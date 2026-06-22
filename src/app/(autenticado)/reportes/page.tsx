'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, BarChart3 } from 'lucide-react';
import {
  reportesServicio,
  type ReporteConsolidado,
  type FiltrosReportes,
} from '@/services/reportes.servicio';
import { Cargando } from '@/components/dashboard/Cargando';
import { useUsuarioAlmacen } from '@/almacen/usuario.almacen';

export default function PaginaReportes() {
  const { usuario } = useUsuarioAlmacen();
  const userSindicatoId = usuario?.sindicatoId?.toString() || '';

  const [desde, setDesde] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0]);
  const [descargando, setDescargando] = useState(false);

  const filtros: FiltrosReportes = {
    desde,
    hasta,
  };

  const { data: reporte, isLoading } = useQuery<ReporteConsolidado>({
    queryKey: ['reportes', userSindicatoId, filtros],
    queryFn: () => reportesServicio.obtenerReporte(userSindicatoId, filtros),
    enabled: !!userSindicatoId,
  });

  const handleDescargarPDF = async () => {
    try {
      setDescargando(true);
      const blob = await reportesServicio.descargarPDF(userSindicatoId, filtros);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error descargando PDF:', error);
    } finally {
      setDescargando(false);
    }
  };

  if (isLoading) return <Cargando />;

  const resumen = reporte?.resumen || {};
  const reportePorConductor = reporte?.reportePorConductor || [];
  const asignaciones = reporte?.asignacionesDetalladas || [];

  return (
    <div style={{ padding: '2rem' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: '1.625rem', color: '#f2f2f2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={22} color="#00d992" /> Reportes Operacionales
          </h1>
          <p style={{ color: '#8b949e', fontSize: '0.875rem' }}>Análisis consolidado de asignaciones y vueltas</p>
        </div>
        <button
          className="boton boton-primario"
          onClick={handleDescargarPDF}
          disabled={descargando || !reporte}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Download size={15} />
          {descargando ? 'Descargando...' : 'Descargar PDF'}
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <input
          className="campo-entrada"
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          style={{ flex: '0 1 140px' }}
        />
        <input
          className="campo-entrada"
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          style={{ flex: '0 1 140px' }}
        />
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'rgba(0,217,146,0.08)', border: '1px solid rgba(0,217,146,0.15)', borderRadius: 8, padding: '1rem' }}>
          <p style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Asignaciones</p>
          <p style={{ color: '#00d992', fontSize: '2rem', fontWeight: 800 }}>{resumen.totalAsignaciones || 0}</p>
        </div>
        <div style={{ background: 'rgba(0,217,146,0.08)', border: '1px solid rgba(0,217,146,0.15)', borderRadius: 8, padding: '1rem' }}>
          <p style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Vueltas</p>
          <p style={{ color: '#00d992', fontSize: '2rem', fontWeight: 800 }}>{resumen.totalVueltas || 0}</p>
        </div>
        <div style={{ background: 'rgba(0,217,146,0.08)', border: '1px solid rgba(0,217,146,0.15)', borderRadius: 8, padding: '1rem' }}>
          <p style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Transferencias</p>
          <p style={{ color: '#00d992', fontSize: '2rem', fontWeight: 800 }}>{resumen.totalTransferencias || 0}</p>
        </div>
        <div style={{ background: 'rgba(0,217,146,0.08)', border: '1px solid rgba(0,217,146,0.15)', borderRadius: 8, padding: '1rem' }}>
          <p style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Promedio Vueltas</p>
          <p style={{ color: '#00d992', fontSize: '2rem', fontWeight: 800 }}>{(resumen.promedioVueltasPorAsignacion || 0).toFixed(1)}</p>
        </div>
      </div>

      {/* Tabla conductores */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#f2f2f2', marginBottom: '1rem' }}>Reporte por Conductor</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #3d3a39' }}>
                {['Conductor', 'Asignaciones', 'Vueltas', 'Viajes', 'Promedio'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#8b949e',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportePorConductor.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#8b949e' }}>
                    Sin datos
                  </td>
                </tr>
              ) : (
                reportePorConductor.map((c, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(61,58,57,0.5)' }}>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ color: '#f2f2f2', fontWeight: 600 }}>{c.nombre}</div>
                      <div style={{ color: '#8b949e', fontSize: '0.75rem' }}>{c.email}</div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#b8b3b0', textAlign: 'center' }}>{c.totalAsignaciones}</td>
                    <td style={{ padding: '0.875rem 1rem', color: '#b8b3b0', textAlign: 'center' }}>{c.totalVueltas}</td>
                    <td style={{ padding: '0.875rem 1rem', color: '#b8b3b0', textAlign: 'center' }}>{c.totalViajes}</td>
                    <td style={{ padding: '0.875rem 1rem', color: '#00d992', fontWeight: 600, textAlign: 'center' }}>
                      {c.promedioVueltas.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla asignaciones */}
      <div>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#f2f2f2', marginBottom: '1rem' }}>Asignaciones Detalladas</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #3d3a39' }}>
                {['Fecha', 'Conductor', 'Micro', 'Ruta', 'Vueltas'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#8b949e',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {asignaciones.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#8b949e' }}>
                    Sin asignaciones
                  </td>
                </tr>
              ) : (
                asignaciones.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid rgba(61,58,57,0.5)' }}>
                    <td style={{ padding: '0.875rem 1rem', color: '#b8b3b0', fontSize: '0.875rem' }}>
                      {format(parseISO(a.fecha), 'dd MMM yyyy', { locale: es })}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#b8b3b0' }}>{a.conductor}</td>
                    <td style={{ padding: '0.875rem 1rem', color: '#00d992', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {a.micro}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#b8b3b0' }}>{a.ruta}</td>
                    <td style={{ padding: '0.875rem 1rem', color: '#00d992', fontWeight: 600, textAlign: 'center' }}>
                      {a.vueltas}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
