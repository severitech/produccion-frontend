/**
 * Servicio de Líneas de Transporte
 *
 * Encapsula:
 * - Obtención de líneas y rutas
 * - Información de horarios y frecuencias
 * - Gestión de líneas (admin)
 * - Filtrado por sindicato
 *
 * Patrón: ClienteApi (Factory)
 */

import { ClienteApi } from '@/core/servicios/cliente-api';

/**
 * Modelo de línea de transporte
 * Los nombres coinciden con lo que retorna el backend
 */
export interface Linea {
  id: string;
  nombre: string;
  numero: string;
  sindicatoId: string;
  descripcion?: string;
  tarifaBaseBs: number;
  rutas?: string[]; // Array de IDs de rutas
  conductoresActivos?: number;
  estado?: 'ACTIVA' | 'PAUSADA' | 'SUSPENDIDA';
  creadoEn?: string;
  actualizadoEn?: string;
  // Campos del backend (mappeo)
  name?: string;
  code?: string;
}

/**
 * DTOs
 */
export interface FiltrosLineas {
  sindicatoId?: string;
  estado?: 'ACTIVA' | 'PAUSADA' | 'SUSPENDIDA';
  skip?: number;
  take?: number;
}

export interface BodyCrearLinea {
  nombre: string;
  codigo: string;
  tarifa: number;
  color: string;
  sindicatoId: number;
  imagenUrl?: string;
}

export interface BodyActualizarLinea {
  nombre?: string;
  codigo?: string;
  tarifa?: number;
  color?: string;
  sindicatoId?: number;
  imagenUrl?: string;
  activo?: boolean;
}

/**
 * Servicio para gestión de líneas de transporte
 */
class LineasServicio extends ClienteApi {
  constructor() {
    super('/lineas');
  }

  /**
   * Obtiene todas las líneas con filtros opcionales
   * @param filtros Sindicato, estado, paginación
   * @returns Array de líneas
   */
  async obtenerTodas(filtros?: FiltrosLineas): Promise<Linea[]> {
    const datos = await this.obtener<any[]>('', {
      params: filtros,
    });
    return datos.map((d) => this.mapearDatos(d));
  }

  /**
   * Obtiene una línea específica por ID
   * @param id ID de la línea
   * @returns Línea encontrada
   */
  async obtenerPorId(id: string): Promise<Linea> {
    const dato = await this.obtener<any>(`/${id}`);
    return this.mapearDatos(dato);
  }

  private mapearDatos(d: any): Linea {
    return {
      ...d,
      nombre: d.name || d.nombre,
      numero: d.code || d.numero,
      tarifaBaseBs: typeof d.fare === 'string' ? parseFloat(d.fare) : d.fare || d.tarifaBaseBs || 0,
    };
  }

  /**
   * Crea una nueva línea de transporte
   * @param datos Datos de la línea
   * @returns Línea creada
   */
  async crear(datos: BodyCrearLinea): Promise<Linea> {
    const respuesta = await super.crear<any>('', datos);
    return this.mapearDatos(respuesta);
  }

  /**
   * Actualiza información de una línea
   * @param id ID de la línea
   * @param datos Campos a actualizar
   * @returns Línea actualizada
   */
  async actualizar(id: string, datos: BodyActualizarLinea): Promise<Linea> {
    const respuesta = await super.actualizar<any>(`/${id}`, datos);
    return this.mapearDatos(respuesta);
  }

  /**
   * Elimina una línea del sistema
   * @param id ID de la línea
   * @returns Confirmación de eliminación
   */
  async eliminar(id: string): Promise<{ mensaje: string }> {
    return super.eliminar(`/${id}`);
  }

  /**
   * Obtiene las rutas de una línea específica
   * @param lineaId ID de la línea
   * @returns Array de rutas
   */
  async obtenerRutas(lineaId: string): Promise<any[]> {
    return this.obtener(`/${lineaId}/rutas`);
  }

  /**
   * Obtiene conductores activos en una línea
   * @param lineaId ID de la línea
   * @returns Array de conductores
   */
  async obtenerConductores(lineaId: string): Promise<any[]> {
    return this.obtener(`/${lineaId}/conductores`);
  }
}

/**
 * Exporta instancia singleton
 */
export const lineasServicio = new LineasServicio();
