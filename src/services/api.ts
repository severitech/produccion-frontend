/**
 * Cliente HTTP centralizado (Axios)
 *
 * Proporciona:
 * - Configuración base (URL, timeout, headers)
 * - Inyección automática de token JWT
 * - Manejo centralizado de errores (401, 503, etc)
 * - Logging de requests/responses (en desarrollo)
 */

import axios, { AxiosError, AxiosResponse } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Instancia singleton de Axios
 * Configurada con interceptores de autenticación y error-handling
 */
export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─────────────────────────────────────────────────────────────────────────
// INTERCEPTOR: Agregar token JWT a cada request
// ─────────────────────────────────────────────────────────────────────────

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Log en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    console.error('[API] Error en request:', error);
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────────────────
// INTERCEPTOR: Manejar respuestas y errores
// ─────────────────────────────────────────────────────────────────────────

api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[API] ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error: AxiosError) => {
    // 401: Token expirado o inválido
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      console.warn('[API] Sesión expirada (401)');
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/autenticacion/iniciar-sesion';
    }

    // 503: Servicio no disponible (blockchain, etc)
    if (error.response?.status === 503) {
      console.error('[API] Servicio no disponible (503)');
    }

    // 500+: Error del servidor
    if (error.response?.status && error.response.status >= 500) {
      console.error(`[API] Error del servidor (${error.response.status})`);
    }

    // Log en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.error('[API] Error de respuesta:', {
        status: error.response?.status,
        url: error.config?.url,
        data: error.response?.data,
      });
    }

    return Promise.reject(error);
  }
);
