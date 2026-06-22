'use client';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Route, FileCheck, Ruler, Clock, Hash, Pen } from 'lucide-react';
import { rutasServicio }       from '../../../../services/rutas.servicio';
import { lineasServicio }      from '../../../../services/lineas.servicio';
import { grabacionesServicio } from '../../../../services/grabaciones.servicio';
import { useUsuarioAlmacen }   from '../../../../almacen/usuario.almacen';
import { MapaDibujoRuta }      from '../../../../components/MapaDibujoRuta';

const dirLabel: Record<string,string>    = { OUTBOUND:'IDA →', INBOUND:'← VUELTA', CIRCULAR:'↻ CIRCULAR' };
const grabEstLabel: Record<string,string> = { PENDING:'Pendiente', APPROVED:'Aprobada', REJECTED:'Rechazada' };
const grabEstColor: Record<string,string> = { PENDING:'#f5a623', APPROVED:'#00d992', REJECTED:'#fb565b' };
const grabMetLabel: Record<string,string> = { ADMIN_DRAW:'Admin', DRIVER_GPS:'GPS Chofer', KML_IMPORT:'KML/GeoJSON' };

type GeoJsonLine = { type: string; coordinates: [number, number][] };
type Grabacion   = { id: string; status: string; method: string; direction?: string; recordedPoints?: GeoJsonLine; simplifiedPoints?: GeoJsonLine };
type Linea       = { id: string|number; name: string; code: string; color: string; syndicateId?: string|number };

function validar(nombre: string, lineaId: string): string | null {
  if (!nombre.trim()) return 'El nombre de la ruta es obligatorio.';
  if (!lineaId)       return 'Debes seleccionar una línea.';
  return null;
}

export default function PaginaNuevaRuta() {
  const router = useRouter();
  const qc     = useQueryClient();
  const { usuario } = useUsuarioAlmacen();
  const sindicatoId = usuario?.sindicatoId ? String(usuario.sindicatoId) : '';

  const [nombre,      setNombre]      = useState('');
  const [lineaId,     setLineaId]     = useState('');
  const [direccion,   setDireccion]   = useState('OUTBOUND');
  const [distanciaKm, setDistanciaKm] = useState('');
  const [tiempoMin,   setTiempoMin]   = useState('');
  const [descansoMin, setDescansoMin] = useState('0');
  const [grabacionId, setGrabacionId] = useState('');
  const [error,       setError]       = useState('');
  const [dibujando,   setDibujando]   = useState(false);
  const [puntosRuta,  setPuntosRuta]  = useState<{lat:number; lng:number}[]>([]);

  // Mapa
  const mapDivRef   = useRef<HTMLDivElement>(null);
  const mapRef      = useRef<import('leaflet').Map | null>(null);
  const initRef     = useRef(false);
  const polyRef     = useRef<import('leaflet').Polyline | null>(null);
  const polySimpRef = useRef<import('leaflet').Polyline | null>(null);
  const [mapListo,   setMapListo]    = useState(false);


  // Línea seleccionada para mostrar color
  const { data: lineas = [] } = useQuery<Linea[]>({
    queryKey: ['lineas', sindicatoId],
    queryFn:  () => lineasServicio.obtenerTodas(sindicatoId ? { sindicatoId } : undefined),
  });
  const lineaSel = (lineas as Linea[]).find(l => String(l.id) === lineaId);

  // Grabaciones aprobadas de la línea elegida
  const { data: grabaciones = [] } = useQuery<Grabacion[]>({
    queryKey: ['grab-disp-nueva', lineaId],
    queryFn:  () => grabacionesServicio.obtenerTodas({ lineaId, estado: 'APPROVED' }),
    enabled:  !!lineaId,
  });

  // Mutation crear
  const crear = useMutation({
    mutationFn: () => rutasServicio.crear({
      lineaId:           parseInt(lineaId),
      nombre,
      direccion,
      distanciaKm:       distanciaKm ? parseFloat(distanciaKm) : undefined,
      tiempoEstimadoMin: tiempoMin ? parseInt(tiempoMin) : undefined,
      tiempoDescansoMin: descansoMin ? parseInt(descansoMin) : 0,
      puntosRuta:        puntosRuta.length > 0 ? puntosRuta : undefined,
      rutaGrabadaId:     grabacionId ? parseInt(grabacionId) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rutas'] });
      router.push('/rutas');
    },
    onError: () => setError('Error al crear la ruta. Intenta de nuevo.'),
  });

  const handleGuardar = () => {
    const err = validar(nombre, lineaId);
    if (err) { setError(err); return; }
    setError('');
    crear.mutate();
  };

  // ── Inicializar mapa solo si no está dibujando ────────────────────────
  useEffect(() => {
    if (dibujando) return;
    if (typeof window === 'undefined' || !mapDivRef.current) return;
    if (mapRef.current) return;

    const container = mapDivRef.current;

    import('leaflet').then(L => {
      if (!container.isConnected || mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((container as any)._leaflet_id) delete (container as any)._leaflet_id;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const map = L.map(container, {
        center: [-17.783, -63.182], zoom: 13,
        zoomAnimation: false, markerZoomAnimation: false, fadeAnimation: false,
        scrollWheelZoom: true, doubleClickZoom: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      setTimeout(() => {
        map.invalidateSize();
        setMapListo(true);
      }, 100);
    });

    return () => {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch { /**/ }
        mapRef.current = null;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (container) delete (container as any)._leaflet_id;
      setMapListo(false);
      initRef.current = false;
    };
  }, [dibujando]);

  // ── Dibujar ruta dibujada manualmente ─────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (dibujando || !map || !mapListo) return;

    // Limpiar línea dibujada anterior
    polyRef.current?.remove();
    polyRef.current = null;
    map.eachLayer(l => { if ((l as any).getLatLng && (l as any).__customMarker) l.remove(); });

    if (puntosRuta.length > 0) {
      import('leaflet').then(L => {
        if (!mapRef.current || dibujando) return;
        const latlngs = puntosRuta.map(p => [p.lat, p.lng] as [number, number]);
        const color = lineaSel?.color ?? '#00d992';

        // Dibujar línea
        polyRef.current = L.polyline(latlngs, { color, weight: 5, opacity: 0.9 }).addTo(map);

        // Marcadores inicio y fin
        const mkStart = L.divIcon({ html: `<div style="width:14px;height:14px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px ${color}80"></div>`, iconSize: [14, 14], iconAnchor: [7, 7], className: '' });
        const mkEnd = L.divIcon({ html: `<div style="width:14px;height:14px;background:#fb565b;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(251,86,91,0.7)"></div>`, iconSize: [14, 14], iconAnchor: [7, 7], className: '' });
        const m1 = L.marker(latlngs[0], { icon: mkStart }).bindTooltip('Inicio (Dibujado)', { permanent: false, direction: 'top' }).addTo(map);
        const m2 = L.marker(latlngs[latlngs.length - 1], { icon: mkEnd }).bindTooltip('Fin (Dibujado)', { permanent: false, direction: 'top' }).addTo(map);
        (m1 as any).__customMarker = true;
        (m2 as any).__customMarker = true;

        // Ajustar vista
        map.fitBounds(L.latLngBounds(latlngs), { padding: [24, 24] });
      });
    }
  }, [puntosRuta, mapListo, dibujando, lineaSel?.color]);

  // ── Dibujar grabación seleccionada en el mapa ────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (dibujando || !map || !mapListo) return;

    polyRef.current?.remove();     polyRef.current     = null;
    polySimpRef.current?.remove(); polySimpRef.current = null;
    // Solo limpiar marcadores que NO sean custom (los de grabación)
    map.eachLayer(l => { if ((l as any).getLatLng && !(l as any).__customMarker) l.remove(); });

    const grab = (grabaciones as Grabacion[]).find(g => String(g.id) === grabacionId);
    if (!grab?.recordedPoints?.coordinates?.length) return;

    import('leaflet').then(L => {
      if (!mapRef.current) return;
      const pts     = grab.recordedPoints!.coordinates;
      const latlngs = pts.map(([lng, lat]) => [lat, lng] as [number, number]);
      const color   = lineaSel?.color ?? '#00d992';

      polyRef.current = L.polyline(latlngs, { color:'#555', weight:4, opacity:0.35 }).addTo(map);

      const simpPts = grab.simplifiedPoints?.coordinates;
      const mainPts = simpPts?.length ? simpPts.map(([lng,lat]) => [lat,lng] as [number,number]) : latlngs;
      polySimpRef.current = L.polyline(mainPts, { color, weight:5, opacity:0.9 }).addTo(map);

      const mkStart = L.divIcon({ html:`<div style="width:14px;height:14px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px ${color}80"></div>`, iconSize:[14,14], iconAnchor:[7,7], className:'' });
      const mkEnd   = L.divIcon({ html:`<div style="width:14px;height:14px;background:#fb565b;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(251,86,91,0.7)"></div>`, iconSize:[14,14], iconAnchor:[7,7], className:'' });
      L.marker(latlngs[0], { icon: mkStart }).bindTooltip('Inicio', { permanent:false, direction:'top' }).addTo(map);
      L.marker(latlngs[latlngs.length-1], { icon: mkEnd }).bindTooltip('Fin', { permanent:false, direction:'top' }).addTo(map);

      map.fitBounds(L.latLngBounds(latlngs), { padding:[24,24] });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grabacionId, grabaciones, mapListo, lineaSel?.color]);

  const grabSel = (grabaciones as Grabacion[]).find(g => String(g.id) === grabacionId);

  return (
    <div style={{ position:'fixed', top:0, left:220, right:0, bottom:0, display:'flex', background:'#050507', zIndex:10 }}>

      {/* ── Panel lateral ──────────────────────────────────────────────────── */}
      <div style={{ width:340, flexShrink:0, background:'#101010', borderRight:'1px solid #3d3a39', display:'flex', flexDirection:'column', overflow:'hidden', zIndex: dibujando ? 1000 : 10 }}>

        {/* Cabecera */}
        <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid #3d3a39', display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <button className="boton boton-secundario" style={{ padding:'0.35rem 0.6rem', flexShrink:0 }} onClick={()=>router.push('/rutas')}>
            <ArrowLeft size={14}/>
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <Route size={15} color="#00d992"/>
            <span style={{ fontWeight:800, fontSize:'0.95rem', color:'#f2f2f2' }}>Nueva Ruta</span>
          </div>
        </div>

        {/* Formulario */}
        <div style={{ flex:1, overflowY:'auto', padding:'1.25rem', display:'flex', flexDirection:'column', gap:'1rem' }}>

          {/* Línea */}
          <div>
            <label style={{ fontSize:'0.8rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.3rem' }}>
              Línea <span style={{ color:'#fb565b' }}>*</span>
            </label>
            <select
              className="campo-entrada"
              value={lineaId}
              onChange={e=>{ setLineaId(e.target.value); setGrabacionId(''); setError(''); }}
            >
              <option value="">— Seleccionar línea —</option>
              {(lineas as Linea[]).map(l=>(
                <option key={String(l.id)} value={String(l.id)}>{l.code} – {l.name}</option>
              ))}
            </select>
          </div>

          {/* Nombre */}
          <div>
            <label style={{ fontSize:'0.8rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.3rem' }}>
              Nombre <span style={{ color:'#fb565b' }}>*</span>
            </label>
            <input className="campo-entrada" placeholder="Ej: L2 IDA Centro" value={nombre} onChange={e=>{ setNombre(e.target.value); setError(''); }}/>
          </div>

          {/* Dirección */}
          <div>
            <label style={{ fontSize:'0.8rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.3rem' }}>Dirección</label>
            <select className="campo-entrada" value={direccion} onChange={e=>setDireccion(e.target.value)}>
              {Object.entries(dirLabel).map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {/* Métricas */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
            <div>
              <label style={{ fontSize:'0.8rem', fontWeight:600, color:'#b8b3b0', display:'flex', alignItems:'center', gap:'0.3rem', marginBottom:'0.3rem' }}><Ruler size={12}/> Distancia (km)</label>
              <input type="number" className="campo-entrada" placeholder="Auto" value={distanciaKm} onChange={e=>setDistanciaKm(e.target.value)}/>
            </div>
            <div>
              <label style={{ fontSize:'0.8rem', fontWeight:600, color:'#b8b3b0', display:'flex', alignItems:'center', gap:'0.3rem', marginBottom:'0.3rem' }}><Clock size={12}/> Tiempo (min)</label>
              <input type="number" className="campo-entrada" placeholder="Auto" value={tiempoMin} onChange={e=>setTiempoMin(e.target.value)}/>
            </div>
            <div style={{ gridColumn:'span 2' }}>
              <label style={{ fontSize:'0.8rem', fontWeight:600, color:'#b8b3b0', display:'flex', alignItems:'center', gap:'0.3rem', marginBottom:'0.3rem' }}><Clock size={12}/> Descanso (min)</label>
              <input type="number" className="campo-entrada" value={descansoMin} onChange={e=>setDescansoMin(e.target.value)}/>
            </div>
          </div>

          {/* Grabación vinculada o dibujo manual */}
          <div style={{ borderTop:'1px solid #3d3a39', paddingTop:'1rem' }}>
            <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.75rem' }}>
              <button
                className={dibujando ? 'boton boton-secundario' : 'boton boton-primario'}
                style={{ flex:1, fontSize:'0.75rem', padding:'0.4rem' }}
                onClick={() => setDibujando(false)}
              >
                <FileCheck size={13}/> Usar grabación
              </button>
              <button
                className={dibujando ? 'boton boton-primario' : 'boton boton-secundario'}
                style={{ flex:1, fontSize:'0.75rem', padding:'0.4rem' }}
                onClick={() => setDibujando(true)}
              >
                <Pen size={13}/> Dibujar ruta
              </button>
            </div>

            {!dibujando ? (
              <>
                {puntosRuta.length > 0 && (
                  <div style={{ background:'rgba(0,217,146,0.08)', border:'1px solid rgba(0,217,146,0.2)', borderRadius:8, padding:'0.625rem 0.75rem', display:'flex', flexDirection:'column', gap:'0.375rem', marginBottom:'0.75rem' }}>
                    <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>
                      <span style={{ fontSize:'0.75rem', fontWeight:700, color:'#00d992' }}>✓ Dibujo Manual</span>
                      <span style={{ fontSize:'0.72rem', padding:'0.15rem 0.45rem', borderRadius:4, background:'rgba(0,217,146,0.15)', color:'#00d992', border:'1px solid rgba(0,217,146,0.3)', fontWeight:700 }}>
                        {puntosRuta.length} puntos
                      </span>
                    </div>
                    <p style={{ fontSize:'0.72rem', color:'#8b949e', margin:0 }}>La ruta se mostrará en el mapa →</p>
                    <button className="boton boton-secundario" style={{ width:'100%', marginTop:'0.5rem', fontSize:'0.7rem', padding:'0.3rem' }} onClick={() => setPuntosRuta([])}>
                      Descartar y dibujar de nuevo
                    </button>
                  </div>
                )}

                <label style={{ fontSize:'0.8rem', fontWeight:600, color:'#b8b3b0', display:'flex', alignItems:'center', gap:'0.375rem', marginBottom:'0.5rem' }}>
                  <FileCheck size={13} color="#00d992"/> Grabación GPS a vincular
                </label>
                <select
                  className="campo-entrada"
                  value={grabacionId}
                  onChange={e=>setGrabacionId(e.target.value)}
                  disabled={!lineaId}
                  style={{ opacity: lineaId ? 1 : 0.5, marginBottom:'0.5rem' }}
                >
                  <option value="">— Sin grabación (opcional) —</option>
                  {(grabaciones as Grabacion[]).map(g=>(
                    <option key={g.id} value={g.id}>
                      {grabMetLabel[g.method]||g.method} — {dirLabel[g.direction||'']||g.direction} (ID {g.id})
                    </option>
                  ))}
                </select>
                {!lineaId && <p style={{ fontSize:'0.72rem', color:'#8b949e' }}>Selecciona una línea primero</p>}
                {lineaId && grabaciones.length === 0 && (
                  <p style={{ fontSize:'0.72rem', color:'#8b949e' }}>No hay grabaciones aprobadas para esta línea</p>
                )}

                {grabSel && (
                  <div style={{ background:'rgba(61,58,57,0.4)', borderRadius:8, padding:'0.625rem 0.75rem', display:'flex', flexDirection:'column', gap:'0.375rem' }}>
                    <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>
                      <span style={{ fontSize:'0.75rem', fontWeight:700, color:'#b8b3b0' }}>{grabMetLabel[grabSel.method]||grabSel.method}</span>
                      <span style={{ fontSize:'0.72rem', padding:'0.15rem 0.45rem', borderRadius:4, background:`${grabEstColor[grabSel.status]}20`, color:grabEstColor[grabSel.status], border:`1px solid ${grabEstColor[grabSel.status]}40`, fontWeight:700 }}>
                        {grabEstLabel[grabSel.status]||grabSel.status}
                      </span>
                    </div>
                    {grabSel.recordedPoints?.coordinates?.length && (
                      <span style={{ fontSize:'0.72rem', color:'#00d992', display:'flex', alignItems:'center', gap:'0.25rem' }}>
                        <Hash size={10}/> {grabSel.recordedPoints.coordinates.length.toLocaleString()} puntos GPS
                      </span>
                    )}
                    <p style={{ fontSize:'0.72rem', color:'#8b949e' }}>La ruta se mostrará en el mapa →</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {puntosRuta.length > 0 && (
                  <div style={{ padding:'0.5rem 0.75rem', borderRadius:8, background:'rgba(0,217,146,0.08)', border:'1px solid rgba(0,217,146,0.2)', fontSize:'0.72rem', color:'#00d992' }}>
                    ✓ Ruta dibujada con {puntosRuta.length} puntos
                    <button className="boton boton-secundario" style={{ width:'100%', marginTop:'0.5rem', fontSize:'0.7rem', padding:'0.3rem' }} onClick={() => setPuntosRuta([])}>
                      Dibujar de nuevo
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer guardar */}
        <div style={{ padding:'1rem 1.25rem', borderTop:'1px solid #3d3a39', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
          {error && <p style={{ fontSize:'0.78rem', color:'#fb565b', fontWeight:600 }}>{error}</p>}
          <button
            className="boton boton-primario"
            style={{ justifyContent:'center', width:'100%' }}
            onClick={handleGuardar}
            disabled={crear.isPending}
          >
            <Save size={14}/> {crear.isPending ? 'Creando...' : 'Crear ruta'}
          </button>
        </div>
      </div>

      {/* ── Mapa ─────────────────────────────────────────────────────────── */}
      <div style={{ flex:1, position:'relative', minWidth:0, zIndex: dibujando ? 999 : 1, display:'flex', flexDirection:'column' }}>
        <div ref={mapDivRef} style={{ width:'100%', height:'100%', display: dibujando ? 'none' : 'block' }}/>
        {dibujando && (
          <MapaDibujoRuta
            onFinish={(puntos) => {
              setPuntosRuta(puntos);
              setDibujando(false);
            }}
          />
        )}

        {/* Spinner carga - solo cuando no está dibujando */}
        {!mapListo && !dibujando && (
          <div style={{ position:'absolute', inset:0, zIndex:999, background:'#0d0d0f', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1rem' }}>
            <div style={{ width:36, height:36, border:'3px solid #3d3a39', borderTopColor:'#00d992', borderRadius:'50%', animation:'girar 0.8s linear infinite' }}/>
            <p style={{ color:'#8b949e', fontSize:'0.875rem' }}>Cargando mapa...</p>
          </div>
        )}


        {/* Leyenda */}
        {mapListo && grabSel && (
          <div style={{ position:'absolute', bottom:16, right:16, zIndex:1000, background:'rgba(16,16,16,0.92)', border:'1px solid #3d3a39', borderRadius:8, padding:'0.625rem 0.875rem', fontSize:'0.75rem', color:'#8b949e', lineHeight:1.8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <div style={{ width:10, height:10, background: lineaSel?.color ?? '#00d992', borderRadius:'50%', border:'2px solid #fff' }}/> Inicio
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <div style={{ width:10, height:10, background:'#fb565b', borderRadius:'50%', border:'2px solid #fff' }}/> Fin
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <div style={{ width:24, height:3, background: lineaSel?.color ?? '#00d992', borderRadius:2 }}/> Ruta simplificada
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
