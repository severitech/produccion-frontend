/**
 * Servicio de Conductores
 *
 * Encapsula:
 * - Obtención de conductores
 * - Gestión de credenciales
 * - CRUD de conductores (admin)
 * - Filtrado por sindicato y línea
 *
 * Patrón: ClienteApi (Factory)
 */

import { ClienteApi } from '@/core/servicios/cliente-api';

/**
 * Modelo de conductor (coincide con respuesta del backend)
 */
export interface Conductor {
  id: string;
  userId: string | number;
  syndicateId: string | number;
  lineId?: string | number;
  nationalId: string;
  nationalIdExtension?: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpirationDate?: string;
  credentialStatus: string;
  active: boolean;
  user?: { id: string | number; name: string; email: string };
  syndicate?: { id: string | number; name: string };
  line?: { id: string | number; name: string; code: string };
}

/**
 * DTOs (coinciden con DTOs del backend)
 */
export interface FiltrosConductores {
  sindicatoId?: string;
  lineaId?: string;
  skip?: number;
  take?: number;
}

export interface BodyCrearConductor {
  usuarioId: number;
  sindicatoId: number;
  lineaId?: number;
  cedulaIdentidad: string;
  extensionCI?: string;
  numeroLicencia: string;
  categoriaLicencia: string;
  vencimientoLicencia: string;
}

export interface BodyActualizarConductor {
  lineaId?: number;
  numeroLicencia?: string;
  categoriaLicencia?: string;
  vencimientoLicencia?: string;
  activo?: boolean;
}

export interface BodyActualizarCredencial {
  estadoCredencial?: string;
}

/**
 * Servicio para gestión de conductores
 */
class ConductoresServicio extends ClienteApi {
  constructor() {
    super('/conductores');
  }

  /**
   * Obtiene todos los conductores con filtros opcionales
   * @param filtros Sindicato, línea, estado, paginación
   * @returns Array de conductores
   */
  async obtenerTodos(filtros?: FiltrosConductores): Promise<Conductor[]> {
    return this.obtener<Conductor[]>('', {
      params: filtros,
    });
  }

  /**
   * Obtiene un conductor específico por ID
   * @param id ID del conductor
   * @returns Conductor encontrado
   */
  async obtenerPorId(id: string): Promise<Conductor> {
    return this.obtener<Conductor>(`/${id}`);
  }

  /**
   * Crea un nuevo registro de conductor
   * Solo acceso admin del sindicato
   * @param datos Usuario, sindicato, datos credencial
   * @returns Conductor creado
   */
  async crear(datos: BodyCrearConductor): Promise<Conductor> {
    return super.crear<Conductor>('', datos);
  }

  /**
   * Actualiza datos de un conductor
   * @param id ID del conductor
   * @param datos Campos a actualizar
   * @returns Conductor actualizado
   */
  async actualizar(id: string, datos: BodyActualizarConductor): Promise<Conductor> {
    return super.actualizar<Conductor>(`/${id}`, datos);
  }

  /**
   * Actualiza el estado de la credencial de un conductor
   * @param id ID del conductor
   * @param datos Nuevo estado de credencial
   * @returns Conductor actualizado
   */
  async actualizarCredencial(
    id: string,
    datos: BodyActualizarCredencial
  ): Promise<Conductor> {
    return super.actualizar<Conductor>(`/${id}/credencial`, datos);
  }

  /**
   * Elimina un conductor del sistema
   * @param id ID del conductor
   * @returns Confirmación de eliminación
   */
  async eliminar(id: string): Promise<{ mensaje: string }> {
    return super.eliminar(`/${id}`);
  }
}

/**
 * Exporta instancia singleton
 */
export const conductoresServicio = new ConductoresServicio();
