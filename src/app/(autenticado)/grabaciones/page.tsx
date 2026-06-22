'use client';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Search, FileCheck, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Eye, MapPin, Plus, X,
  Ruler, Clock, Hash,
} from 'lucide-react';
import { grabacionesServicio } from '../../../services/grabaciones.servicio';
import { lineasServicio } from '../../../services/lineas.servicio';
import { rutasServicio } from '../../../services/rutas.servicio';
import { Modal } from '../../../components/dashboard/Modal';
import { Cargando } from '../../../components/dashboard/Cargando';
import { useUsuarioAlmacen } from '../../../almacen/usuario.almacen';
import { RolUsuario } from '../../../types';

// ── Constantes ───────────────────────────────────────────────────────────────
const estadoColor: Record<string,string> = { PENDING:'insignia-advertencia', APPROVED:'insignia-exito', REJECTED:'insignia-peligro' };
const estadoLabel: Record<string,string> = { PENDING:'Pendiente', APPROVED:'Aprobada', REJECTED:'Rechazada' };
const metodoLabel: Record<string,string>  = { ADMIN_DRAW:'Admin (dibujo)', DRIVER_GPS:'GPS Chofer', KML_IMPORT:'KML/GeoJSON' };
const dirLabel: Record<string,string>     = { OUTBOUND:'IDA →', INBOUND:'← VUELTA', CIRCULAR:'↻ CIRCULAR' };
const dirColor: Record<string,string>     = { OUTBOUND:'insignia-exito', INBOUND:'insignia-info', CIRCULAR:'insignia-advertencia' };

type GeoJsonLine = { type: string; coordinates: [number, number][] };
type Grabacion = {
  id: string;
  lineId: string | number;
  driverId?: string | number;
  approvedById?: string | number;
  method: string;
  direction: string;
  pointCount: number;
  durationMinutes?: number;
  distanceKm?: number | string;
  status: string;
  reviewNotes?: string;
  approvedAt?: string;
  createdAt?: string;
  recordedPoints?:    GeoJsonLine;
  simplifiedPoints?:  GeoJsonLine;
  line?:       { id: string|number; name: string; code: string };
  driver?:     { user?: { id: string|number; name: string } };
  approvedBy?: { id: string|number; name: string };
};
type FormRevisar = { estado: string; notasRevision: string };

const POR_PAGINA = 10;

// ── Validaciones ─────────────────────────────────────────────────────────────
function validarRevision(form: FormRevisar): string | null {
  if (!form.estado) return 'Debes seleccionar un estado.';
  if (form.estado === 'REJECTED' && !form.notasRevision.trim())
    return 'Al rechazar debes indicar el motivo en las notas.';
  return null;
}

export default function PaginaGrabaciones() {
  const router = useRouter();
  const { usuario } = useUsuarioAlmacen();
  const esSuperAdmin    = usuario?.rol === RolUsuario.SUPERADMIN;
  const sindicatoIdUsuario = usuario?.sindicatoId ? String(usuario.sindicatoId) : '';
  const puedeRevisar    = esSuperAdmin || usuario?.rol === RolUsuario.ADMIN_SINDICATO;

  const qc = useQueryClient();
  const [busqueda,      setBusqueda]      = useState('');
  const [filtroEstado,  setFiltroEstado]  = useState('');
  const [filtroLinea,   setFiltroLinea]   = useState('');
  const [filtroMetodo,  setFiltroMetodo]  = useState('');
  const [pagina,        setPagina]        = useState(1);
  const [modal,         setModal]         = useState<'revisar'|'ver'|null>(null);
  const [sel,           setSel]           = useState<Grabacion | null>(null);
  const [detalle,       setDetalle]       = useState<Grabacion | null>(null);
  const [cargandoDet,   setCargandoDet]   = useState(false);
  const [formRevisar,   setFormRevisar]   = useState<FormRevisar>({ estado:'APPROVED', notasRevision:'' });
  const [error,         setError]         = useState('');

  // Queries
  const { data: grabaciones = [], isLoading } = useQuery<Grabacion[]>({
    queryKey: ['grabaciones', filtroLinea, filtroEstado],
    queryFn:  () => grabacionesServicio.obtenerTodas({
      ...(filtroLinea  ? { lineaId: filtroLinea }   : {}),
      ...(filtroEstado ? { estado:  filtroEstado }  : {}),
    }),
  });
  const { data: lineas = [] } = useQuery<{ id:string|number; name:string; code:string; syndicateId?:string|number }[]>({
    queryKey: ['lineas', sindicatoIdUsuario],
    queryFn:  () => lineasServicio.obtenerTodas(sindicatoIdUsuario ? { sindicatoId: sindicatoIdUsuario } : undefined),
  });

  // Mutation revisar
  const revisar = useMutation({
    mutationFn: () => grabacionesServicio.revisar(sel!.id, {
      estado: formRevisar.estado,
      aprobadoPorId: Number(usuario?.id),
      notasRevision: formRevisar.notasRevision || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['grabaciones']}); setModal(null); setError(''); },
    onError:   () => setError('Error al guardar la revisión. Intenta de nuevo.'),
  });

  // Handlers
  const abrirRevisar = (g: Grabacion) => {
    setSel(g);
    setFormRevisar({ estado: g.status === 'PENDING' ? 'APPROVED' : g.status, notasRevision: g.reviewNotes || '' });
    setError('');
    setModal('revisar');
  };
  const abrirVer = async (g: Grabacion) => {
    setSel(g);
    setDetalle(null);
    setModal('ver');
    setCargandoDet(true);
    try {
      const full = await grabacionesServicio.obtenerPorId(g.id);
      setDetalle(full);
    } finally {
      setCargandoDet(false);
    }
  };

  const handleRevisar = () => {
    const err = validarRevision(formRevisar);
    if (err) { setError(err); return; }
    setError('');
    revisar.mutate();
  };

  // Filtrado local (texto + método)
  const filtradas = grabaciones.filter((g) => {
    const texto = busqueda.toLowerCase();
    const coincideTexto  = !busqueda
      || g.line?.name?.toLowerCase().includes(texto)
      || g.line?.code?.toLowerCase().includes(texto)
      || g.driver?.user?.name?.toLowerCase().includes(texto);
    const coincideMetodo = !filtroMetodo || g.method === filtroMetodo;
    return coincideTexto && coincideMetodo;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles     = filtradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);
  const cambiarFiltro = (fn: () => void) => { fn(); setPagina(1); };

  return (
    <div style={{ padding:'2rem' }}>
      {/* Encabezado */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontWeight:800, fontSize:'1.625rem', color:'#f2f2f2', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <FileCheck size={22} color="#00d992"/> Rutas Grabadas
          </h1>
          <p style={{ color:'#8b949e', fontSize:'0.875rem' }}>{filtradas.length} grabaciones encontradas</p>
        </div>
        {puedeRevisar && (
          <button className="boton boton-primario" onClick={()=>router.push('/grabaciones/nueva')}>
            <Plus size={15}/> Nueva grabación
          </button>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', marginBottom:'1.25rem' }}>
        <div style={{ position:'relative', flex:'1 1 200px', minWidth:0 }}>
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#8b949e' }}/>
          <input className="campo-entrada" style={{ paddingLeft:'2.5rem' }} placeholder="Línea, código, conductor..." value={busqueda} onChange={(e)=>cambiarFiltro(()=>setBusqueda(e.target.value))}/>
        </div>
        <select className="campo-entrada" style={{ flex:'0 1 160px' }} value={filtroEstado} onChange={(e)=>cambiarFiltro(()=>setFiltroEstado(e.target.value))}>
          <option value="">Todos los estados</option>
          {Object.entries(estadoLabel).map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
        <select className="campo-entrada" style={{ flex:'0 1 170px' }} value={filtroMetodo} onChange={(e)=>cambiarFiltro(()=>setFiltroMetodo(e.target.value))}>
          <option value="">Todos los métodos</option>
          {Object.entries(metodoLabel).map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
        <select className="campo-entrada" style={{ flex:'0 1 200px' }} value={filtroLinea} onChange={(e)=>cambiarFiltro(()=>setFiltroLinea(e.target.value))}>
          <option value="">Todas las líneas</option>
          {lineas.map(l=><option key={String(l.id)} value={String(l.id)}>{l.code} – {l.name}</option>)}
        </select>
      </div>

      {isLoading ? <Cargando/> : (
        <>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #3d3a39' }}>
                  {['Línea','Dirección','Método','Chofer','Puntos','Dist. km','Duración','Estado','Revisado por','Acciones'].map(h=>(
                    <th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', fontSize:'0.75rem', fontWeight:700, color:'#8b949e', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibles.map((g) => (
                  <tr key={g.id} style={{ borderBottom:'1px solid rgba(61,58,57,0.5)' }}>
                    <td style={{ padding:'0.875rem 1rem' }}>
                      <p style={{ fontWeight:600, color:'#f2f2f2', fontSize:'0.875rem' }}>{g.line?.code || '—'}</p>
                      <p style={{ color:'#8b949e', fontSize:'0.72rem' }}>{g.line?.name}</p>
                    </td>
                    <td style={{ padding:'0.875rem 1rem' }}>
                      <span className={`insignia ${dirColor[g.direction]||'insignia-info'}`}>{dirLabel[g.direction]||g.direction}</span>
                    </td>
                    <td style={{ padding:'0.875rem 1rem', color:'#8b949e', fontSize:'0.8rem' }}>{metodoLabel[g.method]||g.method}</td>
                    <td style={{ padding:'0.875rem 1rem', color:'#b8b3b0', fontSize:'0.8rem' }}>{g.driver?.user?.name || '—'}</td>
                    <td style={{ padding:'0.875rem 1rem', color:'#f2f2f2', fontWeight:600 }}>{g.pointCount.toLocaleString()}</td>
                    <td style={{ padding:'0.875rem 1rem', color:'#8b949e' }}>{g.distanceKm ? `${g.distanceKm} km` : '—'}</td>
                    <td style={{ padding:'0.875rem 1rem', color:'#8b949e' }}>{g.durationMinutes ? `${g.durationMinutes} min` : '—'}</td>
                    <td style={{ padding:'0.875rem 1rem' }}>
                      <span className={`insignia ${estadoColor[g.status]||'insignia-info'}`}>{estadoLabel[g.status]||g.status}</span>
                    </td>
                    <td style={{ padding:'0.875rem 1rem', color:'#8b949e', fontSize:'0.8rem' }}>{g.approvedBy?.name || '—'}</td>
                    <td style={{ padding:'0.875rem 1rem' }}>
                      <div style={{ display:'flex', gap:'0.375rem' }}>
                        <button className="boton boton-secundario" style={{ padding:'0.375rem 0.625rem', fontSize:'0.75rem' }} onClick={()=>abrirVer(g)} title="Ver detalle"><Eye size={12}/></button>
                        {puedeRevisar && (
                          <button
                            className="boton"
                            style={{ padding:'0.375rem 0.625rem', fontSize:'0.72rem', background:'rgba(0,217,146,0.1)', color:'#00d992', border:'1px solid rgba(0,217,146,0.2)', display:'flex', alignItems:'center', gap:'0.25rem' }}
                            onClick={()=>abrirRevisar(g)}
                            title="Revisar grabación"
                          >
                            <FileCheck size={12}/> Revisar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr><td colSpan={10} style={{ padding:'2rem', textAlign:'center', color:'#8b949e' }}>Sin grabaciones encontradas</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'1rem', color:'#8b949e', fontSize:'0.8rem' }}>
            <span>Mostrando {filtradas.length===0?0:Math.min((paginaActual-1)*POR_PAGINA+1,filtradas.length)}–{Math.min(paginaActual*POR_PAGINA,filtradas.length)} de {filtradas.length}</span>
            <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
              <button className="boton boton-secundario" style={{ padding:'0.375rem 0.625rem' }} onClick={()=>setPagina(p=>Math.max(1,p-1))} disabled={paginaActual===1}><ChevronLeft size={14}/></button>
              <span style={{ color:'#f2f2f2', fontWeight:600 }}>Pág. {paginaActual} / {totalPaginas}</span>
              <button className="boton boton-secundario" style={{ padding:'0.375rem 0.625rem' }} onClick={()=>setPagina(p=>Math.min(totalPaginas,p+1))} disabled={paginaActual===totalPaginas}><ChevronRight size={14}/></button>
            </div>
          </div>
        </>
      )}

      {/* ── Overlay VER con mapa ── */}
      {modal==='ver' && sel && (
        <MapaGrabacion
          grabacion={detalle ?? sel}
          cargando={cargandoDet}
          onCerrar={()=>setModal(null)}
          onRevisar={puedeRevisar ? ()=>{ setModal(null); setTimeout(()=>abrirRevisar(sel),50); } : undefined}
        />
      )}

      {/* ── Modal REVISAR ── */}
      {modal==='revisar' && sel && (
        <Modal titulo="Revisar Grabación" onCerrar={()=>{ setModal(null); setError(''); }} ancho={440}>
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

            {/* Info resumida */}
            <div style={{ background:'rgba(61,58,57,0.3)', borderRadius:8, padding:'0.75rem', display:'flex', gap:'0.75rem', alignItems:'center' }}>
              <MapPin size={16} color="#00d992"/>
              <div>
                <p style={{ fontSize:'0.8rem', fontWeight:600, color:'#f2f2f2' }}>{sel.line?.code} – {sel.line?.name}</p>
                <p style={{ fontSize:'0.75rem', color:'#8b949e' }}>{dirLabel[sel.direction]} · {metodoLabel[sel.method]} · {sel.pointCount.toLocaleString()} pts</p>
              </div>
              <span className={`insignia ${estadoColor[sel.status]||'insignia-info'}`} style={{ marginLeft:'auto' }}>{estadoLabel[sel.status]}</span>
            </div>

            {/* Decisión */}
            <div>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.5rem' }}>Decisión <span style={{ color:'#fb565b' }}>*</span></label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.5rem' }}>
                {(['APPROVED','REJECTED','PENDING'] as const).map(v=>{
                  const activo = formRevisar.estado === v;
                  const color  = v==='APPROVED' ? '#00d992' : v==='REJECTED' ? '#fb565b' : '#f5a623';
                  const bg     = v==='APPROVED' ? 'rgba(0,217,146,0.12)' : v==='REJECTED' ? 'rgba(251,86,91,0.12)' : 'rgba(245,166,35,0.12)';
                  return (
                    <button key={v} type="button" onClick={()=>{ setFormRevisar(f=>({...f,estado:v})); setError(''); }}
                      style={{ padding:'0.625rem', borderRadius:8, border:`2px solid ${activo?color:'#3d3a39'}`, background:activo?bg:'rgba(61,58,57,0.25)', color:activo?color:'#8b949e', fontWeight:700, fontSize:'0.78rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.3rem', transition:'all 0.15s' }}>
                      {v==='APPROVED' && <CheckCircle size={13}/>}
                      {v==='REJECTED' && <XCircle    size={13}/>}
                      {v==='PENDING'  && <FileCheck   size={13}/>}
                      {estadoLabel[v]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notas */}
            <div>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>
                Notas de revisión {formRevisar.estado==='REJECTED' && <span style={{ color:'#fb565b' }}>*</span>}
              </label>
              <textarea
                className="campo-entrada"
                rows={3}
                placeholder={formRevisar.estado==='REJECTED' ? 'Obligatorio al rechazar — indica el motivo' : 'Opcional...'}
                value={formRevisar.notasRevision}
                onChange={(e)=>{ setFormRevisar(f=>({...f,notasRevision:e.target.value})); setError(''); }}
                style={{ resize:'vertical' }}
              />
            </div>

            {/* Error de validación */}
            {error && (
              <div style={{ background:'rgba(251,86,91,0.1)', border:'1px solid rgba(251,86,91,0.3)', borderRadius:7, padding:'0.625rem 0.875rem' }}>
                <p style={{ fontSize:'0.8rem', color:'#fb565b' }}>{error}</p>
              </div>
            )}

            <button className="boton boton-primario" style={{ justifyContent:'center' }} onClick={handleRevisar} disabled={revisar.isPending}>
              {revisar.isPending ? 'Guardando...' : 'Guardar revisión'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Componente mapa de grabación ──────────────────────────────────────────────
const estadoColorMap: Record<string,string> = { PENDING:'#f5a623', APPROVED:'#00d992', REJECTED:'#fb565b' };
const estadoLabelMap: Record<string,string> = { PENDING:'Pendiente', APPROVED:'Aprobada', REJECTED:'Rechazada' };
const dirLabelMap: Record<string,string>    = { OUTBOUND:'IDA →', INBOUND:'← VUELTA', CIRCULAR:'↻ CIRCULAR' };

function MapaGrabacion({
  grabacion, cargando, onCerrar, onRevisar,
}: {
  grabacion: Grabacion;
  cargando: boolean;
  onCerrar: () => void;
  onRevisar?: () => void;
}) {
  const qcMap = useQueryClient();
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef    = useRef<import('leaflet').Map | null>(null);
  const initRef   = useRef(false);
  const [rutaVincId, setRutaVincId] = useState('');
  const [msgVinc, setMsgVinc] = useState('');

  // Rutas disponibles para la misma línea
  const { data: rutasLinea = [] } = useQuery<{ id:string|number; name:string; direction:string; routeRecordingId?:string|number }[]>({
    queryKey: ['rutas-linea-grab', grabacion.lineId],
    queryFn: () => rutasServicio.obtenerTodas({ lineaId: String(grabacion.lineId) }),
    enabled: !!grabacion.lineId,
  });

  const vincular = useMutation({
    mutationFn: () => rutasServicio.actualizar(String(rutaVincId), { rutaGrabadaId: parseInt(grabacion.id) }),
    onSuccess: () => {
      setMsgVinc('✓ Ruta vinculada correctamente');
      qcMap.invalidateQueries({ queryKey: ['rutas'] });
      qcMap.invalidateQueries({ queryKey: ['grabaciones'] });
      setTimeout(() => setMsgVinc(''), 3000);
    },
    onError: () => setMsgVinc('Error al vincular. Intenta de nuevo.'),
  });

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
        zoomControl: true,
        center: [-17.783, -63.182],
        zoom: 13,
        zoomAnimation: false,
        markerZoomAnimation: false,
        fadeAnimation: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      requestAnimationFrame(() => { requestAnimationFrame(() => { map.invalidateSize(); }); });

      // Dibujar ruta si hay recordedPoints
      const pts = grabacion.recordedPoints?.coordinates;
      if (pts && pts.length > 0) {
        const latlngs = pts.map(([lng, lat]) => [lat, lng] as [number, number]);

        // Polyline de la ruta completa (gris tenue)
        L.polyline(latlngs, { color: '#555', weight: 4, opacity: 0.35 }).addTo(map);

        // Polyline simplificada (color principal)
        const simpPts = grabacion.simplifiedPoints?.coordinates;
        const mainPts = simpPts && simpPts.length > 0
          ? simpPts.map(([lng, lat]) => [lat, lng] as [number, number])
          : latlngs;
        L.polyline(mainPts, { color: '#00d992', weight: 4, opacity: 0.9 }).addTo(map);

        // Marcador inicio
        const iconInicio = L.divIcon({
          html: `<div style="width:14px;height:14px;background:#00d992;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(0,217,146,0.8)"></div>`,
          iconSize: [14, 14], iconAnchor: [7, 7], className: '',
        });
        L.marker(latlngs[0], { icon: iconInicio }).bindTooltip('Inicio', { permanent: false, direction: 'top' }).addTo(map);

        // Marcador fin
        const iconFin = L.divIcon({
          html: `<div style="width:14px;height:14px;background:#fb565b;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(251,86,91,0.8)"></div>`,
          iconSize: [14, 14], iconAnchor: [7, 7], className: '',
        });
        L.marker(latlngs[latlngs.length - 1], { icon: iconFin }).bindTooltip('Fin', { permanent: false, direction: 'top' }).addTo(map);

        // Ajustar bounds al recorrido
        map.fitBounds(L.latLngBounds(latlngs), { padding: [32, 32] });
      }

      initRef.current = false;
    });

    return () => {
      if (mapRef.current) {
        try { mapRef.current.stop(); } catch { /* ya destruido */ }
        try { mapRef.current.remove(); } catch { /* ya destruido */ }
        mapRef.current = null;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (container) delete (container as any)._leaflet_id;
      initRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grabacion.id, grabacion.recordedPoints]);

  const color = estadoColorMap[grabacion.status] || '#8b949e';

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.75)', display:'flex', flexDirection:'column' }}>

      {/* Barra superior */}
      <div style={{ background:'#101010', borderBottom:'1px solid #3d3a39', padding:'0.75rem 1.25rem', display:'flex', alignItems:'center', gap:'1rem', flexShrink:0 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.625rem', flexWrap:'wrap' }}>
            <span style={{ fontWeight:700, fontSize:'0.95rem', color:'#f2f2f2' }}>
              {grabacion.line ? `${grabacion.line.code} – ${grabacion.line.name}` : 'Grabación'}
            </span>
            <span style={{ fontSize:'0.72rem', padding:'0.2rem 0.55rem', borderRadius:5, background:`${color}20`, color, border:`1px solid ${color}50`, fontWeight:700 }}>
              {estadoLabelMap[grabacion.status] || grabacion.status}
            </span>
            <span style={{ fontSize:'0.72rem', color:'#8b949e' }}>{dirLabelMap[grabacion.direction] || grabacion.direction}</span>
          </div>
          <div style={{ display:'flex', gap:'1rem', marginTop:'0.25rem' }}>
            {[
              { icon:<Hash size={11}/>,  val:`${grabacion.pointCount.toLocaleString()} pts`,                 color:'#00d992' },
              { icon:<Ruler size={11}/>, val:grabacion.distanceKm ? `${grabacion.distanceKm} km` : '—',      color:'#4cb3d4' },
              { icon:<Clock size={11}/>, val:grabacion.durationMinutes ? `${grabacion.durationMinutes} min` : '—', color:'#f5a623' },
            ].map(({ icon, val, color: c }) => (
              <div key={val} style={{ display:'flex', alignItems:'center', gap:'0.25rem', color: c, fontSize:'0.78rem' }}>
                {icon} <span>{val}</span>
              </div>
            ))}
            {grabacion.driver?.user?.name && (
              <span style={{ fontSize:'0.75rem', color:'#8b949e' }}>Chofer: {grabacion.driver.user.name}</span>
            )}
          </div>
        </div>

        <div style={{ display:'flex', gap:'0.5rem', flexShrink:0, alignItems:'center', flexWrap:'wrap' }}>

          {/* Vincular a ruta */}
          <div style={{ display:'flex', gap:'0.375rem', alignItems:'center' }}>
            <select
              className="campo-entrada"
              style={{ fontSize:'0.78rem', padding:'0.35rem 0.6rem', minWidth:200 }}
              value={rutaVincId}
              onChange={e=>{ setRutaVincId(e.target.value); setMsgVinc(''); }}
            >
              <option value="">— Vincular a ruta —</option>
              {(rutasLinea as { id:string|number; name:string; direction:string; routeRecordingId?:string|number }[]).map(r=>(
                <option key={String(r.id)} value={String(r.id)}>
                  {r.name} {r.routeRecordingId ? '(ya vinculada)' : ''}
                </option>
              ))}
            </select>
            <button
              className="boton boton-primario"
              style={{ fontSize:'0.78rem', padding:'0.4rem 0.75rem', whiteSpace:'nowrap' }}
              onClick={()=>vincular.mutate()}
              disabled={!rutaVincId || vincular.isPending}
            >
              {vincular.isPending ? 'Vinculando...' : 'Vincular'}
            </button>
          </div>
          {msgVinc && (
            <span style={{ fontSize:'0.75rem', color: msgVinc.startsWith('✓') ? '#00d992' : '#fb565b', fontWeight:600 }}>
              {msgVinc}
            </span>
          )}

          {onRevisar && (
            <button className="boton boton-secundario" style={{ fontSize:'0.78rem', padding:'0.4rem 0.75rem' }} onClick={onRevisar}>
              <FileCheck size={13}/> Revisar
            </button>
          )}
          <button className="boton boton-secundario" style={{ padding:'0.4rem 0.625rem' }} onClick={onCerrar} title="Cerrar">
            <X size={15}/>
          </button>
        </div>
      </div>

      {/* Mapa */}
      <div style={{ flex:1, position:'relative', minHeight:0 }}>
        {cargando && (
          <div style={{ position:'absolute', inset:0, zIndex:10, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(5,5,7,0.6)' }}>
            <div style={{ background:'#101010', border:'1px solid #3d3a39', borderRadius:10, padding:'1.25rem 2rem', color:'#8b949e', fontSize:'0.875rem' }}>
              Cargando ruta…
            </div>
          </div>
        )}
        {!cargando && !grabacion.recordedPoints && (
          <div style={{ position:'absolute', inset:0, zIndex:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background:'rgba(16,16,16,0.9)', border:'1px solid #3d3a39', borderRadius:10, padding:'1.25rem 2rem', textAlign:'center' }}>
              <MapPin size={28} color="#8b949e" style={{ margin:'0 auto 0.5rem' }}/>
              <p style={{ color:'#8b949e', fontSize:'0.875rem' }}>Esta grabación no tiene puntos GPS disponibles</p>
            </div>
          </div>
        )}
        <div ref={mapDivRef} style={{ width:'100%', height:'100%' }}/>

        {/* Leyenda */}
        <div style={{ position:'absolute', bottom:16, right:16, zIndex:1000, background:'rgba(16,16,16,0.92)', border:'1px solid #3d3a39', borderRadius:8, padding:'0.625rem 0.875rem', fontSize:'0.75rem', color:'#8b949e', lineHeight:1.8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <div style={{ width:10, height:10, background:'#00d992', borderRadius:'50%', border:'2px solid #fff' }}/> Inicio
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <div style={{ width:10, height:10, background:'#fb565b', borderRadius:'50%', border:'2px solid #fff' }}/> Fin
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <div style={{ width:24, height:3, background:'#00d992', borderRadius:2 }}/> Ruta simplificada
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <div style={{ width:24, height:3, background:'#555', borderRadius:2 }}/> Ruta original
          </div>
        </div>

        {grabacion.reviewNotes && (
          <div style={{ position:'absolute', bottom:16, left:16, zIndex:1000, background:'rgba(16,16,16,0.92)', border:'1px solid #3d3a39', borderRadius:8, padding:'0.625rem 0.875rem', maxWidth:280 }}>
            <p style={{ fontSize:'0.7rem', color:'#8b949e', marginBottom:'0.2rem' }}>Notas de revisión</p>
            <p style={{ fontSize:'0.78rem', color:'#b8b3b0' }}>{grabacion.reviewNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
