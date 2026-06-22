/**
 * Servicio de Sindicatos
 *
 * Encapsula:
 * - Obtención de sindicatos
 * - Información de sindicatos
 * - Gestión de sindicatos (superadmin)
 *
 * Patrón: ClienteApi (Factory)
 */

import { ClienteApi } from '@/core/servicios/cliente-api';

/**
 * Modelo de sindicato
 */
export interface Sindicato {
  id: string;
  nombre: string;
  codigo?: string;
  descripcion?: string;
  contactoPrincipal?: {
    nombre: string;
    email: string;
    telefono: string;
  };
  direccion?: string;
  ciudad?: string;
  lineasAfiliadas?: number;
  conductoresAfiliados?: number;
  ingresoMensualBs?: number;
  estado?: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';
  creadoEn?: string;
  actualizadoEn?: string;
  // Campos del backend
  name?: string;
}

/**
 * DTOs
 */
export interface BodyCrearSindicato {
  nombre: string;
  codigo: string;
  descripcion?: string;
  contactoNombre: string;
  contactoEmail: string;
  contactoTelefono: string;
  ciudad: string;
  direccion?: string;
}

export interface BodyActualizarSindicato {
  nombre?: string;
  descripcion?: string;
  contactoNombre?: string;
  contactoEmail?: string;
  contactoTelefono?: string;
  ciudad?: string;
  direccion?: string;
  estado?: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';
}

/**
 * Servicio para gestión de sindicatos
 */
class SindicatosServicio extends ClienteApi {
  constructor() {
    super('/sindicatos');
  }

  /**
   * Obtiene todos los sindicatos
   * @returns Array de sindicatos
   */
  async obtenerTodos(): Promise<Sindicato[]> {
    const datos = await this.obtener<any[]>();
    return datos.map((d) => this.mapearDatos(d));
  }

  /**
   * Obtiene un sindicato específico por ID
   * @param id ID del sindicato
   * @returns Sindicato encontrado
   */
  async obtenerPorId(id: string): Promise<Sindicato> {
    const dato = await this.obtener<any>(`/${id}`);
    return this.mapearDatos(dato);
  }

  private mapearDatos(d: any): Sindicato {
    return {
      ...d,
      nombre: d.name || d.nombre,
    };
  }

  /**
   * Crea un nuevo sindicato
   * Solo acceso superadmin
   * @param datos Nombre, código, contacto principal
   * @returns Sindicato creado
   */
  async crear(datos: BodyCrearSindicato): Promise<Sindicato> {
    const respuesta = await super.crear<any>('', datos);
    return this.mapearDatos(respuesta);
  }

  /**
   * Actualiza información de un sindicato
   * @param id ID del sindicato
   * @param datos Campos a actualizar
   * @returns Sindicato actualizado
   */
  async actualizar(id: string, datos: BodyActualizarSindicato): Promise<Sindicato> {
    const respuesta = await super.actualizar<any>(`/${id}`, datos);
    return this.mapearDatos(respuesta);
  }

  /**
   * Elimina un sindicato del sistema
   * Solo acceso superadmin
   * @param id ID del sindicato
   * @returns Confirmación de eliminación
   */
  async eliminar(id: string): Promise<{ mensaje: string }> {
    return super.eliminar(`/${id}`);
  }

  /**
   * Obtiene las líneas afiliadas a un sindicato
   * @param sindicatoId ID del sindicato
   * @returns Array de líneas
   */
  async obtenerLineas(sindicatoId: string): Promise<any[]> {
    return this.obtener(`/${sindicatoId}/lineas`);
  }

  /**
   * Obtiene los conductores afiliados a un sindicato
   * @param sindicatoId ID del sindicato
   * @returns Array de conductores
   */
  async obtenerConductores(sindicatoId: string): Promise<any[]> {
    return this.obtener(`/${sindicatoId}/conductores`);
  }

  /**
   * Obtiene estadísticas financieras de un sindicato
   * @param sindicatoId ID del sindicato
   * @returns Estadísticas de ingresos
   */
  async obtenerEstadisticas(sindicatoId: string): Promise<any> {
    return this.obtener(`/${sindicatoId}/estadisticas`);
  }
}

/**
 * Exporta instancia singleton
 */
export const sindicatosServicio = new SindicatosServicio();
