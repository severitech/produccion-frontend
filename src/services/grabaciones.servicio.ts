/**
 * Servicio de Grabaciones
 *
 * Encapsula:
 * - Obtención de grabaciones de cámaras de buses
 * - Revisión y clasificación de grabaciones
 * - Almacenamiento y acceso a videos
 *
 * Patrón: ClienteApi (Factory)
 */

import { ClienteApi } from '@/core/servicios/cliente-api';

/**
 * Modelo de grabación
 */
export interface Grabacion {
  id: string;
  viajeId: string;
  busId: string;
  lineaId: string;
  urlVideo: string;
  duracionSeg: number;
  resolucion: string; // 1080p, 720p, etc
  tamanioMB: number;
  estado: 'GRABANDO' | 'PROCESANDO' | 'DISPONIBLE' | 'ARCHIVADO' | 'ELIMINADO';
  revisada: boolean;
  notas?: string;
  revisadoPorId?: string;
  fechaGrabacion: string;
  creadoEn: string;
  actualizadoEn: string;
}

/**
 * DTOs
 */
export interface FiltrosGrabaciones {
  lineaId?: string;
  busId?: string;
  estado?: 'GRABANDO' | 'PROCESANDO' | 'DISPONIBLE' | 'ARCHIVADO' | 'ELIMINADO';
  revisada?: boolean;
  skip?: number;
  take?: number;
}

export interface BodyCrearGrabacion {
  viajeId: string;
  busId: string;
  lineaId: string;
  resolucion: string;
  urlVideo: string;
}

export interface BodyRevisarGrabacion {
  revisadoPorId: string;
  notas?: string;
}

/**
 * Servicio para gestión de grabaciones
 */
class GrabacionesServicio extends ClienteApi {
  constructor() {
    super('/grabaciones');
  }

  /**
   * Obtiene todas las grabaciones con filtros
   * @param filtros Línea, bus, estado, revisión, paginación
   * @returns Array de grabaciones
   */
  async obtenerTodas(filtros?: FiltrosGrabaciones): Promise<Grabacion[]> {
    return this.obtener<Grabacion[]>('', {
      params: filtros,
    });
  }

  /**
   * Obtiene una grabación específica
   * @param id ID de la grabación
   * @returns Grabación encontrada
   */
  async obtenerPorId(id: string): Promise<Grabacion> {
    return this.obtener<Grabacion>(`/${id}`);
  }

  /**
   * Crea un nuevo registro de grabación
   * @param datos Viaje, bus, línea, URL video
   * @returns Grabación creada
   */
  async crear(datos: BodyCrearGrabacion): Promise<Grabacion> {
    return super.crear<Grabacion>('', datos);
  }

  /**
   * Revisa una grabación y agrega notas
   * @param id ID de la grabación
   * @param datos Revisor, notas
   * @returns Grabación actualizada
   */
  async revisar(id: string, datos: BodyRevisarGrabacion): Promise<Grabacion> {
    return super.actualizar<Grabacion>(`/${id}/revisar`, datos);
  }

  /**
   * Obtiene grabaciones sin revisar
   * @returns Array de grabaciones pendientes
   */
  async obtenerSinRevisar(): Promise<Grabacion[]> {
    return this.obtener<Grabacion[]>('/sin-revisar');
  }

  /**
   * Obtiene URL de reproducción de una grabación
   * @param id ID de la grabación
   * @returns URL de streaming
   */
  async obtenerUrlReproduccion(id: string): Promise<{ url: string }> {
    return this.obtener(`/${id}/url-reproduccion`);
  }
}

/**
 * Exporta instancia singleton
 */
export const grabacionesServicio = new GrabacionesServicio();
