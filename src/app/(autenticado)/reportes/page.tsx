'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, BarChart3, Mic, Send } from 'lucide-react';
import {
  reportesServicio,
  type ReporteConsolidado,
  type FiltrosReportes,
  TipoReporteDinamico,
  type CrearReporteDinamico,
  type ReporteDinamico,
} from '@/services/reportes.servicio';
import { Cargando } from '@/components/dashboard/Cargando';
import { useUsuarioAlmacen } from '@/almacen/usuario.almacen';

export default function PaginaReportes() {
  const { usuario } = useUsuarioAlmacen();
  const userSindicatoId = usuario?.sindicatoId?.toString() || '';
  const userId = usuario?.id || 0;

  // Estado de pestañas
  const [pestaña, setPestaña] = useState<'operacionales' | 'dinamicos'>('operacionales');

  // Estado de reportes operacionales
  const [desde, setDesde] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0]);
  const [descargando, setDescargando] = useState(false);

  // Estado de reportes dinámicos
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [formReporte, setFormReporte] = useState({
    report_type: TipoReporteDinamico.INCIDENT,
    title: '',
    description: '',
    linea_id: undefined as number | undefined,
    viaje_id: undefined as number | undefined,
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [hasAudio, setHasAudio] = useState(false);

  const filtros: FiltrosReportes = {
    desde,
    hasta,
  };

  const { data: reporte, isLoading } = useQuery<ReporteConsolidado>({
    queryKey: ['reportes', userSindicatoId, filtros],
    queryFn: () => reportesServicio.obtenerReporte(userSindicatoId, filtros),
    enabled: !!userSindicatoId && pestaña === 'operacionales',
  });

  // Mutación para crear reporte dinámico
  const createReporteMutation = useMutation({
    mutationFn: async (data: CrearReporteDinamico) => {
      return reportesServicio.crearReporteDinamico(data);
    },
    onSuccess: () => {
      resetFormReporte();
      alert('Reporte creado exitosamente');
    },
    onError: (error) => {
      console.error('Error creando reporte:', error);
      alert('Error al crear el reporte');
    },
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

  // Métodos para grabación de voz
  const iniciarGrabacion = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        setRecordedAudio(audioBlob);
        setHasAudio(true);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (error) {
      console.error('Error al acceder al micrófono:', error);
      alert('No se pudo acceder al micrófono');
    }
  };

  const detenerGrabacion = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const enviarReporte = async () => {
    if (!formReporte.title) {
      alert('Por favor ingresa un título');
      return;
    }

    if (!formReporte.description && !recordedAudio) {
      alert('Por favor ingresa una descripción o graba un audio');
      return;
    }

    const dataToSend: CrearReporteDinamico = {
      ...formReporte,
      usuario_id: userId,
    };

    if (recordedAudio) {
      dataToSend.voice_file = new File([recordedAudio], 'reporte.mp3', {
        type: 'audio/mp3',
      });
      dataToSend.voice_duration_seconds = recordingTime;
    }

    await createReporteMutation.mutateAsync(dataToSend);
  };

  const resetFormReporte = () => {
    setFormReporte({
      report_type: TipoReporteDinamico.INCIDENT,
      title: '',
      description: '',
      linea_id: undefined,
      viaje_id: undefined,
    });
    setRecordedAudio(null);
    setHasAudio(false);
    setRecordingTime(0);
  };

  const formatearTiempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading && pestaña === 'operacionales') return <Cargando />;

  const resumen = reporte?.resumen || {};
  const reportePorConductor = reporte?.reportePorConductor || [];
  const asignaciones = reporte?.asignacionesDetalladas || [];

  return (
    <div style={{ padding: '2rem' }}>
      {/* Encabezado con Pestañas */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: '1.625rem', color: '#f2f2f2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={22} color="#00d992" /> Reportes
            </h1>
            <p style={{ color: '#8b949e', fontSize: '0.875rem' }}>
              {pestaña === 'operacionales' ? 'Análisis consolidado de asignaciones' : 'Crea reportes dinámicos con análisis ML'}
            </p>
          </div>
          {pestaña === 'operacionales' && (
            <button
              className="boton boton-primario"
              onClick={handleDescargarPDF}
              disabled={descargando || !reporte}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Download size={15} />
              {descargando ? 'Descargando...' : 'Descargar PDF'}
            </button>
          )}
        </div>

        {/* Pestañas */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #3d3a39', paddingBottom: '1rem' }}>
          <button
            onClick={() => setPestaña('operacionales')}
            style={{
              padding: '0.5rem 1rem',
              background: pestaña === 'operacionales' ? '#00d992' : 'transparent',
              color: pestaña === 'operacionales' ? '#0f0f0f' : '#8b949e',
              border: 'none',
              borderBottom: pestaña === 'operacionales' ? 'none' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            Operacionales
          </button>
          <button
            onClick={() => setPestaña('dinamicos')}
            style={{
              padding: '0.5rem 1rem',
              background: pestaña === 'dinamicos' ? '#00d992' : 'transparent',
              color: pestaña === 'dinamicos' ? '#0f0f0f' : '#8b949e',
              border: 'none',
              borderBottom: pestaña === 'dinamicos' ? 'none' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            Dinámicos
          </button>
        </div>
      </div>

      {/* VISTA: REPORTES OPERACIONALES */}
      {pestaña === 'operacionales' && (
        <>
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
        </>
      )}

      {/* VISTA: REPORTES DINÁMICOS - Interfaz simplificada */}
      {pestaña === 'dinamicos' && (
        <div style={{ maxWidth: '800px' }}>
          {/* Formulario de reporte - Minimalista */}
          <div
            style={{
              background: '#101010',
              border: '1px solid #3d3a39',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            {/* Título del formulario */}
            <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#f2f2f2', marginBottom: '1rem' }}>
              Crear nuevo reporte
            </h2>

            {/* Tipo de reporte (oculto pero funcional) */}
            <input
              type="hidden"
              value={formReporte.report_type}
            />

            {/* Campo de texto único para título + descripción */}
            <textarea
              placeholder="Describe el problema o situación en detalle..."
              value={formReporte.description}
              onChange={(e) => setFormReporte({ ...formReporte, description: e.target.value })}
              disabled={isRecording}
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '1rem',
                backgroundColor: '#050507',
                border: '1px solid #3d3a39',
                color: '#f2f2f2',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                opacity: isRecording ? 0.5 : 1,
                resize: 'vertical',
                marginBottom: '1rem',
              }}
            />

            {/* Controles de voz y envío */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {/* Botón grabar/detener */}
              {!isRecording ? (
                <button
                  onClick={iniciarGrabacion}
                  disabled={createReporteMutation.isPending}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    backgroundColor: '#00d992',
                    color: '#0f0f0f',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.9rem',
                  }}
                >
                  <Mic size={16} /> Grabar
                </button>
              ) : (
                <button
                  onClick={detenerGrabacion}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    backgroundColor: '#ff4444',
                    color: '#f2f2f2',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.9rem',
                  }}
                >
                  Detener {formatearTiempo(recordingTime)}
                </button>
              )}

              {/* Botón enviar */}
              <button
                onClick={enviarReporte}
                disabled={
                  createReporteMutation.isPending ||
                  (!formReporte.description && !recordedAudio)
                }
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  backgroundColor:
                    !formReporte.description && !recordedAudio
                      ? '#666'
                      : '#00d992',
                  color:
                    !formReporte.description && !recordedAudio
                      ? '#999'
                      : '#0f0f0f',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9rem',
                }}
              >
                <Send size={16} /> {createReporteMutation.isPending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>

            {/* Indicador de audio grabado */}
            {hasAudio && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#1a3d2a', border: '1px solid #00d992', borderRadius: '4px' }}>
                <p style={{ color: '#00d992', fontWeight: 600, margin: 0 }}>
                  Audio grabado ({formatearTiempo(recordingTime)})
                </p>
              </div>
            )}
          </div>

          {/* Lista de reportes generados */}
          <div>
            <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#f2f2f2', marginBottom: '1rem' }}>
              Reportes Generados
            </h2>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* Placeholder - Los reportes se cargarían desde la query */}
              <div style={{
                background: '#101010',
                border: '1px solid #3d3a39',
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center',
                color: '#8b949e',
              }}>
                <p>No hay reportes generados aún</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
