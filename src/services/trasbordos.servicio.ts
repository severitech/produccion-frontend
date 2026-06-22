/**
 * Servicio de Trasbordos
 *
 * Encapsula:
 * - Registro de solicitudes de trasbordo
 * - Aprobación/rechazo de trasbordos
 * - Historial de trasbordos
 *
 * Patrón: ClienteApi (Factory)
 */

import { ClienteApi } from '@/core/servicios/cliente-api';

/**
 * Modelo de trasbordo
 */
export interface Trasbordo {
  id: string;
  viajeId: string;
  pasajeroId: string;
  lineaOrigenId: string;
  lineaDestinoId: string;
  tiempoSolicitado: string; // HH:MM
  estado: 'SOLICITADO' | 'APROBADO' | 'RECHAZADO' | 'COMPLETADO' | 'CANCELADO';
  razonRechazo?: string;
  decididoPorId?: string;
  fechaSolicitud: string;
  fechaDecision?: string;
  creadoEn: string;
  actualizadoEn: string;
}

/**
 * DTOs
 */
export interface FiltrosTrasbordos {
  pasajeroId?: string;
  viajeId?: string;
  estado?: 'SOLICITADO' | 'APROBADO' | 'RECHAZADO' | 'COMPLETADO' | 'CANCELADO';
  skip?: number;
  take?: number;
}

export interface BodyDecidirTrasbordo {
  estado: 'APROBADO' | 'RECHAZADO';
  decididoPorId: string;
  razonRechazo?: string;
}

/**
 * Servicio para gestión de trasbordos
 */
class TrasbordosServicio extends ClienteApi {
  constructor() {
    super('/trasbordos');
  }

  /**
   * Obtiene todos los trasbordos con filtros
   * @param filtros Estado, pasajero, viaje, paginación
   * @returns Array de trasbordos
   */
  async obtenerTodos(filtros?: FiltrosTrasbordos): Promise<Trasbordo[]> {
    return this.obtener<Trasbordo[]>('', {
      params: filtros,
    });
  }

  /**
   * Obtiene un trasbordo específico
   * @param id ID del trasbordo
   * @returns Trasbordo encontrado
   */
  async obtenerPorId(id: string): Promise<Trasbordo> {
    return this.obtener<Trasbordo>(`/${id}`);
  }

  /**
   * Aprueba o rechaza una solicitud de trasbordo
   * @param id ID del trasbordo
   * @param datos Estado (aprobado/rechazado), motivo si rechaza
   * @returns Trasbordo actualizado
   */
  async decidir(id: string, datos: BodyDecidirTrasbordo): Promise<Trasbordo> {
    return super.actualizar<Trasbordo>(`/${id}/decidir`, datos);
  }

  /**
   * Elimina un trasbordo
   * @param id ID del trasbordo
   * @returns Confirmación
   */
  async eliminar(id: string): Promise<{ mensaje: string }> {
    return super.eliminar(`/${id}`);
  }

  /**
   * Obtiene trasbordos pendientes de aprobación
   * @returns Array de trasbordos solicitados
   */
  async obtenerPendientes(): Promise<Trasbordo[]> {
    return this.obtener<Trasbordo[]>('/pendientes');
  }
}

/**
 * Exporta instancia singleton
 */
export const trasboardosServicio = new TrasbordosServicio();
