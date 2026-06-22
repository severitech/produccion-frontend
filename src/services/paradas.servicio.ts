import { ClienteApi } from '@/core/servicios/cliente-api';

export interface Punto {
  lat: number;
  lng: number;
}

export interface BodyCrearParada {
  lineaId: string;
  nombre: string;
  descripcion?: string;
  centerLat: number;
  centerLng: number;
  radiusMeters?: number;
  boundaryPoints?: Punto[];
  tipoSuperficie?: string;
  orderIndex: number;
}

export interface Parada {
  id: string;
  lineId: string;
  nombre: string;
  descripcion?: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  boundaryPoints?: Punto[];
  tipoSuperficie?: string;
  orderIndex: number;
  activo: boolean;
  line?: { id: string; name: string; code: string };
  createdAt?: string;
  updatedAt?: string;
  // Backend fields (mapped from English)
  name?: string;
  description?: string;
  active?: boolean;
  surfaceType?: string;
}

class ParadasServicio extends ClienteApi {
  constructor() {
    super('/paradas');
  }

  async obtenerTodas(filtros?: { lineaId?: string }) {
    const params = new URLSearchParams();
    if (filtros?.lineaId) params.append('lineaId', filtros.lineaId);
    return this.obtener<Parada[]>(`${params.toString() ? '?' + params : ''}`);
  }

  async obtenerPorId(id: string) {
    return this.obtener<Parada>(`/${id}`);
  }

  async obtenerCercanas(lat: number, lng: number, radioKm: number = 1) {
    return this.obtener<Parada[]>(
      `/cercanas?lat=${lat}&lng=${lng}&radioKm=${radioKm}`,
    );
  }

  async crear(datos: BodyCrearParada) {
    return super.crear<Parada>('', datos);
  }

  async actualizar(id: string, datos: Partial<BodyCrearParada>) {
    return super.actualizar<Parada>(`/${id}`, datos);
  }

  async eliminar(id: string) {
    return super.eliminar(`/${id}`);
  }
}

export const paradasServicio = new ParadasServicio();
