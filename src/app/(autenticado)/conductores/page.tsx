'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, UserCheck, Edit2, ToggleLeft, ToggleRight, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { conductoresServicio } from '../../../services/conductores.servicio';
import { sindicatosServicio } from '../../../services/sindicatos.servicio';
import { lineasServicio } from '../../../services/lineas.servicio';
import { usuariosServicio } from '../../../services/usuarios.servicio';
import { Modal } from '../../../components/dashboard/Modal';
import { Cargando } from '../../../components/dashboard/Cargando';
import { useUsuarioAlmacen } from '../../../almacen/usuario.almacen';
import { RolUsuario } from '../../../types';

const credColor: Record<string,string> = { VALID:'insignia-exito', EXPIRED:'insignia-peligro', SUSPENDED:'insignia-advertencia', RENEWING:'insignia-info' };
const credLabel: Record<string,string> = { VALID:'Vigente', EXPIRED:'Vencida', SUSPENDED:'Suspendida', RENEWING:'Renovando' };

type Conductor = {
  id: string;
  userId: string | number;
  syndicateId: string | number;
  lineId?: string | number;
  nationalId: string;
  nationalIdExtension?: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpirationDate?: string;
  credentialStatus: string;
  active: boolean;
  user?: { id: string|number; name: string; email: string };
  syndicate?: { id: string|number; name: string };
  line?: { id: string|number; name: string; code: string };
};
type FormConductor = {
  usuarioId: string; sindicatoId: string; lineaId: string;
  cedulaIdentidad: string; extensionCI: string;
  numeroLicencia: string; categoriaLicencia: string; vencimientoLicencia: string;
};

const formInicial: FormConductor = {
  usuarioId:'', sindicatoId:'', lineaId:'',
  cedulaIdentidad:'', extensionCI:'SC',
  numeroLicencia:'', categoriaLicencia:'C', vencimientoLicencia:'',
};
const POR_PAGINA = 10;

export default function PaginaConductores() {
  const { usuario } = useUsuarioAlmacen();
  const esSuperAdmin = usuario?.rol === RolUsuario.SUPERADMIN;
  const sindicatoIdUsuario = usuario?.sindicatoId ? String(usuario.sindicatoId) : '';

  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [filtroCred, setFiltroCred] = useState('');
  const [filtroSindicato, setFiltroSindicato] = useState(esSuperAdmin ? '' : sindicatoIdUsuario);
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState<'crear'|'editar'|'credencial'|null>(null);
  const [sel, setSel] = useState<Conductor | null>(null);
  const [form, setForm] = useState<FormConductor>({ ...formInicial, sindicatoId: sindicatoIdUsuario });
  const [credencial, setCredencial] = useState('VALID');

  // Si no es SUPERADMIN, pre-filtramos la query en el servidor también
  const queryParams = esSuperAdmin
    ? (filtroSindicato ? { sindicatoId: filtroSindicato } : undefined)
    : { sindicatoId: sindicatoIdUsuario };

  const { data: conductores = [], isLoading } = useQuery({
    queryKey: ['conductores', queryParams],
    queryFn: () => conductoresServicio.obtenerTodos(queryParams),
  });
  const { data: sindicatos = [] } = useQuery({
    queryKey: ['sindicatos'],
    queryFn: () => sindicatosServicio.obtenerTodos(),
    enabled: esSuperAdmin,
  });
  const sindicatoEfectivo = esSuperAdmin ? (form.sindicatoId || filtroSindicato) : sindicatoIdUsuario;
  const { data: lineas = [] } = useQuery({
    queryKey: ['lineas', sindicatoEfectivo],
    queryFn: () => lineasServicio.obtenerTodas(sindicatoEfectivo ? { sindicatoId: sindicatoEfectivo } : undefined),
  });
  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-driver', sindicatoEfectivo],
    queryFn: () => usuariosServicio.obtenerTodos({ sindicatoId: sindicatoEfectivo || undefined }),
    enabled: modal === 'crear',
  });

  const crear = useMutation({
    mutationFn: () => conductoresServicio.crear({ ...form, usuarioId:parseInt(form.usuarioId), sindicatoId:parseInt(form.sindicatoId||sindicatoIdUsuario), lineaId:form.lineaId?parseInt(form.lineaId):undefined }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['conductores']}); setModal(null); },
  });
  const actualizar = useMutation({
    mutationFn: () => conductoresServicio.actualizar(sel!.id, { lineaId:form.lineaId?parseInt(form.lineaId):undefined, numeroLicencia:form.numeroLicencia, categoriaLicencia:form.categoriaLicencia, vencimientoLicencia:form.vencimientoLicencia }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['conductores']}); setModal(null); },
  });
  const updCred = useMutation({
    mutationFn: () => conductoresServicio.actualizarCredencial(sel!.id, { estadoCredencial: credencial }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['conductores']}); setModal(null); },
  });
  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => conductoresServicio.actualizar(id, { activo }),
    onSuccess: () => qc.invalidateQueries({queryKey:['conductores']}),
  });

  const abrirEditar = (c: Conductor) => {
    setSel(c);
    setForm({ usuarioId:String(c.userId), sindicatoId:String(c.syndicateId), lineaId:String(c.lineId||''), cedulaIdentidad:c.nationalId, extensionCI:c.nationalIdExtension||'SC', numeroLicencia:c.licenseNumber, categoriaLicencia:c.licenseCategory, vencimientoLicencia:c.licenseExpirationDate?.slice(0,10)||'' });
    setModal('editar');
  };

  const filtrados = conductores.filter((c) => {
    const texto = busqueda.toLowerCase();
    const coincideTexto = !busqueda || c.user?.name?.toLowerCase().includes(texto) || c.nationalId?.includes(busqueda) || c.licenseNumber?.includes(busqueda);
    const coincideActivo = !filtroActivo || (filtroActivo==='activo' ? c.active : !c.active);
    const coincideCred = !filtroCred || c.credentialStatus === filtroCred;
    const coincideSind = !filtroSindicato || String(c.syndicateId) === filtroSindicato;
    return coincideTexto && coincideActivo && coincideCred && coincideSind;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);
  const cambiarFiltro = (fn: () => void) => { fn(); setPagina(1); };

  return (
    <div style={{ padding:'2rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontWeight:800, fontSize:'1.625rem', color:'#f2f2f2', display:'flex', alignItems:'center', gap:'0.5rem' }}><UserCheck size={22} color="#00d992"/> Conductores</h1>
          <p style={{ color:'#8b949e', fontSize:'0.875rem' }}>{filtrados.length} conductores encontrados</p>
        </div>
        <button className="boton boton-primario" onClick={()=>{ setForm({...formInicial, sindicatoId:sindicatoIdUsuario}); setModal('crear'); }}><Plus size={15}/> Nuevo Conductor</button>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', marginBottom:'1.25rem' }}>
        <div style={{ position:'relative', flex:'1 1 200px', minWidth:0 }}>
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#8b949e' }}/>
          <input className="campo-entrada" style={{ paddingLeft:'2.5rem' }} placeholder="Nombre, CI, licencia..." value={busqueda} onChange={(e)=>cambiarFiltro(()=>setBusqueda(e.target.value))}/>
        </div>
        <select className="campo-entrada" style={{ flex:'0 1 150px' }} value={filtroActivo} onChange={(e)=>cambiarFiltro(()=>setFiltroActivo(e.target.value))}>
          <option value="">Activo/Inactivo</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
        <select className="campo-entrada" style={{ flex:'0 1 160px' }} value={filtroCred} onChange={(e)=>cambiarFiltro(()=>setFiltroCred(e.target.value))}>
          <option value="">Credencial</option>
          {Object.entries(credLabel).map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
        {esSuperAdmin && (
          <select className="campo-entrada" style={{ flex:'0 1 190px' }} value={filtroSindicato} onChange={(e)=>cambiarFiltro(()=>setFiltroSindicato(e.target.value))}>
            <option value="">Todos los sindicatos</option>
            {sindicatos.map((s)=><option key={String(s.id)} value={String(s.id)}>{s.name}</option>)}
          </select>
        )}
      </div>

      {isLoading ? <Cargando/> : (
        <>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #3d3a39' }}>
                  {['Conductor','CI','Licencia','Cat.','Vencimiento','Línea',esSuperAdmin&&'Sindicato','Credencial','Activo','Acciones'].filter(Boolean).map((h)=>(
                    <th key={String(h)} style={{ padding:'0.75rem 1rem', textAlign:'left', fontSize:'0.75rem', fontWeight:700, color:'#8b949e', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => (
                  <tr key={c.id} style={{ borderBottom:'1px solid rgba(61,58,57,0.5)' }}>
                    <td style={{ padding:'0.875rem 1rem' }}>
                      <p style={{ fontWeight:700, color:'#f2f2f2', fontSize:'0.875rem' }}>{c.user?.name || '—'}</p>
                      <p style={{ color:'#8b949e', fontSize:'0.72rem' }}>{c.user?.email}</p>
                    </td>
                    <td style={{ padding:'0.875rem 1rem', color:'#b8b3b0', fontFamily:'monospace' }}>{c.nationalId} {c.nationalIdExtension}</td>
                    <td style={{ padding:'0.875rem 1rem', color:'#f2f2f2', fontWeight:600 }}>{c.licenseNumber}</td>
                    <td style={{ padding:'0.875rem 1rem', color:'#8b949e' }}>{c.licenseCategory}</td>
                    <td style={{ padding:'0.875rem 1rem', color:'#8b949e', fontSize:'0.8rem' }}>{c.licenseExpirationDate?.slice(0,10)||'—'}</td>
                    <td style={{ padding:'0.875rem 1rem', color:'#8b949e', fontSize:'0.8rem' }}>{c.line ? `${c.line.code} – ${c.line.name}` : '—'}</td>
                    {esSuperAdmin && <td style={{ padding:'0.875rem 1rem', color:'#8b949e', fontSize:'0.8rem' }}>{c.syndicate?.name||'—'}</td>}
                    <td style={{ padding:'0.875rem 1rem' }}><span className={`insignia ${credColor[c.credentialStatus]||'insignia-info'}`}>{credLabel[c.credentialStatus]||c.credentialStatus}</span></td>
                    <td style={{ padding:'0.875rem 1rem' }}><span className={`insignia ${c.active?'insignia-exito':'insignia-peligro'}`}>{c.active?'Sí':'No'}</span></td>
                    <td style={{ padding:'0.875rem 1rem' }}>
                      <div style={{ display:'flex', gap:'0.375rem' }}>
                        <button className="boton boton-secundario" style={{ padding:'0.375rem 0.625rem', fontSize:'0.75rem' }} onClick={()=>abrirEditar(c)} title="Editar"><Edit2 size={12}/></button>
                        <button className="boton boton-secundario" style={{ padding:'0.375rem 0.5rem', fontSize:'0.75rem' }} onClick={()=>{ setSel(c); setCredencial(c.credentialStatus); setModal('credencial'); }} title="Credencial"><ShieldCheck size={12}/></button>
                        <button
                          className="boton"
                          style={{ padding:'0.375rem 0.625rem', fontSize:'0.72rem', background:c.active?'rgba(251,86,91,0.1)':'rgba(0,217,146,0.1)', color:c.active?'#fb565b':'#00d992', border:c.active?'1px solid rgba(251,86,91,0.2)':'1px solid rgba(0,217,146,0.2)', display:'flex', alignItems:'center', gap:'0.25rem' }}
                          onClick={()=>toggleActivo.mutate({ id:c.id, activo:!c.active })}
                          disabled={toggleActivo.isPending}
                        >
                          {c.active ? <><ToggleRight size={12}/> Desactivar</> : <><ToggleLeft size={12}/> Activar</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr><td colSpan={esSuperAdmin ? 10 : 9} style={{ padding:'2rem', textAlign:'center', color:'#8b949e' }}>Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'1rem', color:'#8b949e', fontSize:'0.8rem' }}>
            <span>Mostrando {filtrados.length===0?0:Math.min((paginaActual-1)*POR_PAGINA+1,filtrados.length)}–{Math.min(paginaActual*POR_PAGINA,filtrados.length)} de {filtrados.length}</span>
            <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
              <button className="boton boton-secundario" style={{ padding:'0.375rem 0.625rem' }} onClick={()=>setPagina(p=>Math.max(1,p-1))} disabled={paginaActual===1}><ChevronLeft size={14}/></button>
              <span style={{ color:'#f2f2f2', fontWeight:600 }}>Pág. {paginaActual} / {totalPaginas}</span>
              <button className="boton boton-secundario" style={{ padding:'0.375rem 0.625rem' }} onClick={()=>setPagina(p=>Math.min(totalPaginas,p+1))} disabled={paginaActual===totalPaginas}><ChevronRight size={14}/></button>
            </div>
          </div>
        </>
      )}

      {/* Modal crear / editar */}
      {(modal==='crear'||modal==='editar') && (
        <Modal titulo={modal==='crear'?'Nuevo Conductor':'Editar Conductor'} onCerrar={()=>setModal(null)}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.875rem' }}>

            {/* Usuario — solo al crear */}
            {modal==='crear' && (
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Usuario</label>
                <select className="campo-entrada" value={form.usuarioId} onChange={(e)=>setForm({...form,usuarioId:e.target.value})}>
                  <option value="">— Seleccionar usuario —</option>
                  {(usuarios as {id:string|number;name:string;email:string}[]).map((u)=>(
                    <option key={String(u.id)} value={String(u.id)}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sindicato — solo al crear; SUPERADMIN puede elegir, otros lo ven fijo */}
            {modal==='crear' && (
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Sindicato</label>
                {esSuperAdmin ? (
                  <select className="campo-entrada" value={form.sindicatoId} onChange={(e)=>setForm({...form,sindicatoId:e.target.value,lineaId:''})}>
                    <option value="">— Seleccionar sindicato —</option>
                    {sindicatos.map((s)=><option key={String(s.id)} value={String(s.id)}>{s.name}</option>)}
                  </select>
                ) : (
                  <input className="campo-entrada" value={usuario?.sindicato?.nombre || sindicatoIdUsuario} readOnly style={{ opacity:0.6 }}/>
                )}
              </div>
            )}

            {/* Línea */}
            <div style={{ gridColumn:'span 2' }}>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Línea (opcional)</label>
              <select className="campo-entrada" value={form.lineaId} onChange={(e)=>setForm({...form,lineaId:e.target.value})}>
                <option value="">— Sin línea asignada —</option>
                {lineas.map((l)=><option key={String(l.id)} value={String(l.id)}>{l.code} – {l.name}</option>)}
              </select>
            </div>

            {/* CI y extensión */}
            <div>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Cédula de Identidad</label>
              <input className="campo-entrada" value={form.cedulaIdentidad} onChange={(e)=>setForm({...form,cedulaIdentidad:e.target.value})} disabled={modal==='editar'}/>
            </div>
            <div>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Extensión CI</label>
              <select className="campo-entrada" value={form.extensionCI} onChange={(e)=>setForm({...form,extensionCI:e.target.value})} disabled={modal==='editar'}>
                {['LP','CB','SC','OR','PT','TJ','CO','BE','PD'].map(e=><option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            {/* Licencia */}
            <div>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>N° Licencia</label>
              <input className="campo-entrada" value={form.numeroLicencia} onChange={(e)=>setForm({...form,numeroLicencia:e.target.value})}/>
            </div>
            <div>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Categoría</label>
              <select className="campo-entrada" value={form.categoriaLicencia} onChange={(e)=>setForm({...form,categoriaLicencia:e.target.value})}>
                {['A','B','C'].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:'span 2' }}>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Vencimiento Licencia</label>
              <input type="date" className="campo-entrada" value={form.vencimientoLicencia} onChange={(e)=>setForm({...form,vencimientoLicencia:e.target.value})}/>
            </div>
          </div>

          <button className="boton boton-primario" style={{ justifyContent:'center', width:'100%', marginTop:'1.25rem' }} onClick={()=>modal==='crear'?crear.mutate():actualizar.mutate()} disabled={crear.isPending||actualizar.isPending}>
            {(crear.isPending||actualizar.isPending)?'Guardando...':'Guardar'}
          </button>
        </Modal>
      )}

      {/* Modal credencial */}
      {modal==='credencial' && (
        <Modal titulo="Actualizar Credencial" onCerrar={()=>setModal(null)} ancho={360}>
          <p style={{ color:'#8b949e', fontSize:'0.8rem', marginBottom:'1rem' }}>{sel?.user?.name} — {sel?.licenseNumber}</p>
          <div style={{ marginBottom:'1rem' }}>
            <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.5rem' }}>Estado de Licencia</label>
            <select className="campo-entrada" value={credencial} onChange={(e)=>setCredencial(e.target.value)}>
              {Object.entries(credLabel).map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <button className="boton boton-primario" style={{ justifyContent:'center', width:'100%' }} onClick={()=>updCred.mutate()} disabled={updCred.isPending}>{updCred.isPending?'Guardando...':'Actualizar'}</button>
        </Modal>
      )}
    </div>
  );
}
