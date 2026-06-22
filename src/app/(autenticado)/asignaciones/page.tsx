'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, Trash2, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { asignacionesServicio } from '../../../services/asignaciones.servicio';
import { useUsuarioAlmacen } from '../../../almacen/usuario.almacen';
import { Cargando } from '../../../components/dashboard/Cargando';

const EST_COLOR: Record<string, string> = {
  SCHEDULED: '#4b82dc', IN_PROGRESS: '#00d992', COMPLETED: '#555', CANCELLED: '#fb565b',
};
const EST_LABEL: Record<string, string> = {
  SCHEDULED: 'Programada', IN_PROGRESS: 'En Curso', COMPLETED: 'Completada', CANCELLED: 'Cancelada',
};
const DIR_LABEL: Record<string, string> = {
  OUTBOUND: 'IDA', INBOUND: 'VUELTA', CIRCULAR: 'Circular',
};

function desplazarFecha(base: string, dias: number): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function labelFecha(f: string): string {
  const hoy = new Date().toISOString().slice(0, 10);
  const man = desplazarFecha(hoy, 1);
  const ayer = desplazarFecha(hoy, -1);
  if (f === hoy) return 'Hoy';
  if (f === man) return 'Mañana';
  if (f === ayer) return 'Ayer';
  return new Date(f + 'T00:00:00').toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function PaginaAsignaciones() {
  const qc = useQueryClient();
  const { usuario } = useUsuarioAlmacen();
  const sindicatoId = (usuario as any)?.sindicatoId?.toString() ?? '';
  const hoy = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(hoy);

  const { data: asignaciones = [], isLoading } = useQuery({
    queryKey: ['asignaciones', fecha, sindicatoId],
    queryFn: () => asignacionesServicio.obtenerTodas({ fecha, ...(sindicatoId ? { sindicatoId } : {}) }),
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => asignacionesServicio.eliminar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asignaciones'] }),
  });

  const lista = asignaciones as any[];

  // Agrupar por línea/ruta
  const grupos = lista.reduce((acc: Record<string, any[]>, a: any) => {
    const key = a.route?.name ?? `Ruta #${a.routeId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <div style={{ padding: '2rem', minHeight: '100vh' }}>

      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: '1.5rem', color: '#f2f2f2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={22} color="#00d992" /> Asignaciones
          </h1>
          <p style={{ color: '#555', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            {lista.length} conductor{lista.length !== 1 ? 'es' : ''} asignado{lista.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          {/* Navegación de fecha */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#101010', border: '1px solid #2a2a2f', borderRadius: 10, overflow: 'hidden' }}>
            <button
              onClick={() => setFecha((f) => desplazarFecha(f, -1))}
              style={{ background: 'none', border: 'none', padding: '0.5rem 0.625rem', cursor: 'pointer', color: '#8b949e', display: 'flex', alignItems: 'center' }}
            >
              <ChevronLeft size={16} />
            </button>
            <div style={{ padding: '0.5rem 0.875rem', borderLeft: '1px solid #2a2a2f', borderRight: '1px solid #2a2a2f', minWidth: 120, textAlign: 'center' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f2f2f2' }}>{labelFecha(fecha)}</p>
              <p style={{ fontSize: '0.6875rem', color: '#555' }}>{fecha}</p>
            </div>
            <button
              onClick={() => setFecha((f) => desplazarFecha(f, 1))}
              style={{ background: 'none', border: 'none', padding: '0.5rem 0.625rem', cursor: 'pointer', color: '#8b949e', display: 'flex', alignItems: 'center' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <Link
            href={`/asignaciones/nueva?fecha=${fecha}${sindicatoId ? `&sid=${sindicatoId}` : ''}`}
            className="boton boton-primario"
            style={{ fontSize: '0.875rem', fontWeight: 700, padding: '0.625rem 1.125rem' }}
          >
            <Plus size={15} /> Nueva Asignación
          </Link>
        </div>
      </div>

      {isLoading ? <Cargando /> : lista.length === 0 ? (
        <div style={{ background: '#0d0d0f', border: '1px solid #1e1e22', borderRadius: 14, padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,217,146,0.08)', border: '1px solid rgba(0,217,146,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Calendar size={24} color="#00d992" />
          </div>
          <p style={{ color: '#8b949e', fontWeight: 600, marginBottom: '0.5rem' }}>Sin asignaciones para {labelFecha(fecha)}</p>
          <p style={{ color: '#444', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Asigna conductores a las rutas del día</p>
          <Link href={`/asignaciones/nueva?fecha=${fecha}`} className="boton boton-primario" style={{ fontSize: '0.875rem', display: 'inline-flex' }}>
            <Plus size={14} /> Crear asignación
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Object.entries(grupos).map(([rutaNombre, items]) => (
            <div key={rutaNombre} style={{ background: '#0d0d0f', border: '1px solid #1e1e22', borderRadius: 14, overflow: 'hidden' }}>
              {/* Cabecera de grupo */}
              <div style={{ padding: '0.75rem 1.125rem', borderBottom: '1px solid #1e1e22', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d992', flexShrink: 0 }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f2f2f2', flex: 1 }}>{rutaNombre}</p>
                {items[0]?.route?.direction && (
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#00d992', background: 'rgba(0,217,146,0.1)', border: '1px solid rgba(0,217,146,0.2)', padding: '0.2rem 0.5rem', borderRadius: 6 }}>
                    {DIR_LABEL[items[0].route.direction] ?? items[0].route.direction}
                  </span>
                )}
                <span style={{ fontSize: '0.75rem', color: '#555' }}>{items.length} conductor{items.length !== 1 ? 'es' : ''}</span>
              </div>

              {/* Filas de conductores */}
              {items.map((a: any, i: number) => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0', padding: '0.625rem 1.125rem',
                  borderBottom: i < items.length - 1 ? '1px solid rgba(30,30,34,0.6)' : 'none',
                }}>
                  {/* Conductor */}
                  <div style={{ flex: 2, minWidth: 0 }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#c8c3c0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.driver?.user?.name ?? `Conductor #${a.driverId}`}
                    </p>
                  </div>
                  {/* Bus */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#00d992', fontFamily: 'monospace' }}>
                      {a.internal?.internalNumber ?? `#${a.busId}`}
                    </span>
                    {a.internal?.licensePlate && (
                      <span style={{ fontSize: '0.6875rem', color: '#444', marginLeft: '0.375rem' }}>{a.internal.licensePlate}</span>
                    )}
                  </div>
                  {/* Turno */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.75rem', color: '#555' }}>{a.shift?.name ?? 'Sin turno'}</p>
                  </div>
                  {/* Horario */}
                  <div style={{ flex: 1, minWidth: 0, fontFamily: 'monospace', fontSize: '0.8125rem', color: '#8b949e' }}>
                    {a.startTime?.slice(11, 16)} – {a.endTime?.slice(11, 16)}
                  </div>
                  {/* Estado */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 20,
                      background: `${EST_COLOR[a.status]}18`, color: EST_COLOR[a.status] ?? '#555',
                      border: `1px solid ${EST_COLOR[a.status]}30`,
                    }}>
                      {EST_LABEL[a.status] ?? a.status}
                    </span>
                  </div>
                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                    <Link
                      href={`/asignaciones/nueva?from=${a.id}&fecha=${fecha}`}
                      title="Repetir esta asignación"
                      style={{ background: 'rgba(75,130,220,0.08)', border: '1px solid rgba(75,130,220,0.2)', borderRadius: 7, padding: '0.3rem 0.5rem', color: '#4b82dc', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                    >
                      <Copy size={12} />
                    </Link>
                    <button
                      onClick={() => { if (confirm('¿Cancelar esta asignación?')) eliminar.mutate(String(a.id)); }}
                      style={{ background: 'rgba(251,86,91,0.08)', border: '1px solid rgba(251,86,91,0.2)', borderRadius: 7, padding: '0.3rem 0.5rem', cursor: 'pointer', color: '#fb565b', display: 'flex', alignItems: 'center' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
