'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Plus, Trash2, Check } from 'lucide-react';
import { notificacionesServicio } from '../../../services/notificaciones.servicio';
import { Modal } from '../../../components/dashboard/Modal';
import { Cargando } from '../../../components/dashboard/Cargando';
import { useUsuarioAlmacen } from '../../../almacen/usuario.almacen';
import { io } from 'socket.io-client';

const tipoColor: Record<string,string> = { SERVICE_ALERT:'insignia-peligro', ROUTE_DEVIATION:'insignia-advertencia', MAINTENANCE:'insignia-info', INCIDENT:'insignia-advertencia', PAYMENT:'insignia-exito', SYSTEM:'insignia-info' };
const tipos = ['SERVICE_ALERT','ROUTE_DEVIATION','MAINTENANCE','INCIDENT','PAYMENT','SYSTEM'];

export default function PaginaNotificaciones() {
  const qc = useQueryClient();
  const { usuario } = useUsuarioAlmacen();
  const [modal, setModal] = useState(false);
  const [vivos, setVivos] = useState<any[]>([]);
  const [form, setForm] = useState({ titulo:'', cuerpo:'', tipo:'SYSTEM', rolDestino:'', usuarioDestinoId:'' });

  const { data: notificaciones=[], isLoading } = useQuery({ queryKey:['notificaciones'], queryFn:()=>notificacionesServicio.obtenerTodas() });
  const crear = useMutation({ mutationFn:()=>notificacionesServicio.crear({ titulo:form.titulo, cuerpo:form.cuerpo, tipo:form.tipo, rolDestino:form.rolDestino||undefined, usuarioDestinoId:form.usuarioDestinoId?parseInt(form.usuarioDestinoId):undefined, creadoPorId:parseInt(String(usuario?.id || 1)) }), onSuccess:()=>{ qc.invalidateQueries({queryKey:['notificaciones']}); setModal(false); } });
  const eliminar = useMutation({ mutationFn:(id:string)=>notificacionesServicio.eliminar(id), onSuccess:()=>qc.invalidateQueries({queryKey:['notificaciones']}) });
  const marcarLeida = useMutation({ mutationFn:(id:string)=>notificacionesServicio.marcarLeida(id, String(usuario?.id||1)), onSuccess:()=>qc.invalidateQueries({queryKey:['notificaciones']}) });

  useEffect(()=>{
    const ws = io(process.env.NEXT_PUBLIC_WS_URL||'http://localhost:4000', { path:'/notificaciones' });
    if (usuario?.id) ws.emit('suscribir-usuario',{usuarioId:usuario.id});
    ws.on('nueva-notificacion',(n)=>{ setVivos(prev=>[n,...prev.slice(0,4)]); setTimeout(()=>setVivos(prev=>prev.filter(x=>x.id!==n.id)),6000); });
    return ()=>{ ws.disconnect(); };
  },[usuario]);

  return (
    <div style={{ padding:'2rem' }}>
      {vivos.length>0 && (
        <div style={{ position:'fixed', top:'1rem', right:'1rem', zIndex:9999, display:'flex', flexDirection:'column', gap:'0.5rem' }}>
          {vivos.map((n,i)=>(
            <div key={i} className="tarjeta animar-aparecer" style={{ maxWidth:320, padding:'0.875rem 1rem', borderColor:'rgba(0,217,146,0.3)' }}>
              <p style={{ fontWeight:700, color:'#00d992', fontSize:'0.8125rem' }}>{n.titulo}</p>
              <p style={{ color:'#b8b3b0', fontSize:'0.75rem', marginTop:'0.25rem' }}>{n.cuerpo}</p>
            </div>
          ))}
        </div>
      )}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem' }}>
        <div><h1 style={{ fontWeight:800, fontSize:'1.625rem', color:'#f2f2f2', display:'flex', alignItems:'center', gap:'0.5rem' }}><Bell size={22} color="#00d992"/> Notificaciones</h1><p style={{ color:'#8b949e', fontSize:'0.875rem' }}>{(notificaciones as any[]).length} notificaciones</p></div>
        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
          <span className="insignia insignia-vivo">WS en vivo</span>
          <button className="boton boton-primario" onClick={()=>{ setForm({titulo:'',cuerpo:'',tipo:'SYSTEM',rolDestino:'',usuarioDestinoId:''}); setModal(true); }}><Plus size={15}/> Nueva</button>
        </div>
      </div>
      {isLoading ? <Cargando/> : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {(notificaciones as any[]).map((n: any, i: number)=>(
            <div key={n.id} className="tarjeta" style={{ animation:`deslizar-arriba 0.3s ease-out ${i*0.04}s forwards`, opacity:0, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1rem 1.25rem' }}>
              <div style={{ display:'flex', gap:'1rem', alignItems:'center', flex:1 }}>
                <Bell size={18} color="#8b949e" style={{ flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.25rem' }}>
                    <span style={{ fontWeight:700, color:'#f2f2f2' }}>{n.title}</span>
                    <span className={`insignia ${tipoColor[n.type]||'insignia-info'}`}>{n.type}</span>
                  </div>
                  <p style={{ fontSize:'0.8125rem', color:'#b8b3b0' }}>{n.body}</p>
                  <p style={{ fontSize:'0.75rem', color:'#8b949e', marginTop:'0.25rem' }}>{new Date(n.createdAt).toLocaleString('es-BO')}</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:'0.375rem', flexShrink:0, marginLeft:'1rem' }}>
                <button className="boton boton-secundario" style={{ padding:'0.375rem 0.5rem' }} onClick={()=>marcarLeida.mutate(n.id)}><Check size={13}/></button>
                <button className="boton" style={{ padding:'0.375rem 0.5rem', background:'rgba(251,86,91,0.1)', color:'#fb565b', border:'1px solid rgba(251,86,91,0.2)' }} onClick={()=>{ if(confirm('¿Eliminar?')) eliminar.mutate(n.id) }}><Trash2 size={13}/></button>
              </div>
            </div>
          ))}
          {(notificaciones as any[]).length===0 && <div style={{ padding:'3rem', textAlign:'center', color:'#8b949e' }}>No hay notificaciones</div>}
        </div>
      )}
      {modal && (
        <Modal titulo="Nueva Notificación" onCerrar={()=>setModal(false)}>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
            <div><label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Título</label><input className="campo-entrada" value={form.titulo} onChange={(e)=>setForm({...form,titulo:e.target.value})}/></div>
            <div><label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Cuerpo</label><textarea className="campo-entrada" style={{ minHeight:80, resize:'vertical' }} value={form.cuerpo} onChange={(e)=>setForm({...form,cuerpo:e.target.value})}/></div>
            <div><label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Tipo</label><select className="campo-entrada" value={form.tipo} onChange={(e)=>setForm({...form,tipo:e.target.value})}>{tipos.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
              <div><label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Rol destino (opc)</label><input className="campo-entrada" placeholder="DRIVER / PASSENGER..." value={form.rolDestino} onChange={(e)=>setForm({...form,rolDestino:e.target.value})}/></div>
              <div><label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>ID Usuario destino</label><input type="number" className="campo-entrada" value={form.usuarioDestinoId} onChange={(e)=>setForm({...form,usuarioDestinoId:e.target.value})}/></div>
            </div>
            <button className="boton boton-primario" style={{ justifyContent:'center' }} onClick={()=>crear.mutate()} disabled={crear.isPending}>{crear.isPending?'Enviando...':'Enviar Notificación'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
