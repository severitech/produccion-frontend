/**
 * Servicio de Reportes
 *
 * Encapsula:
 * - Obtención de reportes consolidados
 * - Exportación a PDF
 * - Estadísticas diarias
 * - Filtrado por fecha, conductor, micro, ruta
 *
 * Patrón: ClienteApi (Factory)
 */

import { ClienteApi } from '@/core/servicios/cliente-api';

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
}

export const reportesServicio = new ReportesServicio();
