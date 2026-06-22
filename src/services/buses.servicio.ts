/**
 * Servicio de Buses (Alias de Internos)
 *
 * Re-exporta el servicio de internos con nombres amigables para "buses"
 */

export type Bus = import('./internos.servicio').Interno;
export { internosServicio as busesServicio } from './internos.servicio';
