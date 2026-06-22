/**
 * Servicio de IA y Machine Learning
 *
 * Encapsula:
 * - Cálculo de ETA (Estimated Time of Arrival)
 * - Análisis de congestión en tiempo real
 * - Aprendizaje de preferencias del usuario
 * - Predicciones de demanda
 *
 * Patrón: Especializado (múltiples endpoints especializados)
 */

import { api } from './api';

/**
 * Resultado de predicción de ETA
 */
export interface ResultadoETA {
  etaMin: number; // minutos
  fuente: 'google' | 'propio'; // origen del cálculo
  factorTraficoPct: number; // factor de tráfico (100 = normal, 150 = muy congestionado)
  distanciaM?: number;
  velocidadKmh?: number;
}

/**
 * Resultado de análisis de congestión
 */
export interface ResultadoCongestion {
  nivel: 'BAJO' | 'MODERADO' | 'ALTO' | 'CRITICO';
  velocidadPromedioKmh: number;
  busesEnZona: number;
  fuente: 'google' | 'flota'; // origen del dato (Google Maps o telemetría propia)
  descripcion: string;
  factorDemora?: number; // multiplicador de tiempo de viaje
}

/**
 * Zona de congestión mapeada
 */
export interface ZonaCongestion {
  lat: number;
  lng: number;
  nivel: 'BAJO' | 'MODERADO' | 'ALTO' | 'CRITICO';
  velocidadKmh: number;
  buses: number;
}

/**
 * Preferencias aprendidas del usuario
 */
export interface Preferencias {
  criterioPrincipal: string; // 'TIEMPO_MINIMO', 'COSTO_MINIMO', 'COMODIDAD'
  maxCaminataMetros: number;
  maxTransbordos: number;
  patronesAprendidos: {
    criterioUsos: Record<string, number>; // Histograma de preferencias
    totalCalculos: number;
  } | null;
}

/**
 * Servicio de IA especializado
 * No extiende ClienteApi por tener múltiples endpoints especializados
 */
class IaServicio {
  private baseUrl = '/ia';

  // ──────────────────────────────────────────────────────────────────────────
  // ETA (Estimated Time of Arrival)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Calcula ETA para un viaje específico desde una posición
   * Predice tiempo hasta que el bus llegue a una parada
   * @param viajeId ID del viaje en progreso
   * @param lat Latitud actual del usuario
   * @param lng Longitud actual del usuario
   * @returns ETA en minutos con factor de tráfico
   */
  async etaViaje(viajeId: string, lat: number, lng: number): Promise<ResultadoETA> {
    try {
      const { data } = await api.get<ResultadoETA>(
        `${this.baseUrl}/eta/viaje/${viajeId}`,
        { params: { lat, lng } }
      );
      return data;
    } catch (error) {
      console.error('[IaServicio] Error al calcular ETA viaje:', error);
      throw error;
    }
  }

  /**
   * Calcula ETA para la próxima salida de una línea desde una ubicación
   * @param lineaId ID de la línea
   * @param lat Latitud de la ubicación
   * @param lng Longitud de la ubicación
   * @returns ETA estimado
   */
  async etaLinea(lineaId: string, lat: number, lng: number): Promise<ResultadoETA> {
    try {
      const { data } = await api.get<ResultadoETA>(
        `${this.baseUrl}/eta/linea/${lineaId}`,
        { params: { lat, lng } }
      );
      return data;
    } catch (error) {
      console.error('[IaServicio] Error al calcular ETA línea:', error);
      throw error;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CONGESTIÓN
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Analiza nivel de congestión en una zona
   * Combina datos de Google Maps y telemetría de la flota
   * @param lat Latitud del punto
   * @param lng Longitud del punto
   * @param radio Radio en km (default 5km)
   * @returns Análisis de congestión
   */
  async congestion(
    lat: number,
    lng: number,
    radio?: number
  ): Promise<ResultadoCongestion> {
    try {
      const params: Record<string, any> = { lat, lng };
      if (radio) params.radio = radio;

      const { data } = await api.get<ResultadoCongestion>(
        `${this.baseUrl}/congestion`,
        { params }
      );
      return data;
    } catch (error) {
      console.error('[IaServicio] Error al analizar congestión:', error);
      throw error;
    }
  }

  /**
   * Obtiene mapa de zonas de congestión actual
   * Útil para renderizar heatmap en mapa interactivo
   * @returns Array de zonas con su nivel de congestión
   */
  async zonasCongestion(): Promise<ZonaCongestion[]> {
    try {
      const { data } = await api.get<ZonaCongestion[]>(
        `${this.baseUrl}/congestion/zonas`
      );
      return data;
    } catch (error) {
      console.error('[IaServicio] Error al obtener zonas de congestión:', error);
      throw error;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PREFERENCIAS (Aprendizaje)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Obtiene preferencias de ruta aprendidas del usuario
   * Basadas en histórico de elecciones
   * @param usuarioId ID del usuario
   * @returns Preferencias y patrones aprendidos
   */
  async obtenerPreferencias(usuarioId: string): Promise<Preferencias> {
    try {
      const { data } = await api.get<Preferencias>(
        `${this.baseUrl}/preferencias/${usuarioId}`
      );
      return data;
    } catch (error) {
      console.error('[IaServicio] Error al obtener preferencias:', error);
      throw error;
    }
  }

  /**
   * Actualiza preferencias manuales del usuario
   * @param usuarioId ID del usuario
   * @param datos Criterio principal, límites de caminata/trasbordos
   * @returns Preferencias actualizadas
   */
  async actualizarPreferencias(
    usuarioId: string,
    datos: {
      criterioPrincipal?: string;
      maxCaminataMetros?: number;
      maxTransbordos?: number;
    }
  ): Promise<void> {
    try {
      await api.patch(`${this.baseUrl}/preferencias/${usuarioId}`, datos);
    } catch (error) {
      console.error('[IaServicio] Error al actualizar preferencias:', error);
      throw error;
    }
  }

  /**
   * Registra una ruta utilizada para aprender preferencias
   * Contribuye al algoritmo de aprendizaje del usuario
   * @param usuarioId ID del usuario
   * @param criterio Criterio usado (TIEMPO_MINIMO, COSTO_MINIMO, etc)
   * @returns Criterio aprendido más frecuente
   */
  async registrarUsoRuta(
    usuarioId: string,
    criterio: string
  ): Promise<{ criterioPrincipalAprendido: string }> {
    try {
      const { data } = await api.post<{ criterioPrincipalAprendido: string }>(
        `${this.baseUrl}/preferencias/${usuarioId}/uso`,
        { criterio }
      );
      return data;
    } catch (error) {
      console.error('[IaServicio] Error al registrar uso de ruta:', error);
      throw error;
    }
  }
}

/**
 * Exporta instancia singleton
 */
export const iaServicio = new IaServicio();
