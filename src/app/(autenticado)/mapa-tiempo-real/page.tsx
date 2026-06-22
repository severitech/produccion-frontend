'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import {
  Bus, Radio, RefreshCw, Users, MapPin, Filter,
  Building2, Wifi, Navigation,
} from 'lucide-react';
import { useUsuarioAlmacen } from '../../../almacen/usuario.almacen';
import { useMapaAdmin, BusEnVivo } from '../../../hooks/useMapaAdmin';
import { lineasServicio } from '../../../services/lineas.servicio';
import { sindicatosServicio } from '../../../services/sindicatos.servicio';
import { conductoresServicio } from '../../../services/conductores.servicio';
import { useQuery } from '@tanstack/react-query';

// Importamos el mapa dinámicamente para evitar SSR
const MapaAdminDinamico = dynamic(() => import('../../../components/mapa/MapaTiempoRealAdmin'), { ssr: false });

// ─── Selector de vista ────────────────────────────────────────────────────────
type VistaFiltro = 'sindicato' | 'linea' | 'conductor';

export default function PaginaMapaTiempoReal() {
  const { usuario } = useUsuarioAlmacen();
  const esSuperAdmin = (usuario?.rol as string) === 'SUPERADMIN';
  const sindicatoIdUsuario = (usuario as any)?.sindicatoId?.toString() ?? null;

  // ── Filtros seleccionados
  const [sindicatoSel, setSindicatoSel] = useState<string>(sindicatoIdUsuario ?? '');
  const [lineaSel, setLineaSel] = useState<string>('');
  const [conductorSel, setConductorSel] = useState<string>('');
  const [vistaFiltro, setVistaFiltro] = useState<VistaFiltro>('sindicato');
  const [busSelId, setBusSelId] = useState<string | null>(null);

  // ── Datos para los selectores
  const { data: sindicatos = [] } = useQuery({
    queryKey: ['sindicatos'],
    queryFn: () => sindicatosServicio.obtenerTodos(),
    enabled: esSuperAdmin,
  });

  const { data: lineas = [] } = useQuery({
    queryKey: ['lineas', sindicatoSel],
    queryFn: () => lineasServicio.obtenerTodas(sindicatoSel ? { sindicatoId: sindicatoSel } : undefined),
    enabled: !!sindicatoSel || !esSuperAdmin,
  });

  const { data: conductores = [] } = useQuery({
    queryKey: ['conductores', sindicatoSel, lineaSel],
    queryFn: () => conductoresServicio.obtenerTodos({
      ...(sindicatoSel ? { sindicatoId: sindicatoSel } : {}),
      ...(lineaSel ? { lineaId: lineaSel } : {}),
    }),
    enabled: !!sindicatoSel || !esSuperAdmin,
  });

  // ── Hook de tiempo real
  const filtros = useMemo(() => ({
    sindicatoId: vistaFiltro === 'sindicato' && sindicatoSel ? sindicatoSel : undefined,
    lineaId: vistaFiltro === 'linea' && lineaSel ? lineaSel : undefined,
    conductorId: vistaFiltro === 'conductor' && conductorSel ? conductorSel : undefined,
  }), [vistaFiltro, sindicatoSel, lineaSel, conductorSel]);

  const { buses, cargando, recargar } = useMapaAdmin(filtros);

  // Si no es superadmin y no tiene sindicato seleccionado, auto-seleccionar su sindicato
  useEffect(() => {
    if (!esSuperAdmin && sindicatoIdUsuario && !sindicatoSel) {
      setSindicatoSel(sindicatoIdUsuario);
    }
  }, [esSuperAdmin, sindicatoIdUsuario, sindicatoSel]);

  const busSel = busSelId ? buses.find((b) => b.viajeId === busSelId) ?? null : null;

  // Agrupar por línea para las estadísticas
  const porLinea = useMemo(() => {
    const mapa = new Map<string, { nombre: string; color: string; codigo: string; count: number }>();
    buses.forEach((b) => {
      if (!b.lineaId) return;
      const prev = mapa.get(b.lineaId);
      if (prev) { prev.count++; }
      else mapa.set(b.lineaId, { nombre: b.lineaNombre ?? '', color: b.lineaColor ?? '#6366f1', codigo: b.lineaCodigo ?? '', count: 1 });
    });
    return Array.from(mapa.values());
  }, [buses]);

  return (
    <div style={{ height: 'calc(100vh - 0px)', display: 'flex', flexDirection: 'column' }}>

      {/* Barra superior */}
      <div style={{ padding: '0.75rem 1.5rem', background: '#0d0d0f', borderBottom: '1px solid #1e1e22', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={16} color="#00d992" />
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#f2f2f2' }}>Mapa en Tiempo Real</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.3rem 0.75rem', background: 'rgba(0,217,146,0.08)', border: '1px solid rgba(0,217,146,0.2)', borderRadius: 20 }}>
          <Radio size={10} color="#00d992" />
          <span style={{ fontSize: '0.75rem', color: '#00d992', fontWeight: 600 }}>En vivo</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: '#8b949e' }}>
          <Bus size={13} />
          <span><strong style={{ color: '#f2f2f2' }}>{buses.length}</strong> buses activos</span>
        </div>

        <button
          onClick={recargar}
          style={{ marginLeft: 'auto', background: 'none', border: '1px solid #2a2a2f', borderRadius: 8, padding: '0.375rem 0.75rem', cursor: 'pointer', color: '#8b949e', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
        >
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Panel lateral de filtros */}
        <aside style={{ width: 280, flexShrink: 0, background: '#0d0d0f', borderRight: '1px solid #1e1e22', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Selector de sindicato (solo SUPERADMIN) */}
            {esSuperAdmin && (
              <div>
                <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Building2 size={11} /> Sindicato
                </label>
                <select
                  value={sindicatoSel}
                  onChange={(e) => { setSindicatoSel(e.target.value); setLineaSel(''); setConductorSel(''); }}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid #2a2a2f', borderRadius: 8, padding: '0.5rem 0.75rem', color: '#f2f2f2', fontSize: '0.8125rem', outline: 'none' }}
                >
                  <option value="">📡 Todos los sindicatos</option>
                  {(sindicatos as any[]).map((s: any) => (
                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Tabs de tipo de filtro */}
            <div>
              <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Filter size={11} /> Filtrar por
              </label>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, gap: 3 }}>
                {([
                  { id: 'sindicato', label: 'Todo' },
                  { id: 'linea',     label: 'Línea' },
                  { id: 'conductor', label: 'Conductor' },
                ] as { id: VistaFiltro; label: string }[]).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setVistaFiltro(tab.id)}
                    style={{
                      flex: 1, padding: '0.375rem 0.25rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                      background: vistaFiltro === tab.id ? '#00d992' : 'transparent',
                      color: vistaFiltro === tab.id ? '#000' : '#8b949e',
                      transition: 'all 0.15s',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de línea */}
            {vistaFiltro === 'linea' && (
              <div>
                <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', display: 'block' }}>Línea</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <button
                    onClick={() => setLineaSel('')}
                    style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', borderRadius: 8, border: `1px solid ${!lineaSel ? 'rgba(0,217,146,0.4)' : '#2a2a2f'}`, background: !lineaSel ? 'rgba(0,217,146,0.08)' : 'transparent', color: !lineaSel ? '#00d992' : '#8b949e', fontSize: '0.8125rem', cursor: 'pointer', fontWeight: !lineaSel ? 700 : 400 }}
                  >
                    Todas las líneas
                  </button>
                  {(lineas as any[]).map((l: any) => (
                    <button
                      key={l.id}
                      onClick={() => setLineaSel(String(l.id))}
                      style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', borderRadius: 8, border: `1px solid ${lineaSel === String(l.id) ? `${l.color}50` : '#2a2a2f'}`, background: lineaSel === String(l.id) ? `${l.color}12` : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.8125rem', color: lineaSel === String(l.id) ? l.color : '#c8c3c0', fontWeight: lineaSel === String(l.id) ? 700 : 400 }}>{l.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selector de conductor */}
            {vistaFiltro === 'conductor' && (
              <div>
                <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', display: 'block' }}>Conductor</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: 300, overflowY: 'auto' }}>
                  <button
                    onClick={() => setConductorSel('')}
                    style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', borderRadius: 8, border: `1px solid ${!conductorSel ? 'rgba(0,217,146,0.4)' : '#2a2a2f'}`, background: !conductorSel ? 'rgba(0,217,146,0.08)' : 'transparent', color: !conductorSel ? '#00d992' : '#8b949e', fontSize: '0.8125rem', cursor: 'pointer', fontWeight: !conductorSel ? 700 : 400 }}
                  >
                    Todos los conductores
                  </button>
                  {(conductores as any[]).map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => setConductorSel(String(c.id))}
                      style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', borderRadius: 8, border: `1px solid ${conductorSel === String(c.id) ? 'rgba(0,217,146,0.4)' : '#2a2a2f'}`, background: conductorSel === String(c.id) ? 'rgba(0,217,146,0.08)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,217,146,0.1)', border: '1px solid rgba(0,217,146,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.7rem', fontWeight: 700, color: '#00d992' }}>
                        {c.user?.name?.charAt(0) ?? 'C'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '0.8125rem', color: conductorSel === String(c.id) ? '#00d992' : '#c8c3c0', fontWeight: conductorSel === String(c.id) ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.user?.name ?? `Conductor ${c.id}`}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: '#555' }}>CI: {c.nationalId}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Resumen por línea */}
            {porLinea.length > 0 && (
              <>
                <div style={{ height: 1, background: '#1e1e22' }} />
                <div>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>Buses por línea</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {porLinea.map((l) => (
                      <div key={l.codigo} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e22', borderRadius: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8125rem', color: '#c8c3c0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.nombre}</span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: l.color, flexShrink: 0 }}>{l.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Detalle del bus seleccionado */}
            {busSel && (
              <>
                <div style={{ height: 1, background: '#1e1e22' }} />
                <div>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>Bus seleccionado</p>
                  <div style={{ background: `${busSel.lineaColor ?? '#6366f1'}10`, border: `1px solid ${busSel.lineaColor ?? '#6366f1'}30`, borderRadius: 10, padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: busSel.lineaColor }} />
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f2f2f2' }}>{busSel.lineaNombre}</span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: '#8b949e' }}>Bus {busSel.internalNumber} · {busSel.licensePlate}</p>
                    <p style={{ fontSize: '0.8125rem', color: '#8b949e' }}>Conductor: <span style={{ color: '#f2f2f2' }}>{busSel.conductorNombre}</span></p>
                    <p style={{ fontSize: '0.8125rem', color: '#8b949e' }}>Ruta: <span style={{ color: '#f2f2f2' }}>{busSel.rutaNombre}</span></p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '0.375rem', textAlign: 'center' }}>
                        <p style={{ fontSize: '1rem', fontWeight: 800, color: '#f2f2f2' }}>{busSel.velocidad}</p>
                        <p style={{ fontSize: '0.6875rem', color: '#555' }}>km/h</p>
                      </div>
                      <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '0.375rem', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00d992' }}>
                          <Wifi size={12} style={{ display: 'inline', marginRight: 2 }} />En vivo
                        </p>
                        <p style={{ fontSize: '0.6875rem', color: '#555' }}>GPS activo</p>
                      </div>
                    </div>
                    <button onClick={() => setBusSelId(null)} style={{ background: 'none', border: '1px solid #2a2a2f', borderRadius: 6, padding: '0.375rem', cursor: 'pointer', color: '#555', fontSize: '0.75rem' }}>
                      Cerrar
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Estado vacío */}
            {!cargando && buses.length === 0 && (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <Bus size={32} color="#2a2a2f" style={{ marginBottom: '0.75rem' }} />
                <p style={{ color: '#555', fontSize: '0.8125rem' }}>No hay buses activos</p>
                <p style={{ color: '#3a3a3f', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {esSuperAdmin && !sindicatoSel ? 'Selecciona un sindicato' : 'Esperando conductores...'}
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Mapa */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapaAdminDinamico buses={buses} busSelId={busSelId} onSeleccionarBus={setBusSelId} />
        </div>
      </div>
    </div>
  );
}
