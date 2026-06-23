/**
 * Servicio de Reportes
 *
 * Encapsula:
 * - Obtención de reportes consolidados
 * - Exportación a PDF
 * - Estadísticas diarias
 * - Filtrado por fecha, conductor, micro, ruta
 * - Reportes dinámicos (voz + análisis ML)
 *
 * Patrón: ClienteApi (Factory)
 */

import { ClienteApi } from '@/core/servicios/cliente-api';
import { api } from './api';

export interface AsignacionDetallada {
  id: string;
  fecha: string;
  conductor: string;
  micro: string;
  ruta: string;
  vueltas: number;
  horaInicio: string;
  horaFin: string;
}

export interface TransferenciaDetallada {
  id: string;
  fecha: string;
  viajeorigen: string;
  viajedestino: string;
  estado: string;
}

export interface ConductorReporte {
  nombre: string;
  email: string;
  totalAsignaciones: number;
  totalVueltas: number;
  totalViajes: number;
  promedioVueltas: number;
}

export interface Resumen {
  totalAsignaciones: number;
  totalVueltas: number;
  totalTransferencias: number;
  totalViajes: number;
  promedioVueltasPorAsignacion: number;
}

export interface ReporteConsolidado {
  periodo: {
    desde: string;
    hasta: string;
  };
  resumen: Resumen;
  reportePorConductor: ConductorReporte[];
  asignacionesDetalladas: AsignacionDetallada[];
  transferenciasDetalladas: TransferenciaDetallada[];
}

export interface FiltrosReportes {
  desde?: string;
  hasta?: string;
  conductorId?: string;
  microId?: string;
  rutaId?: string;
}

export interface EstadisticasDiarias {
  fecha: string;
  totalBuses: number;
  totalVueltas: number;
  asignacionesDetalle: Array<{
    micro: string;
    conductor: string;
    vueltas: number;
  }>;
}

// ════════════════════════════════════════════════════════════════
// REPORTES DINÁMICOS - Nuevos tipos
// ════════════════════════════════════════════════════════════════

export enum TipoReporteDinamico {
  INCIDENT = 'INCIDENT',
  ANOMALY = 'ANOMALY',
  MAINTENANCE = 'MAINTENANCE',
  TRAFFIC = 'TRAFFIC',
  DELAY = 'DELAY',
  GENERAL = 'GENERAL',
}

export enum SeveridadReporte {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface CrearReporteDinamico {
  report_type: TipoReporteDinamico;
  title: string;
  description?: string;
  usuario_id: number;
  linea_id?: number;
  viaje_id?: number;
  voice_file?: File;
  voice_duration_seconds?: number;
}

export interface ReporteDinamico {
  id: string;
  report_type: TipoReporteDinamico;
  title: string;
  description: string;
  transcription: string;
  predicted_severity: SeveridadReporte;
  ml_analysis: {
    severity: SeveridadReporte;
    keywords: string[];
    confidence: number;
    anomaly_score: number;
  };
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  usuario_id: number;
  linea_id?: number;
  viaje_id?: number;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsReportes {
  total_reports: number;
  reports_by_type: Record<string, number>;
  reports_by_severity: Record<string, number>;
  avg_processing_time: number;
  processing_error_rate: number;
  reports_last_24h: number;
  reports_last_7d: number;
}

class ReportesServicio extends ClienteApi {
  constructor() {
    super('/reportes');
  }

  /**
   * Obtiene reporte consolidado de un sindicato
   * @param sindicateId ID del sindicato
   * @param filtros Criterios de filtrado
   * @returns Reporte con métricas agregadas
   */
  async obtenerReporte(
    sindicateId: string,
    filtros?: FiltrosReportes
  ): Promise<ReporteConsolidado> {
    return this.obtener<ReporteConsolidado>(`/consolidado/${sindicateId}`, {
      params: filtros,
    });
  }

  /**
   * Exporta reporte a PDF
   * @param sindicateId ID del sindicato
   * @param filtros Criterios de filtrado
   * @returns Datos formateados para PDF
   */
  async exportarPDF(
    sindicateId: string,
    filtros?: FiltrosReportes
  ): Promise<any> {
    return this.obtener<any>(`/pdf/${sindicateId}`, {
      params: filtros,
    });
  }

  /**
   * Obtiene estadísticas de un día específico
   * @param sindicateId ID del sindicato
   * @param fecha Fecha en formato YYYY-MM-DD
   * @returns Estadísticas del día
   */
  async obtenerEstadisticasDiarias(
    sindicateId: string,
    fecha: string
  ): Promise<EstadisticasDiarias> {
    return this.obtener<EstadisticasDiarias>(`/diarias/${sindicateId}/${fecha}`);
  }

  /**
   * Genera descarga de PDF (helper)
   * @param sindicateId ID del sindicato
   * @param filtros Criterios de filtrado
   */
  async descargarPDF(
    sindicateId: string,
    filtros?: FiltrosReportes
  ): Promise<Blob> {
    const response = await this.api.get(`/pdf/${sindicateId}`, {
      params: filtros,
      responseType: 'blob',
    });
    return response.data;
  }

  // ════════════════════════════════════════════════════════════════
  // REPORTES DINÁMICOS - Nuevos métodos
  // ════════════════════════════════════════════════════════════════

  /**
   * Crear reporte dinámico (texto o voz)
   */
  async crearReporteDinamico(
    data: CrearReporteDinamico
  ): Promise<{ ok: boolean; data: ReporteDinamico; error?: string }> {
    const formData = new FormData();

    // Agregar campos de formulario
    formData.append('report_type', data.report_type);
    formData.append('title', data.title);
    formData.append('description', data.description || '');
    formData.append('usuario_id', String(data.usuario_id));

    if (data.linea_id) formData.append('linea_id', String(data.linea_id));
    if (data.viaje_id) formData.append('viaje_id', String(data.viaje_id));

    // Si hay archivo de voz
    if (data.voice_file) {
      formData.append('voice_file', data.voice_file);
      formData.append('voice_duration_seconds', String(data.voice_duration_seconds || 0));
    }

    return this.api
      .post('/ia/reportes/crear', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((r) => r.data);
  }

  /**
   * Listar reportes dinámicos con filtros
   */
  async listarReportesDinamicos(filtros?: {
    report_type?: TipoReporteDinamico;
    status?: string;
    usuario_id?: number;
    linea_id?: number;
    severity?: SeveridadReporte;
  }): Promise<{ ok: boolean; data: ReporteDinamico[] }> {
    return this.api
      .get('/ia/reportes', {
        params: filtros,
      })
      .then((r) => r.data);
  }

  /**
   * Obtener reporte dinámico específico
   */
  async obtenerReporteDinamico(id: string): Promise<{ ok: boolean; data: ReporteDinamico }> {
    return this.api.get(`/ia/reportes/${id}`).then((r) => r.data);
  }

  /**
   * Actualizar estado de reporte
   */
  async actualizarEstadoReporte(
    id: string,
    status: string,
    error?: string
  ): Promise<{ ok: boolean; data: ReporteDinamico }> {
    return this.api
      .patch(`/ia/reportes/${id}/estado`, {
        status,
        error,
      })
      .then((r) => r.data);
  }

  /**
   * Obtener analytics de reportes
   */
  async obtenerAnalyticsReportes(): Promise<{ ok: boolean; data: AnalyticsReportes }> {
    return this.api.get('/ia/reportes/analytics/dashboard').then((r) => r.data);
  }
}

export const reportesServicio = new ReportesServicio();
