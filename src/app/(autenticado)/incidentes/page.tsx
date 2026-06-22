'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Search, CheckCircle, Trash2 } from 'lucide-react';
import { incidentesServicio } from '../../../services/incidentes.servicio';
import { Modal } from '../../../components/dashboard/Modal';
import { Cargando } from '../../../components/dashboard/Cargando';
import { io } from 'socket.io-client';
import { useUsuarioAlmacen } from '../../../almacen/usuario.almacen';

const estColor: Record<string,string> = { PENDING:'insignia-advertencia', IN_REVIEW:'insignia-info', RESOLVED:'insignia-exito', CLOSED:'insignia-peligro' };
const estLabel: Record<string,string> = { PENDING:'Pendiente', IN_REVIEW:'En Revisión', RESOLVED:'Resuelto', CLOSED:'Cerrado' };
const tipoLabel: Record<string,string> = { MECHANICAL_FAILURE:'Falla Mecánica', ACCIDENT:'Accidente', PASSENGER_ISSUE:'Problema Pasajero', ROAD_BLOCK:'Bloqueo', WEATHER:'Clima', OTHER:'Otro' };

export default function PaginaIncidentes() {
  const qc = useQueryClient();
  const { usuario } = useUsuarioAlmacen();
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal] = useState<any>(null);
  const [notaRevision, setNotaRevision] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState('IN_REVIEW');

  const { data: incidentes=[], isLoading } = useQuery({ queryKey:['incidentes', filtroEstado], queryFn:()=>incidentesServicio.obtenerTodos(filtroEstado?{estado:filtroEstado}:undefined) });
  const revisar = useMutation({ mutationFn:()=>incidentesServicio.revisar(modal.id, { estado:nuevoEstado, revisadoPorId:parseInt(String(usuario?.id || 1)), notasRevision:notaRevision||undefined }), onSuccess:()=>{ qc.invalidateQueries({queryKey:['incidentes']}); setModal(null); } });
  const eliminar = useMutation({ mutationFn:(id:string)=>incidentesServicio.eliminar(id), onSuccess:()=>qc.invalidateQueries({queryKey:['incidentes']}) });

  useEffect(()=>{
    const ws = io(process.env.NEXT_PUBLIC_WS_URL||'http://localhost:4000', { path:'/incidentes' });
    ws.on('nuevo-incidente', ()=>qc.invalidateQueries({queryKey:['incidentes']}));
    return ()=>{ ws.disconnect(); };
  },[qc]);

  const filtrados = (incidentes as any[]).filter((i: any)=>tipoLabel[i.type]?.toLowerCase().includes(busqueda.toLowerCase())||i.description?.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div style={{ padding:'2rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem' }}>
        <div><h1 style={{ fontWeight:800, fontSize:'1.625rem', color:'#f2f2f2', display:'flex', alignItems:'center', gap:'0.5rem' }}><AlertTriangle size={22} color="#ffba00"/> Incidentes</h1><p style={{ color:'#8b949e', fontSize:'0.875rem' }}>{filtrados.length} incidentes</p></div>
        <span className="insignia insignia-vivo">WS en vivo</span>
      </div>
      <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}><Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#8b949e' }}/><input className="campo-entrada" style={{ paddingLeft:'2.5rem' }} placeholder="Buscar..." value={busqueda} onChange={(e)=>setBusqueda(e.target.value)}/></div>
        <select className="campo-entrada" style={{ width:'auto' }} value={filtroEstado} onChange={(e)=>setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {['PENDING','IN_REVIEW','RESOLVED','CLOSED'].map(s=><option key={s} value={s}>{estLabel[s]}</option>)}
        </select>
      </div>
      {isLoading ? <Cargando/> : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {filtrados.map((inc: any, i: number)=>(
            <div key={inc.id} className="tarjeta" style={{ animation:`deslizar-arriba 0.3s ease-out ${i*0.04}s forwards`, opacity:0, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1rem 1.25rem' }}>
              <div style={{ display:'flex', gap:'1rem', alignItems:'center', flex:1 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'rgba(255,186,0,0.1)', border:'1px solid rgba(255,186,0,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><AlertTriangle size={18} color="#ffba00"/></div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', marginBottom:'0.25rem' }}>
                    <span style={{ fontWeight:700, color:'#f2f2f2', fontSize:'0.9rem' }}>{tipoLabel[inc.type]||inc.type}</span>
                    <span className={`insignia ${estColor[inc.status]||'insignia-info'}`}>{estLabel[inc.status]||inc.status}</span>
                  </div>
                  <p style={{ fontSize:'0.8125rem', color:'#b8b3b0' }}>{inc.description}</p>
                  <p style={{ fontSize:'0.75rem', color:'#8b949e', marginTop:'0.25rem' }}>Conductor: {inc.driver?.user?.name||inc.driverId} · Viaje: {inc.tripId} · {new Date(inc.reportedAt).toLocaleString('es-BO')}</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:'0.375rem', flexShrink:0, marginLeft:'1rem' }}>
                {inc.status!=='RESOLVED'&&inc.status!=='CLOSED' && <button className="boton boton-secundario" style={{ padding:'0.375rem 0.625rem', fontSize:'0.75rem' }} onClick={()=>{ setModal(inc); setNuevoEstado('IN_REVIEW'); setNotaRevision(''); }}><CheckCircle size={13}/> Revisar</button>}
                <button className="boton" style={{ padding:'0.375rem 0.5rem', background:'rgba(251,86,91,0.1)', color:'#fb565b', border:'1px solid rgba(251,86,91,0.2)' }} onClick={()=>{ if(confirm('¿Eliminar incidente?')) eliminar.mutate(inc.id) }}><Trash2 size={13}/></button>
              </div>
            </div>
          ))}
          {filtrados.length===0 && <div style={{ padding:'3rem', textAlign:'center', color:'#8b949e' }}>No hay incidentes con estos filtros</div>}
        </div>
      )}
      {modal && (
        <Modal titulo="Revisar Incidente" onCerrar={()=>setModal(null)} ancho={420}>
          <div style={{ marginBottom:'0.875rem', padding:'0.875rem', background:'rgba(61,58,57,0.3)', borderRadius:8 }}>
            <p style={{ fontWeight:600, color:'#f2f2f2', marginBottom:'0.25rem' }}>{tipoLabel[modal.type]||modal.type}</p>
            <p style={{ fontSize:'0.8125rem', color:'#b8b3b0' }}>{modal.description}</p>
          </div>
          <div style={{ marginBottom:'0.875rem' }}>
            <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Nuevo Estado</label>
            <select className="campo-entrada" value={nuevoEstado} onChange={(e)=>setNuevoEstado(e.target.value)}>
              {['IN_REVIEW','RESOLVED','CLOSED'].map(s=><option key={s} value={s}>{estLabel[s]}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:'1rem' }}>
            <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Notas de revisión</label>
            <textarea className="campo-entrada" style={{ minHeight:80, resize:'vertical' }} value={notaRevision} onChange={(e)=>setNotaRevision(e.target.value)} placeholder="Observaciones..."/>
          </div>
          <button className="boton boton-primario" style={{ justifyContent:'center', width:'100%' }} onClick={()=>revisar.mutate()} disabled={revisar.isPending}>{revisar.isPending?'Guardando...':'Guardar Revisión'}</button>
        </Modal>
      )}
    </div>
  );
}
