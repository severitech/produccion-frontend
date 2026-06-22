'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, X, Check, AlertCircle, ChevronDown, Map } from 'lucide-react';
import { asignacionesServicio } from '../../../../services/asignaciones.servicio';
import { conductoresServicio } from '../../../../services/conductores.servicio';
import { internosServicio } from '../../../../services/internos.servicio';
import { rutasServicio } from '../../../../services/rutas.servicio';
import { lineasServicio } from '../../../../services/lineas.servicio';
import { turnosServicio } from '../../../../services/turnos.servicio';
import { useUsuarioAlmacen } from '../../../../almacen/usuario.almacen';
import { api } from '../../../../services/api';

const MapaAsignacion = dynamic(() => import('@/components/mapa/MapaAsignacion'), { ssr: false });

// ─── Constantes ───────────────────────────────────────────────────────────────
const HORAS_TURNO: Record<string, [string, string]> = {
  MANANA: ['06:00:00', '14:00:00'],
  TARDE:  ['14:00:00', '22:00:00'],
  NOCTURNO: ['22:00:00', '06:00:00'],
};
const DIR_COLOR: Record<string, string> = { OUTBOUND: '#00d992', INBOUND: '#4b82dc', CIRCULAR: '#ffba00' };
const DIR_LABEL: Record<string, string> = { OUTBOUND: 'IDA →', INBOUND: '← VUELTA', CIRCULAR: '↺ Circular' };

let _n = 0;
const nextId = () => String(++_n);

interface Fila { id: string; conductorId: string; busId: string; turnoId: string; horaInicio: string; horaFin: string; }

// ─── Select con estilo ────────────────────────────────────────────────────────
function Sel({ value, onChange, options, placeholder, acento }: {
  value: string; onChange: (v: string) => void;
  options: { id: string; label: string }[];
  placeholder?: string; acento?: string;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', appearance: 'none', cursor: 'pointer', outline: 'none',
          background: value ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${value && acento ? acento + '60' : value ? '#3a3a3f' : '#2a2a2f'}`,
          borderRadius: 10, padding: '0.6875rem 2.25rem 0.6875rem 0.875rem',
          color: value ? '#f2f2f2' : '#555', fontSize: '0.875rem',
          transition: 'border-color 0.15s',
        }}
      >
        <option value="">{placeholder ?? '—'}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <ChevronDown size={15} color="#555" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function PaginaNuevaAsignacion() {
  const router = useRouter();
  const qc = useQueryClient();
  const params = useSearchParams();
  const { usuario } = useUsuarioAlmacen();
  const hoy = new Date().toISOString().slice(0, 10);

  // Obtener sindicatos y encontrar el del usuario admin
  const { data: sindicatosData = [], isLoading: cargandoSindicatos } = useQuery({
    queryKey: ['sindicatos'],
    queryFn: () => api.get('/sindicatos').then(r => {
      const data = Array.isArray(r.data) ? r.data : r.data.data || [];
      console.log('[SINDICATOS] Data:', data);
      return data;
    }),
    enabled: !!usuario?.id,
  });

  console.log('[DEBUG SINDICATOS]', { usuarioId: usuario?.id, sindicatosLength: sindicatosData.length, primerSindicato: sindicatosData[0], cargandoSindicatos });

  // Buscar sindicato del usuario actual
  let sindicatoId = '';

  if (usuario?.id && sindicatosData.length > 0) {
    const adminSindicato = (sindicatosData as any[]).find((s: any) => s.usuarioId === usuario.id);
    if (adminSindicato?.id) {
      sindicatoId = String(adminSindicato.id);
      console.log('[SINDICATO ENCONTRADO]', sindicatoId);
    } else {
      // Si no encuentra por usuarioId, usar el primer sindicato (fallback)
      sindicatoId = String(sindicatosData[0]?.id || '');
      console.log('[SINDICATO FALLBACK]', sindicatoId);
    }
  }

  console.log('[SINDICATO FINAL]', { sindicatoId, cargandoSindicatos });

  const [fecha, setFecha] = useState(params.get('fecha') ?? hoy);
  const [lineaId, setLineaId] = useState('');
  const [rutaId, setRutaId] = useState('');
  const [notas, setNotas] = useState('');
  const [filas, setFilas] = useState<Fila[]>([{ id: nextId(), conductorId: '', busId: '', turnoId: '', horaInicio: '06:00:00', horaFin: '14:00:00' }]);
  const [lineasMapa, setLineasMapa] = useState<any[]>([]);
  const [lineaMapaActiva, setLineaMapaActiva] = useState<any>(null);
  const [errores, setErrores] = useState<string[]>([]);

  const { data: lineas = [] }     = useQuery({ queryKey: ['lineas', sindicatoId],    queryFn: () => lineasServicio.obtenerTodas(sindicatoId ? { sindicatoId } : {}) });
  const { data: rutas = [] }      = useQuery({ queryKey: ['rutas-linea', lineaId],   queryFn: () => rutasServicio.obtenerTodas({ lineaId }), enabled: !!lineaId });
  const { data: conductores = [] }= useQuery({ queryKey: ['conductores', sindicatoId], queryFn: () => conductoresServicio.obtenerTodos(sindicatoId ? { sindicatoId } : {}) });
  const { data: buses = [] }      = useQuery({ queryKey: ['buses', sindicatoId],     queryFn: () => internosServicio.obtenerTodas() });
  const { data: turnos = [] }     = useQuery({ queryKey: ['turnos'],                 queryFn: () => turnosServicio.obtenerTodos() });

  // Cargar asignación a repetir
  const fromId = params.get('from');
  useEffect(() => {
    if (!fromId) return;
    asignacionesServicio.obtenerPorId(fromId).then((a: any) => {
      if (a.route?.lineId) setLineaId(String(a.route.lineId));
      setRutaId(String(a.routeId));
      setFilas([{ id: nextId(), conductorId: String(a.driverId), busId: String(a.busId), turnoId: String(a.shiftId ?? ''), horaInicio: a.startTime?.slice(11, 19) ?? '06:00:00', horaFin: a.endTime?.slice(11, 19) ?? '14:00:00' }]);
    }).catch(() => {});
  }, [fromId]);

  // Puntos del mapa
  useEffect(() => {
    api.get('/planificador/lineas-mapa').then(({ data }) => setLineasMapa(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!lineaId || !lineasMapa.length) { setLineaMapaActiva(null); return; }
    const linea = (lineas as any[]).find((l: any) => String(l.id) === lineaId);
    const mapaL = lineasMapa.find((m) => m.id === lineaId);
    setLineaMapaActiva(mapaL ? { ...mapaL, ...(linea ? { nombre: linea.name, color: linea.color } : {}) } : null);
  }, [lineaId, lineasMapa, lineas]);

  const lineaActiva = (lineas as any[]).find((l: any) => String(l.id) === lineaId);
  const rutaActiva  = (rutas as any[]).find((r: any) => String(r.id) === rutaId);

  // Filas
  const actualizarFila = (id: string, cambios: Partial<Fila>) => {
    setFilas((prev) => prev.map((f) => {
      if (f.id !== id) return f;
      const next = { ...f, ...cambios };
      if (cambios.turnoId) {
        const t = (turnos as any[]).find((x: any) => String(x.id) === cambios.turnoId);
        if (t && HORAS_TURNO[t.name]) { next.horaInicio = HORAS_TURNO[t.name][0]; next.horaFin = HORAS_TURNO[t.name][1]; }
      }
      return next;
    }));
  };

  const agregarFila = () => {
    const ultima = filas[filas.length - 1];
    const t = ultima.turnoId ? (turnos as any[]).find((x: any) => String(x.id) === ultima.turnoId) : null;
    const nombres = ['MANANA', 'TARDE', 'NOCTURNO'];
    const sigIdx = t ? (nombres.indexOf(t.name) + 1) % 3 : 1;
    const horas = HORAS_TURNO[nombres[sigIdx]] ?? ['14:00:00', '22:00:00'];
    setFilas((prev) => [...prev, { id: nextId(), conductorId: '', busId: '', turnoId: '', horaInicio: horas[0], horaFin: horas[1] }]);
  };

  const crear = useMutation({
    mutationFn: async () => {
      const errs: string[] = [];
      console.log('[CREAR] sindicatoId:', sindicatoId, 'usuario:', usuario);
      if (!sindicatoId || isNaN(parseInt(sindicatoId))) errs.push('Sindicato no válido');
      if (!rutaId) errs.push('Selecciona una ruta');
      filas.forEach((f, i) => {
        if (!f.conductorId) errs.push(`Conductor ${i + 1}: elige al conductor`);
        if (!f.busId)       errs.push(`Conductor ${i + 1}: elige el bus`);
      });
      if (errs.length) { setErrores(errs); throw new Error('Validación'); }
      setErrores([]);
      await Promise.all(filas.map((f) => {
        const payload = {
          sindicatoId: parseInt(sindicatoId),
          conductorId: String(f.conductorId),
          busId: parseInt(f.busId),
          rutaId: parseInt(rutaId),
          fecha: fecha + 'T00:00:00Z',
          horaInicio: f.horaInicio,
          horaFin: f.horaFin,
          notasAdministrador: notas || undefined,
        };
        console.log('[CREAR] Enviando payload:', payload);
        return asignacionesServicio.crear(payload);
      }));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['asignaciones'] }); router.push(`/asignaciones?fecha=${fecha}`); },
  });

  const conductoresList = (conductores as any[]).map((c: any) => ({ id: String(c.id), label: c.user?.name ?? `Conductor #${c.id}` }));
  const busesList       = (buses as any[]).map((b: any) => ({ id: String(b.id), label: `N°${b.numeroInterno} · ${b.placa}` }));
  const turnosList      = (turnos as any[]).map((t: any) => ({ id: String(t.id), label: t.name === 'MANANA' ? 'Mañana' : t.name === 'TARDE' ? 'Tarde' : 'Nocturno' }));
  const lineasList      = (lineas as any[]).map((l: any) => ({ id: String(l.id), label: l.nombre ?? l.numero }));
  const rutasList       = (rutas as any[]).map((r: any) => ({ id: String(r.id), label: `${r.name}` }));

  return (
    <div style={{ minHeight: '100vh', background: '#050507' }}>

      {/* Header */}
      <header style={{ height: 54, padding: '0 1.75rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #1e1e22', background: '#0d0d0f', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href={`/asignaciones?fecha=${fecha}`} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#8b949e', textDecoration: 'none', fontSize: '0.875rem', padding: '0.375rem 0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid #1e1e22' }}>
          <ArrowLeft size={14} /> Volver
        </Link>
        <h1 style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#f2f2f2' }}>
          {fromId ? 'Repetir Asignación' : 'Nueva Asignación'}
        </h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#8b949e' }}>
          Para el día:
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a2f', borderRadius: 8, padding: '0.3rem 0.625rem', color: '#f2f2f2', fontSize: '0.875rem', outline: 'none' }} />
        </div>
      </header>

      {/* Layout: form ancho + mapa compacto */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', minHeight: 'calc(100vh - 54px)' }}>

        {/* ── Panel formulario (izquierda) ── */}
        <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto', maxHeight: 'calc(100vh - 54px)' }}>

          {/* PASO 1: Ruta */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.125rem' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,217,146,0.12)', border: '1px solid rgba(0,217,146,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 900, color: '#00d992' }}>1</span>
              </div>
              <h2 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#f2f2f2' }}>Selecciona la ruta del servicio</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Línea */}
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#8b949e', display: 'block', marginBottom: '0.5rem' }}>Línea de micro</label>
                <Sel value={lineaId} onChange={(v) => { setLineaId(v); setRutaId(''); }} options={lineasList} placeholder="Selecciona la línea…" acento="#00d992" />
                {lineaActiva && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: lineaActiva.color ?? '#00d992' }} />
                    <span style={{ fontSize: '0.75rem', color: '#555' }}>Bs {lineaActiva.fare} tarifa</span>
                  </div>
                )}
              </div>

              {/* Ruta */}
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#8b949e', display: 'block', marginBottom: '0.5rem' }}>
                  Ruta y dirección
                  {!lineaId && <span style={{ color: '#444', fontWeight: 400, marginLeft: '0.5rem' }}>· Elige la línea primero</span>}
                </label>
                <Sel value={rutaId} onChange={setRutaId} options={rutasList} placeholder={lineaId ? 'Selecciona la ruta…' : '—'} acento={rutaActiva ? DIR_COLOR[rutaActiva.direction] : undefined} />
                {rutaActiva && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: DIR_COLOR[rutaActiva.direction] ?? '#00d992', background: `${DIR_COLOR[rutaActiva.direction] ?? '#00d992'}15`, border: `1px solid ${DIR_COLOR[rutaActiva.direction] ?? '#00d992'}30`, padding: '0.125rem 0.5rem', borderRadius: 6 }}>
                      {DIR_LABEL[rutaActiva.direction] ?? rutaActiva.direction}
                    </span>
                    {rutaActiva.totalDistanceKm && <span style={{ fontSize: '0.75rem', color: '#555' }}>{rutaActiva.totalDistanceKm} km</span>}
                    {rutaActiva.estimatedTimeMin && <span style={{ fontSize: '0.75rem', color: '#555' }}>~{rutaActiva.estimatedTimeMin} min/vuelta</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Divisor */}
          <div style={{ height: 1, background: '#1e1e22' }} />

          {/* PASO 2: Conductores */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.125rem' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,217,146,0.12)', border: '1px solid rgba(0,217,146,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 900, color: '#00d992' }}>2</span>
              </div>
              <h2 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#f2f2f2', flex: 1 }}>Conductores y turnos</h2>
              <button onClick={agregarFila} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(0,217,146,0.08)', border: '1px solid rgba(0,217,146,0.2)', borderRadius: 8, padding: '0.375rem 0.875rem', cursor: 'pointer', color: '#00d992', fontSize: '0.8125rem', fontWeight: 600 }}>
                <Plus size={13} /> Agregar turno
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filas.map((f, idx) => {
                const turno = (turnos as any[]).find((t: any) => String(t.id) === f.turnoId);
                return (
                  <div key={f.id} style={{ background: '#101010', border: '1px solid #1e1e22', borderRadius: 12, padding: '1rem 1.125rem' }}>
                    {/* Cabecera de fila */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid #2a2a2f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#8b949e' }}>{idx + 1}</span>
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#c8c3c0', flex: 1 }}>
                        {f.conductorId ? (conductoresList.find((c) => c.id === f.conductorId)?.label ?? 'Conductor') : `Conductor ${idx + 1}`}
                      </span>
                      {turno && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffba00', background: 'rgba(255,186,0,0.1)', border: '1px solid rgba(255,186,0,0.2)', padding: '0.15rem 0.5rem', borderRadius: 6 }}>
                          {turno.name === 'MANANA' ? 'Mañana' : turno.name === 'TARDE' ? 'Tarde' : 'Nocturno'}
                        </span>
                      )}
                      {filas.length > 1 && (
                        <button onClick={() => setFilas((p) => p.filter((x) => x.id !== f.id))} style={{ background: 'rgba(251,86,91,0.08)', border: '1px solid rgba(251,86,91,0.2)', borderRadius: 7, padding: '0.25rem 0.5rem', cursor: 'pointer', color: '#fb565b', display: 'flex', alignItems: 'center' }}>
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Campos en grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#555', fontWeight: 600, display: 'block', marginBottom: '0.375rem' }}>Conductor</label>
                        <Sel value={f.conductorId} onChange={(v) => actualizarFila(f.id, { conductorId: v })} options={conductoresList} placeholder="Seleccionar…" />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#555', fontWeight: 600, display: 'block', marginBottom: '0.375rem' }}>Bus / Interno</label>
                        <Sel value={f.busId} onChange={(v) => actualizarFila(f.id, { busId: v })} options={busesList} placeholder="Seleccionar…" />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#555', fontWeight: 600, display: 'block', marginBottom: '0.375rem' }}>Turno</label>
                        <Sel value={f.turnoId} onChange={(v) => actualizarFila(f.id, { turnoId: v })} options={turnosList} placeholder="Sin turno" acento="#ffba00" />
                      </div>
                    </div>

                    {/* Horas */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <label style={{ fontSize: '0.75rem', color: '#555', fontWeight: 600, whiteSpace: 'nowrap' }}>Horario:</label>
                      <input type="time" value={f.horaInicio.slice(0, 5)} onChange={(e) => actualizarFila(f.id, { horaInicio: e.target.value + ':00' })}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a2f', borderRadius: 8, padding: '0.375rem 0.625rem', color: '#f2f2f2', fontSize: '0.875rem', outline: 'none', fontFamily: 'monospace' }} />
                      <span style={{ color: '#444', fontSize: '0.875rem' }}>→</span>
                      <input type="time" value={f.horaFin.slice(0, 5)} onChange={(e) => actualizarFila(f.id, { horaFin: e.target.value + ':00' })}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a2f', borderRadius: 8, padding: '0.375rem 0.625rem', color: '#f2f2f2', fontSize: '0.875rem', outline: 'none', fontFamily: 'monospace' }} />
                      <span style={{ color: '#555', fontSize: '0.75rem', marginLeft: 'auto' }}>
                        {f.horaInicio.slice(0, 5)} – {f.horaFin.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Resumen múltiples */}
              {filas.length > 1 && (
                <div style={{ background: 'rgba(0,217,146,0.05)', border: '1px solid rgba(0,217,146,0.15)', borderRadius: 10, padding: '0.625rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={14} color="#00d992" />
                  <span style={{ fontSize: '0.8125rem', color: '#00d992', fontWeight: 600 }}>
                    Se crearán {filas.length} asignaciones en la misma ruta con diferentes turnos
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Divisor */}
          <div style={{ height: 1, background: '#1e1e22' }} />

          {/* Notas */}
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#8b949e', display: 'block', marginBottom: '0.5rem' }}>Notas (opcional)</label>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones para el día…" rows={2}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid #2a2a2f', borderRadius: 10, padding: '0.75rem', color: '#f2f2f2', fontSize: '0.875rem', outline: 'none', resize: 'none' }} />
          </div>

          {/* Errores */}
          {errores.length > 0 && (
            <div style={{ background: 'rgba(251,86,91,0.08)', border: '1px solid rgba(251,86,91,0.2)', borderRadius: 10, padding: '0.875rem 1rem' }}>
              {errores.map((e, i) => (
                <p key={i} style={{ fontSize: '0.8125rem', color: '#fb565b', display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: i < errores.length - 1 ? '0.375rem' : 0 }}>
                  <AlertCircle size={13} /> {e}
                </p>
              ))}
            </div>
          )}

          {/* Botones */}
          <div style={{ display: 'flex', gap: '0.75rem', paddingBottom: '1.75rem' }}>
            <Link href={`/asignaciones?fecha=${fecha}`} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a2f', borderRadius: 10, padding: '0.75rem', textAlign: 'center', color: '#8b949e', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Cancelar
            </Link>
            <button onClick={() => crear.mutate()} disabled={crear.isPending}
              style={{ flex: 2.5, background: crear.isPending ? 'rgba(0,217,146,0.3)' : '#00d992', border: 'none', borderRadius: 10, padding: '0.75rem', cursor: crear.isPending ? 'not-allowed' : 'pointer', color: crear.isPending ? '#00d992' : '#000', fontWeight: 800, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {crear.isPending ? 'Creando…' : <><Check size={17} /> Crear {filas.length > 1 ? `${filas.length} asignaciones` : 'asignación'}</>}
            </button>
          </div>
        </div>

        {/* ── Panel mapa (derecha, compacto) ── */}
        <div style={{ borderLeft: '1px solid #1e1e22', display: 'flex', flexDirection: 'column', background: '#0a0a0c', position: 'sticky', top: 54, height: 'calc(100vh - 54px)' }}>
          {/* Label */}
          <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #1e1e22', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Map size={14} color="#555" />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#555' }}>Vista de recorrido</span>
            {lineaMapaActiva && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: lineaMapaActiva.color }} />
                <span style={{ fontSize: '0.75rem', color: lineaMapaActiva.color, fontWeight: 700 }}>{lineaMapaActiva.codigo ?? ''}</span>
              </div>
            )}
          </div>

          {/* Mapa */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <MapaAsignacion
              puntos={lineaMapaActiva?.puntos ?? []}
              colorLinea={lineaMapaActiva?.color ?? '#00d992'}
              nombreLinea={lineaMapaActiva?.nombre ?? ''}
              direccion={rutaActiva?.direction}
            />
            {!lineaMapaActiva && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.625rem', zIndex: 10, background: '#0a0a0c' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,217,146,0.06)', border: '1px solid rgba(0,217,146,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Map size={20} color="rgba(0,217,146,0.4)" />
                </div>
                <p style={{ color: '#333', fontSize: '0.8125rem', textAlign: 'center', lineHeight: 1.5, maxWidth: 200 }}>
                  Selecciona una línea para ver el recorrido
                </p>
              </div>
            )}
          </div>

          {/* Info ruta debajo del mapa */}
          {rutaActiva && (
            <div style={{ padding: '0.875rem 1rem', borderTop: '1px solid #1e1e22', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#f2f2f2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rutaActiva.name}</p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: '0.6875rem', color: '#444' }}>Dirección</p>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: DIR_COLOR[rutaActiva.direction] ?? '#00d992' }}>{DIR_LABEL[rutaActiva.direction] ?? rutaActiva.direction}</p>
                </div>
                {rutaActiva.totalDistanceKm && (
                  <div>
                    <p style={{ fontSize: '0.6875rem', color: '#444' }}>Distancia</p>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#c8c3c0' }}>{rutaActiva.totalDistanceKm} km</p>
                  </div>
                )}
                {rutaActiva.estimatedTimeMin && (
                  <div>
                    <p style={{ fontSize: '0.6875rem', color: '#444' }}>Duración vuelta</p>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#c8c3c0' }}>{rutaActiva.estimatedTimeMin} min</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
