/**
 * Cliente base para todas las llamadas API
 * Centraliza lógica de request/response, manejo de errores, y tipado
 *
 * Patrón Factory: cada dominio (billetera, auth, etc) extiende este cliente
 */

import { api } from '@/services/api';
import { RespuestaApi } from '../tipos/respuesta';

export interface ConfigCliente {
  baseUrl?: string;
  timeout?: number;
}

/**
 * Clase base para clientes de API
 * Proporciona métodos tipados para GET, POST, PATCH, DELETE
 */
export class ClienteApi {
  protected endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  /**
   * GET - Obtener recurso
   * @param ruta Ruta relativa al endpoint
   * @param opciones Opciones de query
   * @returns Datos deserializados
   */
  async obtener<T = any>(
    ruta: string = '',
    opciones?: { params?: Record<string, any> }
  ): Promise<T> {
    try {
      const { data } = await api.get(`${this.endpoint}${ruta}`, opciones);
      return (data?.data ?? data ?? []) as T;
    } catch (error) {
      throw this.mapearError(error);
    }
  }

  /**
   * POST - Crear recurso
   * @param ruta Ruta relativa al endpoint
   * @param cuerpo Datos a enviar
   * @returns Datos de respuesta
   */
  async crear<T = any>(ruta: string = '', cuerpo: any): Promise<T> {
    try {
      const { data } = await api.post(`${this.endpoint}${ruta}`, cuerpo);
      // Extraer .data del envelope { ok, data } si existe
      return (data?.data ?? data ?? []) as T;
    } catch (error) {
      throw this.mapearError(error);
    }
  }

  /**
   * PATCH - Actualizar parcialmente
   * @param ruta Ruta relativa al endpoint
   * @param cuerpo Datos a actualizar
   * @returns Datos actualizados
   */
  async actualizar<T = any>(ruta: string = '', cuerpo: any): Promise<T> {
    try {
      const { data } = await api.patch(`${this.endpoint}${ruta}`, cuerpo);
      // Extraer .data del envelope { ok, data } si existe
      return (data?.data ?? data ?? []) as T;
    } catch (error) {
      throw this.mapearError(error);
    }
  }

  /**
   * DELETE - Eliminar recurso
   * @param ruta Ruta relativa al endpoint
   * @returns Confirmación de eliminación
   */
  async eliminar<T = any>(ruta: string = ''): Promise<T> {
    try {
      const { data } = await api.delete(`${this.endpoint}${ruta}`);
      // Extraer .data del envelope { ok, data } si existe
      return (data?.data ?? data ?? []) as T;
    } catch (error) {
      throw this.mapearError(error);
    }
  }

  /**
   * Mapea errores de Axios a mensajes legibles
   * @param error Error capturado
   * @returns Mensaje de error legible
   */
  protected mapearError(error: any): Error {
    if (error.response?.data?.message) {
      return new Error(error.response.data.message);
    }
    if (error.message === 'Network Error') {
      return new Error('No hay conexión a internet');
    }
    return error;
  }
}
