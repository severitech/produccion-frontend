'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Building2, Edit2, ToggleLeft, ToggleRight, Users, Bus, List } from 'lucide-react';
import { sindicatosServicio } from '../../../services/sindicatos.servicio';
import { Modal } from '../../../components/dashboard/Modal';
import { Cargando } from '../../../components/dashboard/Cargando';
import { useUsuarioAlmacen } from '../../../almacen/usuario.almacen';
import { RolUsuario } from '../../../types';

const statusColor: Record<string,string> = { ACTIVE:'insignia-exito', INACTIVE:'insignia-peligro', SUSPENDED:'insignia-advertencia' };
const statusLabel: Record<string,string> = { ACTIVE:'Activo', INACTIVE:'Inactivo', SUSPENDED:'Suspendido' };

type Sindicato = {
  id: string | number;
  name: string;
  Nit?: string;
  legalRepresentative: string;
  contactPhone: string;
  contactEmail?: string;
  address: string;
  logoUrl?: string;
  status: string;
  active: boolean;
  _count?: { drivers: number; buses: number; lines: number };
};
type FormSindicato = { nombre: string; nit: string; representanteLegal: string; telefonoContacto: string; emailContacto: string; direccion: string; logoUrl: string };

const formInicial: FormSindicato = { nombre:'', nit:'', representanteLegal:'', telefonoContacto:'', emailContacto:'', direccion:'', logoUrl:'' };

export default function PaginaSindicatos() {
  const { usuario } = useUsuarioAlmacen();
  const esSuperAdmin = usuario?.rol === RolUsuario.SUPERADMIN;
  const sindicatoIdUsuario = usuario?.sindicatoId ? String(usuario.sindicatoId) : '';

  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modal, setModal] = useState<'crear'|'editar'|null>(null);
  const [sel, setSel] = useState<Sindicato | null>(null);
  const [form, setForm] = useState<FormSindicato>(formInicial);

  const { data: sindicatos = [], isLoading } = useQuery<Sindicato[]>({
    queryKey: ['sindicatos'],
    queryFn: () => sindicatosServicio.obtenerTodos(),
  });

  const crear = useMutation({
    mutationFn: () => sindicatosServicio.crear({ nombre:form.nombre, nit:form.nit||undefined, representanteLegal:form.representanteLegal, telefonoContacto:form.telefonoContacto, emailContacto:form.emailContacto||undefined, direccion:form.direccion, logoUrl:form.logoUrl||undefined }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['sindicatos']}); setModal(null); },
  });
  const actualizar = useMutation({
    mutationFn: () => sindicatosServicio.actualizar(String(sel!.id), { nombre:form.nombre, nit:form.nit||undefined, representanteLegal:form.representanteLegal, telefonoContacto:form.telefonoContacto, emailContacto:form.emailContacto||undefined, direccion:form.direccion, logoUrl:form.logoUrl||undefined }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['sindicatos']}); setModal(null); },
  });
  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      sindicatosServicio.actualizar(id, { activo, estado: activo ? 'ACTIVE' : 'INACTIVE' }),
    onSuccess: () => qc.invalidateQueries({queryKey:['sindicatos']}),
  });

  const abrirEditar = (s: Sindicato) => {
    setSel(s);
    setForm({ nombre:s.name, nit:s.Nit||'', representanteLegal:s.legalRepresentative, telefonoContacto:s.contactPhone, emailContacto:s.contactEmail||'', direccion:s.address, logoUrl:s.logoUrl||'' });
    setModal('editar');
  };

  // ADMIN_SINDICATO solo ve su propio sindicato
  const visibles = sindicatos.filter(s => {
    if (!esSuperAdmin && sindicatoIdUsuario) return String(s.id) === sindicatoIdUsuario;
    const coincideTexto = !busqueda || s.name?.toLowerCase().includes(busqueda.toLowerCase()) || s.Nit?.includes(busqueda) || s.legalRepresentative?.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstado = !filtroEstado || s.status === filtroEstado;
    return coincideTexto && coincideEstado;
  });

  return (
    <div style={{ padding:'2rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontWeight:800, fontSize:'1.625rem', color:'#f2f2f2', display:'flex', alignItems:'center', gap:'0.5rem' }}><Building2 size={22} color="#00d992"/> Sindicatos</h1>
          <p style={{ color:'#8b949e', fontSize:'0.875rem' }}>{visibles.length} sindicatos encontrados</p>
        </div>
        {esSuperAdmin && (
          <button className="boton boton-primario" onClick={()=>{ setForm(formInicial); setModal('crear'); }}><Plus size={15}/> Nuevo Sindicato</button>
        )}
      </div>

      {/* Filtros — solo SUPERADMIN */}
      {esSuperAdmin && (
        <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', marginBottom:'1.5rem' }}>
          <div style={{ position:'relative', flex:'1 1 220px', minWidth:0 }}>
            <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#8b949e' }}/>
            <input className="campo-entrada" style={{ paddingLeft:'2.5rem' }} placeholder="Nombre, NIT, representante..." value={busqueda} onChange={(e)=>setBusqueda(e.target.value)}/>
          </div>
          <select className="campo-entrada" style={{ flex:'0 1 170px' }} value={filtroEstado} onChange={(e)=>setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(statusLabel).map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      )}

      {isLoading ? <Cargando/> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))', gap:'1.25rem' }}>
          {visibles.map((s, i) => (
            <div key={String(s.id)} className="tarjeta" style={{ animation:`deslizar-arriba 0.35s ease-out ${i*0.06}s forwards`, opacity:0 }}>

              {/* Cabecera */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', minWidth:0 }}>
                  {s.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.logoUrl} alt={s.name} style={{ width:42, height:42, borderRadius:9, objectFit:'cover', border:'1px solid #3d3a39', flexShrink:0 }}/>
                  ) : (
                    <div style={{ width:42, height:42, borderRadius:9, background:'rgba(0,217,146,0.08)', border:'1px solid rgba(0,217,146,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Building2 size={19} color="#00d992"/>
                    </div>
                  )}
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontWeight:700, color:'#f2f2f2', fontSize:'0.9375rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</p>
                    <p style={{ color:'#8b949e', fontSize:'0.75rem' }}>NIT: {s.Nit || '—'}</p>
                  </div>
                </div>
                <span className={`insignia ${statusColor[s.status]||'insignia-info'}`} style={{ flexShrink:0, marginLeft:'0.5rem' }}>{statusLabel[s.status]||s.status}</span>
              </div>

              {/* Info contacto */}
              <div style={{ display:'flex', flexDirection:'column', gap:'0.3rem', marginBottom:'0.875rem' }}>
                <p style={{ fontSize:'0.8rem', color:'#b8b3b0' }}>
                  <span style={{ color:'#8b949e' }}>Rep: </span>{s.legalRepresentative}
                </p>
                <p style={{ fontSize:'0.78rem', color:'#8b949e' }}>{s.contactPhone}{s.contactEmail ? ` · ${s.contactEmail}` : ''}</p>
                <p style={{ fontSize:'0.75rem', color:'#8b949e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.address}</p>
              </div>

              {/* Estadísticas */}
              {s._count && (
                <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.875rem' }}>
                  {[
                    { icon:<Users size={12}/>, val:s._count.drivers, label:'Conductores' },
                    { icon:<Bus size={12}/>,   val:s._count.buses,   label:'Buses' },
                    { icon:<List size={12}/>,  val:s._count.lines,   label:'Líneas' },
                  ].map(({ icon, val, label }) => (
                    <div key={label} style={{ flex:1, background:'rgba(61,58,57,0.4)', borderRadius:7, padding:'0.375rem 0.5rem', textAlign:'center' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.25rem', color:'#8b949e', marginBottom:'0.2rem' }}>{icon}<span style={{ fontSize:'0.65rem' }}>{label}</span></div>
                      <p style={{ fontWeight:700, color:'#f2f2f2', fontSize:'0.9rem' }}>{val}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Acciones */}
              <div style={{ display:'flex', gap:'0.375rem', paddingTop:'0.75rem', borderTop:'1px solid #3d3a39' }}>
                <button className="boton boton-secundario" style={{ flex:1, justifyContent:'center', fontSize:'0.75rem', padding:'0.375rem' }} onClick={()=>abrirEditar(s)}><Edit2 size={12}/> Editar</button>
                {esSuperAdmin && (
                  <button
                    className="boton"
                    style={{ flex:1, justifyContent:'center', fontSize:'0.72rem', padding:'0.375rem', background:s.active?'rgba(251,86,91,0.1)':'rgba(0,217,146,0.1)', color:s.active?'#fb565b':'#00d992', border:s.active?'1px solid rgba(251,86,91,0.2)':'1px solid rgba(0,217,146,0.2)', display:'flex', alignItems:'center', gap:'0.25rem' }}
                    onClick={()=>toggleActivo.mutate({ id:String(s.id), activo:!s.active })}
                    disabled={toggleActivo.isPending}
                  >
                    {s.active ? <><ToggleRight size={12}/> Desactivar</> : <><ToggleLeft size={12}/> Activar</>}
                  </button>
                )}
              </div>
            </div>
          ))}
          {visibles.length === 0 && !isLoading && (
            <p style={{ color:'#8b949e', gridColumn:'1/-1', textAlign:'center', paddingTop:'2rem' }}>Sin sindicatos encontrados</p>
          )}
        </div>
      )}

      {/* Modal */}
      {(modal==='crear'||modal==='editar') && (
        <Modal titulo={modal==='crear'?'Nuevo Sindicato':'Editar Sindicato'} onCerrar={()=>setModal(null)} ancho={500}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.875rem' }}>

            <div style={{ gridColumn:'span 2' }}>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Nombre del Sindicato</label>
              <input className="campo-entrada" value={form.nombre} onChange={(e)=>setForm({...form,nombre:e.target.value})}/>
            </div>

            <div>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>NIT</label>
              <input className="campo-entrada" placeholder="Opcional" value={form.nit} onChange={(e)=>setForm({...form,nit:e.target.value})}/>
            </div>

            <div>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Teléfono</label>
              <input type="tel" className="campo-entrada" value={form.telefonoContacto} onChange={(e)=>setForm({...form,telefonoContacto:e.target.value})}/>
            </div>

            <div style={{ gridColumn:'span 2' }}>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Representante Legal</label>
              <input className="campo-entrada" value={form.representanteLegal} onChange={(e)=>setForm({...form,representanteLegal:e.target.value})}/>
            </div>

            <div style={{ gridColumn:'span 2' }}>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Email de contacto</label>
              <input type="email" className="campo-entrada" placeholder="Opcional" value={form.emailContacto} onChange={(e)=>setForm({...form,emailContacto:e.target.value})}/>
            </div>

            <div style={{ gridColumn:'span 2' }}>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Dirección</label>
              <input className="campo-entrada" value={form.direccion} onChange={(e)=>setForm({...form,direccion:e.target.value})}/>
            </div>

            <div style={{ gridColumn:'span 2' }}>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>URL Logo</label>
              <input className="campo-entrada" placeholder="https://... (opcional)" value={form.logoUrl} onChange={(e)=>setForm({...form,logoUrl:e.target.value})}/>
              {form.logoUrl && (
                <div style={{ marginTop:'0.5rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.logoUrl} alt="preview" style={{ width:40, height:40, borderRadius:7, objectFit:'cover', border:'1px solid #3d3a39' }} onError={(e)=>(e.currentTarget.style.display='none')}/>
                  <span style={{ fontSize:'0.75rem', color:'#8b949e' }}>Vista previa</span>
                </div>
              )}
            </div>
          </div>

          <button className="boton boton-primario" style={{ justifyContent:'center', width:'100%', marginTop:'1.25rem' }} onClick={()=>modal==='crear'?crear.mutate():actualizar.mutate()} disabled={crear.isPending||actualizar.isPending}>
            {(crear.isPending||actualizar.isPending)?'Guardando...':'Guardar'}
          </button>
        </Modal>
      )}
    </div>
  );
}
