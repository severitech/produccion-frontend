'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Route, Edit2, Search, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight, Satellite, MapPin } from 'lucide-react';
import { rutasServicio } from '../../../services/rutas.servicio';
import { lineasServicio } from '../../../services/lineas.servicio';
import { Cargando } from '../../../components/dashboard/Cargando';
import { useUsuarioAlmacen } from '../../../almacen/usuario.almacen';
import { RolUsuario } from '../../../types';

const dirLabel: Record<string,string> = { OUTBOUND:'IDA →', INBOUND:'← VUELTA', CIRCULAR:'↻ CIRCULAR' };
const dirColor: Record<string,string> = { OUTBOUND:'insignia-exito', INBOUND:'insignia-info', CIRCULAR:'insignia-advertencia' };
const grabEstLabel: Record<string,string> = { PENDING:'Pendiente', APPROVED:'Aprobada', REJECTED:'Rechazada' };
const grabEstColor: Record<string,string> = { PENDING:'#f5a623', APPROVED:'#00d992', REJECTED:'#fb565b' };

type RutaGrabacion = { id: string; status: string; method: string; direction?: string };
type Ruta = {
  id: string;
  lineId: string | number;
  name: string;
  direction: string;
  totalDistanceKm?: number | string;
  estimatedTimeMin?: number;
  restTimeMin?: number;
  active: boolean;
  routeRecordingId?: string | number;
  drawnPoints?: Array<{ lat: number; lng: number }>;
  recordingType?: string; // 'GPS' o 'DRAWN'
  routeRecording?: RutaGrabacion;
  line?: { id: string|number; name: string; code: string; color: string };
};
type Linea = { id: string|number; name: string; code: string; syndicateId?: string|number };
const POR_PAGINA = 10;

export default function PaginaRutas() {
  const router = useRouter();
  const { usuario } = useUsuarioAlmacen();
  const sindicatoIdUsuario = usuario?.sindicatoId ? String(usuario.sindicatoId) : '';

  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [filtroDir, setFiltroDir] = useState('');
  const [filtroLinea, setFiltroLinea] = useState('');
  const [pagina, setPagina] = useState(1);

  const sindicatoEfectivo = sindicatoIdUsuario;

  const { data: rutas = [], isLoading } = useQuery<Ruta[]>({
    queryKey: ['rutas', filtroLinea],
    queryFn: () => rutasServicio.obtenerTodas(filtroLinea ? { lineaId: filtroLinea } : undefined),
  });
  const { data: lineas = [] } = useQuery<Linea[]>({
    queryKey: ['lineas', sindicatoEfectivo],
    queryFn: () => lineasServicio.obtenerTodas(sindicatoEfectivo ? { sindicatoId: sindicatoEfectivo } : undefined),
  });

  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => rutasServicio.actualizar(id, { activo }),
    onSuccess: () => qc.invalidateQueries({queryKey:['rutas']}),
  });

  const filtradas = rutas.filter((r) => {
    const texto = busqueda.toLowerCase();
    const coincideTexto = !busqueda || r.name?.toLowerCase().includes(texto) || r.line?.name?.toLowerCase().includes(texto) || r.line?.code?.toLowerCase().includes(texto);
    const coincideActivo = !filtroActivo || (filtroActivo==='activo' ? r.active : !r.active);
    const coincideDir = !filtroDir || r.direction === filtroDir;
    return coincideTexto && coincideActivo && coincideDir;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);
  const cambiarFiltro = (fn: () => void) => { fn(); setPagina(1); };

  return (
    <div style={{ padding:'2rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontWeight:800, fontSize:'1.625rem', color:'#f2f2f2', display:'flex', alignItems:'center', gap:'0.5rem' }}><Route size={22} color="#00d992"/> Rutas</h1>
          <p style={{ color:'#8b949e', fontSize:'0.875rem' }}>{filtradas.length} rutas encontradas</p>
        </div>
        <button className="boton boton-primario" onClick={()=>router.push('/rutas/nueva')}><Plus size={15}/> Nueva Ruta</button>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', marginBottom:'1.25rem' }}>
        <div style={{ position:'relative', flex:'1 1 200px', minWidth:0 }}>
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#8b949e' }}/>
          <input className="campo-entrada" style={{ paddingLeft:'2.5rem' }} placeholder="Nombre, línea..." value={busqueda} onChange={(e)=>cambiarFiltro(()=>setBusqueda(e.target.value))}/>
        </div>
        <select className="campo-entrada" style={{ flex:'0 1 150px' }} value={filtroActivo} onChange={(e)=>cambiarFiltro(()=>setFiltroActivo(e.target.value))}>
          <option value="">Activo/Inactivo</option>
          <option value="activo">Activas</option>
          <option value="inactivo">Inactivas</option>
        </select>
        <select className="campo-entrada" style={{ flex:'0 1 160px' }} value={filtroDir} onChange={(e)=>cambiarFiltro(()=>setFiltroDir(e.target.value))}>
          <option value="">Todas las dir.</option>
          {Object.entries(dirLabel).map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
        <select className="campo-entrada" style={{ flex:'0 1 190px' }} value={filtroLinea} onChange={(e)=>cambiarFiltro(()=>setFiltroLinea(e.target.value))}>
          <option value="">Todas las líneas</option>
          {lineas.map((l)=><option key={String(l.id)} value={String(l.id)}>{l.code} – {l.name}</option>)}
        </select>
      </div>

      {isLoading ? <Cargando/> : (
        <>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #3d3a39' }}>
                  {['Nombre','Línea','Dirección','Dist. km','Tiempo','Descanso','Grabación','Activo','Acciones'].map(h=>(
                    <th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', fontSize:'0.75rem', fontWeight:700, color:'#8b949e', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibles.map((r) => (
                  <tr key={r.id} style={{ borderBottom:'1px solid rgba(61,58,57,0.5)' }}>
                    <td style={{ padding:'0.875rem 1rem', fontWeight:600, color:'#f2f2f2' }}>{r.name}</td>
                    <td style={{ padding:'0.875rem 1rem' }}>
                      {r.line ? (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:'0.375rem' }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background:r.line.color, flexShrink:0 }}/>
                          <span style={{ color:'#b8b3b0', fontSize:'0.8rem' }}>{r.line.code}</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding:'0.875rem 1rem' }}><span className={`insignia ${dirColor[r.direction]||'insignia-info'}`}>{dirLabel[r.direction]||r.direction}</span></td>
                    <td style={{ padding:'0.875rem 1rem', color:'#8b949e' }}>{r.totalDistanceKm ? `${r.totalDistanceKm} km` : '—'}</td>
                    <td style={{ padding:'0.875rem 1rem', color:'#8b949e' }}>{r.estimatedTimeMin ? `${r.estimatedTimeMin} min` : '—'}</td>
                    <td style={{ padding:'0.875rem 1rem', color:'#8b949e' }}>{r.restTimeMin ? `${r.restTimeMin} min` : '—'}</td>
                    <td style={{ padding:'0.875rem 1rem' }}>
                      {r.recordingType === 'GPS' ? (
                        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                          <Satellite size={16} color="#00d992" />
                          <span className="insignia insignia-exito">GPS</span>
                        </div>
                      ) : r.recordingType === 'DRAWN' ? (
                        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                          <MapPin size={16} color="#00d992" />
                          <span className="insignia insignia-exito">PUNTOS</span>
                        </div>
                      ) : <span style={{ color:'#8b949e', fontSize:'0.8rem' }}>—</span>}
                    </td>
                    <td style={{ padding:'0.875rem 1rem' }}>
                      <div style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', padding:'0.35rem 0.75rem', borderRadius:6, background:r.active?'rgba(0,217,146,0.15)':'rgba(107,114,128,0.15)' }}>
                        <div style={{ width:10, height:10, borderRadius:'50%', background:r.active?'#00d992':'#6b7280', flexShrink:0 }}/>
                        <span style={{ fontSize:'0.8rem', fontWeight:600, color:r.active?'#00d992':'#9ca3af' }}>{r.active?'Activa':'Inactiva'}</span>
                      </div>
                    </td>
                    <td style={{ padding:'0.875rem 1rem' }}>
                      <div style={{ display:'flex', gap:'0.375rem' }}>
                        <button className="boton boton-secundario" style={{ padding:'0.375rem 0.625rem', fontSize:'0.75rem' }} onClick={()=>router.push(`/rutas/${r.id}`)} title="Editar ruta"><Edit2 size={12}/> Editar</button>
                        <button
                          className="boton"
                          style={{
                            padding:'0.375rem 0.75rem',
                            fontSize:'0.75rem',
                            background:r.active?'rgba(251,86,91,0.12)':'rgba(0,217,146,0.12)',
                            color:r.active?'#fb565b':'#00d992',
                            border:r.active?'1px solid rgba(251,86,91,0.3)':'1px solid rgba(0,217,146,0.3)',
                            display:'flex',
                            alignItems:'center',
                            gap:'0.4rem',
                            cursor:'pointer',
                            fontWeight:600,
                            transition:'all 0.2s',
                          }}
                          onClick={()=>toggleActivo.mutate({ id:r.id, activo:!r.active })}
                          disabled={toggleActivo.isPending}
                          title={r.active ? 'Desactivar esta ruta' : 'Activar esta ruta'}
                        >
                          {toggleActivo.isPending && toggleActivo.variables?.id === r.id ? (
                            <>⏳ </>
                          ) : r.active ? (
                            <><ToggleRight size={13}/> Desactivar</>
                          ) : (
                            <><ToggleLeft size={13}/> Activar</>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr><td colSpan={9} style={{ padding:'2rem', textAlign:'center', color:'#8b949e' }}>Sin resultados</td></tr>
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

    </div>
  );
}
