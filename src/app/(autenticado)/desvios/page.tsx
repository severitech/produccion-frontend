'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GitBranch, Search, CheckCircle } from 'lucide-react';
import { desviosServicio } from '../../../services/desvios.servicio';
import { Modal } from '../../../components/dashboard/Modal';
import { Cargando } from '../../../components/dashboard/Cargando';
import { useUsuarioAlmacen } from '../../../almacen/usuario.almacen';

export default function PaginaDesvios() {
  const qc = useQueryClient();
  const { usuario } = useUsuarioAlmacen();
  const [filtroJust, setFiltroJust] = useState('');
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState({ justificado: true, justificacion:'' });

  const { data: desvios=[], isLoading } = useQuery({ queryKey:['desvios', filtroJust], queryFn:()=>desviosServicio.obtenerTodos(filtroJust?{justificado:filtroJust}:undefined) });
  const justificar = useMutation({ mutationFn:()=>desviosServicio.justificar(modal.id,{...form, revisadoPorId:parseInt(String(usuario?.id || 1))}), onSuccess:()=>{ qc.invalidateQueries({queryKey:['desvios']}); setModal(null); } });

  return (
    <div style={{ padding:'2rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem' }}>
        <div><h1 style={{ fontWeight:800, fontSize:'1.625rem', color:'#f2f2f2', display:'flex', alignItems:'center', gap:'0.5rem' }}><GitBranch size={22} color="#4cb3d4"/> Desvíos de Ruta</h1><p style={{ color:'#8b949e', fontSize:'0.875rem' }}>{(desvios as any[]).length} desvíos detectados</p></div>
        <select className="campo-entrada" style={{ width:'auto' }} value={filtroJust} onChange={(e)=>setFiltroJust(e.target.value)}>
          <option value="">Todos</option>
          <option value="false">Sin justificar</option>
          <option value="true">Justificados</option>
        </select>
      </div>
      {isLoading ? <Cargando/> : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {(desvios as any[]).map((d: any, i: number)=>(
            <div key={d.id} className="tarjeta" style={{ animation:`deslizar-arriba 0.3s ease-out ${i*0.04}s forwards`, opacity:0, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1rem 1.25rem' }}>
              <div style={{ display:'flex', gap:'1rem', alignItems:'center' }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'rgba(76,179,212,0.1)', border:'1px solid rgba(76,179,212,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}><GitBranch size={18} color="#4cb3d4"/></div>
                <div>
                  <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.25rem' }}>
                    <span style={{ fontWeight:700, color:'#f2f2f2' }}>Viaje #{d.tripId}</span>
                    <span className={`insignia ${d.justified?'insignia-exito':'insignia-advertencia'}`}>{d.justified?'Justificado':'Sin justificar'}</span>
                  </div>
                  <p style={{ fontSize:'0.8125rem', color:'#b8b3b0' }}>Distancia: <strong style={{ color:'#ffba00' }}>{d.distanceMeters}m</strong> fuera de ruta</p>
                  <p style={{ fontSize:'0.75rem', color:'#8b949e' }}>📍 {d.latitude}, {d.longitude} · {new Date(d.detectedAt).toLocaleString('es-BO')}</p>
                  {d.justification && <p style={{ fontSize:'0.75rem', color:'#00d992', marginTop:'0.25rem' }}>Justif.: {d.justification}</p>}
                </div>
              </div>
              {!d.justified && <button className="boton boton-secundario" style={{ padding:'0.375rem 0.75rem', fontSize:'0.75rem', flexShrink:0 }} onClick={()=>{ setModal(d); setForm({justificado:true,justificacion:''}); }}><CheckCircle size={13}/> Justificar</button>}
            </div>
          ))}
          {(desvios as any[]).length===0 && <div style={{ padding:'3rem', textAlign:'center', color:'#8b949e' }}>No hay desvíos registrados</div>}
        </div>
      )}
      {modal && (
        <Modal titulo="Justificar Desvío" onCerrar={()=>setModal(null)} ancho={400}>
          <div style={{ marginBottom:'1rem' }}>
            <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>¿Está justificado?</label>
            <select className="campo-entrada" value={String(form.justificado)} onChange={(e)=>setForm({...form,justificado:e.target.value==='true'})}>
              <option value="true">Sí, justificado</option>
              <option value="false">No justificado</option>
            </select>
          </div>
          <div style={{ marginBottom:'1rem' }}>
            <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Justificación</label>
            <textarea className="campo-entrada" style={{ minHeight:80, resize:'vertical' }} value={form.justificacion} onChange={(e)=>setForm({...form,justificacion:e.target.value})} placeholder="Motivo del desvío..."/>
          </div>
          <button className="boton boton-primario" style={{ justifyContent:'center', width:'100%' }} onClick={()=>justificar.mutate()} disabled={justificar.isPending}>{justificar.isPending?'Guardando...':'Guardar'}</button>
        </Modal>
      )}
    </div>
  );
}
