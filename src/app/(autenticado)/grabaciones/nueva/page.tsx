'use client';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  MapPin, Trash2, Undo2, CheckCircle, Save,
  Navigation, ArrowLeft, Ruler, Clock, Hash,
} from 'lucide-react';
import { grabacionesServicio } from '../../../../services/grabaciones.servicio';
import { lineasServicio }      from '../../../../services/lineas.servicio';
import { rutasServicio }       from '../../../../services/rutas.servicio';
import { useUsuarioAlmacen }   from '../../../../almacen/usuario.almacen';
import { RolUsuario }          from '../../../../types';

// ── Douglas-Peucker ──────────────────────────────────────────────────────────
type LatLng = { lat: number; lng: number };

function perpendicularDistance(p: LatLng, a: LatLng, b: LatLng): number {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  if (dx === 0 && dy === 0) {
    return Math.hypot(p.lng - a.lng, p.lat - a.lat);
  }
  const t = ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / (dx * dx + dy * dy);
  const tc = Math.max(0, Math.min(1, t));
  return Math.hypot(p.lng - a.lng - tc * dx, p.lat - a.lat - tc * dy);
}

function douglasPeucker(points: LatLng[], epsilon: number): LatLng[] {
  if (points.length < 3) return points;
  let maxDist = 0, maxIdx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    const l = douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
    const r = douglasPeucker(points.slice(maxIdx), epsilon);
    return [...l.slice(0, -1), ...r];
  }
  return [points[0], points[points.length - 1]];
}

// ── Haversine distance ────────────────────────────────────────────────────────
function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function totalDistanceKm(pts: LatLng[]): number {
  return pts.reduce((sum, p, i) => i === 0 ? 0 : sum + haversineKm(pts[i-1], p), 0);
}

// ── Validación de calle via Nominatim (OSM reverso) ──────────────────────────
// Nominatim tiene cobertura completa de OSM incluida Bolivia.
// Con zoom=17 devuelve resultado a nivel calle; si no hay vía cercana,
// la respuesta no incluye el campo `road` / `highway` / equivalente.

type SnapResult =
  | { ok: true;  snapped: LatLng; streetName: string }
  | { ok: false; reason: string };

// Tipos de vía que acepta OSM en el campo `address`
const ROAD_KEYS = [
  'road', 'highway', 'pedestrian', 'path',
  'footway', 'cycleway', 'service', 'track',
  'residential', 'living_street',
] as const;

async function snapToRoad(raw: LatLng): Promise<SnapResult> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${raw.lat}&lon=${raw.lng}&format=json&zoom=17&addressdetails=1`;
    const res  = await fetch(url, {
      headers: { 'Accept-Language': 'es', 'User-Agent': 'TransitAI/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, reason: 'Sin respuesta del servicio de calles.' };

    const json = await res.json();

    // Nominatim devuelve error si no encontró nada
    if (json.error) return { ok: false, reason: 'No hay ninguna vía en ese punto.' };

    const address: Record<string, string> = json.address ?? {};

    // Buscar cualquier clave que corresponda a una vía
    const streetName = ROAD_KEYS.map(k => address[k]).find(v => !!v);

    if (!streetName) {
      // No hay calle: puede ser edificio, parque, terreno, etc.
      const lugar = address.building || address.amenity || address.leisure
        || address.suburb || address.neighbourhood || 'ese punto';
      return {
        ok: false,
        reason: `"${lugar}" no es una vía transitable. Haz clic sobre una calle o avenida.`,
      };
    }

    return { ok: true, snapped: raw, streetName };

  } catch {
    // Si Nominatim falla (sin internet, timeout), permitir el punto sin validar
    return { ok: true, snapped: raw, streetName: 'Calle (sin validar)' };
  }
}

// ── Routing OSRM entre dos puntos (geometría real por calles) ────────────────
async function routeByRoad(from: LatLng, to: LatLng): Promise<LatLng[]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [from, to];
    const json = await res.json();
    if (json.code !== 'Ok' || !json.routes?.[0]) return [from, to];
    const coords: [number, number][] = json.routes[0].geometry.coordinates;
    return coords.map(([lng, lat]) => ({ lat, lng }));
  } catch {
    return [from, to]; // fallback a línea recta si OSRM no responde
  }
}

// ── Validación del formulario ─────────────────────────────────────────────────
function validar(lineaId: string, direccion: string, anchors: LatLng[]): string | null {
  if (!lineaId)            return 'Debes seleccionar una línea.';
  if (!direccion)          return 'Debes seleccionar la dirección de la ruta.';
  if (anchors.length < 2)  return 'Debes marcar al menos 2 puntos en el mapa.';
  return null;
}

// ── Marcador tipo para inicio/fin ─────────────────────────────────────────────
const MODO = { INACTIVO: 'inactivo', DIBUJANDO: 'dibujando', TERMINADO: 'terminado' } as const;
type Modo = typeof MODO[keyof typeof MODO];

const AVG_SPEED_KMH = 25; // velocidad promedio bus urbano

// ── Componente principal ──────────────────────────────────────────────────────
export default function PaginaNuevaGrabacion() {
  const router  = useRouter();
  const { usuario } = useUsuarioAlmacen();
  const sindicatoId = usuario?.sindicatoId ? String(usuario.sindicatoId) : '';

  // Form metadata
  const [lineaId,    setLineaId]    = useState('');
  const [direccion,  setDireccion]  = useState('OUTBOUND');
  const [metodo,     setMetodo]     = useState('ADMIN_DRAW');
  const [conductorId, setConductorId] = useState('');
  const [rutaId,     setRutaId]     = useState('');

  // Estado del dibujo
  const [modo,         setModo]         = useState<Modo>(MODO.INACTIVO);
  // anchors = puntos donde el usuario hizo clic (para undo y marcadores)
  const [anchors,      setAnchors]      = useState<LatLng[]>([]);
  // segments = geometría real por calle entre cada par de anchors
  // segments[i] = ruta de anchors[i] → anchors[i+1]
  const [segments,     setSegments]     = useState<LatLng[][]>([]);
  const [error,        setError]        = useState('');
  const [snapping,     setSnapping]     = useState(false);
  const [snapError,    setSnapError]    = useState('');
  const [calleActual,  setCalleActual]  = useState('');

  // Mapa refs
  const mapRef       = useRef<import('leaflet').Map | null>(null);
  const polylineRef  = useRef<import('leaflet').Polyline | null>(null);
  const markersRef   = useRef<import('leaflet').Marker[]>([]);
  const mapDivRef    = useRef<HTMLDivElement>(null);

  // Datos derivados — a partir de los segmentos (ruta real por calles)
  const allRoutePoints = segments.flat();
  const distancia   = totalDistanceKm(allRoutePoints);
  const duracionMin = distancia > 0 ? Math.round((distancia / AVG_SPEED_KMH) * 60) : 0;

  // Queries
  const { data: lineas = [] } = useQuery<{id:string|number; name:string; code:string}[]>({
    queryKey: ['lineas', sindicatoId],
    queryFn:  () => lineasServicio.obtenerTodas(sindicatoId ? { sindicatoId } : undefined),
  });
  const { data: rutas = [] } = useQuery<{id:string|number; name:string; direction:string}[]>({
    queryKey: ['rutas', lineaId],
    queryFn:  () => rutasServicio.obtenerTodas(lineaId ? { lineaId } : undefined),
    enabled:  !!lineaId,
  });

  // Mutation guardar
  const guardar = useMutation({
    mutationFn: () => {
      const simplificados = douglasPeucker(allRoutePoints, 0.00005);
      const geoJson = {
        type: 'LineString',
        coordinates: allRoutePoints.map(p => [p.lng, p.lat]),
      };
      const geoJsonSimp = {
        type: 'LineString',
        coordinates: simplificados.map(p => [p.lng, p.lat]),
      };
      return grabacionesServicio.crear({
        lineaId:             parseInt(lineaId),
        conductorId:         conductorId ? parseInt(conductorId) : undefined,
        rutaId:              rutaId      ? parseInt(rutaId)      : undefined,
        metodo,
        direccion,
        puntosGrabados:      JSON.stringify(geoJson),
        puntosSimplificados: JSON.stringify(geoJsonSimp),
        cantidadPuntos:      allRoutePoints.length,
        distanciaKm:         Math.round(distancia * 100) / 100,
        duracionMinutos:     duracionMin,
      });
    },
    onSuccess: () => router.push('/grabaciones'),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message;
      const texto = Array.isArray(msg) ? msg.join(' · ') : (msg ?? 'Error al guardar. Intenta de nuevo.');
      setError(texto);
    },
  });

  const handleGuardar = () => {
    const err = validar(lineaId, direccion, anchors);
    if (err) { setError(err); return; }
    setError('');
    guardar.mutate();
  };

  // ── Inicializar mapa (solo cliente) ────────────────────────────────────────
  const initializingRef2 = useRef(false); // guard contra doble init por Strict Mode

  useEffect(() => {
    if (typeof window === 'undefined' || !mapDivRef.current) return;
    if (mapRef.current || initializingRef2.current) return;

    initializingRef2.current = true;
    const container = mapDivRef.current;

    import('leaflet').then(L => {
      // Si el cleanup ya corrió antes de que llegue el callback, abortar
      if (!container.isConnected || mapRef.current) {
        initializingRef2.current = false;
        return;
      }

      // Limpiar cualquier instancia previa que Leaflet haya dejado en el DOM
      // (ocurre en React Strict Mode cuando el effect se ejecuta dos veces)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((container as any)._leaflet_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (container as any)._leaflet_id;
      }

      // Fix iconos por defecto de Leaflet en Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(container, {
        center: [-17.783, -63.182],
        zoom:   14,
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: false,
        zoomAnimation: false,
        markerZoomAnimation: false,
        fadeAnimation: false,
        contextmenu: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // ── Pan con botón derecho ──────────────────────────────────────────
      // Desactivamos el arrastre nativo del izquierdo y lo reemplazamos:
      // - Izquierdo: solo clic (añade punto), NO arrastra el mapa
      // - Derecho:   arrastra el mapa
      map.dragging.disable();

      let isPanning = false;
      let lastX = 0, lastY = 0;

      const onMouseDown = (e: MouseEvent) => {
        if (e.button !== 2) return; // solo botón derecho
        isPanning = true;
        lastX = e.clientX;
        lastY = e.clientY;
        container.style.cursor = 'grabbing';
        e.preventDefault();
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isPanning) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        map.panBy([-dx, -dy], { animate: false });
      };

      const onMouseUp = (e: MouseEvent) => {
        if (e.button !== 2) return;
        isPanning = false;
        // Restaurar cursor según el modo actual
        container.style.cursor = modoRef.current === MODO.DIBUJANDO ? 'crosshair' : '';
      };

      const onContextMenu = (e: MouseEvent) => e.preventDefault();

      container.addEventListener('mousedown',   onMouseDown);
      window.addEventListener('mousemove',      onMouseMove);
      window.addEventListener('mouseup',        onMouseUp);
      container.addEventListener('contextmenu', onContextMenu);

      // Guardar cleanup en el map para poder removerlo después
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any)._rightDragCleanup = () => {
        container.removeEventListener('mousedown',   onMouseDown);
        window.removeEventListener('mousemove',      onMouseMove);
        window.removeEventListener('mouseup',        onMouseUp);
        container.removeEventListener('contextmenu', onContextMenu);
      };
      // ──────────────────────────────────────────────────────────────────

      mapRef.current = map;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          map.invalidateSize();
          initializingRef2.current = false;
        });
      });
    });

    return () => {
      initializingRef2.current = false;
      if (mapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapRef.current as any)._rightDragCleanup?.();
        try { mapRef.current.stop(); }   catch { /* ya destruido */ }
        try { mapRef.current.remove(); } catch { /* ya destruido */ }
        mapRef.current = null;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (container) delete (container as any)._leaflet_id;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handler click en mapa ──────────────────────────────────────────────────
  const modoRef = useRef<Modo>(MODO.INACTIVO);
  modoRef.current = modo;

  const anchorsRef  = useRef<LatLng[]>([]);
  anchorsRef.current = anchors;
  const segmentsRef = useRef<LatLng[][]>([]);
  segmentsRef.current = segments;

  const snappingRef = useRef(false);

  const agregarPunto = useCallback(async (raw: LatLng) => {
    if (modoRef.current !== MODO.DIBUJANDO) return;
    if (snappingRef.current) return;

    snappingRef.current = true;
    setSnapping(true);
    setSnapError('');

    // 1. Validar que hay una calle en el punto
    const snapResult = await snapToRoad(raw);
    if (!snapResult.ok) {
      snappingRef.current = false;
      setSnapping(false);
      setSnapError(snapResult.reason);
      setTimeout(() => setSnapError(''), 3500);
      return;
    }

    const { snapped, streetName } = snapResult;
    setCalleActual(streetName);

    const prevAnchors = anchorsRef.current;
    const newAnchors  = [...prevAnchors, snapped];

    // 2. Calcular segmento por calles (si hay punto anterior)
    let newSegment: LatLng[] = [snapped];
    if (prevAnchors.length > 0) {
      const from = prevAnchors[prevAnchors.length - 1];
      newSegment = await routeByRoad(from, snapped);
    }

    snappingRef.current = false;
    setSnapping(false);

    // 3. Actualizar estado
    anchorsRef.current  = newAnchors;
    segmentsRef.current = [...segmentsRef.current, newSegment];
    setAnchors(newAnchors);
    setSegments(s => [...s, newSegment]);

    // 4. Actualizar mapa
    import('leaflet').then(L => {
      const map = mapRef.current;
      if (!map) return;

      // Polyline con toda la ruta (todos los segmentos aplanados)
      const allPts = [...segmentsRef.current.flat()];
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(allPts.map(p => [p.lat, p.lng]));
      } else {
        polylineRef.current = L.polyline(allPts.map(p => [p.lat, p.lng]), {
          color: '#00d992', weight: 5, opacity: 0.9,
        }).addTo(map);
      }

      // Marcador del nuevo anchor
      if (newAnchors.length === 1) {
        const icon = L.divIcon({
          html: `<div style="width:14px;height:14px;background:#00d992;border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(0,217,146,0.9)"></div>`,
          iconSize: [14, 14], iconAnchor: [7, 7], className: '',
        });
        const m = L.marker([snapped.lat, snapped.lng], { icon }).addTo(map);
        m.bindTooltip(`Inicio · ${streetName}`, { permanent: true, direction:'top', offset:[0,-10], className:'leaflet-label-inicio' });
        markersRef.current.push(m);
      } else {
        // Quitar tooltip "Fin" del marcador anterior
        markersRef.current[markersRef.current.length - 1]?.unbindTooltip();
        const icon = L.divIcon({
          html: `<div style="width:11px;height:11px;background:#00d992;border:2px solid #fff;border-radius:50%;opacity:0.85"></div>`,
          iconSize: [11, 11], iconAnchor: [5, 5], className: '',
        });
        const m = L.marker([snapped.lat, snapped.lng], { icon }).addTo(map);
        markersRef.current.push(m);
        m.bindTooltip(`Fin · ${streetName}`, { permanent: true, direction:'top', offset:[0,-10], className:'leaflet-label-fin' });
      }
    });
  }, []);

  // Registrar/desregistrar click del mapa cuando cambia el modo
  const handlerRef = useRef<((e: import('leaflet').LeafletMouseEvent) => void) | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (handlerRef.current) {
      map.off('click', handlerRef.current);
      handlerRef.current = null;
    }

    if (modo === MODO.DIBUJANDO) {
      const handler = (e: import('leaflet').LeafletMouseEvent) => {
        if (snappingRef.current) return;
        map.getContainer().style.cursor = 'wait';
        void agregarPunto({ lat: e.latlng.lat, lng: e.latlng.lng }).then(() => {
          if (modoRef.current === MODO.DIBUJANDO) map.getContainer().style.cursor = 'crosshair';
        });
      };
      handlerRef.current = handler;
      map.on('click', handler);
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.getContainer().style.cursor = '';
    }
  }, [modo, agregarPunto]);

  // ── Acciones ───────────────────────────────────────────────────────────────
  const iniciarDibujo = () => { setModo(MODO.DIBUJANDO); setError(''); };

  const deshacerUltimo = () => {
    const prevAnchors  = anchorsRef.current;
    const prevSegments = segmentsRef.current;
    if (prevAnchors.length === 0) return;

    // Quitar último anchor y último segmento
    const newAnchors  = prevAnchors.slice(0, -1);
    const newSegments = prevSegments.slice(0, -1);
    anchorsRef.current  = newAnchors;
    segmentsRef.current = newSegments;
    setAnchors(newAnchors);
    setSegments(newSegments);

    // Quitar último marcador del mapa
    const m = markersRef.current.pop();
    m?.remove();

    // Restaurar tooltip "Fin" al nuevo último anchor
    if (markersRef.current.length > 1) {
      const ultimo = markersRef.current[markersRef.current.length - 1];
      const calleUltima = newAnchors.length > 0 ? calleActual : '';
      ultimo?.unbindTooltip();
      if (calleUltima) ultimo?.bindTooltip(`Fin · ${calleUltima}`, { permanent:true, direction:'top', offset:[0,-10] });
    }

    // Actualizar polyline
    const allPts = newSegments.flat();
    if (polylineRef.current) {
      if (allPts.length > 0) polylineRef.current.setLatLngs(allPts.map(p => [p.lat, p.lng]));
      else { polylineRef.current.remove(); polylineRef.current = null; }
    }
  };

  const limpiarTodo = () => {
    setAnchors([]);
    setSegments([]);
    anchorsRef.current  = [];
    segmentsRef.current = [];
    setModo(MODO.INACTIVO);
    setCalleActual('');
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    polylineRef.current?.remove();
    polylineRef.current = null;
    setError('');
  };

  const terminarDibujo = () => {
    if (anchors.length < 2) { setError('Necesitas al menos 2 puntos para terminar.'); return; }
    setModo(MODO.TERMINADO);
    setError('');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ position:'fixed', inset:0, display:'flex', flexDirection:'column', background:'#050507', overflow:'hidden', zIndex:50 }}>

      {/* ── Barra superior ──────────────────────────────────────────────────── */}
      <div style={{ background:'#101010', borderBottom:'1px solid #3d3a39', padding:'0.75rem 1.5rem', flexShrink:0 }}>

        {/* Fila 1: título + estado */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.875rem', marginBottom:'0.75rem' }}>
          <button className="boton boton-secundario" style={{ padding:'0.35rem 0.6rem', flexShrink:0 }} onClick={()=>router.push('/grabaciones')}>
            <ArrowLeft size={14}/>
          </button>
          <h1 style={{ fontWeight:800, fontSize:'1.1rem', color:'#f2f2f2', whiteSpace:'nowrap' }}>Grabar nueva ruta</h1>
          {modo === MODO.DIBUJANDO && (
            <span style={{ fontSize:'0.72rem', padding:'0.2rem 0.55rem', borderRadius:5, background:'rgba(0,217,146,0.12)', color:'#00d992', border:'1px solid rgba(0,217,146,0.3)', fontWeight:700, animation:'pulso 1.5s infinite', whiteSpace:'nowrap' }}>● Dibujando</span>
          )}
          {modo === MODO.TERMINADO && (
            <span style={{ fontSize:'0.72rem', padding:'0.2rem 0.55rem', borderRadius:5, background:'rgba(245,166,35,0.12)', color:'#f5a623', border:'1px solid rgba(245,166,35,0.3)', fontWeight:700, whiteSpace:'nowrap' }}>✓ Listo para guardar</span>
          )}
          {/* Stats inline cuando hay puntos */}
          {anchors.length > 0 && (
            <div style={{ display:'flex', gap:'1.25rem', marginLeft:'auto' }}>
              {[
                { icon:<Hash size={12}/>,  val:`${anchors.length} anclajes / ${allRoutePoints.length} pts`, unit:'',  color:'#00d992' },
                { icon:<Ruler size={12}/>, val:distancia.toFixed(2),     unit:'km',       color:'#4cb3d4' },
                { icon:<Clock size={12}/>, val:duracionMin.toString(),   unit:'min aprox',color:'#f5a623' },
              ].map(({icon,val,unit,color})=>(
                <div key={unit} style={{ display:'flex', alignItems:'center', gap:'0.3rem', color }}>
                  {icon}
                  <span style={{ fontSize:'0.82rem', fontWeight:700 }}>{val}</span>
                  <span style={{ fontSize:'0.7rem', color:'#8b949e' }}>{unit}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fila 2: campos de metadatos en grid */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:'0.625rem' }}>

          {/* Línea */}
          <div>
            <label style={{ fontSize:'0.72rem', fontWeight:600, color:'#8b949e', display:'block', marginBottom:'0.2rem' }}>
              Línea <span style={{ color:'#fb565b' }}>*</span>
            </label>
            <select
              className="campo-entrada"
              value={lineaId}
              onChange={e=>{ setLineaId(e.target.value); setRutaId(''); setError(''); }}
              style={{ fontSize:'0.82rem', padding:'0.35rem 0.6rem' }}
            >
              <option value="">— Seleccionar línea —</option>
              {lineas.map(l=><option key={String(l.id)} value={String(l.id)}>{l.code} – {l.name}</option>)}
            </select>
          </div>

          {/* Dirección */}
          <div>
            <label style={{ fontSize:'0.72rem', fontWeight:600, color:'#8b949e', display:'block', marginBottom:'0.2rem' }}>
              Dirección <span style={{ color:'#fb565b' }}>*</span>
            </label>
            <select
              className="campo-entrada"
              value={direccion}
              onChange={e=>setDireccion(e.target.value)}
              style={{ fontSize:'0.82rem', padding:'0.35rem 0.6rem' }}
            >
              <option value="OUTBOUND">IDA →</option>
              <option value="INBOUND">← VUELTA</option>
              <option value="CIRCULAR">↻ CIRCULAR</option>
            </select>
          </div>

          {/* Método */}
          <div>
            <label style={{ fontSize:'0.72rem', fontWeight:600, color:'#8b949e', display:'block', marginBottom:'0.2rem' }}>Método</label>
            <select
              className="campo-entrada"
              value={metodo}
              onChange={e=>setMetodo(e.target.value)}
              style={{ fontSize:'0.82rem', padding:'0.35rem 0.6rem' }}
            >
              <option value="ADMIN_DRAW">Dibujo manual (Admin)</option>
              <option value="KML_IMPORT">KML / GeoJSON</option>
            </select>
          </div>

          {/* Ruta a actualizar — select filtrado por línea */}
          <div>
            <label style={{ fontSize:'0.72rem', fontWeight:600, color:'#8b949e', display:'block', marginBottom:'0.2rem' }}>Ruta a actualizar</label>
            <select
              className="campo-entrada"
              value={rutaId}
              onChange={e=>setRutaId(e.target.value)}
              disabled={!lineaId}
              style={{ fontSize:'0.82rem', padding:'0.35rem 0.6rem', opacity: lineaId ? 1 : 0.5 }}
            >
              <option value="">— Nueva ruta —</option>
              {rutas.map(r=><option key={String(r.id)} value={String(r.id)}>{r.name} ({r.direction === 'OUTBOUND' ? 'IDA' : r.direction === 'INBOUND' ? 'VUELTA' : 'CIRCULAR'})</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Mapa + controles (ocupa el resto) ─────────────────────────────── */}
      <div style={{ flex:1, position:'relative', minHeight:0 }}>

        {/* Mapa */}
        <div ref={mapDivRef} style={{ width:'100%', height:'100%' }}/>

        {/* Panel de controles flotante */}
        <div style={{ position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:1000, display:'flex', gap:'0.625rem', alignItems:'center', background:'rgba(16,16,16,0.95)', border:'1px solid #3d3a39', borderRadius:12, padding:'0.625rem 0.875rem', backdropFilter:'blur(6px)', boxShadow:'0 4px 24px rgba(0,0,0,0.5)' }}>

          {modo === MODO.INACTIVO && (
            <button className="boton boton-primario" style={{ gap:'0.375rem' }} onClick={iniciarDibujo}>
              <Navigation size={14}/> Iniciar dibujo
            </button>
          )}

          {modo === MODO.DIBUJANDO && (<>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.15rem', marginRight:'0.25rem' }}>
              {snapping ? (
                <span style={{ fontSize:'0.75rem', color:'#f5a623', display:'flex', alignItems:'center', gap:'0.35rem' }}>
                  <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:'#f5a623', animation:'pulso 0.8s infinite' }}/>
                  Ajustando a la calle...
                </span>
              ) : calleActual ? (
                <span style={{ fontSize:'0.75rem', color:'#00d992', display:'flex', alignItems:'center', gap:'0.35rem' }}>
                  <MapPin size={11}/> {calleActual}
                </span>
              ) : (
                <span style={{ fontSize:'0.75rem', color:'#8b949e' }}>Haz clic sobre una calle</span>
              )}
            </div>
            <button className="boton boton-secundario" style={{ padding:'0.4rem 0.625rem', fontSize:'0.75rem' }} onClick={deshacerUltimo} disabled={anchors.length===0||snapping} title="Deshacer último punto">
              <Undo2 size={13}/> Deshacer
            </button>
            <button className="boton" style={{ padding:'0.4rem 0.625rem', fontSize:'0.75rem', background:'rgba(251,86,91,0.1)', color:'#fb565b', border:'1px solid rgba(251,86,91,0.2)' }} onClick={limpiarTodo} title="Limpiar todo" disabled={snapping}>
              <Trash2 size={13}/> Limpiar
            </button>
            <button className="boton boton-primario" style={{ padding:'0.4rem 0.75rem', fontSize:'0.75rem' }} onClick={terminarDibujo} disabled={anchors.length<2||snapping}>
              <CheckCircle size={13}/> Terminar ruta
            </button>
          </>)}

          {modo === MODO.TERMINADO && (<>
            <div style={{ fontSize:'0.78rem', color:'#8b949e' }}>
              <span style={{ color:'#f2f2f2', fontWeight:600 }}>{anchors.length}</span> anclajes · <span style={{ color:'#f2f2f2', fontWeight:600 }}>{allRoutePoints.length}</span> pts ·{' '}
              <span style={{ color:'#00d992', fontWeight:600 }}>{distancia.toFixed(2)} km</span> ·{' '}
              <span style={{ color:'#f5a623', fontWeight:600 }}>{duracionMin} min</span>
              <span style={{ color:'#8b949e', fontSize:'0.7rem' }}> (Douglas-Peucker aplicado al guardar)</span>
            </div>
            <button className="boton boton-secundario" style={{ padding:'0.4rem 0.625rem', fontSize:'0.75rem' }} onClick={()=>setModo(MODO.DIBUJANDO)}>
              <Edit size={13}/> Seguir editando
            </button>
            <button className="boton boton-primario" style={{ padding:'0.4rem 0.875rem', fontSize:'0.75rem', background:'rgba(0,217,146,0.15)', border:'1px solid rgba(0,217,146,0.4)' }} onClick={handleGuardar} disabled={guardar.isPending}>
              <Save size={13}/> {guardar.isPending ? 'Guardando...' : 'Guardar grabación'}
            </button>
          </>)}
        </div>

        {/* Leyenda esquina superior derecha */}
        <div style={{ position:'absolute', top:16, right:16, zIndex:1000, background:'rgba(16,16,16,0.92)', border:'1px solid #3d3a39', borderRadius:9, padding:'0.75rem 1rem', fontSize:'0.75rem', color:'#8b949e', lineHeight:1.8, minWidth:210 }}>

          {/* Controles del mapa */}
          <p style={{ fontSize:'0.7rem', fontWeight:700, color:'#f2f2f2', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.375rem' }}>Controles</p>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.2rem' }}>
            <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:22, height:22, borderRadius:5, background:'rgba(0,217,146,0.12)', border:'1px solid rgba(0,217,146,0.35)', fontSize:'0.65rem', fontWeight:700, color:'#00d992', flexShrink:0 }}>L</span>
            <span>Clic izquierdo — trazar punto</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.2rem' }}>
            <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:22, height:22, borderRadius:5, background:'rgba(76,179,212,0.12)', border:'1px solid rgba(76,179,212,0.35)', fontSize:'0.65rem', fontWeight:700, color:'#4cb3d4', flexShrink:0 }}>R</span>
            <span>Clic derecho + arrastrar — mover mapa</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.75rem' }}>
            <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:22, height:22, borderRadius:5, background:'rgba(245,166,35,0.12)', border:'1px solid rgba(245,166,35,0.35)', fontSize:'0.65rem', fontWeight:700, color:'#f5a623', flexShrink:0 }}>⊕</span>
            <span>Rueda del mouse — zoom</span>
          </div>

          {/* Leyenda visual */}
          <p style={{ fontSize:'0.7rem', fontWeight:700, color:'#f2f2f2', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.375rem' }}>Leyenda</p>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <div style={{ width:10, height:10, background:'#00d992', borderRadius:'50%', border:'2px solid #fff', flexShrink:0 }}/> Inicio
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <div style={{ width:10, height:10, background:'#00d992', borderRadius:'50%', opacity:0.7, flexShrink:0 }}/> Punto intermedio
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <div style={{ width:24, height:3, background:'#00d992', borderRadius:2, flexShrink:0 }}/> Ruta por calles
          </div>
        </div>

        {/* Error banner — calle no válida (snap) */}
        {snapError && (
          <div style={{ position:'absolute', top:16, left:'50%', transform:'translateX(-50%)', zIndex:1002, background:'rgba(245,166,35,0.15)', border:'1px solid rgba(245,166,35,0.5)', borderRadius:8, padding:'0.5rem 1rem', color:'#f5a623', fontSize:'0.8rem', fontWeight:600, backdropFilter:'blur(4px)', display:'flex', alignItems:'center', gap:'0.5rem', whiteSpace:'nowrap' }}>
            <MapPin size={13}/> {snapError}
          </div>
        )}

        {/* Error banner — formulario */}
        {error && (
          <div style={{ position:'absolute', top: snapError ? 58 : 16, left:'50%', transform:'translateX(-50%)', zIndex:1001, background:'rgba(251,86,91,0.15)', border:'1px solid rgba(251,86,91,0.4)', borderRadius:8, padding:'0.625rem 1rem', color:'#fb565b', fontSize:'0.8rem', fontWeight:600, backdropFilter:'blur(4px)' }}>
            {error}
          </div>
        )}

        {/* Instrucción inicial */}
        {modo === MODO.INACTIVO && anchors.length === 0 && (
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:999, textAlign:'center', pointerEvents:'none' }}>
            <div style={{ background:'rgba(16,16,16,0.85)', border:'1px solid #3d3a39', borderRadius:12, padding:'1.5rem 2rem', backdropFilter:'blur(4px)' }}>
              <MapPin size={32} color="#00d992" style={{ margin:'0 auto 0.75rem' }}/>
              <p style={{ color:'#f2f2f2', fontWeight:700, fontSize:'0.95rem', marginBottom:'0.375rem' }}>Selecciona una línea y presiona "Iniciar dibujo"</p>
              <p style={{ color:'#8b949e', fontSize:'0.8rem' }}>Luego haz clic sobre las calles del mapa para marcar el recorrido</p>
            </div>
          </div>
        )}
      </div>

      {/* CSS animación pulso */}
      <style>{`
        @keyframes pulso { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .leaflet-label-inicio .leaflet-tooltip { background:#00d992; color:#000; font-weight:700; font-size:11px; border:none; box-shadow:none; }
        .leaflet-label-fin    .leaflet-tooltip { background:#fb565b; color:#fff; font-weight:700; font-size:11px; border:none; box-shadow:none; }
      `}</style>
    </div>
  );
}

// Icono Edit local para no importar desde lucide en el bundle si no existe
function Edit({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
