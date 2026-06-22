/** Tipos e interfaces del frontend — todo en español */

export enum RolUsuario {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN_SINDICATO = 'ADMIN_SINDICATO',
  OPERADOR = 'OPERADOR',
  PASAJERO = 'PASAJERO',
}

export enum EstadoBus {
  ACTIVO = 'ACTIVO',
  MANTENIMIENTO = 'MANTENIMIENTO',
  INACTIVO = 'INACTIVO',
}

export enum EstadoAsignacion {
  EN_RUTA = 'EN_RUTA',
  FINALIZADO = 'FINALIZADO',
  PENDIENTE = 'PENDIENTE',
}

export interface Sindicato {
  id: number;
  nombre: string;
  nit: string;
  representanteLegal: string;
  telefono?: string;
  email?: string;
  logoUrl?: string;
  activo: boolean;
  creadoEn: string;
}

export interface Linea {
  id: number;
  sindicato?: Sindicato;
  sindicatoId: number;
  nombre: string;
  codigo: string;
  colorHex: string;
  tarifa: number;
  activo: boolean;
}

export interface Ruta {
  id: number;
  linea?: Linea;
  lineaId: number;
  nombre: string;
  direccion: string;
  distanciaKm: number;
  tiempoTotalMin: number;
}

export interface Parada {
  id: number;
  nombre: string;
  codigo: string;
  latitud: number;
  longitud: number;
  tieneTecho: boolean;
  accesible: boolean;
}

export interface Bus {
  id: number;
  sindicato?: Sindicato;
  sindicatoId: number;
  linea?: Linea;
  lineaId: number;
  placa: string;
  numeroInterno: string;
  modelo?: string;
  anio?: number;
  capacidadTotal: number;
  estado: EstadoBus;
  dispositivoGpsId?: string;
}

export interface Conductor {
  id: number;
  sindicato?: Sindicato;
  sindicatoId: number;
  nombreCompleto: string;
  ci: string;
  licencia: string;
  categoriaLicencia: string;
  telefono?: string;
  activo: boolean;
}

export interface Asignacion {
  id: number;
  bus?: Bus;
  busId: number;
  conductor?: Conductor;
  conductorId: number;
  ruta?: Ruta;
  rutaId: number;
  fecha: string;
  horaInicio: string;
  horaFin?: string;
  estado: EstadoAsignacion;
}

export interface UbicacionBus {
  busId: number;
  lineaId?: number;
  lineaNombre?: string;
  lineaColor?: string;
  placa?: string;
  numeroInterno?: string;
  conductorNombre?: string;
  latitud: number;
  longitud: number;
  velocidadKmh: number;
  rumboCrados: number;
  pasajerosEstimados: number;
  timestamp: string;
}

export interface OpcionViaje {
  id: number;
  lineaId: number;
  nombreLinea: string;
  colorLinea: string;
  paradaEmbarque: string;
  paradaDescenso: string;
  tiempoCaminataMin: number;
  tiempoEsperaMin: number;
  tiempoViajeMin: number;
  transbordos: number;
  scoreIa: number;
  etaProximoBus: string;
}

export interface AlertaServicio {
  id: number;
  linea?: Linea;
  lineaId: number;
  tipo: string;
  descripcion: string;
  inicio: string;
  finEstimado?: string;
  activo: boolean;
}

export interface Usuario {
  id: number;
  nombreCompleto: string;
  email: string;
  rol: RolUsuario;
  sindicatoId?: number;
  sindicato?: Sindicato;
  activo: boolean;
}

export interface RespuestaApi<T> {
  exito: boolean;
  datos: T;
  mensaje: string;
  errores?: string[];
}

export interface CredencialesLogin {
  email: string;
  password: string;
}

export interface RespuestaLogin {
  accessToken: string;
  usuario: {
    id: number;
    nombreCompleto: string;
    email: string;
    rol: RolUsuario;
  };
}
