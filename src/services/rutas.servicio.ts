/**
 * Servicio de Rutas
 *
 * Encapsula:
 * - Obtención de rutas de transporte
 * - Información de paradas y horarios
 * - Gestión de rutas (admin)
 * - Filtrado por línea
 *
 * Patrón: ClienteApi (Factory)
 */

import { ClienteApi } from '@/core/servicios/cliente-api';

/**
 * Modelo de parada
 */
export interface Parada {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  orden: number;
}

/**
 * Modelo de ruta
 */
export interface Ruta {
  id: string;
  nombre: string;
  lineaId: string;
  descripcion?: string;
  tipo: 'IDA' | 'REGRESO' | 'CIRCULAR';
  paradas: Parada[];
  distanciaKm: number;
  tiempoEstimadoMin: number;
  frecuenciaMin: number;
  recordingType?: string; // 'GPS' o 'DRAWN'
  estado: 'ACTIVA' | 'PAUSADA' | 'SUSPENDIDA';
  horarios: {
    horaInicio: string;
    horaFin: string;
    diasSemana: string[];
  }[];
  creadoEn: string;
  actualizadoEn: string;
}

/**
 * DTOs
 */
export interface FiltrosRutas {
  lineaId?: string;
  tipo?: 'IDA' | 'REGRESO' | 'CIRCULAR';
  estado?: 'ACTIVA' | 'PAUSADA' | 'SUSPENDIDA';
  skip?: number;
  take?: number;
}

export interface BodyCrearRuta {
  nombre: string;
  lineaId: number | string;
  descripcion?: string;
  direccion?: string;
  tipo?: 'IDA' | 'REGRESO' | 'CIRCULAR';
  paradas?: Array<{
    nombre: string;
    latitud: number;
    longitud: number;
    orden: number;
  }>;
  distanciaKm?: number;
  tiempoEstimadoMin?: number;
  tiempoDescansoMin?: number;
  frecuenciaMin?: number;
  horarios?: Array<{
    horaInicio: string;
    horaFin: string;
    diasSemana: string[];
  }>;
  puntosRuta?: Array<{
    lat: number;
    lng: number;
  }>;
  rutaGrabadaId?: number | string;
  recordingType?: string; // 'GPS' o 'DRAWN'
}

export interface BodyActualizarRuta {
  nombre?: string;
  descripcion?: string;
  tipo?: 'IDA' | 'REGRESO' | 'CIRCULAR';
  paradas?: Array<{
    nombre: string;
    latitud: number;
    longitud: number;
    orden: number;
  }>;
  distanciaKm?: number;
  tiempoEstimadoMin?: number;
  frecuenciaMin?: number;
  estado?: 'ACTIVA' | 'PAUSADA' | 'SUSPENDIDA';
  horarios?: Array<{
    horaInicio: string;
    horaFin: string;
    diasSemana: string[];
  }>;
}

/**
 * Servicio para gestión de rutas de transporte
 */
class RutasServicio extends ClienteApi {
  constructor() {
    super('/rutas');
  }

  /**
   * Obtiene todas las rutas con filtros opcionales
   * @param filtros Línea, tipo, estado, paginación
   * @returns Array de rutas
   */
  async obtenerTodas(filtros?: FiltrosRutas): Promise<Ruta[]> {
    return this.obtener<Ruta[]>('', {
      params: filtros,
    });
  }

  /**
   * Obtiene una ruta específica por ID
   * @param id ID de la ruta
   * @returns Ruta encontrada
   */
  async obtenerPorId(id: string): Promise<Ruta> {
    return this.obtener<Ruta>(`/${id}`);
  }

  /**
   * Crea una nueva ruta de transporte
   * Solo acceso admin del sindicato
   * @param datos Nombre, línea, paradas, horarios
   * @returns Ruta creada
   */
  async crear(datos: BodyCrearRuta): Promise<Ruta> {
    return super.crear<Ruta>('', datos);
  }

  /**
   * Actualiza información de una ruta
   * @param id ID de la ruta
   * @param datos Campos a actualizar
   * @returns Ruta actualizada
   */
  async actualizar(id: string, datos: BodyActualizarRuta): Promise<Ruta> {
    return super.actualizar<Ruta>(`/${id}`, datos);
  }

  /**
   * Elimina una ruta del sistema
   * @param id ID de la ruta
   * @returns Confirmación de eliminación
   */
  async eliminar(id: string): Promise<{ mensaje: string }> {
    return super.eliminar(`/${id}`);
  }

  /**
   * Obtiene las paradas de una ruta
   * @param rutaId ID de la ruta
   * @returns Array de paradas ordenadas
   */
  async obtenerParadas(rutaId: string): Promise<Parada[]> {
    return this.obtener<Parada[]>(`/${rutaId}/paradas`);
  }

  /**
   * Obtiene los horarios de una ruta
   * @param rutaId ID de la ruta
   * @returns Array de horarios
   */
  async obtenerHorarios(rutaId: string): Promise<any[]> {
    return this.obtener(`/${rutaId}/horarios`);
  }
}

/**
 * Exporta instancia singleton
 */
export const rutasServicio = new RutasServicio();
