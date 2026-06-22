/**
 * Servicio de Notificaciones
 *
 * Encapsula:
 * - Obtención de notificaciones
 * - Marcar como leídas
 * - Gestión de notificaciones push
 *
 * Patrón: ClienteApi (Factory)
 */

import { ClienteApi } from '@/core/servicios/cliente-api';

/**
 * Modelo de notificación
 */
export interface Notificacion {
  id: string;
  usuarioDestinoId: string;
  titulo: string;
  mensaje: string;
  tipo: 'INFO' | 'ALERTA' | 'ERROR' | 'TRANSACCION' | 'PAGO';
  leida: boolean;
  datos?: Record<string, any>;
  creadoEn: string;
  leidoEn?: string;
}

/**
 * DTOs
 */
export interface FiltrosNotificaciones {
  usuarioDestinoId?: string;
  tipo?: 'INFO' | 'ALERTA' | 'ERROR' | 'TRANSACCION' | 'PAGO';
  leida?: boolean;
  skip?: number;
  take?: number;
}

export interface BodyCrearNotificacion {
  usuarioDestinoId: string;
  titulo: string;
  mensaje: string;
  tipo: 'INFO' | 'ALERTA' | 'ERROR' | 'TRANSACCION' | 'PAGO';
  datos?: Record<string, any>;
}

export interface BodyMarcarLeida {
  usuarioId: string;
}

/**
 * Servicio para gestión de notificaciones
 */
class NotificacionesServicio extends ClienteApi {
  constructor() {
    super('/notificaciones');
  }

  /**
   * Obtiene todas las notificaciones con filtros
   * @param filtros Usuario destino, tipo, estado leída, paginación
   * @returns Array de notificaciones
   */
  async obtenerTodas(filtros?: FiltrosNotificaciones): Promise<Notificacion[]> {
    return this.obtener<Notificacion[]>('/todas', {
      params: filtros,
    });
  }

  /**
   * Obtiene una notificación específica
   * @param id ID de la notificación
   * @returns Notificación encontrada
   */
  async obtenerPorId(id: string): Promise<Notificacion> {
    return this.obtener<Notificacion>(`/${id}`);
  }

  /**
   * Crea una nueva notificación
   * @param datos Destino, título, mensaje, tipo
   * @returns Notificación creada
   */
  async crear(datos: BodyCrearNotificacion): Promise<Notificacion> {
    return super.crear<Notificacion>('', datos);
  }

  /**
   * Marca una notificación como leída
   * @param id ID de la notificación
   * @param usuarioId ID del usuario que lee
   * @returns Notificación actualizada
   */
  async marcarLeida(id: string, usuarioId: string): Promise<Notificacion> {
    return super.actualizar<Notificacion>(`/${id}/leer/${usuarioId}`);
  }

  /**
   * Elimina una notificación
   * @param id ID de la notificación
   * @returns Confirmación de eliminación
   */
  async eliminar(id: string): Promise<{ mensaje: string }> {
    return super.eliminar(`/${id}`);
  }

  /**
   * Obtiene notificaciones no leídas del usuario
   * @param usuarioId ID del usuario
   * @returns Array de notificaciones sin leer
   */
  async obtenerNoLeidas(usuarioId?: string): Promise<Notificacion[]> {
    return this.obtener<Notificacion[]>('/sin-leer', {
      params: usuarioId ? { usuarioId } : {},
    });
  }
}

/**
 * Exporta instancia singleton
 */
export const notificacionesServicio = new NotificacionesServicio();
