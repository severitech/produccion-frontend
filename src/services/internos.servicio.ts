/**
 * Servicio de Internos (Buses)
 *
 * Encapsula:
 * - Obtención de buses disponibles
 * - Gestión de buses (admin)
 * - Información de estado de buses
 *
 * Patrón: ClienteApi (Factory)
 */

import { ClienteApi } from '@/core/servicios/cliente-api';

/**
 * Modelo de Interno (Bus)
 * Los nombres coinciden con lo que retorna el backend
 */
export interface Interno {
  // Campos del backend
  id: string;
  placa: string;
  lineaId?: string | number;
  numeroInterno: number | string;
  modelo: string;
  anioFabricacion: number;
  capacidad: number;
  estado: string;
  ultimoMantenimiento: string | null;
  proximoMantenimiento: string | null;
  kilometraje: number;
  creadoEn: string;
  actualizadoEn: string;
  // Aliases para compatibilidad con componentes
  año?: number;
  capacidadPasajeros?: number;
}

/**
 * DTOs - Coinciden exactamente con lo que espera el backend
 */
export interface BodyCrearInterno {
  placa: string;
  lineaId?: string | number;
  sindicatoId: string | number;
  numeroInterno: string | number;
  modelo: string;
  anioFabricacion?: number;
  capacidad: number;
  idDispositivoGps?: string;
}

export interface BodyActualizarInterno {
  modelo?: string;
  capacidad?: number;
  numeroInterno?: string | number;
  placa?: string;
  lineaId?: string | number;
  anioFabricacion?: number;
  estadoOperacional?: string;
  activo?: boolean;
}

/**
 * Servicio para gestión de internos
 */
class InternosServicio extends ClienteApi {
  constructor() {
    super('/internos');
  }

  /**
   * Obtiene todos los internos
   * @returns Array de internos
   */
  async obtenerTodos(): Promise<Interno[]> {
    const datos = await this.obtener<any[]>();
    return datos.map((d) => this.mapearDatos(d));
  }

  /**
   * Alias de obtenerTodos() para compatibilidad con componentes
   * @returns Array de internos
   */
  async obtenerTodas(): Promise<Interno[]> {
    return this.obtenerTodos();
  }

  /**
   * Obtiene un interno específico
   * @param id ID del interno
   * @returns Interno encontrado
   */
  async obtenerPorId(id: string): Promise<Interno> {
    const dato = await this.obtener<any>(`/${id}`);
    return this.mapearDatos(dato);
  }

  private mapearDatos(d: any): Interno {
    return {
      ...d,
      año: d.anioFabricacion,
      capacidadPasajeros: d.capacidad,
    };
  }

  /**
   * Crea un nuevo interno
   * @param datos Placa, línea, modelo, año, capacidad
   * @returns Interno creado
   */
  async crear(datos: BodyCrearInterno): Promise<Interno> {
    return super.crear<Interno>('', datos);
  }

  /**
   * Actualiza información de un interno
   * @param id ID del interno
   * @param datos Campos a actualizar
   * @returns Interno actualizado
   */
  async actualizar(id: string, datos: BodyActualizarInterno): Promise<Interno> {
    return super.actualizar<Interno>(`/${id}`, datos);
  }

  /**
   * Obtiene internos de una línea
   * @param lineaId ID de la línea
   * @returns Array de internos
   */
  async obtenerPorLinea(lineaId: string): Promise<Interno[]> {
    return this.obtener<Interno[]>('/', {
      params: { lineaId },
    });
  }

  /**
   * Obtiene internos disponibles (operativos)
   * @returns Array de internos en servicio
   */
  async obtenerDisponibles(): Promise<Interno[]> {
    return this.obtener<Interno[]>('/', {
      params: { estado: 'OPERATIVO' },
    });
  }
}

/**
 * Exporta instancia singleton
 */
export const internosServicio = new InternosServicio();
