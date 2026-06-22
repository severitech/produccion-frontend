'use client';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Route, Pen,
  ToggleLeft, ToggleRight, Ruler, Clock, Hash, Satellite, MapPin,
} from 'lucide-react';
import { rutasServicio }       from '../../../../services/rutas.servicio';
import { grabacionesServicio } from '../../../../services/grabaciones.servicio';
import { MapaDibujoRuta }      from '../../../../components/MapaDibujoRuta';
import { Cargando }            from '../../../../components/dashboard/Cargando';

// ── Constantes ────────────────────────────────────────────────────────────────
const dirLabel: Record<string,string> = { OUTBOUND:'IDA →', INBOUND:'← VUELTA', CIRCULAR:'↻ CIRCULAR' };
const grabEstLabel: Record<string,string> = { PENDING:'Pendiente', APPROVED:'Aprobada', REJECTED:'Rechazada' };
const grabEstColor: Record<string,string> = { PENDING:'#f5a623', APPROVED:'#00d992', REJECTED:'#fb565b' };
const grabMetLabel: Record<string,string> = { ADMIN_DRAW:'Admin', DRIVER_GPS:'GPS Chofer', KML_IMPORT:'KML/GeoJSON' };

type GeoJsonLine = { type: string; coordinates: [number, number][] };
type Grabacion   = { id: string; status: string; method: string; direction?: string; reviewNotes?: string; recordedPoints?: GeoJsonLine; simplifiedPoints?: GeoJsonLine };
type RutaDetalle = {
  id: string; lineId: string|number; name: string; direction: string;
  totalDistanceKm?: number|string; estimatedTimeMin?: number; restTimeMin?: number;
  active: boolean; routeRecordingId?: string|number;
  drawnPoints?: Array<{ lat: number; lng: number }>;
  recordingType?: string; // 'GPS' o 'DRAWN'
  routeRecording?: Grabacion;
  line?: { id: string|number; name: string; code: string; color: string };
};

// ── Validación ────────────────────────────────────────────────────────────────
function validar(nombre: string): string | null {
  if (!nombre.trim()) return 'El nombre de la ruta es obligatorio.';
  return null;
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function PaginaEditarRuta() {
  const params = useParams();
  const id     = String(params.id);
  const router = useRouter();
  const qc     = useQueryClient();

  // Form
  const [nombre,         setNombre]         = useState('');
  const [direccion,      setDireccion]      = useState('OUTBOUND');
  const [distanciaKm,    setDistanciaKm]    = useState('');
  const [tiempoMin,      setTiempoMin]      = useState('');
  const [descansoMin,    setDescansoMin]    = useState('0');
  const [grabacionId,    setGrabacionId]    = useState('');
  const [puntosRuta,     setPuntosRuta]     = useState<{lat:number; lng:number}[]>([]);
  const [dibujando,      setDibujando]      = useState(false);
  const [recordingType,  setRecordingType]  = useState<string>('');
  const [error,          setError]          = useState('');
  const [exito,          setExito]          = useState('');

  // Mapa
  const mapDivRef   = useRef<HTMLDivElement>(null);
  const mapRef      = useRef<import('leaflet').Map | null>(null);
  const initRef     = useRef(false);
  const polyRef     = useRef<import('leaflet').Polyline | null>(null);
  const polySimpRef = useRef<import('leaflet').Polyline | null>(null);
  const [mapListo,  setMapListo] = useState(false);

  // Query ruta
  const { data: ruta, isLoading } = useQuery<RutaDetalle>({
    queryKey: ['ruta-detalle', id],
    queryFn:  () => rutasServicio.obtenerPorId(id),
  });

  // Query grabaciones aprobadas para la línea
  const { data: grabaciones = [] } = useQuery<Grabacion[]>({
    queryKey: ['grab-disp-ruta', ruta?.lineId],
    queryFn:  () => grabacionesServicio.obtenerTodas({ lineaId: String(ruta!.lineId), estado: 'APPROVED' }),
    enabled:  !!ruta?.lineId,
  });

  // Query todas las rutas de la línea (para ver las dibujadas)
  const { data: rutasOtras = [] } = useQuery<RutaDetalle[]>({
    queryKey: ['rutas-linea', ruta?.lineId],
    queryFn:  () => rutasServicio.obtenerTodas(ruta?.lineId ? { lineaId: String(ruta.lineId) } : undefined),
    enabled:  !!ruta?.lineId,
  });

  // Poblar form cuando carga la ruta
  const [rutaOriginal, setRutaOriginal] = useState<RutaDetalle | null>(null);

  useEffect(() => {
    if (!ruta) return;
    setRutaOriginal(ruta);
    setNombre(ruta.name);
    setDireccion(ruta.direction);
    setDistanciaKm(ruta.totalDistanceKm ? String(ruta.totalDistanceKm) : '');
    setTiempoMin(ruta.estimatedTimeMin ? String(ruta.estimatedTimeMin) : '');
    setDescansoMin(ruta.restTimeMin ? String(ruta.restTimeMin) : '0');
    setGrabacionId(ruta.routeRecordingId ? String(ruta.routeRecordingId) : '');
    setPuntosRuta(ruta.drawnPoints ?? []);
    setRecordingType(ruta.recordingType ?? '');
  }, [ruta]);

  // Mutations
  const guardar = useMutation({
    mutationFn: () => {
      const datos: any = {};

      // Solo agregar campos que cambiaron
      if (nombre !== rutaOriginal?.name) datos.nombre = nombre;
      if (direccion !== rutaOriginal?.direction) datos.direccion = direccion;
      if (distanciaKm && parseFloat(distanciaKm) !== rutaOriginal?.totalDistanceKm) {
        datos.distanciaKm = parseFloat(distanciaKm);
      }
      if (tiempoMin && parseInt(tiempoMin) !== rutaOriginal?.estimatedTimeMin) {
        datos.tiempoEstimadoMin = parseInt(tiempoMin);
      }
      if (descansoMin && parseInt(descansoMin) !== rutaOriginal?.restTimeMin) {
        datos.tiempoDescansoMin = parseInt(descansoMin);
      }

      // Manejar cambios en puntos dibujados o grabación
      if (puntosRuta.length > 0) {
        datos.puntosRuta = puntosRuta;
        datos.recordingType = 'DRAWN';
      } else if (grabacionId?.startsWith('dibujada-')) {
        // Si seleccionó una ruta dibujada, copiar sus puntos
        const rutaDibujada = rutasOtras.find(r => `dibujada-${r.id}` === grabacionId);
        if (rutaDibujada?.drawnPoints?.length) {
          datos.puntosRuta = rutaDibujada.drawnPoints;
          datos.recordingType = 'DRAWN';
          setPuntosRuta(rutaDibujada.drawnPoints);
        }
      } else if (grabacionId && !grabacionId.startsWith('dibujada-')) {
        datos.rutaGrabadaId = parseInt(grabacionId);
        datos.recordingType = 'GPS';
      }

      console.log('[GUARDAR RUTA] Datos a enviar:', datos);
      return rutasServicio.actualizar(id, datos);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rutas'] });
      qc.invalidateQueries({ queryKey: ['ruta-detalle', id] });
      qc.refetchQueries({ queryKey: ['ruta-detalle', id] });
      setExito('Ruta guardada correctamente');
      setTimeout(() => setExito(''), 3000);
    },
    onError: () => setError('Error al guardar. Intenta de nuevo.'),
  });
  const toggleActivo = useMutation({
    mutationFn: (activo: boolean) => rutasServicio.actualizar(id, { activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ruta-detalle', id] }),
  });

  const handleGuardar = () => {
    const err = validar(nombre);
    if (err) { setError(err); return; }
    setError('');
    guardar.mutate();
  };

  // ── Inicializar mapa ────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !mapDivRef.current || initRef.current) return;
    initRef.current = true;
    const container = mapDivRef.current;

    import('leaflet').then(L => {
      if (!container.isConnected || mapRef.current) { initRef.current = false; return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((container as any)._leaflet_id) delete (container as any)._leaflet_id;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const map = L.map(container, {
        center: [-17.783, -63.182],
        zoom: 13,
        scrollWheelZoom: true,
        doubleClickZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      map.invalidateSize();
      setMapListo(true);
      initRef.current = false;
    });

    return () => {
      if (mapRef.current) {
        try { mapRef.current.stop(); }   catch { /**/ }
        try { mapRef.current.remove(); } catch { /**/ }
        mapRef.current = null;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (container) delete (container as any)._leaflet_id;
      initRef.current = false;
      setMapListo(false);
    };
  }, []);

  // ── Dibujar puntos dibujados en el mapa ──────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (dibujando || !map || !mapListo) return;

    // Limpiar línea dibujada anterior (no las de grabación)
    polyRef.current?.remove();
    polyRef.current = null;
    map.eachLayer(l => { if ((l as any).getLatLng && (l as any).__customMarker) l.remove(); });

    if (puntosRuta.length > 0) {
      import('leaflet').then(L => {
        if (!mapRef.current || dibujando) return;
        const latlngs = puntosRuta.map(p => [p.lat, p.lng] as [number, number]);
        const color = ruta?.line?.color ?? '#00d992';

        polyRef.current = L.polyline(latlngs, { color, weight: 5, opacity: 0.9 }).addTo(map);
        const mkStart = L.divIcon({ html: `<div style="width:14px;height:14px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px ${color}80"></div>`, iconSize: [14, 14], iconAnchor: [7, 7], className: '' });
        const mkEnd = L.divIcon({ html: `<div style="width:14px;height:14px;background:#fb565b;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(251,86,91,0.7)"></div>`, iconSize: [14, 14], iconAnchor: [7, 7], className: '' });
        const m1 = L.marker(latlngs[0], { icon: mkStart }).bindTooltip('Inicio (Dibujado)', { permanent: false, direction: 'top' }).addTo(map);
        const m2 = L.marker(latlngs[latlngs.length - 1], { icon: mkEnd }).bindTooltip('Fin (Dibujado)', { permanent: false, direction: 'top' }).addTo(map);
        (m1 as any).__customMarker = true;
        (m2 as any).__customMarker = true;
        map.fitBounds(L.latLngBounds(latlngs), { padding: [24, 24] });
      });
    }
  }, [puntosRuta, mapListo, dibujando, ruta?.line?.color]);

  // ── Dibujar ruta en el mapa cuando cambia la grabación seleccionada ─────────
  useEffect(() => {
    const map = mapRef.current;
    if (dibujando || !map || !mapListo || !grabacionId) return;

    // Limpiar capas de grabación (no las custom que son de dibujo)
    polyRef.current?.remove(); polyRef.current = null;
    polySimpRef.current?.remove(); polySimpRef.current = null;
    map.eachLayer(l => { if ((l as any).getLatLng && !(l as any).__customMarker) l.remove(); });

    try {
      let latlngs: [number, number][] = [];
      let isDrawn = false;

      if (grabacionId.startsWith('dibujada-')) {
        const rutaDibujada = rutasOtras.find(r => `dibujada-${r.id}` === grabacionId);
        if (rutaDibujada?.drawnPoints?.length) {
          latlngs = rutaDibujada.drawnPoints.map(p => [p.lat, p.lng] as [number, number]);
          isDrawn = true;
        }
      } else if (grabacionId) {
        const grab = grabaciones.find(g => String(g.id) === grabacionId) ?? ruta?.routeRecording;
        if (grab?.recordedPoints?.coordinates?.length) {
          latlngs = grab.recordedPoints.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
        }
      }

      if (latlngs.length === 0) return;

      import('leaflet').then(L => {
        if (!mapRef.current) return;
        const lineColor = ruta?.line?.color ?? '#00d992';

        if (isDrawn) {
          polySimpRef.current = L.polyline(latlngs, { color: lineColor, weight: 5, opacity: 0.9 }).addTo(map);
        } else {
          const grab = grabaciones.find(g => String(g.id) === grabacionId) ?? ruta?.routeRecording;
          polyRef.current = L.polyline(latlngs, { color: '#555', weight: 4, opacity: 0.35 }).addTo(map);
          const simpPts = grab?.simplifiedPoints?.coordinates;
          const mainPts = simpPts?.length ? simpPts.map(([lng, lat]) => [lat, lng] as [number, number]) : latlngs;
          polySimpRef.current = L.polyline(mainPts, { color: lineColor, weight: 5, opacity: 0.9 }).addTo(map);
        }

        const mkStart = L.divIcon({ html: `<div style="width:14px;height:14px;background:${lineColor};border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px ${lineColor}80"></div>`, iconSize: [14, 14], iconAnchor: [7, 7], className: '' });
        const mkEnd = L.divIcon({ html: `<div style="width:14px;height:14px;background:#fb565b;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(251,86,91,0.7)"></div>`, iconSize: [14, 14], iconAnchor: [7, 7], className: '' });
        L.marker(latlngs[0], { icon: mkStart }).bindTooltip('Inicio', { permanent: false, direction: 'top' }).addTo(map);
        L.marker(latlngs[latlngs.length - 1], { icon: mkEnd }).bindTooltip('Fin', { permanent: false, direction: 'top' }).addTo(map);
        map.fitBounds(L.latLngBounds(latlngs), { padding: [24, 24] });
      });
    } catch (err) {
      console.error('Error dibujando ruta:', err);
    }
  }, [grabacionId, grabaciones, rutasOtras, mapListo]);

  if (isLoading) return <div style={{ padding:'2rem' }}><Cargando/></div>;
  if (!ruta)     return <div style={{ padding:'2rem', color:'#fb565b' }}>Ruta no encontrada.</div>;

  const grabActual = grabacionId.startsWith('dibujada-')
    ? (rutasOtras.find(r => `dibujada-${r.id}` === grabacionId) as any)
    : (grabaciones.find(g => String(g.id) === grabacionId) ?? ruta.routeRecording);

  return (
    <div style={{ position:'fixed', top:0, left:220, right:0, bottom:0, display:'flex', background:'#050507', zIndex:10 }}>

      {/* ── Panel lateral ───────────────────────────────────────────────────── */}
      <div style={{ width:340, flexShrink:0, background:'#101010', borderRight:'1px solid #3d3a39', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Cabecera */}
        <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid #3d3a39', display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <button className="boton boton-secundario" style={{ padding:'0.35rem 0.6rem', flexShrink:0 }} onClick={()=>router.push('/rutas')}>
            <ArrowLeft size={14}/>
          </button>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <Route size={15} color="#00d992"/>
              <span style={{ fontWeight:800, fontSize:'0.95rem', color:'#f2f2f2', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {ruta.name}
              </span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginTop:'0.375rem' }}>
              {ruta.line && (
                <p style={{ fontSize:'0.72rem', color:'#8b949e', margin:0 }}>
                  <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:ruta.line.color, marginRight:4 }}/>
                  {ruta.line.code} — {ruta.line.name}
                </p>
              )}
              {recordingType && (
                <div style={{ display:'flex', alignItems:'center', gap:'0.375rem', marginLeft:'auto' }}>
                  {recordingType === 'GPS' ? (
                    <>
                      <Satellite size={12} color="#00d992" />
                      <span style={{ fontSize:'0.7rem', color:'#00d992', fontWeight:700 }}>GPS</span>
                    </>
                  ) : recordingType === 'DRAWN' ? (
                    <>
                      <MapPin size={12} color="#00d992" />
                      <span style={{ fontSize:'0.7rem', color:'#00d992', fontWeight:700 }}>PUNTOS</span>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div style={{ flex:1, overflowY:'auto', padding:'1.25rem', display:'flex', flexDirection:'column', gap:'1rem' }}>

          {/* Nombre */}
          <div>
            <label style={{ fontSize:'0.8rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.3rem' }}>Nombre</label>
            <input className="campo-entrada" value={nombre} onChange={e=>{ setNombre(e.target.value); setError(''); }}/>
          </div>

          {/* Dirección */}
          <div>
            <label style={{ fontSize:'0.8rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.3rem' }}>Dirección</label>
            <select className="campo-entrada" value={direccion} onChange={e=>setDireccion(e.target.value)}>
              {Object.entries(dirLabel).map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {/* Métricas en grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
            <div>
              <label style={{ fontSize:'0.8rem', fontWeight:600, color:'#b8b3b0', display:'flex', alignItems:'center', gap:'0.3rem', marginBottom:'0.3rem' }}><Ruler size={12}/> Distancia (km)</label>
              <input
                type="number"
                className="campo-entrada"
                value={distanciaKm}
                onChange={e=>setDistanciaKm(e.target.value)}
                placeholder="Auto"
                disabled={puntosRuta.length > 0}
                style={{ opacity: puntosRuta.length > 0 ? 0.6 : 1, cursor: puntosRuta.length > 0 ? 'not-allowed' : 'auto' }}
              />
              {puntosRuta.length > 0 && <p style={{ fontSize:'0.65rem', color:'#8b949e', marginTop:'0.25rem' }}>Calculado automáticamente</p>}
            </div>
            <div>
              <label style={{ fontSize:'0.8rem', fontWeight:600, color:'#b8b3b0', display:'flex', alignItems:'center', gap:'0.3rem', marginBottom:'0.3rem' }}><Clock size={12}/> Tiempo (min)</label>
              <input
                type="number"
                className="campo-entrada"
                value={tiempoMin}
                onChange={e=>setTiempoMin(e.target.value)}
                placeholder="Auto"
                disabled={puntosRuta.length > 0}
                style={{ opacity: puntosRuta.length > 0 ? 0.6 : 1, cursor: puntosRuta.length > 0 ? 'not-allowed' : 'auto' }}
              />
              {puntosRuta.length > 0 && <p style={{ fontSize:'0.65rem', color:'#8b949e', marginTop:'0.25rem' }}>Calculado automáticamente</p>}
            </div>
            <div style={{ gridColumn:'span 2' }}>
              <label style={{ fontSize:'0.8rem', fontWeight:600, color:'#b8b3b0', display:'flex', alignItems:'center', gap:'0.3rem', marginBottom:'0.3rem' }}><Clock size={12}/> Descanso (min)</label>
              <input
                type="number"
                className="campo-entrada"
                value={descansoMin}
                onChange={e=>setDescansoMin(e.target.value)}
              />
            </div>
          </div>

          {/* Dibujo manual */}
          <div style={{ borderTop:'1px solid #3d3a39', paddingTop:'1rem' }}>
            {puntosRuta.length > 0 ? (
              <div style={{ background:'rgba(0,217,146,0.08)', border:'1px solid rgba(0,217,146,0.2)', borderRadius:8, padding:'0.625rem 0.75rem', display:'flex', flexDirection:'column', gap:'0.375rem' }}>
                <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'0.75rem', fontWeight:700, color:'#00d992' }}>✓ Dibujo Manual</span>
                  <span style={{ fontSize:'0.72rem', padding:'0.15rem 0.45rem', borderRadius:4, background:'rgba(0,217,146,0.15)', color:'#00d992', border:'1px solid rgba(0,217,146,0.3)', fontWeight:700 }}>
                    {puntosRuta.length} puntos
                  </span>
                </div>
                <p style={{ fontSize:'0.72rem', color:'#8b949e', margin:0 }}>Se mostrará en el mapa →</p>
                <div style={{ display:'flex', gap:'0.5rem' }}>
                  <button className="boton boton-secundario" style={{ flex:1, fontSize:'0.7rem', padding:'0.3rem' }} onClick={() => setDibujando(true)}>
                    <Pen size={12}/> Editar dibujo
                  </button>
                  <button className="boton" style={{ flex:1, fontSize:'0.7rem', padding:'0.3rem', background:'rgba(251,86,91,0.1)', color:'#fb565b', border:'1px solid rgba(251,86,91,0.2)' }} onClick={() => setPuntosRuta([])}>
                    Borrar
                  </button>
                </div>
              </div>
            ) : (
              <button className="boton boton-primario" style={{ width:'100%', fontSize:'0.8rem', padding:'0.5rem' }} onClick={() => setDibujando(true)}>
                <Pen size={14}/> Dibujar ruta
              </button>
            )}
          </div>

          {/* Grabación o ruta dibujada vinculada */}
          <div style={{ borderTop:'1px solid #3d3a39', paddingTop:'1rem' }}>
            <label style={{ fontSize:'0.8rem', fontWeight:600, color:'#b8b3b0', display:'flex', alignItems:'center', gap:'0.375rem', marginBottom:'0.5rem' }}>
              <Route size={13} color="#00d992"/> Ruta a mostrar
            </label>
            <select
              className="campo-entrada"
              value={grabacionId}
              onChange={e=>setGrabacionId(e.target.value)}
              style={{ marginBottom:'0.5rem' }}
            >
              <option value="">— Ninguna —</option>
              <optgroup label="Grabaciones GPS">
                {(grabaciones as Grabacion[]).map(g=>(
                  <option key={`grab-${g.id}`} value={g.id}>
                    {grabMetLabel[g.method]||g.method} — {dirLabel[g.direction||'']||g.direction}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Rutas Dibujadas">
                {(rutasOtras as RutaDetalle[]).filter(r => r.drawnPoints && r.drawnPoints.length > 0 && r.id !== id).map(r=>(
                  <option key={`dibujada-${r.id}`} value={`dibujada-${r.id}`}>
                    {r.name} — {r.drawnPoints!.length} puntos
                  </option>
                ))}
              </optgroup>
            </select>

            {/* Info de la grabación o ruta dibujada seleccionada */}
            {grabActual && (
              <div style={{ background:'rgba(61,58,57,0.4)', borderRadius:8, padding:'0.625rem 0.75rem', display:'flex', flexDirection:'column', gap:'0.375rem' }}>
                {(grabActual as any).drawnPoints ? (
                  <>
                    <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>
                      <MapPin size={14} color="#00d992" />
                      <span style={{ fontSize:'0.75rem', fontWeight:700, color:'#00d992' }}>Ruta Dibujada</span>
                      <span style={{ fontSize:'0.72rem', padding:'0.15rem 0.45rem', borderRadius:4, background:'rgba(0,217,146,0.15)', color:'#00d992', border:'1px solid rgba(0,217,146,0.3)', fontWeight:700 }}>
                        Activa
                      </span>
                    </div>
                    <span style={{ fontSize:'0.72rem', color:'#00d992', display:'flex', alignItems:'center', gap:'0.25rem' }}>
                      <Hash size={10}/> {(grabActual as any).drawnPoints.length.toLocaleString()} puntos
                    </span>
                  </>
                ) : (
                  <>
                    <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>
                      <Satellite size={14} color="#b8b3b0" />
                      <span style={{ fontSize:'0.75rem', fontWeight:700, color:'#b8b3b0' }}>{grabMetLabel[(grabActual as any).method]||(grabActual as any).method}</span>
                      <span style={{ fontSize:'0.72rem', padding:'0.15rem 0.45rem', borderRadius:4, background:`${grabEstColor[(grabActual as any).status]}20`, color:grabEstColor[(grabActual as any).status], border:`1px solid ${grabEstColor[(grabActual as any).status]}40`, fontWeight:700 }}>
                        {grabEstLabel[(grabActual as any).status]||(grabActual as any).status}
                      </span>
                    </div>
                    {(grabActual as any).recordedPoints?.coordinates?.length && (
                      <div style={{ display:'flex', gap:'0.875rem' }}>
                        <span style={{ fontSize:'0.72rem', color:'#00d992', display:'flex', alignItems:'center', gap:'0.25rem' }}>
                          <Hash size={10}/> {(grabActual as any).recordedPoints.coordinates.length.toLocaleString()} pts
                        </span>
                      </div>
                    )}
                    {!(grabActual as any).recordedPoints && (
                      <p style={{ fontSize:'0.72rem', color:'#8b949e' }}>Sin puntos GPS cargados en esta vista</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Estado activo */}
          <div style={{ borderTop:'1px solid #3d3a39', paddingTop:'1rem' }}>
            <label style={{ fontSize:'0.8rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.5rem' }}>Estado</label>
            <button
              className="boton"
              style={{ width:'100%', justifyContent:'center', fontSize:'0.8rem', background: ruta.active?'rgba(251,86,91,0.1)':'rgba(0,217,146,0.1)', color: ruta.active?'#fb565b':'#00d992', border: ruta.active?'1px solid rgba(251,86,91,0.25)':'1px solid rgba(0,217,146,0.25)' }}
              onClick={()=>toggleActivo.mutate(!ruta.active)}
              disabled={toggleActivo.isPending}
            >
              {ruta.active ? <><ToggleRight size={14}/> Activa — clic para desactivar</> : <><ToggleLeft size={14}/> Inactiva — clic para activar</>}
            </button>
          </div>
        </div>

        {/* Footer con botón guardar */}
        <div style={{ padding:'1rem 1.25rem', borderTop:'1px solid #3d3a39', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
          {error && <p style={{ fontSize:'0.78rem', color:'#fb565b', fontWeight:600 }}>{error}</p>}
          {exito && <p style={{ fontSize:'0.78rem', color:'#00d992', fontWeight:600 }}>{exito}</p>}
          <button
            className="boton boton-primario"
            style={{ justifyContent:'center', width:'100%' }}
            onClick={handleGuardar}
            disabled={guardar.isPending}
          >
            <Save size={14}/> {guardar.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* ── Mapa ────────────────────────────────────────────────────────────── */}
      <div style={{ flex:1, position:'relative', minWidth:0, display:'flex', flexDirection:'column', zIndex: dibujando ? 999 : 1 }}>
        <div ref={mapDivRef} style={{ width:'100%', height:'100%' }}/>
        {dibujando && (
          <MapaDibujoRuta
            onFinish={(puntos) => {
              setPuntosRuta(puntos);
              setDibujando(false);
            }}
          />
        )}

        {/* Spinner mientras carga el mapa */}
        {!mapListo && !dibujando && (
          <div style={{ position:'absolute', inset:0, zIndex:999, background:'#0d0d0f', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1rem' }}>
            <div style={{ width:36, height:36, border:'3px solid #3d3a39', borderTopColor:'#00d992', borderRadius:'50%', animation:'girar 0.8s linear infinite' }}/>
            <p style={{ color:'#8b949e', fontSize:'0.875rem' }}>Cargando mapa...</p>
          </div>
        )}


        {/* Leyenda */}
        {mapListo && grabActual && (
          <div style={{ position:'absolute', bottom:16, right:16, zIndex:1000, background:'rgba(16,16,16,0.92)', border:'1px solid #3d3a39', borderRadius:8, padding:'0.625rem 0.875rem', fontSize:'0.75rem', color:'#8b949e', lineHeight:1.8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <div style={{ width:10, height:10, background: ruta.line?.color ?? '#00d992', borderRadius:'50%', border:'2px solid #fff' }}/> Inicio
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <div style={{ width:10, height:10, background:'#fb565b', borderRadius:'50%', border:'2px solid #fff' }}/> Fin
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <div style={{ width:24, height:3, background: ruta.line?.color ?? '#00d992', borderRadius:2 }}/> Ruta simplificada
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <div style={{ width:24, height:3, background:'#555', borderRadius:2 }}/> Ruta original
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes girar { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
