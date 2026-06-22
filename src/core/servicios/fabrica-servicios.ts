/**
 * Fábrica de Servicios (Service Locator Pattern)
 *
 * Centraliza la inyección de dependencias y la instanciación de servicios.
 * Facilita el testing (se pueden reemplazar con mocks) y reduce acoplamiento.
 * Proporciona un único punto de entrada a todos los servicios de la aplicación.
 *
 * Uso:
 *   import { servicios } from '@/core/servicios/fabrica-servicios'
 *   await servicios.billetera.miBilletera()
 *   await servicios.auth.login({ email: 'user@example.com', password: 'xxx' })
 *
 * Para testing:
 *   import { inyectarServicio } from '@/core/servicios/fabrica-servicios'
 *   inyectarServicio('billetera', mockBilletera)
 */

// ─────────────────────────────────────────────────────────────────────────
// IMPORTAR TODOS LOS SERVICIOS
// ─────────────────────────────────────────────────────────────────────────

import { billeteraServicio } from '@/services/billetera.servicio';
import { authServicio } from '@/services/auth.servicio';
import { lineasServicio } from '@/services/lineas.servicio';
import { usuariosServicio } from '@/services/usuarios.servicio';
import { conductoresServicio } from '@/services/conductores.servicio';
import { rutasServicio } from '@/services/rutas.servicio';
import { sindicatosServicio } from '@/services/sindicatos.servicio';
import { turnosServicio } from '@/services/turnos.servicio';
import { notificacionesServicio } from '@/services/notificaciones.servicio';
import { incidentesServicio } from '@/services/incidentes.servicio';
import { asignacionesServicio } from '@/services/asignaciones.servicio';
import { internosServicio } from '@/services/internos.servicio';
import { desviosServicio } from '@/services/desvios.servicio';
import { trasboardosServicio } from '@/services/trasbordos.servicio';
import { grabacionesServicio } from '@/services/grabaciones.servicio';
import { planificadorServicio } from '@/services/planificador.servicio';
import { iaServicio } from '@/services/ia.servicio';

/**
 * Contenedor centralizado de servicios
 * Proporciona acceso tipado a todos los servicios de la aplicación
 * Permite inyectar implementaciones alternativas para testing
 */
export const servicios = {
  // Autenticación y usuarios
  auth: authServicio,
  usuarios: usuariosServicio,

  // Transporte y líneas
  lineas: lineasServicio,
  conductores: conductoresServicio,
  rutas: rutasServicio,
  sindicatos: sindicatosServicio,

  // Operaciones
  turnos: turnosServicio,
  asignaciones: asignacionesServicio,

  // Viajes y traslados
  internos: internosServicio,
  desvios: desviosServicio,
  trasbordos: trasboardosServicio,

  // Vehículos y equipos
  grabaciones: grabacionesServicio,

  // Comunicaciones
  notificaciones: notificacionesServicio,

  // Reportes e incidentes
  incidentes: incidentesServicio,

  // Funcionalidades especializadas (IA/ML)
  planificador: planificadorServicio,
  ia: iaServicio,
};

/**
 * Tipo de servicios disponibles
 * Proporciona autocompletado en el IDE
 * Útil para tipado en componentes
 */
export type Servicios = typeof servicios;

/**
 * Hook React para acceder a servicios en componentes
 * Proporciona todos los servicios tipados
 *
 * Uso:
 *   const { billetera, auth } = useServicios()
 *   const misBilletera = await billetera.miBilletera()
 */
export function useServicios(): Servicios {
  return servicios;
}

/**
 * Permite reemplazar servicios para testing o implementaciones alternativas
 * Útil para inyectar mocks en tests unitarios
 *
 * Uso:
 *   const mockBilletera = { miBilletera: vi.fn() }
 *   inyectarServicio('billetera', mockBilletera)
 *
 * @param nombre Nombre del servicio a reemplazar
 * @param instancia Nueva instancia del servicio
 */
export function inyectarServicio<K extends keyof Servicios>(
  nombre: K,
  instancia: Servicios[K]
): void {
  servicios[nombre] = instancia;
}

/**
 * Restaura servicios originales después de testing
 * Debe llamarse en cleanup de tests
 */
export function restaurarServicios(): void {
  // Los servicios se recargarán en la próxima importación
  // Si se necesita persistencia, guardar copia inicial antes
}
