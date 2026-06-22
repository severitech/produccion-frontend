'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Bus, MapPin, Users, AlertTriangle, LayoutDashboard, Calendar,
  BarChart3, ChevronRight, Radio, TrendingUp, Clock, Activity,
  CheckCircle, XCircle,
} from 'lucide-react';
import { internosServicio } from '../../../services/internos.servicio';
import { incidentesServicio } from '../../../services/incidentes.servicio';
import { asignacionesServicio } from '../../../services/asignaciones.servicio';
import { lineasServicio } from '../../../services/lineas.servicio';
import { Cargando } from '../../../components/dashboard/Cargando';
import { api } from '../../../services/api';

const estColor: Record<string,string> = { SCHEDULED:'insignia-info', IN_PROGRESS:'insignia-exito', COMPLETED:'insignia-advertencia', CANCELLED:'insignia-peligro' };
const estLabel: Record<string,string> = { SCHEDULED:'Programada', IN_PROGRESS:'En Curso', COMPLETED:'Completada', CANCELLED:'Cancelada' };

const TIPO_INC_LABEL: Record<string,string> = {
  MECHANICAL_FAILURE:'Falla mecánica', ACCIDENT:'Accidente', PASSENGER_ISSUE:'Pasajeros',
  ROAD_BLOCK:'Bloqueo', WEATHER:'Clima', OTHER:'Otro',
};

function BarraMetrica({ valor, total, color }: { valor: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <div style={{ height: 6, borderRadius: 4, background: 'rgba(61,58,57,0.4)', overflow: 'hidden', marginTop: '0.375rem' }}>
      <div style={{ height: '100%', borderRadius: 4, background: color, width: `${pct}%`, transition: 'width 0.8s ease-out' }} />
    </div>
  );
}

export default function PaginaPanel() {
  const hoy = new Date().toISOString().slice(0, 10);

  const { data: buses = [] } = useQuery({ queryKey: ['internos'], queryFn: () => internosServicio.obtenerTodos() });
  const { data: lineas = [] } = useQuery({ queryKey: ['lineas'], queryFn: () => lineasServicio.obtenerTodas() });
  const { data: incidentes = [] } = useQuery({ queryKey: ['incidentes', 'PENDING'], queryFn: () => incidentesServicio.obtenerTodos({ estado: 'PENDING' }) });
  const { data: todosIncidentes = [] } = useQuery({ queryKey: ['incidentes-todos'], queryFn: () => incidentesServicio.obtenerTodos({}) });
  const { data: asignaciones = [], isLoading: cargandoAsig } = useQuery({ queryKey: ['asignaciones', hoy], queryFn: () => asignacionesServicio.obtenerTodos({ fecha: hoy }) });
  const { data: viajesActivos = [] } = useQuery({ queryKey: ['viajes-activos'], queryFn: () => api.get('/viajes/activos').then(r => r.data), refetchInterval: 15000 });

  // ── Métricas calculadas ──────────────────────────────────────────────────────
  const busesActivos = (buses as any[]).filter((b: any) => b.operationalStatus === 'ACTIVE').length;
  const busesMantenimiento = (buses as any[]).filter((b: any) => b.operationalStatus === 'MAINTENANCE').length;
  const busesInactivos = (buses as any[]).filter((b: any) => b.operationalStatus === 'INACTIVE').length;
  const lineasActivas = (lineas as any[]).filter((l: any) => l.active).length;
  const asigEnCurso = (asignaciones as any[]).filter((a: any) => a.status === 'IN_PROGRESS').length;
  const asigCompletadas = (asignaciones as any[]).filter((a: any) => a.status === 'COMPLETED').length;
  const asigCanceladas = (asignaciones as any[]).filter((a: any) => a.status === 'CANCELLED').length;
  const totalBuses = (buses as any[]).length || 1;
  const totalViajesActivos = (viajesActivos as any[]).length;

  // Incidentes por tipo
  const incPorTipo = (todosIncidentes as any[]).reduce((acc: Record<string, number>, inc: any) => {
    acc[inc.type] = (acc[inc.type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const tiposOrdenados = Object.entries(incPorTipo).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const totalIncidentes = (todosIncidentes as any[]).length || 1;

  // Líneas con más asignaciones hoy
  const lineaPorAsig: Record<string, { nombre: string; color: string; count: number }> = {};
  (asignaciones as any[]).forEach((a: any) => {
    const linId = String(a.internal?.lineId ?? a.route?.lineId ?? '?');
    const nombre = a.route?.name ?? `Línea ${linId}`;
    const color = '#00d992';
    if (!lineaPorAsig[linId]) lineaPorAsig[linId] = { nombre, color, count: 0 };
    lineaPorAsig[linId].count++;
  });
  const lineasTop = Object.values(lineaPorAsig).sort((a, b) => b.count - a.count).slice(0, 4);

  const estadisticas = [
    { label: 'Buses Activos', valor: String(busesActivos), icono: <Bus size={22} />, color: '#00d992' },
    { label: 'Líneas Operando', valor: String(lineasActivas), icono: <MapPin size={22} />, color: '#4cb3d4' },
    { label: 'Alertas Pendientes', valor: String((incidentes as any[]).length), icono: <AlertTriangle size={22} />, color: '#ffba00' },
    { label: 'Viajes Activos', valor: String(totalViajesActivos), icono: <Activity size={22} />, color: '#2fd6a1' },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontWeight: 800, fontSize: '1.625rem', color: '#f2f2f2', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LayoutDashboard size={22} color="#00d992" /> Panel de Control
        </h1>
        <p style={{ color: '#8b949e', fontSize: '0.875rem' }}>
          {new Date().toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Estadísticas principales */}
      <div className="cuadricula-estadisticas" style={{ marginBottom: '1.75rem' }}>
        {estadisticas.map((s, i) => (
          <div key={i} className="tarjeta" style={{ animation: `deslizar-arriba 0.4s ease-out ${i * 0.08}s forwards`, opacity: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: '#8b949e', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>{s.label}</p>
                <p style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, color: '#f2f2f2' }}>{s.valor}</p>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 11, background: `${s.color}15`, border: `1px solid ${s.color}30`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icono}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Acceso rápido mapa en vivo */}
      <Link href="/mapa-tiempo-real" style={{ textDecoration: 'none', display: 'block', marginBottom: '1.25rem' }}>
        <div
          style={{ background: 'rgba(0,217,146,0.06)', border: '1px solid rgba(0,217,146,0.2)', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,217,146,0.1)'; e.currentTarget.style.borderColor = 'rgba(0,217,146,0.35)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,217,146,0.06)'; e.currentTarget.style.borderColor = 'rgba(0,217,146,0.2)'; }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(0,217,146,0.12)', border: '1px solid rgba(0,217,146,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Radio size={18} color="#00d992" />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#f2f2f2', marginBottom: '0.125rem' }}>Ver Mapa en Tiempo Real</p>
            <p style={{ fontSize: '0.8125rem', color: '#8b949e' }}>Monitorea buses activos por línea o conductor</p>
          </div>
          <ChevronRight size={16} color="#00d992" style={{ marginLeft: 'auto', flexShrink: 0 }} />
        </div>
      </Link>

      {/* Grilla principal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>

        {/* Estado de buses */}
        <div className="tarjeta">
          <h2 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#f2f2f2', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={17} color="#00d992" /> Estado de Flota
          </h2>
          {[
            { label: 'Activos', cnt: busesActivos, color: '#00d992' },
            { label: 'Mantenimiento', cnt: busesMantenimiento, color: '#ffba00' },
            { label: 'Inactivos', cnt: busesInactivos, color: '#fb565b' },
          ].map(({ label, cnt, color }) => (
            <div key={label} style={{ marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.125rem' }}>
                <span style={{ color: '#b8b3b0' }}>{label}</span>
                <span style={{ fontWeight: 700, color: '#f2f2f2' }}>{cnt} <span style={{ fontWeight: 400, color: '#555' }}>/ {(buses as any[]).length}</span></span>
              </div>
              <BarraMetrica valor={cnt} total={totalBuses} color={color} />
            </div>
          ))}
        </div>

        {/* Asignaciones hoy */}
        <div className="tarjeta">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#f2f2f2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={17} color="#00d992" /> Asignaciones Hoy
            </h2>
            <Link href="/asignaciones" style={{ color: '#00d992', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}>
              Ver todas <ChevronRight size={13} />
            </Link>
          </div>
          {cargandoAsig ? <Cargando texto="Cargando..." /> : (
            <>
              {/* Mini métricas de estado */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {[
                  { label: 'En curso', val: asigEnCurso, color: '#00d992', icono: <Activity size={12} /> },
                  { label: 'Completadas', val: asigCompletadas, color: '#4cb3d4', icono: <CheckCircle size={12} /> },
                  { label: 'Canceladas', val: asigCanceladas, color: '#fb565b', icono: <XCircle size={12} /> },
                ].map((m) => (
                  <div key={m.label} style={{ flex: 1, background: `${m.color}10`, border: `1px solid ${m.color}25`, borderRadius: 8, padding: '0.5rem', textAlign: 'center' }}>
                    <div style={{ color: m.color, display: 'flex', justifyContent: 'center', marginBottom: '0.25rem' }}>{m.icono}</div>
                    <p style={{ fontSize: '1rem', fontWeight: 800, color: '#f2f2f2', lineHeight: 1 }}>{m.val}</p>
                    <p style={{ fontSize: '0.6rem', color: '#555', marginTop: '0.125rem' }}>{m.label}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                {(asignaciones as any[]).slice(0, 4).map((a: any) => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(61,58,57,0.4)', fontSize: '0.8125rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontWeight: 600, color: '#f2f2f2' }}>{a.driver?.user?.name || `Conductor ${a.driverId}`}</span>
                      <span style={{ color: '#8b949e' }}> · Bus {a.internal?.internalNumber || a.busId}</span>
                    </div>
                    <span className={`insignia ${estColor[a.status] || 'insignia-info'}`}>{estLabel[a.status] || a.status}</span>
                  </div>
                ))}
                {(asignaciones as any[]).length === 0 && <p style={{ color: '#555', fontSize: '0.8125rem', textAlign: 'center', padding: '1rem 0' }}>Sin asignaciones hoy</p>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Grilla de métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>

        {/* Incidentes por tipo */}
        <div className="tarjeta">
          <h2 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#f2f2f2', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={17} color="#ffba00" /> Incidentes por Tipo
          </h2>
          {tiposOrdenados.length === 0 && (
            <p style={{ color: '#555', fontSize: '0.8125rem', textAlign: 'center', padding: '1rem 0' }}>Sin incidentes registrados</p>
          )}
          {tiposOrdenados.map(([tipo, cnt]) => (
            <div key={tipo} style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.125rem' }}>
                <span style={{ color: '#b8b3b0' }}>{TIPO_INC_LABEL[tipo] ?? tipo}</span>
                <span style={{ fontWeight: 700, color: '#f2f2f2' }}>{cnt}</span>
              </div>
              <BarraMetrica valor={cnt} total={totalIncidentes} color="#ffba00" />
            </div>
          ))}
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #1e1e22', display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
            <span style={{ color: '#555' }}>Total registrados</span>
            <span style={{ fontWeight: 700, color: '#f2f2f2' }}>{(todosIncidentes as any[]).length}</span>
          </div>
        </div>

        {/* Operación por línea hoy */}
        <div className="tarjeta">
          <h2 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#f2f2f2', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={17} color="#4cb3d4" /> Actividad por Línea Hoy
          </h2>
          {lineasTop.length === 0 && (
            <p style={{ color: '#555', fontSize: '0.8125rem', textAlign: 'center', padding: '1rem 0' }}>Sin actividad hoy</p>
          )}
          {lineasTop.map((l, i) => (
            <div key={i} style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.125rem' }}>
                <span style={{ color: '#b8b3b0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{l.nombre}</span>
                <span style={{ fontWeight: 700, color: '#f2f2f2' }}>{l.count} asig.</span>
              </div>
              <BarraMetrica valor={l.count} total={Math.max(...lineasTop.map(x => x.count)) || 1} color="#4cb3d4" />
            </div>
          ))}
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #1e1e22', display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
            <span style={{ color: '#555' }}>Total asignaciones</span>
            <span style={{ fontWeight: 700, color: '#f2f2f2' }}>{(asignaciones as any[]).length}</span>
          </div>
        </div>
      </div>

      {/* Incidentes pendientes */}
      {(incidentes as any[]).length > 0 && (
        <div className="tarjeta">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#ffba00', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={17} /> Incidentes Pendientes
            </h2>
            <Link href="/incidentes" style={{ color: '#00d992', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}>
              Ver todos <ChevronRight size={13} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(incidentes as any[]).slice(0, 3).map((inc: any) => (
              <div key={inc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0.875rem', background: 'rgba(255,186,0,0.05)', borderRadius: 8, border: '1px solid rgba(255,186,0,0.15)' }}>
                <div>
                  <span style={{ fontSize: '0.8125rem', color: '#b8b3b0' }}>{inc.description}</span>
                  {inc.type && <span style={{ fontSize: '0.75rem', color: '#ffba00', marginLeft: '0.5rem' }}>· {TIPO_INC_LABEL[inc.type] ?? inc.type}</span>}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#8b949e', flexShrink: 0 }}>
                  {new Date(inc.reportedAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
