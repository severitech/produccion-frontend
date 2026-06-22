/**
 * Transformadores de datos del Backend
 *
 * El backend devuelve datos con nombres en inglés (name, code, role)
 * El frontend espera datos con nombres en español (nombre, numero, rol)
 *
 * Estos mappers transforman la estructura del backend a la esperada por el frontend
 */

/**
 * Mapea una Línea del backend al formato del frontend
 */
export function mapearLinea(linea: any): any {
  return {
    id: linea.id,
    nombre: linea.name,
    numero: linea.code,
    sindicatoId: linea.syndicateId,
    descripcion: linea.description,
    tarifaBaseBs: parseFloat(linea.fare || '0'),
    rutas: linea._count?.routes || 0,
    conductoresActivos: linea._count?.drivers || 0,
    estado: linea.active ? 'ACTIVA' : 'PAUSADA',
    creadoEn: linea.createdAt,
    actualizadoEn: linea.updatedAt,
    // Información adicional del backend
    color: linea.color,
    syndicate: linea.syndicate,
  };
}

/**
 * Mapea un Usuario del backend al formato del frontend
 */
export function mapearUsuario(usuario: any): any {
  return {
    id: usuario.id,
    nombre: usuario.name,
    email: usuario.email,
    telefono: usuario.phone,
    rol: usuario.role === 'DRIVER' ? 'CONDUCTOR' : usuario.role === 'PASSENGER' ? 'PASAJERO' : usuario.role,
    sindicatoId: usuario.syndicateId,
    activo: usuario.active,
    creadoEn: usuario.createdAt,
    actualizadoEn: usuario.updatedAt,
    // Información adicional
    avatarUrl: usuario.avatarUrl,
  };
}

/**
 * Mapea una Ruta del backend al formato del frontend
 */
export function mapearRuta(ruta: any): any {
  return {
    id: ruta.id,
    nombre: ruta.name,
    lineaId: ruta.lineId,
    tiempoEstimadoMin: ruta.estimatedTimeMin,
    distanciaTotalKm: ruta.totalDistanceKm,
    direccion: ruta.direction,
    version: ruta.version,
    activo: ruta.active,
    creadoEn: ruta.createdAt,
    actualizadoEn: ruta.updatedAt,
    // Información adicional
    line: ruta.line,
  };
}

/**
 * Mapea un Conductor del backend al formato del frontend
 */
export function mapearConductor(conductor: any): any {
  return {
    id: conductor.id,
    usuarioId: conductor.userId,
    nombre: conductor.user?.name || 'Sin nombre',
    email: conductor.user?.email || '',
    lineaId: conductor.lineId,
    sindicatoId: conductor.syndicateId,
    numeroLicencia: conductor.licenseNumber,
    cedulaIdentidad: conductor.nationalId,
    estado: conductor.active ? 'ACTIVO' : 'INACTIVO',
    creadoEn: conductor.createdAt,
    actualizadoEn: conductor.updatedAt,
    // Información adicional
    user: conductor.user,
    line: conductor.line,
    syndicate: conductor.syndicate,
    licenseExpirationDate: conductor.licenseExpirationDate,
  };
}

/**
 * Mapea un array de items
 */
export function mapearArray<T>(items: any[], mapper: (item: any) => T): T[] {
  return items.map(mapper);
}
