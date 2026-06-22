/**
 * Tipos de respuesta API estandarizados
 * Proporciona una capa de tipado consistente para todas las respuestas del backend
 */

/// Respuesta genérica de la API
export interface RespuestaApi<T = any> {
  ok?: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/// Respuesta de autenticación
export interface RespuestaAutenticacion {
  usuario: {
    id: string;
    nombre: string;
    email: string;
    rol: 'PASSENGER' | 'DRIVER' | 'SUPERADMIN' | 'SINDICATO_ADMIN';
  };
  accessToken: string;
  refreshToken: string;
}

/// Respuesta de billetera
export interface RespuestaBilletera {
  address: string;
  categoria: 'GENERAL' | 'ESTUDIANTE' | 'ADULTO_MAYOR';
  saldoBs: number;
  saldoCentavos: number;
}

/// Respuesta de pago
export interface RespuestaPago {
  ok: boolean;
  linea: string;
  tarifaBaseBs: number;
  descuentoBs: number;
  tarifaPagadaBs: number;
  categoria: string;
  saldoBs: number;
  txHash: string;
  blockNumber: number;
}

/// Respuesta de QR
export interface RespuestaQr {
  qr: string;
  expiraEnSeg: number;
}

/// Transacción de billetera
export interface Transaccion {
  id: string;
  tipo: 'TOPUP' | 'FARE_PAYMENT' | 'PASS_PURCHASE';
  montoBs: number;
  tarifaBaseBs?: number;
  titular?: string;
  email?: string;
  lineaId?: string | number;
  txHash: string;
  blockNumber: number | null;
  fecha: string;
  metadata?: Record<string, any>;
}

/// Configuración de billetera
export interface ConfigBilletera {
  descuentos: {
    GENERAL: number;
    ESTUDIANTE: number;
    ADULTO_MAYOR: number;
  };
  reparto: {
    sindicatoPct: number;
    choferPct: number;
    sistemaPct: number;
  };
  abono: {
    viajes: number;
    dias: number;
  };
}
