/**
 * Servicio de Planificador de Rutas
 *
 * Encapsula:
 * - Cálculo de rutas óptimas entre dos puntos
 * - Análisis de múltiples opciones (tiempo, costo, trasbordos)
 * - Integración con datos de líneas y rutas
 *
 * Patrón: Especializado (no extiende ClienteApi por naturaleza de endpoint)
 */

import { api } from './api';

/**
 * Modelo de segmento de ruta en bus
 */
export interface SegmentoBus {
  tipo: 'bus';
  linea: {
    id: string;
    nombre: string;
    codigo: string;
    color: string;
    imageUrl: string | null;
    tarifa: number;
  };
  embarque: { lat: number; lng: number };
  descenso: { lat: number; lng: number };
  puntosRuta: [number, number][];
  distanciaKm: number;
  tiempoMin: number;
}

/**
 * Modelo de segmento de caminata
 */
export interface SegmentoCaminata {
  tipo: 'caminata';
  desde: { lat: number; lng: number };
  hasta: { lat: number; lng: number };
  puntosRuta: [number, number][];
  distanciaMetros: number;
  tiempoMin: number;
}

/**
 * Unión de tipos de segmento
 */
export type Segmento = SegmentoBus | SegmentoCaminata;

/**
 * Opción de ruta completa
 */
export interface OpcionRuta {
  segmentos: Segmento[];
  tiempoTotalMin: number;
  tiempoEsperaMin: number;
  distanciaTotalKm: number;
  caminataMetros: number;
  transbordos: number;
  costoTotal: number;
}

/**
 * DTOs
 */
export interface BodyCalcularRuta {
  origenLat: number;
  origenLng: number;
  destinoLat: number;
  destinoLng: number;
}

/**
 * Servicio especializado para cálculo de rutas
 * Usa el endpoint de planificador del backend que integra con Google Maps
 */
class PlanificadorServicio {
  /**
   * Calcula opciones de ruta entre dos coordenadas
   * Retorna múltiples opciones ordenadas por criterio (tiempo, costo, comodidad)
   * @param datos Origen y destino en lat/lng
   * @returns Array de opciones de ruta
   */
  async calcularRuta(datos: BodyCalcularRuta): Promise<OpcionRuta[]> {
    try {
      const { data } = await api.post('/planificador/calcular', datos);
      // El backend devuelve { ok: true, data: [...opciones...] }
      // Extraer el array de opciones del envelope
      return (data as any)?.data ?? data ?? [];
    } catch (error) {
      console.error('[PlanificadorServicio] Error al calcular ruta:', error);
      throw error;
    }
  }

  /**
   * Versión corta para llamadas simples
   * @param origenLat Latitud del origen
   * @param origenLng Longitud del origen
   * @param destinoLat Latitud del destino
   * @param destinoLng Longitud del destino
   * @returns Array de opciones de ruta
   */
  async calcular(
    origenLat: number,
    origenLng: number,
    destinoLat: number,
    destinoLng: number
  ): Promise<OpcionRuta[]> {
    return this.calcularRuta({
      origenLat,
      origenLng,
      destinoLat,
      destinoLng,
    });
  }

  /**
   * Valida si una ruta es alcanzable
   * Útil para mostrar si hay servicio disponible
   * @param origenLat Latitud del origen
   * @param origenLng Longitud del origen
   * @param destinoLat Latitud del destino
   * @param destinoLng Longitud del destino
   * @returns true si hay al menos una opción disponible
   */
  async esAlcanzable(
    origenLat: number,
    origenLng: number,
    destinoLat: number,
    destinoLng: number
  ): Promise<boolean> {
    try {
      const rutas = await this.calcular(origenLat, origenLng, destinoLat, destinoLng);
      return rutas && rutas.length > 0;
    } catch {
      return false;
    }
  }
}

/**
 * Exporta instancia singleton
 */
export const planificadorServicio = new PlanificadorServicio();
