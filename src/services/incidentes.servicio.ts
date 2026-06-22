/**
 * Servicio de Incidentes
 *
 * Encapsula:
 * - Reporte de incidentes en viajes
 * - Revisión y clasificación de incidentes
 * - Historial de incidentes por conductor
 *
 * Patrón: ClienteApi (Factory)
 */

import { ClienteApi } from '@/core/servicios/cliente-api';

/**
 * Modelo de incidente
 */
export interface Incidente {
  id: string;
  viajeId: string;
  conductorId: string;
  pasajeroId?: string;
  titulo: string;
  descripcion: string;
  tipo: 'ACCIDENTE' | 'DAÑO' | 'COMPORTAMIENTO' | 'TECNICO' | 'OTRO';
  severidad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  estado: 'REPORTADO' | 'EN_REVISION' | 'RESUELTO' | 'CERRADO';
  fotosEvidencia?: string[]; // URLs de imágenes
  notasReporte: string;
  revisadoPorId?: string;
  notasRevision?: string;
  fechaReporte: string;
  fechaRevision?: string;
}

/**
 * DTOs
 */
export interface FiltrosIncidentes {
  conductorId?: string;
  viajeId?: string;
  tipo?: string;
  estado?: 'REPORTADO' | 'EN_REVISION' | 'RESUELTO' | 'CERRADO';
  severidad?: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  skip?: number;
  take?: number;
}

export interface BodyCrearIncidente {
  viajeId: string;
  conductorId: string;
  pasajeroId?: string;
  titulo: string;
  descripcion: string;
  tipo: 'ACCIDENTE' | 'DAÑO' | 'COMPORTAMIENTO' | 'TECNICO' | 'OTRO';
  severidad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  fotosEvidencia?: string[];
  notasReporte: string;
}

export interface BodyRevisarIncidente {
  estado: 'REPORTADO' | 'EN_REVISION' | 'RESUELTO' | 'CERRADO';
  revisadoPorId: string;
  notasRevision?: string;
}

/**
 * Servicio para gestión de incidentes
 */
class IncidentesServicio extends ClienteApi {
  constructor() {
    super('/incidentes');
  }

  /**
   * Obtiene todos los incidentes con filtros
   * @param filtros Conductor, viaje, tipo, estado, paginación
   * @returns Array de incidentes
   */
  async obtenerTodos(filtros?: FiltrosIncidentes): Promise<Incidente[]> {
    return this.obtener<Incidente[]>('', {
      params: filtros,
    });
  }

  /**
   * Obtiene un incidente específico
   * @param id ID del incidente
   * @returns Incidente encontrado
   */
  async obtenerPorId(id: string): Promise<Incidente> {
    return this.obtener<Incidente>(`/${id}`);
  }

  /**
   * Crea un nuevo reporte de incidente
   * @param datos Viaje, conductor, descripción, evidencia
   * @returns Incidente creado
   */
  async crear(datos: BodyCrearIncidente): Promise<Incidente> {
    return super.crear<Incidente>('', datos);
  }

  /**
   * Revisa y cambia estado de un incidente
   * Solo acceso admin y supervisores
   * @param id ID del incidente
   * @param datos Nuevo estado, revisor, notas
   * @returns Incidente actualizado
   */
  async revisar(id: string, datos: BodyRevisarIncidente): Promise<Incidente> {
    return super.actualizar<Incidente>(`/${id}/revisar`, datos);
  }

  /**
   * Elimina un incidente del sistema
   * @param id ID del incidente
   * @returns Confirmación de eliminación
   */
  async eliminar(id: string): Promise<{ mensaje: string }> {
    return super.eliminar(`/${id}`);
  }

  /**
   * Obtiene historial de incidentes de un conductor
   * @param conductorId ID del conductor
   * @returns Array de incidentes del conductor
   */
  async obtenerPorConductor(conductorId: string): Promise<Incidente[]> {
    return this.obtener<Incidente[]>('/conductor', {
      params: { conductorId },
    });
  }

  /**
   * Obtiene incidentes criticos sin resolver
   * @returns Array de incidentes críticos
   */
  async obtenerCriticos(): Promise<Incidente[]> {
    return this.obtener<Incidente[]>('/criticos');
  }
}

/**
 * Exporta instancia singleton
 */
export const incidentesServicio = new IncidentesServicio();
