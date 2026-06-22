/**
 * Servicio del Simulador de Rutas
 *
 * Encapsula todas las llamadas API necesarias para:
 * - Obtener lista de internos (buses/micros)
 * - Obtener lista de líneas
 * - Obtener lista de rutas
 * - Gestionar ubicaciones de prueba
 *
 * Patrón: ClienteApi (Factory)
 */

import { ClienteApi } from '@/core/servicios/cliente-api';

export interface Driver {
  id: string;
  user?: {
    name: string;
    email: string;
  };
}

export interface Interno {
  id: string;
  numeroInterno?: string;
  internalNumber?: string;
  placa?: string;
  licensePlate?: string;
  modelo?: string;
  model?: string;
  capacidad?: number;
  capacity?: number;
  sindicatoId?: string | number;
  syndicateId?: string | number;
  lineaId?: string;
  lineId?: string;
}

export interface Linea {
  id: string;
  name: string;
  code: string;
  color?: string;
  fare?: number;
}

export interface Parada {
  id: string;
  name: string;
  centerLat: number | string;
  centerLng: number | string;
  orderIndex: number;
}

export interface Ruta {
  id: string;
  name: string;
  lineId: string;
  stops?: Parada[];
  drawnPoints?: any[]; // Puntos dibujados de la ruta
  totalDistanceKm?: number;
  estimatedTimeMin?: number;
}

class SimuladorServicio extends ClienteApi {
  constructor() {
    super('');
  }

  /**
   * Obtiene lista de conductores
   * @returns Array de conductores disponibles
   */
  async obtenerConductores(): Promise<Driver[]> {
    return this.obtener<Driver[]>('/conductores');
  }

  /**
   * Obtiene lista de internos (buses)
   * @returns Array de internos disponibles
   */
  async obtenerInternos(): Promise<Interno[]> {
    const datos = await this.obtener<any[]>('/internos');
    console.log('🚌 Datos crudos de internos:', datos);
    const mapeados = datos.map((d) => ({
      ...d,
      id: d.id,
      numeroInterno: d.numeroInterno || d.internalNumber,
      internalNumber: d.numeroInterno || d.internalNumber,
      placa: d.placa || d.licensePlate,
      licensePlate: d.placa || d.licensePlate,
      sindicatoId: d.sindicatoId || d.syndicateId,
      syndicateId: d.sindicatoId || d.syndicateId,
    }));
    console.log('🚌 Internos con alias:', mapeados);
    return mapeados;
  }

  /**
   * Obtiene lista de líneas
   * @returns Array de líneas disponibles
   */
  async obtenerLineas(): Promise<Linea[]> {
    const datos = await this.obtener<any[]>('/lineas');
    return datos.map((d) => this.mapearLinea(d));
  }

  private mapearLinea(d: any): Linea {
    return {
      id: d.id,
      name: d.name || d.nombre,
      code: d.code || d.numero,
      color: d.color,
      fare: d.tarifaBaseBs || d.fare,
    };
  }

  /**
   * Obtiene rutas de una línea específica
   * @param lineId ID de la línea
   * @returns Array de rutas
   */
  async obtenerRutas(lineId: string): Promise<Ruta[]> {
    const datos = await this.obtener<any[]>('/rutas', {
      params: { lineId },
    });
    console.log('📍 Datos crudos de rutas:', datos);
    const mapeadas = datos.map((d) => this.mapearRuta(d));
    console.log('📍 Rutas mapeadas:', mapeadas);
    return mapeadas;
  }

  private mapearRuta(d: any): Ruta {
    const paradas = (d.stops || d.paradas || []) as any[];
    const stopsMaped = paradas.map((p: any) => this.mapearParada(p));
    console.log(`🗺️ Ruta "${d.name}": drawnPoints=${d.drawnPoints?.length || 0}, stops=${stopsMaped.length}`);
    return {
      id: d.id,
      name: d.name || d.nombre,
      lineId: d.lineId || d.lineaId,
      stops: stopsMaped,
      drawnPoints: d.drawnPoints || [],
      totalDistanceKm: d.totalDistanceKm || d.distanciaTotal,
      estimatedTimeMin: d.estimatedTimeMin || d.tiempoEstimado,
    };
  }

  private mapearParada(p: any): Parada {
    return {
      id: p.id,
      name: p.name || p.nombre,
      centerLat: p.centerLat || p.latitud,
      centerLng: p.centerLng || p.longitud,
      orderIndex: p.orderIndex || p.orden || 0,
    };
  }
}

export const simuladorServicio = new SimuladorServicio();
