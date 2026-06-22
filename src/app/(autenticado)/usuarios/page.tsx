'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Users, Edit2, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { usuariosServicio } from '../../../services/usuarios.servicio';
import { sindicatosServicio } from '../../../services/sindicatos.servicio';
import { Modal } from '../../../components/dashboard/Modal';
import { Cargando } from '../../../components/dashboard/Cargando';
import { useUsuarioAlmacen } from '../../../almacen/usuario.almacen';
import { RolUsuario } from '../../../types';

// Roles que maneja el backend (Prisma enum)
const ROLES_TODOS   = ['SUPERADMIN','SINDICATO_ADMIN','OPERATOR','DRIVER','PASSENGER'];
const ROLES_SINDICATO = ['SINDICATO_ADMIN','OPERATOR','DRIVER','PASSENGER'];
const ROLES_BASICOS   = ['OPERATOR','DRIVER','PASSENGER'];

const rolColor: Record<string,string> = {
  SUPERADMIN:'insignia-peligro',
  SINDICATO_ADMIN:'insignia-advertencia',
  OPERATOR:'insignia-info',
  DRIVER:'insignia-exito',
  PASSENGER:'insignia-info',
};
const rolLabel: Record<string,string> = {
  SUPERADMIN:'Super Admin',
  SINDICATO_ADMIN:'Admin Sindicato',
  OPERATOR:'Operador',
  DRIVER:'Conductor',
  PASSENGER:'Pasajero',
};

type Usuario = {
  id: string | number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  active: boolean;
  syndicateId?: string | number;
  avatarUrl?: string;
  createdAt?: string;
  syndicate?: { id: string|number; name: string };
};
type FormUsuario = { sindicatoId: string; email: string; contrasena: string; nombre: string; telefono: string; rol: string };

const formInicial: FormUsuario = { sindicatoId:'', email:'', contrasena:'', nombre:'', telefono:'', rol:'PASSENGER' };
const POR_PAGINA = 10;

export default function PaginaUsuarios() {
  const { usuario } = useUsuarioAlmacen();
  const esSuperAdmin   = usuario?.rol === RolUsuario.SUPERADMIN;
  const sindicatoIdUsuario = usuario?.sindicatoId ? String(usuario.sindicatoId) : '';

  // Roles que puede asignar según su propio rol
  const rolesDisponibles = esSuperAdmin ? ROLES_TODOS
    : usuario?.rol === RolUsuario.ADMIN_SINDICATO ? ROLES_SINDICATO
    : ROLES_BASICOS;

  const qc = useQueryClient();
  const [busqueda, setBusqueda]         = useState('');
  const [filtroRol, setFiltroRol]       = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [filtroSindicato, setFiltroSindicato] = useState(esSuperAdmin ? '' : sindicatoIdUsuario);
  const [pagina, setPagina]             = useState(1);
  const [modal, setModal]               = useState<'crear'|'editar'|null>(null);
  const [sel, setSel]                   = useState<Usuario | null>(null);
  const [form, setForm]                 = useState<FormUsuario>({ ...formInicial, sindicatoId: sindicatoIdUsuario });

  const queryParams = esSuperAdmin
    ? { ...(filtroRol ? { rol:filtroRol } : {}), ...(filtroSindicato ? { sindicatoId:filtroSindicato } : {}) }
    : { sindicatoId: sindicatoIdUsuario, ...(filtroRol ? { rol:filtroRol } : {}) };

  const { data: usuarios = [], isLoading } = useQuery<Usuario[]>({
    queryKey: ['usuarios', queryParams],
    queryFn:  () => usuariosServicio.obtenerTodos(queryParams),
  });
  const { data: sindicatos = [] } = useQuery<{ id:string|number; name:string }[]>({
    queryKey: ['sindicatos'],
    queryFn:  () => sindicatosServicio.obtenerTodos(),
  });

  const crear = useMutation({
    mutationFn: () => usuariosServicio.crear({
      nombre: form.nombre, email: form.email, contrasena: form.contrasena,
      telefono: form.telefono || undefined, rol: form.rol,
      sindicatoId: form.sindicatoId ? parseInt(form.sindicatoId) : (sindicatoIdUsuario ? parseInt(sindicatoIdUsuario) : undefined),
    }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['usuarios']}); setModal(null); },
  });
  const actualizar = useMutation({
    mutationFn: () => usuariosServicio.actualizar(String(sel!.id), {
      nombre: form.nombre, telefono: form.telefono || undefined, rol: form.rol,
      ...(esSuperAdmin && form.sindicatoId ? { sindicatoId: parseInt(form.sindicatoId) } : {}),
    }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['usuarios']}); setModal(null); },
  });
  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => usuariosServicio.actualizar(id, { activo }),
    onSuccess: () => qc.invalidateQueries({queryKey:['usuarios']}),
  });

  const abrirEditar = (u: Usuario) => {
    setSel(u);
    setForm({ sindicatoId:String(u.syndicateId||''), email:u.email, contrasena:'', nombre:u.name, telefono:u.phone||'', rol:u.role });
    setModal('editar');
  };

  const filtrados = usuarios.filter((u) => {
    const texto = busqueda.toLowerCase();
    const coincideTexto  = !busqueda || u.name?.toLowerCase().includes(texto) || u.email?.toLowerCase().includes(texto);
    const coincideActivo = !filtroActivo || (filtroActivo==='activo' ? u.active : !u.active);
    return coincideTexto && coincideActivo;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles     = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);
  const cambiarFiltro = (fn: () => void) => { fn(); setPagina(1); };

  // El usuario no puede desactivarse a sí mismo
  const esMismoUsuario = (id: string|number) => String(id) === String(usuario?.id);

  return (
    <div style={{ padding:'2rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontWeight:800, fontSize:'1.625rem', color:'#f2f2f2', display:'flex', alignItems:'center', gap:'0.5rem' }}><Users size={22} color="#00d992"/> Usuarios</h1>
          <p style={{ color:'#8b949e', fontSize:'0.875rem' }}>{filtrados.length} usuarios encontrados</p>
        </div>
        <button className="boton boton-primario" onClick={()=>{ setForm({...formInicial, sindicatoId:sindicatoIdUsuario, rol: esSuperAdmin ? 'PASSENGER' : 'DRIVER'}); setModal('crear'); }}><Plus size={15}/> Nuevo Usuario</button>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', marginBottom:'1.25rem' }}>
        <div style={{ position:'relative', flex:'1 1 200px', minWidth:0 }}>
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#8b949e' }}/>
          <input className="campo-entrada" style={{ paddingLeft:'2.5rem' }} placeholder="Nombre o email..." value={busqueda} onChange={(e)=>cambiarFiltro(()=>setBusqueda(e.target.value))}/>
        </div>
        <select className="campo-entrada" style={{ flex:'0 1 170px' }} value={filtroRol} onChange={(e)=>cambiarFiltro(()=>setFiltroRol(e.target.value))}>
          <option value="">Todos los roles</option>
          {ROLES_TODOS.map(r=><option key={r} value={r}>{rolLabel[r]||r}</option>)}
        </select>
        <select className="campo-entrada" style={{ flex:'0 1 150px' }} value={filtroActivo} onChange={(e)=>cambiarFiltro(()=>setFiltroActivo(e.target.value))}>
          <option value="">Activo/Inactivo</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
        {esSuperAdmin && (
          <select className="campo-entrada" style={{ flex:'0 1 190px' }} value={filtroSindicato} onChange={(e)=>cambiarFiltro(()=>setFiltroSindicato(e.target.value))}>
            <option value="">Todos los sindicatos</option>
            {sindicatos.map(s=><option key={String(s.id)} value={String(s.id)}>{s.name}</option>)}
          </select>
        )}
      </div>

      {isLoading ? <Cargando/> : (
        <>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #3d3a39' }}>
                  {['Usuario','Email','Rol','Sindicato','Teléfono','Activo','Acciones'].map(h=>(
                    <th key={String(h)} style={{ padding:'0.75rem 1rem', textAlign:'left', fontSize:'0.75rem', fontWeight:700, color:'#8b949e', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibles.map((u) => (
                  <tr key={String(u.id)} style={{ borderBottom:'1px solid rgba(61,58,57,0.5)', opacity: u.active ? 1 : 0.6 }}>
                    <td style={{ padding:'0.875rem 1rem' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                        <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(0,217,146,0.1)', border:'1px solid rgba(0,217,146,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'0.75rem', fontWeight:700, color:'#00d992' }}>
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight:600, color:'#f2f2f2', fontSize:'0.875rem' }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ padding:'0.875rem 1rem', color:'#8b949e', fontSize:'0.8rem' }}>{u.email}</td>
                    <td style={{ padding:'0.875rem 1rem' }}><span className={`insignia ${rolColor[u.role]||'insignia-info'}`}>{rolLabel[u.role]||u.role}</span></td>
                    <td style={{ padding:'0.875rem 1rem', color:'#8b949e', fontSize:'0.8rem' }}>{u.syndicate?.name || (u.syndicateId ? `#${u.syndicateId}` : '—')}</td>
                    <td style={{ padding:'0.875rem 1rem', color:'#8b949e', fontSize:'0.8rem' }}>{u.phone||'—'}</td>
                    <td style={{ padding:'0.875rem 1rem' }}><span className={`insignia ${u.active?'insignia-exito':'insignia-peligro'}`}>{u.active?'Sí':'No'}</span></td>
                    <td style={{ padding:'0.875rem 1rem' }}>
                      <div style={{ display:'flex', gap:'0.375rem' }}>
                        <button className="boton boton-secundario" style={{ padding:'0.375rem 0.625rem', fontSize:'0.75rem' }} onClick={()=>abrirEditar(u)}><Edit2 size={12}/></button>
                        <button
                          className="boton"
                          style={{ padding:'0.375rem 0.625rem', fontSize:'0.72rem', background:u.active?'rgba(251,86,91,0.1)':'rgba(0,217,146,0.1)', color:u.active?'#fb565b':'#00d992', border:u.active?'1px solid rgba(251,86,91,0.2)':'1px solid rgba(0,217,146,0.2)', display:'flex', alignItems:'center', gap:'0.25rem', opacity: esMismoUsuario(u.id) ? 0.4 : 1 }}
                          onClick={()=>toggleActivo.mutate({ id:String(u.id), activo:!u.active })}
                          disabled={toggleActivo.isPending || esMismoUsuario(u.id)}
                          title={esMismoUsuario(u.id) ? 'No puedes desactivarte a ti mismo' : ''}
                        >
                          {u.active ? <><ToggleRight size={12}/> Desactivar</> : <><ToggleLeft size={12}/> Activar</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr><td colSpan={7} style={{ padding:'2rem', textAlign:'center', color:'#8b949e' }}>Sin resultados</td></tr>
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
        <Modal titulo={modal==='crear'?'Nuevo Usuario':'Editar Usuario'} onCerrar={()=>setModal(null)} ancho={460}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.875rem' }}>

            {/* Nombre */}
            <div style={{ gridColumn:'span 2' }}>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Nombre completo</label>
              <input className="campo-entrada" value={form.nombre} onChange={(e)=>setForm({...form,nombre:e.target.value})}/>
            </div>

            {/* Email — solo al crear */}
            <div style={{ gridColumn:'span 2' }}>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Email</label>
              <input type="email" className="campo-entrada" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} disabled={modal==='editar'} style={{ opacity: modal==='editar' ? 0.6 : 1 }}/>
            </div>

            {/* Contraseña — solo al crear */}
            {modal==='crear' && (
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Contraseña</label>
                <input type="password" className="campo-entrada" value={form.contrasena} onChange={(e)=>setForm({...form,contrasena:e.target.value})}/>
              </div>
            )}

            {/* Teléfono */}
            <div>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Teléfono</label>
              <input type="tel" className="campo-entrada" placeholder="Opcional" value={form.telefono} onChange={(e)=>setForm({...form,telefono:e.target.value})}/>
            </div>

            {/* Rol */}
            <div>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Rol</label>
              <select className="campo-entrada" value={form.rol} onChange={(e)=>setForm({...form,rol:e.target.value})}>
                {rolesDisponibles.map(r=><option key={r} value={r}>{rolLabel[r]||r}</option>)}
              </select>
            </div>

            {/* Sindicato */}
            <div style={{ gridColumn:'span 2' }}>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Sindicato <span style={{ color:'#8b949e', fontWeight:400 }}>(opcional)</span></label>
              {esSuperAdmin ? (
                <select className="campo-entrada" value={form.sindicatoId} onChange={(e)=>setForm({...form,sindicatoId:e.target.value})}>
                  <option value="">— Sin sindicato (pasajero/superadmin) —</option>
                  {sindicatos.map(s=><option key={String(s.id)} value={String(s.id)}>{s.name}</option>)}
                </select>
              ) : (
                <input className="campo-entrada" value={usuario?.sindicato?.nombre || (sindicatoIdUsuario ? `Sindicato #${sindicatoIdUsuario}` : '—')} readOnly style={{ opacity:0.6 }}/>
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
