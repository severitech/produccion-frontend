/**
 * Servicio de Usuarios
 *
 * Encapsula:
 * - Obtención de usuarios
 * - CRUD de usuarios (admin)
 * - Filtrado por rol y sindicato
 *
 * Patrón: ClienteApi (Factory)
 */

import { ClienteApi } from '@/core/servicios/cliente-api';

/**
 * Modelo de usuario
 */
export interface Usuario {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'PASSENGER' | 'DRIVER' | 'SUPERADMIN' | 'SINDICATO_ADMIN';
  syndicateId?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
  avatarUrl?: string;
  // Relaciones opcionales
  syndicate?: { id: string; name: string };
  driver?: { id: string; credentialStatus: string; lineId: string };
  // Campos opcionales del servicio de billetera
  saldoBs?: number;
  categoria?: 'GENERAL' | 'ESTUDIANTE' | 'ADULTO_MAYOR';
}

/**
 * DTOs
 */
export interface FiltrosUsuarios {
  rol?: 'PASSENGER' | 'DRIVER' | 'SUPERADMIN' | 'SINDICATO_ADMIN';
  sindicatoId?: string;
  skip?: number;
  take?: number;
}

export interface BodyCrearUsuario {
  nombre: string;
  email: string;
  password: string;
  telefono?: string;
  rol: 'PASSENGER' | 'DRIVER';
}

export interface BodyActualizarUsuario {
  nombre?: string;
  telefono?: string;
  activo?: boolean;
}

/**
 * Servicio para gestión de usuarios
 */
class UsuariosServicio extends ClienteApi {
  constructor() {
    super('/usuarios');
  }

  /**
   * Obtiene lista de todos los usuarios con filtros opcionales
   * @param filtros Rol, sindicato, paginación
   * @returns Array de usuarios
   */
  async obtenerTodos(filtros?: FiltrosUsuarios): Promise<Usuario[]> {
    return this.obtener<Usuario[]>('', {
      params: filtros,
    });
  }

  /**
   * Obtiene un usuario específico por ID
   * @param id ID del usuario
   * @returns Usuario encontrado
   */
  async obtenerPorId(id: string): Promise<Usuario> {
    return this.obtener<Usuario>(`/${id}`);
  }

  /**
   * Crea un nuevo usuario en el sistema
   * Solo acceso admin
   * @param datos Nombre, email, password, rol
   * @returns Usuario creado
   */
  async crear(datos: BodyCrearUsuario): Promise<Usuario> {
    return super.crear<Usuario>('', datos);
  }

  /**
   * Actualiza datos de un usuario
   * Solo acceso admin
   * @param id ID del usuario
   * @param datos Campos a actualizar
   * @returns Usuario actualizado
   */
  async actualizar(id: string, datos: BodyActualizarUsuario): Promise<Usuario> {
    return super.actualizar<Usuario>(`/${id}`, datos);
  }

  /**
   * Elimina un usuario del sistema
   * Solo acceso superadmin
   * @param id ID del usuario a eliminar
   * @returns Confirmación de eliminación
   */
  async eliminar(id: string): Promise<{ mensaje: string }> {
    return super.eliminar(`/${id}`);
  }
}

/**
 * Exporta instancia singleton
 */
export const usuariosServicio = new UsuariosServicio();
