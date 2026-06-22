/**
 * Servicio de Prueba de Ubicaciones
 *
 * Encapsula:
 * - Creación de ubicaciones de prueba para micros
 * - Actualización de ubicación y velocidad
 * - Obtención de historial de ubicaciones
 * - Desactivación de pruebas
 *
 * Patrón: ClienteApi (Factory)
 */

import { ClienteApi } from '@/core/servicios/cliente-api';

export interface UbicacionPrueba {
  id: string;
  internalId: string;
  syndicateId: string;
  driverId?: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading?: number;
  accuracy?: number;
  timestamp: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  internal?: {
    id: string;
    internalNumber: string;
    licensePlate: string;
  };
  syndicate?: {
    id: string;
    name: string;
  };
  driver?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface CrearUbicacionPruebaDto {
  internalId: string;
  syndicateId: string;
  driverId?: string;
  latitude: number;
  longitude: number;
  speedKmh?: number;
  heading?: number;
  accuracy?: number;
}

export interface ActualizarUbicacionPruebaDto {
  latitude?: number;
  longitude?: number;
  speedKmh?: number;
  heading?: number;
  accuracy?: number;
  driverId?: string;
  isActive?: boolean;
}

class LocationTestServicio extends ClienteApi {
  constructor() {
    super('/location-test');
  }

  /**
   * Crea nueva ubicación de prueba para un micro
   * @param datos Coordenadas y datos del micro
   * @returns Ubicación creada
   */
  async crear(datos: CrearUbicacionPruebaDto): Promise<UbicacionPrueba> {
    return super.crear<UbicacionPrueba>('', datos);
  }

  /**
   * Obtiene todas las ubicaciones activas de prueba
   * @returns Array de ubicaciones activas
   */
  async obtenerActivas(): Promise<UbicacionPrueba[]> {
    console.log('📡 [locationTestServicio] Llamando GET /location-test/activas/todas');
    const resultado = await this.obtener<UbicacionPrueba[]>('/activas/todas');
    console.log('📡 [locationTestServicio] Respuesta GET /location-test/activas/todas:', {
      cantidad: resultado?.length ?? 0,
      primera: resultado?.[0],
      todas: resultado,
    });
    return resultado;
  }

  /**
   * Obtiene todas las ubicaciones activas de un sindicato
   * @param syndicateId ID del sindicato
   * @returns Array de ubicaciones
   */
  async obtenerPorSindicato(syndicateId: string): Promise<UbicacionPrueba[]> {
    return this.obtener<UbicacionPrueba[]>(`/sindicato/${syndicateId}`);
  }

  /**
   * Obtiene una ubicación específica
   * @param id ID de la ubicación
   * @returns Ubicación encontrada
   */
  async obtenerPorId(id: string): Promise<UbicacionPrueba> {
    return this.obtener<UbicacionPrueba>(`/${id}`);
  }

  /**
   * Obtiene historial de ubicaciones de un micro
   * @param internalId ID del micro interno
   * @param syndicateId ID del sindicato
   * @returns Array de últimas 100 ubicaciones
   */
  async obtenerHistorial(
    internalId: string,
    syndicateId: string
  ): Promise<UbicacionPrueba[]> {
    return this.obtener<UbicacionPrueba[]>(
      `/historial/${internalId}/${syndicateId}`
    );
  }

  /**
   * Actualiza ubicación, velocidad u otros parámetros
   * @param id ID de la ubicación
   * @param datos Datos a actualizar
   * @returns Ubicación actualizada
   */
  async actualizar(
    id: string,
    datos: ActualizarUbicacionPruebaDto
  ): Promise<UbicacionPrueba> {
    return super.actualizar<UbicacionPrueba>(`/${id}`, datos);
  }

  /**
   * Desactiva una ubicación de prueba
   * @param id ID de la ubicación
   * @returns Ubicación desactivada
   */
  async desactivar(id: string): Promise<UbicacionPrueba> {
    return this.actualizar(id, { isActive: false });
  }

  /**
   * Elimina una ubicación de prueba
   * @param id ID de la ubicación
   * @returns Confirmación de eliminación
   */
  async eliminar(id: string): Promise<{ mensaje: string }> {
    return super.eliminar(`/${id}`);
  }

  /**
   * Simula movimiento actualización de ubicación
   * @param id ID de la ubicación
   * @param latitude Nueva latitud
   * @param longitude Nueva longitud
   * @param speedKmh Velocidad
   * @returns Ubicación actualizada
   */
  async simularMovimiento(
    id: string,
    latitude: number,
    longitude: number,
    speedKmh: number
  ): Promise<UbicacionPrueba> {
    return this.actualizar(id, { latitude, longitude, speedKmh });
  }
}

export const locationTestServicio = new LocationTestServicio();
