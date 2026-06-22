/**
 * Servicio de Asignaciones
 *
 * Encapsula:
 * - Asignación de turnos a conductores
 * - Gestión de asignaciones
 * - Filtrado por sindicato, fecha, conductor
 *
 * Patrón: ClienteApi (Factory)
 */

import { ClienteApi } from '@/core/servicios/cliente-api';

/**
 * Modelo de asignación
 */
export interface Asignacion {
  id: string;
  conductorId: string;
  turnoId: string;
  fechaAsignacion: string;
  estado: 'ASIGNADO' | 'ACTIVO' | 'COMPLETADO' | 'CANCELADO';
  sindicatoId: string;
  notasAdministrador?: string;
  creadoEn: string;
  actualizadoEn: string;
}

/**
 * DTOs
 */
export interface FiltrosAsignaciones {
  sindicatoId?: string;
  conductorId?: string;
  fecha?: string;
  estado?: 'ASIGNADO' | 'ACTIVO' | 'COMPLETADO' | 'CANCELADO';
  skip?: number;
  take?: number;
}

export interface BodyCrearAsignacion {
  sindicatoId: number;
  conductorId: string;
  busId: number;
  rutaId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  notasAdministrador?: string;
}

export interface BodyActualizarAsignacion {
  estado?: 'ASIGNADO' | 'ACTIVO' | 'COMPLETADO' | 'CANCELADO';
  notasAdministrador?: string;
}

/**
 * Servicio para gestión de asignaciones de turnos
 */
class AsignacionesServicio extends ClienteApi {
  constructor() {
    super('/asignaciones');
  }

  /**
   * Obtiene todas las asignaciones con filtros
   * @param filtros Sindicato, conductor, fecha, paginación
   * @returns Array de asignaciones
   */
  async obtenerTodas(filtros?: FiltrosAsignaciones): Promise<Asignacion[]> {
    return this.obtener<Asignacion[]>('', {
      params: filtros,
    });
  }

  /**
   * Obtiene una asignación específica
   * @param id ID de la asignación
   * @returns Asignación encontrada
   */
  async obtenerPorId(id: string): Promise<Asignacion> {
    return this.obtener<Asignacion>(`/${id}`);
  }

  /**
   * Crea una nueva asignación
   * @param datos Conductor, turno
   * @returns Asignación creada
   */
  async crear(datos: BodyCrearAsignacion): Promise<Asignacion> {
    return super.crear<Asignacion>('', datos);
  }

  /**
   * Actualiza una asignación
   * @param id ID de la asignación
   * @param datos Campos a actualizar
   * @returns Asignación actualizada
   */
  async actualizar(id: string, datos: BodyActualizarAsignacion): Promise<Asignacion> {
    return super.actualizar<Asignacion>(`/${id}`, datos);
  }

  /**
   * Elimina una asignación
   * @param id ID de la asignación
   * @returns Confirmación
   */
  async eliminar(id: string): Promise<{ mensaje: string }> {
    return super.eliminar(`/${id}`);
  }
}

/**
 * Exporta instancia singleton
 */
export const asignacionesServicio = new AsignacionesServicio();
