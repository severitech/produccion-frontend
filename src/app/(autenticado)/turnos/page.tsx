'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Clock, Edit2, ToggleLeft, ToggleRight, Sun, Sunset, Moon } from 'lucide-react';
import { turnosServicio } from '../../../services/turnos.servicio';
import { Modal } from '../../../components/dashboard/Modal';
import { Cargando } from '../../../components/dashboard/Cargando';

// ── Constantes ──────────────────────────────────────────────────────────────
const TURNOS_PRESET = [
  { valor: 'Mañana',  horaInicio: '06:00:00', horaFin: '14:00:00', color: '#f5a623', icon: 'sun' },
  { valor: 'Tarde',   horaInicio: '14:00:00', horaFin: '22:00:00', color: '#e07b39', icon: 'sunset' },
  { valor: 'Noche',   horaInicio: '22:00:00', horaFin: '06:00:00', color: '#4cb3d4', icon: 'moon' },
] as const;

const TURNO_COLOR: Record<string,string> = { Mañana:'#f5a623', Tarde:'#e07b39', Noche:'#4cb3d4' };
const TURNO_BG:    Record<string,string> = { Mañana:'rgba(245,166,35,0.12)', Tarde:'rgba(224,123,57,0.12)', Noche:'rgba(76,179,212,0.12)' };

const DIAS_MAP: Record<string,string> = { '1':'Lun','2':'Mar','3':'Mié','4':'Jue','5':'Vie','6':'Sáb','7':'Dom' };
const TODOS_DIAS = ['1','2','3','4','5','6','7'] as const;

type Turno = {
  id: string;
  name?: string;
  daysOfWeek: string;
  startTime?: string;
  endTime?: string;
  expectedRounds?: number;
  active: boolean;
  _count?: { assignments: number };
};
type FormTurno = { nombre: string; diasSemana: string[]; horaInicio: string; horaFin: string; vueltasEsperadas: string };

const formInicial: FormTurno = { nombre:'Mañana', diasSemana:['1','2','3','4','5'], horaInicio:'06:00:00', horaFin:'14:00:00', vueltasEsperadas:'' };

function TurnoIcon({ nombre, size = 18 }: { nombre?: string; size?: number }) {
  if (nombre === 'Noche') return <Moon size={size} color={TURNO_COLOR['Noche']}/>;
  if (nombre === 'Tarde') return <Sunset size={size} color={TURNO_COLOR['Tarde']}/>;
  return <Sun size={size} color={TURNO_COLOR['Mañana']}/>;
}

function parseHora(dt?: string) {
  if (!dt) return '—';
  // Puede ser "1970-01-01T06:00:00.000Z" o "06:00:00"
  if (dt.includes('T')) return dt.slice(11, 16);
  return dt.slice(0, 5);
}

export default function PaginaTurnos() {
  const qc = useQueryClient();
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [modal, setModal] = useState<'crear'|'editar'|null>(null);
  const [sel, setSel] = useState<Turno | null>(null);
  const [form, setForm] = useState<FormTurno>(formInicial);

  const { data: turnos = [], isLoading } = useQuery<Turno[]>({ queryKey:['turnos'], queryFn:()=>turnosServicio.obtenerTodos() });

  const diasStr = (d: string[]) => d.slice().sort().join(',');

  const crear = useMutation({
    mutationFn: () => turnosServicio.crear({ nombre:form.nombre, diasSemana:diasStr(form.diasSemana), horaInicio:form.horaInicio, horaFin:form.horaFin, vueltasEsperadas:form.vueltasEsperadas?parseInt(form.vueltasEsperadas):undefined }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['turnos']}); setModal(null); },
  });
  const actualizar = useMutation({
    mutationFn: () => turnosServicio.actualizar(sel!.id, { nombre:form.nombre, diasSemana:diasStr(form.diasSemana), horaInicio:form.horaInicio, horaFin:form.horaFin, vueltasEsperadas:form.vueltasEsperadas?parseInt(form.vueltasEsperadas):undefined }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['turnos']}); setModal(null); },
  });
  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => turnosServicio.actualizar(id, { activo }),
    onSuccess: () => qc.invalidateQueries({queryKey:['turnos']}),
  });

  const abrirEditar = (t: Turno) => {
    setSel(t);
    setForm({ nombre: t.name || 'Mañana', diasSemana: (t.daysOfWeek || '').split(',').map(d=>d.trim()).filter(Boolean), horaInicio: t.startTime?.includes('T') ? t.startTime.slice(11,19) : (t.startTime || '06:00:00'), horaFin: t.endTime?.includes('T') ? t.endTime.slice(11,19) : (t.endTime || '14:00:00'), vueltasEsperadas: String(t.expectedRounds||'') });
    setModal('editar');
  };

  const toggleDia = (d: string) => {
    setForm(prev => ({ ...prev, diasSemana: prev.diasSemana.includes(d) ? prev.diasSemana.filter(x=>x!==d) : [...prev.diasSemana, d] }));
  };

  const aplicarPreset = (nombre: typeof TURNOS_PRESET[number]['valor']) => {
    const p = TURNOS_PRESET.find(x=>x.valor===nombre)!;
    setForm(prev => ({ ...prev, nombre, horaInicio: p.horaInicio, horaFin: p.horaFin }));
  };

  const filtrados = turnos.filter(t => {
    const coincideNombre = !filtroNombre || t.name === filtroNombre;
    const coincideActivo = !filtroActivo || (filtroActivo==='activo' ? t.active : !t.active);
    return coincideNombre && coincideActivo;
  });

  return (
    <div style={{ padding:'2rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontWeight:800, fontSize:'1.625rem', color:'#f2f2f2', display:'flex', alignItems:'center', gap:'0.5rem' }}><Clock size={22} color="#00d992"/> Turnos</h1>
          <p style={{ color:'#8b949e', fontSize:'0.875rem' }}>{filtrados.length} turnos encontrados</p>
        </div>
        <button className="boton boton-primario" onClick={()=>{ setForm(formInicial); setModal('crear'); }}><Plus size={15}/> Nuevo Turno</button>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', marginBottom:'1.5rem' }}>
        <select className="campo-entrada" style={{ flex:'0 1 170px' }} value={filtroNombre} onChange={(e)=>setFiltroNombre(e.target.value)}>
          <option value="">Todos los turnos</option>
          {TURNOS_PRESET.map(p=><option key={p.valor} value={p.valor}>{p.valor}</option>)}
        </select>
        <select className="campo-entrada" style={{ flex:'0 1 150px' }} value={filtroActivo} onChange={(e)=>setFiltroActivo(e.target.value)}>
          <option value="">Activo/Inactivo</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      {isLoading ? <Cargando/> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1rem' }}>
          {filtrados.map((t, i) => {
            const color = TURNO_COLOR[t.name||''] || '#00d992';
            const bg    = TURNO_BG[t.name||'']    || 'rgba(0,217,146,0.08)';
            const inicio = parseHora(t.startTime);
            const fin    = parseHora(t.endTime);
            return (
              <div key={t.id} className="tarjeta" style={{ animation:`deslizar-arriba 0.35s ease-out ${i*0.05}s forwards`, opacity:0, borderTop:`2px solid ${color}` }}>
                {/* Cabecera */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.875rem' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.625rem' }}>
                    <div style={{ width:38, height:38, borderRadius:9, background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <TurnoIcon nombre={t.name} size={18}/>
                    </div>
                    <div>
                      <p style={{ fontWeight:700, color:'#f2f2f2', fontSize:'0.9375rem' }}>{t.name || 'Sin nombre'}</p>
                      <p style={{ color, fontSize:'0.78rem', fontWeight:600 }}>{inicio} – {fin}</p>
                    </div>
                  </div>
                  <span className={`insignia ${t.active?'insignia-exito':'insignia-peligro'}`}>{t.active?'Activo':'Inactivo'}</span>
                </div>

                {/* Días */}
                <div style={{ display:'flex', gap:'0.3rem', marginBottom:'0.75rem', flexWrap:'wrap' }}>
                  {TODOS_DIAS.map(d => {
                    const activo = t.daysOfWeek?.split(',').map(x=>x.trim()).includes(d);
                    return (
                      <span key={d} style={{ fontSize:'0.6875rem', padding:'0.25rem 0.5rem', borderRadius:5, fontWeight:700, background: activo ? bg : 'rgba(61,58,57,0.35)', color: activo ? color : '#555', border:`1px solid ${activo ? color+'50' : 'transparent'}` }}>{DIAS_MAP[d]}</span>
                    );
                  })}
                </div>

                {/* Vueltas */}
                {t.expectedRounds && (
                  <p style={{ fontSize:'0.775rem', color:'#8b949e', marginBottom:'0.5rem' }}>
                    <span style={{ color:'#b8b3b0', fontWeight:600 }}>{t.expectedRounds}</span> vueltas esperadas
                  </p>
                )}
                {t._count && (
                  <p style={{ fontSize:'0.75rem', color:'#8b949e' }}>{t._count.assignments} asignaciones</p>
                )}

                {/* Acciones */}
                <div style={{ display:'flex', gap:'0.375rem', paddingTop:'0.875rem', borderTop:'1px solid #3d3a39', marginTop:'0.75rem' }}>
                  <button className="boton boton-secundario" style={{ flex:1, justifyContent:'center', fontSize:'0.75rem', padding:'0.375rem' }} onClick={()=>abrirEditar(t)}><Edit2 size={12}/> Editar</button>
                  <button
                    className="boton"
                    style={{ flex:1, justifyContent:'center', fontSize:'0.72rem', padding:'0.375rem', background:t.active?'rgba(251,86,91,0.1)':'rgba(0,217,146,0.1)', color:t.active?'#fb565b':'#00d992', border:t.active?'1px solid rgba(251,86,91,0.2)':'1px solid rgba(0,217,146,0.2)', display:'flex', alignItems:'center', gap:'0.25rem' }}
                    onClick={()=>toggleActivo.mutate({ id:t.id, activo:!t.active })}
                    disabled={toggleActivo.isPending}
                  >
                    {t.active ? <><ToggleRight size={12}/> Desactivar</> : <><ToggleLeft size={12}/> Activar</>}
                  </button>
                </div>
              </div>
            );
          })}
          {filtrados.length === 0 && !isLoading && (
            <p style={{ color:'#8b949e', gridColumn:'1/-1', textAlign:'center', paddingTop:'2rem' }}>Sin turnos encontrados</p>
          )}
        </div>
      )}

      {/* Modal */}
      {(modal==='crear'||modal==='editar') && (
        <Modal titulo={modal==='crear'?'Nuevo Turno':'Editar Turno'} onCerrar={()=>setModal(null)} ancho={440}>
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

            {/* Selector de turno como tarjetas */}
            <div>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.5rem' }}>Turno</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.5rem' }}>
                {TURNOS_PRESET.map(p => {
                  const activo = form.nombre === p.valor;
                  return (
                    <button
                      key={p.valor}
                      type="button"
                      onClick={()=>aplicarPreset(p.valor)}
                      style={{ padding:'0.75rem 0.5rem', borderRadius:10, border:`2px solid ${activo ? TURNO_COLOR[p.valor] : '#3d3a39'}`, background: activo ? TURNO_BG[p.valor] : 'rgba(61,58,57,0.3)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'0.375rem', transition:'all 0.15s' }}
                    >
                      <TurnoIcon nombre={p.valor} size={20}/>
                      <span style={{ fontSize:'0.8125rem', fontWeight:700, color: activo ? TURNO_COLOR[p.valor] : '#b8b3b0' }}>{p.valor}</span>
                      <span style={{ fontSize:'0.7rem', color:'#8b949e' }}>{p.horaInicio.slice(0,5)}–{p.horaFin.slice(0,5)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Horas personalizables */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
              <div>
                <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Hora inicio</label>
                <input type="time" className="campo-entrada" value={form.horaInicio.slice(0,5)} onChange={(e)=>setForm({...form,horaInicio:e.target.value+':00'})}/>
              </div>
              <div>
                <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Hora fin</label>
                <input type="time" className="campo-entrada" value={form.horaFin.slice(0,5)} onChange={(e)=>setForm({...form,horaFin:e.target.value+':00'})}/>
              </div>
            </div>

            {/* Selector de días como botones toggle */}
            <div>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.5rem' }}>Días de operación</label>
              <div style={{ display:'flex', gap:'0.375rem' }}>
                {TODOS_DIAS.map(d => {
                  const sel = form.diasSemana.includes(d);
                  const color = TURNO_COLOR[form.nombre] || '#00d992';
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={()=>toggleDia(d)}
                      style={{ flex:1, padding:'0.5rem 0', borderRadius:7, border:`1.5px solid ${sel ? color : '#3d3a39'}`, background: sel ? `${color}20` : 'rgba(61,58,57,0.3)', color: sel ? color : '#8b949e', fontWeight:700, fontSize:'0.7rem', cursor:'pointer', transition:'all 0.15s' }}
                    >
                      {DIAS_MAP[d]}
                    </button>
                  );
                })}
              </div>
              {/* Atajos */}
              <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.5rem' }}>
                {[['L–V',['1','2','3','4','5']],['L–S',['1','2','3','4','5','6']],['Todos',['1','2','3','4','5','6','7']]] .map(([lbl,ds])=>(
                  <button key={lbl as string} type="button" onClick={()=>setForm(p=>({...p,diasSemana:ds as string[]}))} style={{ fontSize:'0.7rem', padding:'0.25rem 0.625rem', borderRadius:5, border:'1px solid #3d3a39', background:'rgba(61,58,57,0.4)', color:'#8b949e', cursor:'pointer' }}>{lbl as string}</button>
                ))}
                <button type="button" onClick={()=>setForm(p=>({...p,diasSemana:[]}))} style={{ fontSize:'0.7rem', padding:'0.25rem 0.625rem', borderRadius:5, border:'1px solid rgba(251,86,91,0.3)', background:'rgba(251,86,91,0.08)', color:'#fb565b', cursor:'pointer' }}>Limpiar</button>
              </div>
            </div>

            {/* Vueltas esperadas */}
            <div>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Vueltas esperadas</label>
              <input type="number" min="1" className="campo-entrada" placeholder="Ej: 8" value={form.vueltasEsperadas} onChange={(e)=>setForm({...form,vueltasEsperadas:e.target.value})}/>
            </div>

            <button className="boton boton-primario" style={{ justifyContent:'center' }} onClick={()=>modal==='crear'?crear.mutate():actualizar.mutate()} disabled={crear.isPending||actualizar.isPending}>
              {(crear.isPending||actualizar.isPending)?'Guardando...':'Guardar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
