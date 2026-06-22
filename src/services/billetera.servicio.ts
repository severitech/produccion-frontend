/**
 * Servicio de Billetera Digital
 *
 * Encapsula toda la lógica relacionada con:
 * - Operaciones del pasajero (recargas, pagos, generación de QR)
 * - Configuración del sistema (descuentos, reparto, abonos)
 * - Administración de categorías de descuento
 * - Transacciones e historial
 *
 * Patrón: Factory + Inyección de dependencias (singleton)
 */

import { ClienteApi } from '@/core/servicios/cliente-api';
import {
  RespuestaBilletera,
  RespuestaPago,
  RespuestaQr,
  ConfigBilletera,
  Transaccion,
} from '@/core/tipos/respuesta';

/**
 * DTOs de entrada validados por el backend
 */
export interface BodyRecargar {
  monto: number;
  metodo?: 'TARJETA' | 'TRANSFERENCIA';
  referencia?: string;
}

export interface BodyPagar {
  lineaId: string;
}

export interface BodyComprarAbono {
  lineaId?: string;
}

export interface BodyActualizarDescuento {
  categoria: 'GENERAL' | 'ESTUDIANTE' | 'ADULTO_MAYOR';
  porcentaje: number;
}

export interface BodyActualizarReparto {
  sindicato: number;
  chofer: number;
}

export interface BodyActualizarAbono {
  viajes: number;
  dias: number;
}

export interface BodyAsignarCategoria {
  categoria: 'GENERAL' | 'ESTUDIANTE' | 'ADULTO_MAYOR';
}

export interface BodyStripeCheckout {
  monto: number;
}

export interface BodyStripeConfirmar {
  sessionId: string;
}

/**
 * Clase encapsuladora del servicio de Billetera
 * Extiende ClienteApi para reutilizar métodos tipados
 */
class BilleteraServicio extends ClienteApi {
  constructor() {
    super('/billetera');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // OPERACIONES DEL PASAJERO
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Obtiene o crea la billetera del usuario autenticado
   * @returns Datos de billetera (address, saldo, categoría)
   */
  async miBilletera(): Promise<RespuestaBilletera> {
    return this.obtener<RespuestaBilletera>();
  }

  /**
   * Crea una billetera nueva para el usuario
   * Se llama automáticamente si no existe
   * @returns Billetera creada
   */
  async crearBilletera(): Promise<RespuestaBilletera> {
    return this.crear<RespuestaBilletera>('');
  }

  /**
   * Recarga saldo desde método tradicional (tarjeta/transferencia)
   * O inicia sesión Stripe para pago con tarjeta real
   * @param datos Monto, método, referencia opcional
   * @returns Confirmación de recarga
   */
  async recargar(datos: BodyRecargar): Promise<any> {
    return this.crear('/recargar', datos);
  }

  /**
   * Paga un pasaje directamente desde la billetera
   * Aplica descuentos automáticos según categoría
   * @param datos ID de línea
   * @returns Detalles del pago (tarifa, descuento, saldo nuevo)
   */
  async pagar(datos: BodyPagar): Promise<RespuestaPago> {
    return this.crear<RespuestaPago>('/pagar', datos);
  }

  /**
   * Genera un QR temporal (90 segundos) para pago sin contacto
   * El conductor escanea este QR para cobrar
   * @returns Token QR con tiempo de expiración
   */
  async generarQr(): Promise<RespuestaQr> {
    return this.obtener<RespuestaQr>('/qr');
  }

  /**
   * Compra un abono mensual (pase de transporte)
   * @param datos Línea opcional (null = todas las líneas)
   * @returns Confirmación de compra y validez
   */
  async comprarAbono(datos?: BodyComprarAbono): Promise<any> {
    return this.crear('/abono', datos || {});
  }

  /**
   * Obtiene el abono vigente del usuario
   * @returns Abono actual o null si no existe
   */
  async abonoActivo(): Promise<any> {
    return this.obtener('/abono');
  }

  /**
   * Obtiene el historial de últimas 50 transacciones
   * Incluye recargas, pagos y compras de abono
   * @returns Array de transacciones
   */
  async miHistorial(): Promise<Transaccion[]> {
    return this.obtener<Transaccion[]>('/historial');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INTEGRACIÓN STRIPE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Inicia sesión de pago Stripe para recarga con tarjeta real
   * Redirige a checkout.stripe.com
   * @param datos Monto a recargar
   * @returns URL de checkout de Stripe
   */
  async stripeCheckout(datos: BodyStripeCheckout): Promise<{ url: string }> {
    return this.crear('/stripe/checkout', datos);
  }

  /**
   * Confirma un pago de Stripe completado
   * Acredita el saldo después del pago exitoso
   * @param datos ID de sesión Stripe
   * @returns Confirmación con saldo acreditado
   */
  async stripeConfirmar(datos: BodyStripeConfirmar): Promise<any> {
    return this.crear('/stripe/confirmar', datos);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ADMINISTRACIÓN DEL SISTEMA (solo admin)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Obtiene la configuración actual del sistema de billetera
   * Incluye descuentos, reparto, y parámetros de abono
   * Solo visible para SUPERADMIN y SINDICATO_ADMIN
   * @returns Configuración vigente
   */
  async obtenerConfig(): Promise<ConfigBilletera> {
    return this.obtener<ConfigBilletera>('/config');
  }

  /**
   * Actualiza el descuento de una categoría de usuario
   * Cambios se aplican on-chain de forma inmediata
   * @param datos Categoría y nuevo porcentaje (0-100)
   * @returns Configuración actualizada
   */
  async actualizarDescuento(datos: BodyActualizarDescuento): Promise<ConfigBilletera> {
    return this.actualizar<ConfigBilletera>('/config/descuento', datos);
  }

  /**
   * Actualiza el reparto de ingresos entre sindicato, chofer y sistema
   * Los porcentajes deben sumar 100
   * @param datos Porcentaje sindicato y porcentaje chofer
   * @returns Configuración actualizada
   */
  async actualizarReparto(datos: BodyActualizarReparto): Promise<ConfigBilletera> {
    return this.actualizar<ConfigBilletera>('/config/reparto', datos);
  }

  /**
   * Actualiza los parámetros del abono mensual
   * Afecta solo a abonos nuevos, no retroactivamente
   * @param datos Cantidad de viajes equivalentes y días de validez
   * @returns Configuración actualizada
   */
  async actualizarAbono(datos: BodyActualizarAbono): Promise<ConfigBilletera> {
    return this.actualizar<ConfigBilletera>('/config/abono', datos);
  }

  /**
   * Asigna una categoría de descuento a un usuario específico
   * Las categorías son: GENERAL (0%), ESTUDIANTE (50%), ADULTO_MAYOR (30%)
   * @param usuarioId ID del usuario
   * @param datos Nueva categoría
   * @returns Usuario actualizado
   */
  async asignarCategoria(usuarioId: string, datos: BodyAsignarCategoria): Promise<any> {
    return this.crear(`/${usuarioId}/categoria`, datos);
  }

  /**
   * Obtiene el historial de todas las transacciones del sistema
   * Filtrable por tipo de transacción o usuario
   * Solo visible para admin
   * @param filtros Tipo y usuario opcional
   * @returns Array de transacciones globales
   */
  async transacciones(filtros?: {
    tipo?: 'TOPUP' | 'FARE_PAYMENT' | 'PASS_PURCHASE';
    usuarioId?: string;
  }): Promise<Transaccion[]> {
    return this.obtener<Transaccion[]>('/transacciones', {
      params: filtros,
    });
  }

  /**
   * Obtiene todos los pasajeros con sus saldos actuales
   * @returns Array de pasajeros con saldo
   */
  async obtenerPasajerosConSaldo(): Promise<any[]> {
    return this.obtener<any[]>('/usuarios-con-saldo');
  }

  /**
   * Obtiene el historial de transacciones del usuario autenticado
   * @returns Array de transacciones
   */
  async obtenerMiHistorial(): Promise<Transaccion[]> {
    return this.obtener<Transaccion[]>('/historial');
  }
}

/**
 * Exporta instancia singleton del servicio
 * Se reutiliza en toda la aplicación
 */
export const billeteraServicio = new BilleteraServicio();
