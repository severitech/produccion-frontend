/**
 * Servicio de Predicciones - Modelos de ML desde Django
 *
 * Encapsula llamadas a predicciones de:
 * - ETA (tiempo de llegada)
 * - Congestión de tráfico
 * - Detección de anomalías
 */

import axios from 'axios';

const ML_SERVICE_URL = process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8000';
const NEST_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface PrediccionETA {
  eta_minutes: number;
  model_type: string;
  confidence: number;
}

interface PrediccionCongestión {
  congestion_level: 'BAJO' | 'MODERADO' | 'ALTO' | 'CRITICO';
  level_numeric: number;
  model_type: string;
  confidence: number;
}

interface PrediccionAnomalia {
  is_anomaly: boolean;
  anomaly_score: number;
  model_type: string;
  confidence: number;
}

interface DatosETA {
  distance_km: number;
  speed_kmh: number;
  hour_of_day: number;
  traffic_factor?: number;
}

interface DatosCongestión {
  speed_kmh: number;
  vehicle_count: number;
  hour_of_day: number;
  day_of_week: number;
}

interface DatosAnomalia {
  speed_kmh: number;
  acceleration_mss: number;
  stops_count: number;
  route_deviation_meters: number;
}

/**
 * Servicio de predicciones que usa los modelos ML de Django
 * Mantiene compatibilidad con ambos backends: Django directo o NestJS proxy
 */
class PrediccionesServicio {
  private mlUrl: string;
  private nestUrl: string;

  constructor() {
    this.mlUrl = ML_SERVICE_URL.replace(/\/$/, '');
    this.nestUrl = NEST_API_URL.replace(/\/$/, '');
  }

  /**
   * Predice ETA (Tiempo de Llegada)
   * @param datos Datos de entrada: distancia, velocidad, hora del día
   * @returns Predicción con minutos estimados y confianza
   */
  async predecirETA(datos: DatosETA): Promise<PrediccionETA | null> {
    try {
      // Intenta vía NestJS primero (proxy)
      const response = await axios.post(`${this.nestUrl}/ia/predictions/predict/`, {
        prediction_type: 'ETA_ARRIVAL',
        input_data: {
          distance_km: datos.distance_km,
          speed_kmh: datos.speed_kmh,
          hour_of_day: datos.hour_of_day,
          traffic_factor: datos.traffic_factor || 1.0,
        },
      });

      if (response.data?.ok) {
        return response.data.data;
      }

      // Fallback a Django directo
      return await this.predecirETADirecto(datos);
    } catch (error) {
      console.error('Error en predicción ETA:', error);
      // Fallback a Django directo
      return await this.predecirETADirecto(datos);
    }
  }

  /**
   * Predicción ETA directa a Django
   */
  private async predecirETADirecto(datos: DatosETA): Promise<PrediccionETA | null> {
    try {
      const response = await axios.post(`${this.mlUrl}/api/predictions/predict/`, {
        prediction_type: 'ETA_ARRIVAL',
        input_data: {
          distance_km: datos.distance_km,
          speed_kmh: datos.speed_kmh,
          hour_of_day: datos.hour_of_day,
          traffic_factor: datos.traffic_factor || 1.0,
        },
      });

      if (response.data?.ok) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error en predicción ETA directa:', error);
      return null;
    }
  }

  /**
   * Predice nivel de congestión de tráfico
   * @param datos Datos: velocidad, cantidad de vehículos, hora, día
   * @returns Nivel de congestión: BAJO, MODERADO, ALTO, CRÍTICO
   */
  async predecirCongestión(datos: DatosCongestión): Promise<PrediccionCongestión | null> {
    try {
      // Intenta vía NestJS primero
      const response = await axios.post(`${this.nestUrl}/ia/predictions/predict/`, {
        prediction_type: 'ROUTE_CONGESTION',
        input_data: {
          speed_kmh: datos.speed_kmh,
          vehicle_count: datos.vehicle_count,
          hour_of_day: datos.hour_of_day,
          day_of_week: datos.day_of_week,
        },
      });

      if (response.data?.ok) {
        return response.data.data;
      }

      // Fallback a Django directo
      return await this.predecirCongestiónDirecto(datos);
    } catch (error) {
      console.error('Error en predicción congestión:', error);
      return await this.predecirCongestiónDirecto(datos);
    }
  }

  /**
   * Predicción congestión directa a Django
   */
  private async predecirCongestiónDirecto(datos: DatosCongestión): Promise<PrediccionCongestión | null> {
    try {
      const response = await axios.post(`${this.mlUrl}/api/predictions/predict/`, {
        prediction_type: 'ROUTE_CONGESTION',
        input_data: {
          speed_kmh: datos.speed_kmh,
          vehicle_count: datos.vehicle_count,
          hour_of_day: datos.hour_of_day,
          day_of_week: datos.day_of_week,
        },
      });

      if (response.data?.ok) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error en predicción congestión directa:', error);
      return null;
    }
  }

  /**
   * Detecta anomalías en el comportamiento del bus
   * @param datos Datos: velocidad, aceleración, paradas, desviación de ruta
   * @returns Predicción: es_anomalía y score
   */
  async detectarAnomalia(datos: DatosAnomalia): Promise<PrediccionAnomalia | null> {
    try {
      // Intenta vía NestJS primero
      const response = await axios.post(`${this.nestUrl}/ia/predictions/predict/`, {
        prediction_type: 'ANOMALY_DETECTION',
        input_data: {
          speed_kmh: datos.speed_kmh,
          acceleration_mss: datos.acceleration_mss,
          stops_count: datos.stops_count,
          route_deviation_meters: datos.route_deviation_meters,
        },
      });

      if (response.data?.ok) {
        return response.data.data;
      }

      // Fallback a Django directo
      return await this.detectarAnomaliaDirecto(datos);
    } catch (error) {
      console.error('Error en detección anomalía:', error);
      return await this.detectarAnomaliaDirecto(datos);
    }
  }

  /**
   * Detección anomalía directa a Django
   */
  private async detectarAnomaliaDirecto(datos: DatosAnomalia): Promise<PrediccionAnomalia | null> {
    try {
      const response = await axios.post(`${this.mlUrl}/api/predictions/predict/`, {
        prediction_type: 'ANOMALY_DETECTION',
        input_data: {
          speed_kmh: datos.speed_kmh,
          acceleration_mss: datos.acceleration_mss,
          stops_count: datos.stops_count,
          route_deviation_meters: datos.route_deviation_meters,
        },
      });

      if (response.data?.ok) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error en detección anomalía directa:', error);
      return null;
    }
  }

  /**
   * Obtiene métricas de desempeño de los modelos
   */
  async obtenerMetricasModelos(): Promise<any> {
    try {
      // Intenta vía NestJS
      const response = await axios.get(`${this.nestUrl}/ia/metricas`);
      if (response.data?.ok) {
        return response.data.data;
      }

      // Fallback a Django directo
      const djangoResponse = await axios.get(`${this.mlUrl}/api/models/`);
      return djangoResponse.data;
    } catch (error) {
      console.error('Error obteniendo métricas:', error);
      return null;
    }
  }

  /**
   * Obtiene estado de los modelos disponibles
   */
  async obtenerEstadoModelos(): Promise<any> {
    try {
      // Intenta vía NestJS
      const response = await axios.get(`${this.nestUrl}/ia/status`);
      if (response.data?.ok) {
        return response.data.data;
      }

      // Fallback a Django directo
      const djangoResponse = await axios.get(`${this.mlUrl}/api/models/active/`);
      return djangoResponse.data;
    } catch (error) {
      console.error('Error obteniendo estado de modelos:', error);
      return null;
    }
  }
}

export const prediccionesServicio = new PrediccionesServicio();

export type { PrediccionETA, PrediccionCongestión, PrediccionAnomalia, DatosETA, DatosCongestión, DatosAnomalia };
