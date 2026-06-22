/**
 * Servicio de Desvíos
 *
 * Encapsula:
 * - Registro de desvíos de rutas
 * - Justificación de desvíos
 * - Análisis de desvíos
 *
 * Patrón: ClienteApi (Factory)
 */

import { ClienteApi } from '@/core/servicios/cliente-api';

/**
 * Modelo de desvío
 */
export interface Desvio {
  id: string;
  viajeId: string;
  conductorId: string;
  rutaPlaneada: string;
  rutaReal: string;
  distanciaExtra: number; // km
  tiempoExtra: number; // minutos
  justificado: boolean;
  justificacion?: string;
  revisadoPorId?: string;
  estadoRevision?: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  creadoEn: string;
  actualizadoEn: string;
}

/**
 * DTOs
 */
export interface FiltrosDesvios {
  viajeId?: string;
  conductorId?: string;
  justificado?: boolean;
  estadoRevision?: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  skip?: number;
  take?: number;
}

export interface BodyJustificarDesvio {
  justificado: boolean;
  justificacion?: string;
  revisadoPorId: string;
}

/**
 * Servicio para gestión de desvíos de ruta
 */
class DesviosServicio extends ClienteApi {
  constructor() {
    super('/desvios');
  }

  /**
   * Obtiene todos los desvíos con filtros
   * @param filtros Viaje, conductor, estado justificación, paginación
   * @returns Array de desvíos
   */
  async obtenerTodos(filtros?: FiltrosDesvios): Promise<Desvio[]> {
    return this.obtener<Desvio[]>('', {
      params: filtros,
    });
  }

  /**
   * Obtiene un desvío específico
   * @param id ID del desvío
   * @returns Desvío encontrado
   */
  async obtenerPorId(id: string): Promise<Desvio> {
    return this.obtener<Desvio>(`/${id}`);
  }

  /**
   * Justifica un desvío de ruta
   * @param id ID del desvío
   * @param datos Justificado, texto justificación, revisor
   * @returns Desvío actualizado
   */
  async justificar(id: string, datos: BodyJustificarDesvio): Promise<Desvio> {
    return this.actualizar<Desvio>(`/${id}/justificar`, datos);
  }

  /**
   * Obtiene desvíos de un conductor
   * @param conductorId ID del conductor
   * @returns Array de desvíos
   */
  async obtenerPorConductor(conductorId: string): Promise<Desvio[]> {
    return this.obtener<Desvio[]>('/conductor', {
      params: { conductorId },
    });
  }

  /**
   * Obtiene desvíos sin justificar
   * @returns Array de desvíos pendientes
   */
  async obtenerPendientes(): Promise<Desvio[]> {
    return this.obtener<Desvio[]>('/pendientes');
  }
}

/**
 * Exporta instancia singleton
 */
export const desviosServicio = new DesviosServicio();
