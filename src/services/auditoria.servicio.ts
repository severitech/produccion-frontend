/**
 * Servicio de Auditoría (Bitácora)
 *
 * Encapsula:
 * - Obtención de registros de auditoria filtrados
 * - Resumen de acciones por tabla
 * - Filtrado por sindicato, usuario, fecha
 *
 * Patrón: ClienteApi (Factory)
 */

import { ClienteApi } from '@/core/servicios/cliente-api';

export interface RegistroAuditoria {
  id: string;
  userId: string;
  sindicatoId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN';
  tableName: string;
  recordId: string;
  recordName?: string;
  previousData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  syndicate?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export interface FiltrosBitacora {
  sindicatoId?: string;
  tableName?: string;
  accion?: 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN';
  usuarioId?: string;
  desde?: string;
  hasta?: string;
  pagina?: number;
  limite?: number;
}

export interface ResumenAccion {
  action: string;
  tableName: string;
  _count: number;
}

class AuditoriaServicio extends ClienteApi {
  constructor() {
    super('/auditoria');
  }

  /**
   * Obtiene la bitácora filtrada con paginación
   * @param filtros Criterios de filtrado
   * @returns Registros paginados de auditoría
   */
  async obtenerBitacora(filtros: FiltrosBitacora): Promise<{
    registros: RegistroAuditoria[];
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
  }> {
    return this.obtener<any>('/bitacora', {
      params: filtros,
    });
  }

  /**
   * Obtiene resumen agregado de acciones
   * @returns Conteo por acción y tabla
   */
  async obtenerResumen(): Promise<ResumenAccion[]> {
    return this.obtener<ResumenAccion[]>('/resumen');
  }

  /**
   * Registra una acción en la bitácora
   * @param datos Datos de la acción
   * @returns Registro creado
   */
  async registrarAccion(datos: {
    action: 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN';
    tableName: string;
    recordId: string;
    recordName?: string;
    previousData?: any;
    newData?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<RegistroAuditoria> {
    return super.crear<RegistroAuditoria>('/registrar', datos);
  }
}

export const auditoriaServicio = new AuditoriaServicio();
