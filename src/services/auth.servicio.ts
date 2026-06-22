/**
 * Servicio de Autenticación
 *
 * Encapsula:
 * - Login/Register (local y OAuth)
 * - Tokens y refresh
 * - Integración con almacén de usuario
 *
 * Patrón: Factory + ClienteApi + Zustand
 */

import { ClienteApi } from '@/core/servicios/cliente-api';
import { RespuestaAutenticacion } from '@/core/tipos/respuesta';
import { useUsuarioAlmacen } from '../almacen/usuario.almacen';

/**
 * DTOs de entrada
 */
export interface BodyLogin {
  email: string;
  password: string;
}

export interface BodyRegister {
  email: string;
  nombre: string;
  password: string;
  telefono?: string;
}

export interface BodyLoginGoogle {
  idToken: string;
}

export interface BodyRefresh {
  refreshToken: string;
}

/**
 * Servicio de autenticación
 * Maneja login/logout y gestión de tokens
 */
class AuthServicio extends ClienteApi {
  constructor() {
    super('/auth');
  }

  /**
   * Autentica usuario con email y contraseña
   * Almacena token y usuario en localStorage y Zustand
   * @param datos Email y contraseña
   * @returns Usuario y tokens
   */
  async login(datos: BodyLogin): Promise<RespuestaAutenticacion> {
    const respuesta = await this.crear<RespuestaAutenticacion>('/login', datos);

    // Guardar en almacén local
    const { setUsuario } = useUsuarioAlmacen.getState();
    setUsuario(
      {
        id: respuesta.usuario.id,
        nombreCompleto: respuesta.usuario.nombre,
        email: respuesta.usuario.email,
        rol: respuesta.usuario.rol,
        activo: true,
      },
      respuesta.accessToken
    );

    // Guardar tokens
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', respuesta.accessToken);
      localStorage.setItem('refreshToken', respuesta.refreshToken);
    }

    return respuesta;
  }

  /**
   * Registra nuevo usuario en el sistema
   * @param datos Email, nombre, contraseña, teléfono opcional
   * @returns Respuesta de registro
   */
  async register(datos: BodyRegister): Promise<any> {
    return this.crear('/register', datos);
  }

  /**
   * Cierra sesión del usuario actual
   * Limpia tokens y almacén local
   */
  async logout(): Promise<void> {
    try {
      await this.crear('/logout', {});
    } catch {
      // Continuar incluso si el logout falla en servidor
    }

    const { cerrarSesion } = useUsuarioAlmacen.getState();
    cerrarSesion();

    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  }

  /**
   * Autentica mediante Google OAuth
   * Almacena usuario y token como login normal
   * @param datos Token de ID de Google
   * @returns Usuario y tokens
   */
  async loginGoogle(datos: BodyLoginGoogle): Promise<RespuestaAutenticacion> {
    const respuesta = await this.crear<RespuestaAutenticacion>('/google', datos);

    const { setUsuario } = useUsuarioAlmacen.getState();
    setUsuario(
      {
        id: respuesta.usuario.id,
        nombreCompleto: respuesta.usuario.nombre,
        email: respuesta.usuario.email,
        rol: respuesta.usuario.rol,
        activo: true,
      },
      respuesta.accessToken
    );

    if (typeof window !== 'undefined') {
      localStorage.setItem('token', respuesta.accessToken);
      localStorage.setItem('refreshToken', respuesta.refreshToken);
    }

    return respuesta;
  }

  /**
   * Renueva el access token usando refresh token
   * Actualiza token en localStorage
   * @returns Nuevo access token
   */
  async refresh(): Promise<{ accessToken: string }> {
    if (typeof window === 'undefined') {
      throw new Error('refresh() solo disponible en cliente');
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token disponible');
    }

    const respuesta = await this.crear<{ accessToken: string }>('/refresh', {
      refreshToken,
    });

    localStorage.setItem('token', respuesta.accessToken);
    return respuesta;
  }
}

/**
 * Exporta instancia singleton del servicio de autenticación
 */
export const authServicio = new AuthServicio();
