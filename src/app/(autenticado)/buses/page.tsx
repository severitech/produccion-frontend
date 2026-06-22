'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Bus as BusIcon, Edit2, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight } from 'lucide-react';
const Bus = BusIcon;
import { busesServicio } from '../../../services/buses.servicio';
import type { Bus } from '../../../services/buses.servicio';
import { sindicatosServicio } from '../../../services/sindicatos.servicio';
import type { Sindicato as SindicatoType } from '../../../services/sindicatos.servicio';
import { lineasServicio } from '../../../services/lineas.servicio';
import type { Linea as LineaType } from '../../../services/lineas.servicio';
import { Modal } from '../../../components/dashboard/Modal';
import { Cargando } from '../../../components/dashboard/Cargando';

const estadoOpColor: Record<string,string> = { ACTIVE:'insignia-exito', MAINTENANCE:'insignia-advertencia', INACTIVE:'insignia-info', OUT_OF_SERVICE:'insignia-peligro' };
const estadoOpLabel: Record<string,string> = { ACTIVE:'Activo', MAINTENANCE:'Mantenimiento', INACTIVE:'Inactivo', OUT_OF_SERVICE:'Fuera de servicio' };

type Linea = { id: string | number; numero?: string; nombre?: string; name?: string; code?: string };
type Sindicato = { id: string | number; nombre?: string; name?: string };
type FormBus = { sindicatoId: string; lineaId: string; numeroInterno: string; placa: string; modelo: string; capacidad: string; anioFabricacion: string; estadoOperacional: string };

const formInicial: FormBus = { sindicatoId:'', lineaId:'', numeroInterno:'', placa:'', modelo:'', capacidad:'35', anioFabricacion:'', estadoOperacional: 'ACTIVE' };
const POR_PAGINA = 10;

export default function PaginaBuses() {
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [filtroEstadoOp, setFiltroEstadoOp] = useState('');
  const [filtroSindicato, setFiltroSindicato] = useState('');
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState<'crear'|'editar'|null>(null);
  const [seleccionado, setSeleccionado] = useState<Bus | null>(null);
  const [form, setForm] = useState<FormBus>(formInicial);

  const { data: buses = [], isLoading } = useQuery<Bus[]>({ queryKey:['buses'], queryFn: () => busesServicio.obtenerTodos() });
  const { data: sindicatos = [] } = useQuery<SindicatoType[]>({ queryKey:['sindicatos'], queryFn: () => sindicatosServicio.obtenerTodos() });
  const { data: lineas = [] } = useQuery<LineaType[]>({ queryKey:['lineas'], queryFn: () => lineasServicio.obtenerTodas() });

  const crear = useMutation({
    mutationFn: () => busesServicio.crear({
      placa: form.placa,
      lineaId: form.lineaId || undefined,
      modelo: form.modelo,
      numeroInterno: form.numeroInterno,
      anioFabricacion: form.anioFabricacion ? parseInt(form.anioFabricacion) : undefined,
      capacidad: parseInt(form.capacidad) || 35,
      sindicatoId: form.sindicatoId,
    }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['buses']}); setModal(null); },
  });
  const actualizar = useMutation({
    mutationFn: () => busesServicio.actualizar(seleccionado!.id, {
      modelo: form.modelo || undefined,
      capacidad: form.capacidad ? parseInt(form.capacidad) : undefined,
      numeroInterno: form.numeroInterno || undefined,
      lineaId: form.lineaId || undefined,
      anioFabricacion: form.anioFabricacion ? parseInt(form.anioFabricacion) : undefined,
      estadoOperacional: form.estadoOperacional || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['buses']}); setModal(null); },
  });
  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => busesServicio.actualizar(id, { activo }),
    onSuccess: () => qc.invalidateQueries({queryKey:['buses']}),
  });

  const abrirEditar = (b: Bus) => {
    setSeleccionado(b);
    setForm({
      sindicatoId: String(b.sindicatoId || ''),
      lineaId: String(b.lineaId || ''),
      numeroInterno: String(b.numeroInterno || ''),
      placa: b.placa || '',
      modelo: b.modelo || '',
      capacidad: String(b.capacidad || ''),
      anioFabricacion: String(b.anioFabricacion || ''),
      estadoOperacional: b.estado || 'ACTIVE',
    });
    setModal('editar');
  };

  const filtrados = buses.filter((b) => {
    const texto = busqueda.toLowerCase();
    const coincideTexto = !busqueda || b.placa?.toLowerCase().includes(texto) || b.modelo?.toLowerCase().includes(texto);
    const coincideEstadoOp = !filtroEstadoOp || b.estado === filtroEstadoOp;
    return coincideTexto && coincideEstadoOp;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);
  const cambiarFiltro = (fn: () => void) => { fn(); setPagina(1); };

  const lineasFiltradas = lineas;

  return (
    <div style={{ padding:'2rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontWeight:800, fontSize:'1.625rem', color:'#f2f2f2', display:'flex', alignItems:'center', gap:'0.5rem' }}><Bus size={22} color="#00d992"/> Buses / Internos</h1>
          <p style={{ color:'#8b949e', fontSize:'0.875rem' }}>{filtrados.length} unidades encontradas</p>
        </div>
        <button className="boton boton-primario" onClick={()=>{ setForm(formInicial); setModal('crear'); }}><Plus size={15}/> Nuevo Bus</button>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', marginBottom:'1.25rem' }}>
        <div style={{ position:'relative', flex:'1 1 200px', minWidth:0 }}>
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#8b949e' }}/>
          <input className="campo-entrada" style={{ paddingLeft:'2.5rem' }} placeholder="Placa, modelo..." value={busqueda} onChange={(e)=>cambiarFiltro(()=>setBusqueda(e.target.value))}/>
        </div>
        <select className="campo-entrada" style={{ flex:'0 1 170px' }} value={filtroEstadoOp} onChange={(e)=>cambiarFiltro(()=>setFiltroEstadoOp(e.target.value))}>
          <option value="">Estado operativo</option>
          {Object.entries(estadoOpLabel).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {isLoading ? <Cargando/> : (
        <>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #3d3a39' }}>
                  {['Placa','Modelo','Año','Cap.','Estado','Acciones'].map(h=>(
                    <th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', fontSize:'0.75rem', fontWeight:700, color:'#8b949e', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibles.map((b) => (
                  <tr key={b.id} style={{ borderBottom:'1px solid rgba(61,58,57,0.5)' }}>
                    <td style={{ padding:'0.875rem 1rem', color:'#00d992', fontWeight:600, fontFamily:'monospace' }}>{b.placa}</td>
                    <td style={{ padding:'0.875rem 1rem', color:'#b8b3b0' }}>{b.modelo}</td>
                    <td style={{ padding:'0.875rem 1rem', color:'#8b949e' }}>{b.año||'—'}</td>
                    <td style={{ padding:'0.875rem 1rem', color:'#f2f2f2' }}>{b.capacidadPasajeros} pax</td>
                    <td style={{ padding:'0.875rem 1rem' }}><span className={`insignia ${estadoOpColor[b.estado]||'insignia-info'}`}>{estadoOpLabel[b.estado]||b.estado}</span></td>
                    <td style={{ padding:'0.875rem 1rem' }}>
                      <div style={{ display:'flex', gap:'0.375rem' }}>
                        <button className="boton boton-secundario" style={{ padding:'0.375rem 0.625rem', fontSize:'0.75rem' }} onClick={()=>abrirEditar(b)}><Edit2 size={12}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr><td colSpan={10} style={{ padding:'2rem', textAlign:'center', color:'#8b949e' }}>Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'1rem', color:'#8b949e', fontSize:'0.8rem' }}>
            <span>Mostrando {filtrados.length === 0 ? 0 : Math.min((paginaActual-1)*POR_PAGINA+1, filtrados.length)}–{Math.min(paginaActual*POR_PAGINA, filtrados.length)} de {filtrados.length}</span>
            <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
              <button className="boton boton-secundario" style={{ padding:'0.375rem 0.625rem' }} onClick={()=>setPagina(p=>Math.max(1,p-1))} disabled={paginaActual===1}><ChevronLeft size={14}/></button>
              <span style={{ color:'#f2f2f2', fontWeight:600 }}>Pág. {paginaActual} / {totalPaginas}</span>
              <button className="boton boton-secundario" style={{ padding:'0.375rem 0.625rem' }} onClick={()=>setPagina(p=>Math.min(totalPaginas,p+1))} disabled={paginaActual===totalPaginas}><ChevronRight size={14}/></button>
            </div>
          </div>
        </>
      )}

      {(modal==='crear'||modal==='editar') && (
        <Modal titulo={modal==='crear'?'Nuevo Bus':'Editar Bus'} onCerrar={()=>setModal(null)}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.875rem' }}>

            {/* Sindicato */}
            <div style={{ gridColumn:'span 2' }}>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Sindicato</label>
              <select className="campo-entrada" value={form.sindicatoId} onChange={(e)=>setForm({...form, sindicatoId:e.target.value, lineaId:''})}>
                <option value="">— Seleccionar sindicato —</option>
                {sindicatos.map((s) => <option key={String(s.id)} value={String(s.id)}>{s.nombre}</option>)}
              </select>
            </div>

            {/* Línea */}
            <div style={{ gridColumn:'span 2' }}>
              <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Línea</label>
              <select className="campo-entrada" value={form.lineaId} onChange={(e)=>setForm({...form,lineaId:e.target.value})}>
                <option value="">— Sin línea asignada —</option>
                {lineasFiltradas.map((l) => <option key={String(l.id)} value={String(l.id)}>{l.numero} – {l.nombre}</option>)}
              </select>
            </div>

            {/* Campos de texto */}
            {([['numeroInterno','Número Interno','text'],['placa','Placa','text'],['modelo','Modelo','text'],['capacidad','Capacidad','number'],['anioFabricacion','Año Fabricación','number']] as [keyof FormBus, string, string][]).map(([k,l,t])=>(
              <div key={k} style={{ gridColumn: k==='modelo'?'span 2':'auto' }}>
                <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>{l}</label>
                <input type={t} className="campo-entrada" value={form[k]} onChange={(e)=>setForm({...form,[k]:e.target.value})} disabled={modal==='editar'&&k==='placa'}/>
              </div>
            ))}

            {/* Estado operativo — solo en editar */}
            {modal==='editar' && (
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:'0.8125rem', fontWeight:600, color:'#b8b3b0', display:'block', marginBottom:'0.375rem' }}>Estado Operativo</label>
                <select className="campo-entrada" value={form.estadoOperacional} onChange={(e)=>setForm({...form,estadoOperacional:e.target.value})}>
                  {Object.entries(estadoOpLabel).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            )}
          </div>

          <button className="boton boton-primario" style={{ justifyContent:'center', width:'100%', marginTop:'1.25rem' }} onClick={()=>modal==='crear'?crear.mutate():actualizar.mutate()} disabled={crear.isPending||actualizar.isPending}>
            {(crear.isPending||actualizar.isPending)?'Guardando...':'Guardar'}
          </button>
        </Modal>
      )}
    </div>
  );
}
