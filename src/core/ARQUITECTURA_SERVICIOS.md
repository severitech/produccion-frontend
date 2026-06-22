# Arquitectura de Servicios - Frontend Transit AI

## Resumen Ejecutivo

Los servicios frontend han sido refactorizados siguiendo el patrón **Factory + Herencia de ClienteApi** para lograr:

- ✅ **Reutilización de código**: Métodos CRUD comunes heredados de `ClienteApi`
- ✅ **Tipado fuerte**: Interfaces TypeScript para todas las respuestas y DTOs
- ✅ **Documentación completa**: JSDoc en cada método
- ✅ **Mantenibilidad**: Reducción de ~200 líneas de boilerplate
- ✅ **Testing**: Inyección de dependencias simplificada

## Estructura

```
/frontend/src
├── core/
│   ├── servicios/
│   │   ├── cliente-api.ts          ← Base class con CRUD genérico
│   │   └── fabrica-servicios.ts    ← Contenedor centralizado
│   └── tipos/
│       └── respuesta.ts            ← Interfaces de respuesta API
└── services/
    ├── auth.servicio.ts            ← Autenticación
    ├── usuarios.servicio.ts        ← Gestión de usuarios
    ├── billetera.servicio.ts       ← Pagos y transacciones
    ├── lineas.servicio.ts          ← Líneas de transporte
    ├── conductores.servicio.ts     ← Gestión de conductores
    ├── rutas.servicio.ts           ← Rutas de viaje
    ├── sindicatos.servicio.ts      ← Administración de sindicatos
    ├── turnos.servicio.ts          ← Asignación de turnos
    ├── notificaciones.servicio.ts  ← Sistema de notificaciones
    ├── incidentes.servicio.ts      ← Reportes de incidentes
    ├── asignaciones.servicio.ts    ← Asignaciones de turnos
    ├── internos.servicio.ts        ← Transferencias internas
    ├── desvios.servicio.ts         ← Desvíos de rutas
    ├── trasboardos.servicio.ts     ← Solicitudes de trasbordo
    ├── buses.servicio.ts           ← Gestión de buses
    ├── grabaciones.servicio.ts     ← Videos de cámaras
    ├── planificador.servicio.ts    ← Cálculo de rutas (IA)
    ├── ia.servicio.ts              ← Machine Learning
    └── api.ts                       ← Cliente HTTP base
```

## Patrones Utilizados

### 1. **ClienteApi (Base Class)**

Proporciona métodos CRUD tipados reutilizables:

```typescript
class BilleteraServicio extends ClienteApi {
  constructor() {
    super('/billetera');
  }

  async miBilletera(): Promise<RespuestaBilletera> {
    return this.obtener<RespuestaBilletera>();
  }
}
```

**Métodos disponibles:**
- `obtener<T>(ruta, opciones)` - GET
- `crear<T>(ruta, cuerpo)` - POST
- `actualizar<T>(ruta, cuerpo)` - PATCH
- `eliminar<T>(ruta)` - DELETE

### 2. **Fabrica de Servicios (Service Locator)**

Contenedor centralizado para inyección de dependencias:

```typescript
import { servicios } from '@/core/servicios/fabrica-servicios'

const { billetera, auth } = servicios
await billetera.miBilletera()
```

**Beneficios:**
- Un único punto de entrada a todos los servicios
- Fácil reemplazo con mocks en tests
- Autocompletado en IDE

### 3. **Tipado Fuerte (TypeScript)**

Interfaces centralizadas para respuestas:

```typescript
export interface RespuestaBilletera {
  address: string
  categoria: 'GENERAL' | 'ESTUDIANTE' | 'ADULTO_MAYOR'
  saldoBs: number
  saldoCentavos: number
}
```

**DTOs específicos por servicio** para peticiones:

```typescript
export interface BodyPagar {
  lineaId: string
}

async pagar(datos: BodyPagar): Promise<RespuestaPago> {
  return this.crear<RespuestaPago>('/pagar', datos)
}
```

## Ejemplos de Uso

### Autenticación

```typescript
const { auth } = servicios

// Login
const respuesta = await auth.login({
  email: 'usuario@example.com',
  password: 'contraseña123'
})

// Logout
await auth.logout()
```

### Transacciones

```typescript
const { billetera } = servicios

// Obtener saldo
const misPesos = await billetera.miBilletera()

// Pagar pasaje
const resultado = await billetera.pagar({
  lineaId: 'linea-123'
})

// Historial
const transacciones = await billetera.miHistorial()
```

### Gestión Administrativa

```typescript
const { usuarios, lineas, conductores } = servicios

// Listar usuarios
const usuarios = await usuarios.obtenerTodos({
  rol: 'PASSENGER',
  skip: 0,
  take: 20
})

// Crear línea
const nuevaLinea = await lineas.crear({
  nombre: 'Línea 1',
  numero: '1',
  tarifaBaseBs: 2.5,
  // ...
})

// Asignar credencial a conductor
await conductores.actualizarCredencial(conductorId, {
  estado: 'VIGENTE'
})
```

### IA y Predicciones

```typescript
const { ia, planificador } = servicios

// ETA para viaje
const eta = await ia.etaViaje(viajeId, latitud, longitud)

// Análisis de congestión
const congestion = await ia.congestion(lat, lng, radio)

// Calcular ruta
const rutas = await planificador.calcular(
  origenLat, origenLng,
  destinoLat, destinoLng
)
```

## Testing con Inyección de Dependencias

```typescript
import { inyectarServicio } from '@/core/servicios/fabrica-servicios'
import { vi } from 'vitest'

describe('MiComponente', () => {
  beforeEach(() => {
    const mockBilletera = {
      miBilletera: vi.fn().mockResolvedValue({
        address: '0x123...',
        saldoBs: 100
      })
    }
    inyectarServicio('billetera', mockBilletera)
  })

  it('debe mostrar saldo', async () => {
    // Test con mock
  })
})
```

## Transformación de Servicios Antiguos

### Antes (Boilerplate)

```typescript
export const billeteraServicio = {
  miBilletera: () => api.get('/billetera').then(r => r.data),
  pagar: (datos) => api.post('/billetera/pagar', datos).then(r => r.data),
  // ... repetición 20 veces
}
```

### Después (Limpio)

```typescript
class BilleteraServicio extends ClienteApi {
  constructor() { super('/billetera') }

  async miBilletera(): Promise<RespuestaBilletera> {
    return this.obtener<RespuestaBilletera>()
  }

  async pagar(datos: BodyPagar): Promise<RespuestaPago> {
    return this.crear<RespuestaPago>('/pagar', datos)
  }
}

export const billeteraServicio = new BilleteraServicio()
```

## Manejo de Errores

Centralizado en `ClienteApi`:

```typescript
protected mapearError(error: any): Error {
  if (error.response?.data?.message) {
    return new Error(error.response.data.message)
  }
  if (error.message === 'Network Error') {
    return new Error('No hay conexión a internet')
  }
  return error
}
```

**Interceptores Axios** en `api.ts`:
- Inyecta token JWT automáticamente
- Maneja 401 (sesión expirada)
- Registra requests/responses en desarrollo
- Tipos explícitos con TypeScript

## Próximos Pasos

- [ ] Crear decoradores para validación automática de DTOs
- [ ] Implementar cache en ClienteApi
- [ ] Agregar retry automático en fallos de red
- [ ] Crear generador de servicios para nuevos endpoints
- [ ] Tests unitarios para cada servicio
- [ ] Integración con Storybook para documentación visual

## Referencias

- Patrón Factory: Creación centralizada de objetos
- Service Locator: Registro global de servicios
- Base Class: Reutilización de métodos CRUD
- TypeScript Generics: Tipado fuerte en runtime
