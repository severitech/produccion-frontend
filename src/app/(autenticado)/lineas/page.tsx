'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, List, ToggleLeft, ToggleRight } from 'lucide-react';
import { lineasServicio } from '../../../services/lineas.servicio';
import { sindicatosServicio } from '../../../services/sindicatos.servicio';
import { Modal } from '../../../components/dashboard/Modal';
import { Cargando } from '../../../components/dashboard/Cargando';

type Linea = { id:string; name:string; code:string; fare:number|string; color:string; active:boolean; imageUrl?:string; syndicateId:string|number; syndicate?:{name:string} };
type FormLinea = { nombre:string; codigo:string; tarifa:string; color:string; sindicatoId:string; imagenUrl:string };
const formInicial: FormLinea = { nombre:'', codigo:'', tarifa:'2.5', color:'#00d992', sindicatoId:'', imagenUrl:'' };

export default function PaginaLineas() {
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal] = useState<'crear' | 'editar' | null>(null);
  const [seleccionado, setSeleccionado] = useState<Linea | null>(null);
  const [form, setForm] = useState(formInicial);

  const { data: lineas = [], isLoading } = useQuery<{id:string; name:string; code:string; fare:number|string; color:string; active:boolean; imageUrl?:string; syndicateId:string|number; syndicate?:{name:string}}[]>({ queryKey:['lineas'], queryFn: () => lineasServicio.obtenerTodas() });
  const { data: sindicatos = [] } = useQuery<{id: string|number; name: string}[]>({ queryKey:['sindicatos'], queryFn: () => sindicatosServicio.obtenerTodos() });

  const crear = useMutation({
    mutationFn: () => {
      console.log('[CREAR] Iniciando creación con datos:', { nombre:form.nombre, codigo:form.codigo, tarifa:parseFloat(form.tarifa), color:form.color, sindicatoId:parseInt(form.sindicatoId), imagenUrl:form.imagenUrl||undefined });
      return lineasServicio.crear({ nombre:form.nombre, codigo:form.codigo, tarifa:parseFloat(form.tarifa), color:form.color, sindicatoId:parseInt(form.sindicatoId), imagenUrl:form.imagenUrl||undefined });
    },
    onSuccess: () => { console.log('[CREAR] Éxito'); qc.invalidateQueries({queryKey:['lineas']}); setModal(null); },
    onError: (err) => console.error('[CREAR] Error:', err),
  });
  const actualizar = useMutation({
    mutationFn: () => {
      console.log('[ACTUALIZAR] Iniciando actualización con id:', seleccionado?.id, 'datos:', { nombre:form.nombre, codigo:form.codigo, tarifa:parseFloat(form.tarifa), color:form.color, sindicatoId:parseInt(form.sindicatoId), imagenUrl:form.imagenUrl||undefined });
      return lineasServicio.actualizar(seleccionado!.id, { nombre:form.nombre, codigo:form.codigo, tarifa:parseFloat(form.tarifa), color:form.color, sindicatoId:parseInt(form.sindicatoId), imagenUrl:form.imagenUrl||undefined });
    },
    onSuccess: () => { console.log('[ACTUALIZAR] Éxito'); qc.invalidateQueries({queryKey:['lineas']}); setModal(null); },
    onError: (err) => console.error('[ACTUALIZAR] Error:', err),
  });
  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => {
      console.log('[TOGGLE] Activando/Desactivando id:', id, 'activo:', activo);
      return lineasServicio.actualizar(id, { activo });
    },
    onSuccess: () => { console.log('[TOGGLE] Éxito'); qc.invalidateQueries({queryKey:['lineas']}); },
    onError: (err) => console.error('[TOGGLE] Error:', err),
  });

  const abrirEditar = (l: any) => {
    setSeleccionado(l);
    setForm({ nombre:l.name, codigo:l.code, tarifa:String(l.fare), color:l.color, sindicatoId:String(l.syndicateId), imagenUrl:l.imageUrl||'' });
    setModal('editar');
  };
  const filtradas = lineas.filter((l) => l.name?.toLowerCase().includes(busqueda.toLowerCase()) || l.code?.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div style={{ padding:'2rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontWeight:800, fontSize:'1.625rem', color:'#f2f2f2', display:'flex', alignItems:'center', gap:'0.5rem' }}><List size={22} color="#00d992"/> Líneas</h1>
          <p style={{ color:'#8b949e', fontSize:'0.875rem' }}>{filtradas.length} líneas registradas</p>
        </div>
        <button className="boton boton-primario" onClick={()=>{ setForm(formInicial); setModal('crear'); }}><Plus size={15}/> Nueva Línea</button>
      </div>
      <div style={{ position:'relative', maxWidth:360, marginBottom:'1.5rem' }}>
        <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#8b949e' }}/>
        <input className="campo-entrada" style={{ paddingLeft:'2.5rem' }} placeholder="Buscar líneas..." value={busqueda} onChange={(e)=>setBusqueda(e.target.value)}/>
      </div>
      {isLoading ? <Cargando/> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1rem' }}>
          {filtradas.map((l: any, i: number) => (
            <div key={l.id} className="tarjeta" style={{ animation:`deslizar-arriba 0.35s ease-out ${i*0.06}s forwards`, opacity:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.875rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                  <div style={{ width:38, height:38, borderRadius:9, background:`${l.color}20`, border:`1px solid ${l.color}40`, color:l.color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'0.75rem' }}>{l.code}</div>
                  <div>
                    <p style={{ fontWeight:700, fontSize:'0.9rem', color:'#f2f2f2' }}>{l.name}</p>
                    <p style={{ color:'#8b949e', fontSize:'0.75rem' }}>Bs. {l.fare}</p>
                    {l.syndicate && <p style={{ color:'#8b949e', fontSize:'0.7rem' }}>{l.syndicate.name}</p>}
                  </div>
                </div>
                <span className={`insignia ${l.active ? 'insignia-exito':'insignia-peligro'}`}>{l.active?'Activa':'Inactiva'}</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {l.imageUrl && <img src={l.imageUrl} alt={l.name} style={{ width:'100%', height:80, objectFit:'cover', borderRadius:6, marginBottom:'0.75rem' }}/>}
              <div style={{ display:'flex', gap:'0.5rem', paddingTop:'0.75rem', borderTop:'1px solid #3d3a39' }}>
                <button className="boton boton-secundario" style={{ flex:1, justifyContent:'center', fontSize:'0.75rem', padding:'0.4rem' }} onClick={()=>abrirEditar(l)}><Edit2 size={12}/> Editar</button>
                <button
                  className="boton"
                  style={{ flex:1, justifyContent:'center', fontSize:'0.75rem', padding:'0.4rem', background: l.active ? 'rgba(251,86,91,0.1)' : 'rgba(0,217,146,0.1)', color: l.active ? '#fb565b' : '#00d992', border: l.active ? '1px solid rgba(251,86,91,0.2)' : '1px solid rgba(0,217,146,0.2)' }}
                  onClick={()=>toggleActivo.mutate({ id:l.id, activo:!l.active })}
                  disabled={toggleActivo.isPending}
                >
                  {l.active ? <><ToggleRight size={13}/> Desactivar</> : <><ToggleLeft size={13}/> Activar</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {(modal==='crear'||modal==='editar') && (
        <Modal titulo={modal==='crear'?'Nueva Línea':'Editar Línea'} onCerrar={()=>setModal(null)}>
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {([['nombre','Nombre','text','Ej: Línea 1 — Centro'],['codigo','Código','text','Ej: L1'],['tarifa','Tarifa (Bs.)','number','2.50'],['imagenUrl','URL Imagen','text','https://...']] as [string,string,string,string][]).map(([k,l,t,ph])=>(
              <div key={k}>
                <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>{l}</label>
                <input type={t} className="campo-entrada" placeholder={ph} value={(form as any)[k]} onChange={(e)=>setForm({...form,[k]:e.target.value})}/>
              </div>
            ))}
            <div>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Sindicato</label>
              <select className="campo-entrada" value={form.sindicatoId} onChange={(e)=>setForm({...form,sindicatoId:e.target.value})}>
                <option value="">— Seleccionar sindicato —</option>
                {sindicatos.map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Color</label>
              <input type="color" value={form.color} onChange={(e)=>setForm({...form,color:e.target.value})} style={{ width:'100%', height:40, borderRadius:8, border:'1px solid #3d3a39', background:'#101010', cursor:'pointer' }}/>
            </div>
            <button className="boton boton-primario" style={{ justifyContent:'center' }} onClick={()=>{ console.log('[BTN GUARDAR] modal:', modal, 'seleccionado:', seleccionado); if(modal==='crear') { console.log('[BTN] Llamando crear'); crear.mutate(); } else { console.log('[BTN] Llamando actualizar'); actualizar.mutate(); } }} disabled={crear.isPending||actualizar.isPending}>
              {(crear.isPending||actualizar.isPending)?'Guardando...':'Guardar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
