/**
 * Servicio de Turnos
 *
 * Encapsula:
 * - Obtención de turnos disponibles
 * - Asignación de turnos a conductores
 * - Gestión de turnos (admin)
 *
 * Patrón: ClienteApi (Factory)
 */

import { ClienteApi } from '@/core/servicios/cliente-api';

/**
 * Modelo de turno
 */
export interface Turno {
  id: string;
  lineaId: string;
  rutaId: string;
  horaInicio: string;
  horaFin: string;
  conductorAsignadoId?: string;
  fecha: string;
  estado: 'DISPONIBLE' | 'ASIGNADO' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO';
  capacidadPasajeros: number;
  notas?: string;
  creadoEn: string;
  actualizadoEn: string;
}

/**
 * DTOs
 */
export interface BodyCrearTurno {
  lineaId: string;
  rutaId: string;
  horaInicio: string;
  horaFin: string;
  fecha: string;
  capacidadPasajeros: number;
  notas?: string;
}

export interface BodyActualizarTurno {
  conductorAsignadoId?: string;
  estado?: 'DISPONIBLE' | 'ASIGNADO' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO';
  notas?: string;
}

/**
 * Servicio para gestión de turnos
 */
class TurnosServicio extends ClienteApi {
  constructor() {
    super('/turnos');
  }

  /**
   * Obtiene todos los turnos
   * @returns Array de turnos
   */
  async obtenerTodos(): Promise<Turno[]> {
    return this.obtener<Turno[]>();
  }

  /**
   * Obtiene un turno específico
   * @param id ID del turno
   * @returns Turno encontrado
   */
  async obtenerPorId(id: string): Promise<Turno> {
    return this.obtener<Turno>(`/${id}`);
  }

  /**
   * Crea un nuevo turno
   * @param datos Línea, ruta, horario, fecha
   * @returns Turno creado
   */
  async crear(datos: BodyCrearTurno): Promise<Turno> {
    return super.crear<Turno>('', datos);
  }

  /**
   * Actualiza un turno
   * @param id ID del turno
   * @param datos Campos a actualizar
   * @returns Turno actualizado
   */
  async actualizar(id: string, datos: BodyActualizarTurno): Promise<Turno> {
    return super.actualizar<Turno>(`/${id}`, datos);
  }

  /**
   * Elimina un turno
   * @param id ID del turno
   * @returns Confirmación
   */
  async eliminar(id: string): Promise<{ mensaje: string }> {
    return super.eliminar(`/${id}`);
  }

  /**
   * Obtiene turnos disponibles para una fecha
   * @param fecha Fecha en formato YYYY-MM-DD
   * @returns Array de turnos sin asignar
   */
  async obtenerDisponibles(fecha: string): Promise<Turno[]> {
    return this.obtener<Turno[]>('/disponibles', {
      params: { fecha },
    });
  }

  /**
   * Obtiene turnos asignados a un conductor
   * @param conductorId ID del conductor
   * @returns Array de turnos del conductor
   */
  async obtenerPorConductor(conductorId: string): Promise<Turno[]> {
    return this.obtener<Turno[]>('/conductor', {
      params: { conductorId },
    });
  }
}

/**
 * Exporta instancia singleton
 */
export const turnosServicio = new TurnosServicio();
