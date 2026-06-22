'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, Trash2 } from 'lucide-react';
import { trasboardosServicio } from '../../../services/trasbordos.servicio';
import { Modal } from '../../../components/dashboard/Modal';
import { Cargando } from '../../../components/dashboard/Cargando';
import { useUsuarioAlmacen } from '../../../almacen/usuario.almacen';

const estColor: Record<string,string> = { SUGGESTED:'insignia-advertencia', ACCEPTED:'insignia-exito', REJECTED:'insignia-peligro', COMPLETED:'insignia-info' };
const estLabel: Record<string,string> = { SUGGESTED:'Sugerido', ACCEPTED:'Aceptado', REJECTED:'Rechazado', COMPLETED:'Completado' };

export default function PaginaTrasbordos() {
  const qc = useQueryClient();
  const { usuario } = useUsuarioAlmacen();
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modal, setModal] = useState<any>(null);
  const [nuevoEstado, setNuevoEstado] = useState('ACCEPTED');

  const { data: trasbordos=[], isLoading } = useQuery({ queryKey:['trasbordos', filtroEstado], queryFn:()=>trasboardosServicio.obtenerTodos(filtroEstado?{estado:filtroEstado}:undefined) });
  const decidir = useMutation({ mutationFn:()=>trasboardosServicio.decidir(modal.id,{estado:nuevoEstado, decididoPorId:parseInt(String(usuario?.id || 1))}), onSuccess:()=>{ qc.invalidateQueries({queryKey:['trasbordos']}); setModal(null); } });
  const eliminar = useMutation({ mutationFn:(id:string)=>trasboardosServicio.eliminar(id), onSuccess:()=>qc.invalidateQueries({queryKey:['trasbordos']}) });

  return (
    <div style={{ padding:'2rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem' }}>
        <div><h1 style={{ fontWeight:800, fontSize:'1.625rem', color:'#f2f2f2', display:'flex', alignItems:'center', gap:'0.5rem' }}><ArrowLeftRight size={22} color="#00d992"/> Trasbordos</h1><p style={{ color:'#8b949e', fontSize:'0.875rem' }}>{(trasbordos as any[]).length} trasbordos</p></div>
        <select className="campo-entrada" style={{ width:'auto' }} value={filtroEstado} onChange={(e)=>setFiltroEstado(e.target.value)}>
          <option value="">Todos</option>
          {['SUGGESTED','ACCEPTED','REJECTED','COMPLETED'].map(s=><option key={s} value={s}>{estLabel[s]}</option>)}
        </select>
      </div>
      {isLoading ? <Cargando/> : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {(trasbordos as any[]).map((t: any, i: number)=>(
            <div key={t.id} className="tarjeta" style={{ animation:`deslizar-arriba 0.3s ease-out ${i*0.04}s forwards`, opacity:0, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1rem 1.25rem' }}>
              <div style={{ display:'flex', gap:'1rem', alignItems:'center', flex:1 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'rgba(0,217,146,0.08)', border:'1px solid rgba(0,217,146,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}><ArrowLeftRight size={17} color="#00d992"/></div>
                <div>
                  <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.25rem' }}>
                    <span style={{ fontWeight:700, color:'#f2f2f2' }}>Viaje #{t.originTripId} → #{t.destinationTripId}</span>
                    <span className={`insignia ${estColor[t.status]||'insignia-info'}`}>{estLabel[t.status]||t.status}</span>
                  </div>
                  {t.reason && <p style={{ fontSize:'0.8125rem', color:'#b8b3b0' }}>{t.reason}</p>}
                  <p style={{ fontSize:'0.75rem', color:'#8b949e' }}>📍 {t.latitude}, {t.longitude} · {new Date(t.suggestedAt).toLocaleString('es-BO')}</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:'0.375rem', flexShrink:0, marginLeft:'1rem' }}>
                {t.status==='SUGGESTED' && <button className="boton boton-secundario" style={{ padding:'0.375rem 0.75rem', fontSize:'0.75rem' }} onClick={()=>{ setModal(t); setNuevoEstado('ACCEPTED'); }}>Decidir</button>}
                <button className="boton" style={{ padding:'0.375rem 0.5rem', background:'rgba(251,86,91,0.1)', color:'#fb565b', border:'1px solid rgba(251,86,91,0.2)' }} onClick={()=>{ if(confirm('¿Eliminar trasbordo?')) eliminar.mutate(t.id) }}><Trash2 size={13}/></button>
              </div>
            </div>
          ))}
          {(trasbordos as any[]).length===0 && <div style={{ padding:'3rem', textAlign:'center', color:'#8b949e' }}>No hay trasbordos</div>}
        </div>
      )}
      {modal && (
        <Modal titulo="Decidir Trasbordo" onCerrar={()=>setModal(null)} ancho={360}>
          <div style={{ marginBottom:'1rem' }}>
            <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Decisión</label>
            <select className="campo-entrada" value={nuevoEstado} onChange={(e)=>setNuevoEstado(e.target.value)}>
              <option value="ACCEPTED">Aceptar</option>
              <option value="REJECTED">Rechazar</option>
              <option value="COMPLETED">Completado</option>
            </select>
          </div>
          <button className="boton boton-primario" style={{ justifyContent:'center', width:'100%' }} onClick={()=>decidir.mutate()} disabled={decidir.isPending}>{decidir.isPending?'Guardando...':'Confirmar Decisión'}</button>
        </Modal>
      )}
    </div>
  );
}
