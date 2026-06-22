# Transit AI — Frontend

## Stack
- **Framework:** Next.js 16 (App Router)
- **UI:** Tailwind CSS v4 + estilos inline propios (dark theme `#050507`)
- **Estado global:** Zustand (`src/almacen/`)
- **Fetching:** Axios (`src/services/api.ts`) + TanStack React Query
- **WebSocket:** Socket.IO Client (`src/lib/socket.ts`)
- **Mapas:** Leaflet + React Leaflet
- **Formularios:** React Hook Form + Zod
- **Iconos:** Lucide React

---

## Estructura de carpetas

```
src/
├── app/
│   ├── (autenticado)/           # Rutas protegidas del dashboard
│   │   ├── panel/page.tsx       # Dashboard KPIs y asignaciones
│   │   ├── lineas/page.tsx      # Lista de líneas
│   │   └── buses/page.tsx       # Lista de buses/internos
│   ├── (publica)/               # Sin autenticación
│   │   ├── mapa/page.tsx        # Mapa GPS en tiempo real
│   │   └── planificador/page.tsx
│   └── autenticacion/
│       ├── iniciar-sesion/page.tsx
│       └── registrar/page.tsx
├── almacen/
│   ├── usuario.almacen.ts       # Zustand: sesión del usuario
│   └── buses.almacen.ts         # Zustand: buses en tiempo real
├── components/
│   ├── mapa/MapaPrincipal.tsx
│   └── planificador/MapaPlanificador.tsx
├── hooks/
│   ├── useBusesEnTiempoReal.ts
│   └── usePlanificador.ts
├── services/
│   ├── api.ts                   # Axios base (JWT automático)
│   ├── buses.servicio.ts
│   ├── lineas.servicio.ts
│   └── planificador.servicio.ts
└── types/index.ts               # Todos los tipos del sistema
```

---

## API Backend

**Base URL:** `http://localhost:4000` → variable `NEXT_PUBLIC_API_URL`
**WebSocket:** `http://localhost:4000` → variable `NEXT_PUBLIC_WS_URL`

`src/services/api.ts` ya inyecta el JWT desde `localStorage` y limpia la sesión en 401.

### Autenticación (`/auth`)

| Método | Ruta | Body |
|--------|------|------|
| POST | `/auth/login` | `{ email, password }` |
| POST | `/auth/register` | `{ email, nombre, password, rol?, telefono? }` |
| POST | `/auth/refresh` | `{ refreshToken }` |
| POST | `/auth/logout` | — (Bearer en header) |

Respuesta login: `{ usuario: { id, nombre, email, rol }, accessToken, refreshToken }`

### Endpoints REST disponibles

| Recurso | Ruta base | Filtros query |
|---------|-----------|---------------|
| Sindicatos | `/sindicatos` | — |
| Usuarios | `/usuarios` | `?rol=&sindicatoId=` |
| Conductores | `/conductores` | `?sindicatoId=&lineaId=` |
| Líneas | `/lineas` | `?sindicatoId=` |
| Rutas | `/rutas` | `?lineaId=` |
| Grabaciones GPS | `/grabaciones` | `?lineaId=&estado=` |
| Buses / Internos | `/internos` | `?sindicatoId=&lineaId=` |
| Turnos | `/turnos` | — |
| Asignaciones | `/asignaciones` | `?sindicatoId=&fecha=&conductorId=` |
| Viajes activos | `/viajes/activos` | — |
| Viaje por ID | `/viajes/:id` | — |
| Última GPS del viaje | `/viajes/:id/ubicacion` | — |
| Terminales | `/terminales` | `?lineaId=` |
| Incidentes | `/incidentes` | `?conductorId=&estado=&viajeId=` |
| Desvíos | `/desvios` | `?viajeId=&justificado=` |
| Trasbordos | `/trasbordos` | `?estado=` |
| Notificaciones | `/notificaciones` | `?usuarioDestinoId=&tipo=` |
| Preferencias | `/preferencias/:usuarioId` | — |
| Favoritos | `/favoritos/usuario/:usuarioId` | — |

> Los IDs vienen como strings numéricos (BigInt serializado). Las respuestas son el dato directo, sin wrapper `{ exito, datos, mensaje }`.

### WebSocket — namespaces y eventos

```ts
import { io } from 'socket.io-client';

// ── Viajes en tiempo real ──────────────────────────────────
const socket = io('http://localhost:4000/viajes');

// Suscribirse a todos los buses de una línea (vista mapa)
socket.emit('suscribir-linea', { lineaId: '1' });
socket.on('bus-actualizado', (d) => {
  // { viajeId, latitud, longitud, rumbo, velocidad, registradoEn }
});

// Seguir un viaje específico
socket.emit('suscribir-viaje', { viajeId: '5' });
socket.on('ubicacion-actualizada', (d) => { /* nueva posición GPS */ });
socket.on('viaje-finalizado',      (d) => { /* { viajeId, estado, razonFin, finalizadoEn } */ });

// ── Incidentes ────────────────────────────────────────────
const incSocket = io('http://localhost:4000/incidentes');
incSocket.on('nuevo-incidente',  (d) => { /* alerta en dashboard */ });
incSocket.on('incidente-revisado',(d) => { /* actualizar estado */ });

// ── Notificaciones ────────────────────────────────────────
const notSocket = io('http://localhost:4000/notificaciones');
notSocket.emit('suscribir-usuario', { usuarioId: '1' });
notSocket.emit('suscribir-rol',     { rol: 'DRIVER' });
notSocket.on('nueva-notificacion',  (d) => { /* { id, titulo, cuerpo, tipo } */ });
```

---

## Enums del backend

```ts
// Roles de usuario
'SUPERADMIN' | 'SINDICATO_ADMIN' | 'OPERATOR' | 'DRIVER' | 'PASSENGER'

// Estado operacional del bus
'ACTIVE' | 'MAINTENANCE' | 'INACTIVE' | 'OUT_OF_SERVICE'

// Estado del viaje
'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'PAUSED'

// Estado de asignación diaria
'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

// Dirección de ruta
'OUTBOUND' | 'INBOUND' | 'CIRCULAR'

// Estado credencial del conductor
'VALID' | 'EXPIRED' | 'SUSPENDED' | 'RENEWING'

// Tipo de incidente
'MECHANICAL_FAILURE' | 'ACCIDENT' | 'PASSENGER_ISSUE' | 'ROAD_BLOCK' | 'WEATHER' | 'OTHER'

// Estado del incidente
'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED'

// Tipo de terminal
'START' | 'END' | 'INTERMEDIATE' | 'TRANSFER_HUB'

// Tipo de notificación
'SERVICE_ALERT' | 'ROUTE_DEVIATION' | 'MAINTENANCE' | 'INCIDENT' | 'PAYMENT' | 'SYSTEM'
```

---

## Diseño — convenciones del proyecto

### Paleta de colores
| Token | Valor |
|-------|-------|
| Fondo principal | `#050507` |
| Fondo tarjeta | `#101010` |
| Borde | `#3d3a39` |
| Texto principal | `#f2f2f2` |
| Texto secundario | `#8b949e` |
| Texto muted | `#b8b3b0` |
| **Verde primario** | `#00d992` |
| Azul | `#4cb3d4` |
| Amarillo | `#ffba00` |
| Rojo | `#fb565b` |

### Clases CSS globales disponibles
```css
.tarjeta                /* card oscura con borde */
.boton                  /* botón base */
.boton-primario         /* botón verde #00d992 */
.boton-secundario       /* botón outline */
.insignia               /* badge inline pequeño */
.insignia-exito         /* verde */
.insignia-advertencia   /* amarillo */
.insignia-error         /* rojo */
.insignia-info          /* azul */
.cuadricula-estadisticas /* grid 4 columnas para KPIs */
```

### Animación de entrada
```css
/* Aplicar en tarjetas con delay escalonado */
animation: deslizar-arriba 0.4s ease-out 0.08s forwards;
opacity: 0;
```

---

## Páginas del dashboard pendientes de implementar

El sidebar ya existe en `/panel/page.tsx`. Items con `href: '#'` por completar:

| Página | Ruta | Endpoint clave | Notas |
|--------|------|----------------|-------|
| Conductores | `/conductores` | `/conductores` | CRUD + badge credencial |
| Asignaciones | `/asignaciones` | `/asignaciones` | filtro por fecha |
| Incidentes / Alertas | `/incidentes` | `/incidentes` | badge estado + WS |
| Sindicatos | `/sindicatos` | `/sindicatos` | solo SUPERADMIN |
| Usuarios | `/usuarios` | `/usuarios` | filtro por rol |
| Turnos | `/turnos` | `/turnos` | CRUD simple |
| Rutas | `/rutas` | `/rutas` | filtro por lineaId |
| Notificaciones | `/notificaciones` | `/notificaciones` | WS en tiempo real |
| Desvíos | `/desvios` | `/desvios` | solo lectura + justificar |
| Trasbordos | `/trasbordos` | `/trasbordos` | decidir estado |

---

## Patrón para un nuevo servicio

```ts
// src/services/conductores.servicio.ts
import { api } from './api';

export const conductoresServicio = {
  obtenerTodos: (params?: { sindicatoId?: string; lineaId?: string }) =>
    api.get('/conductores', { params }).then((r) => r.data),

  obtenerPorId: (id: string) =>
    api.get(`/conductores/${id}`).then((r) => r.data),

  crear: (body: unknown) =>
    api.post('/conductores', body).then((r) => r.data),

  actualizar: (id: string, body: unknown) =>
    api.patch(`/conductores/${id}`, body).then((r) => r.data),

  eliminar: (id: string) =>
    api.delete(`/conductores/${id}`).then((r) => r.data),
};
```

## Patrón para una página del dashboard

```tsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { conductoresServicio } from '@/services/conductores.servicio';

export default function PaginaConductores() {
  const { data, isLoading } = useQuery({
    queryKey: ['conductores'],
    queryFn: () => conductoresServicio.obtenerTodos(),
  });

  if (isLoading) return <p style={{ color: '#8b949e' }}>Cargando…</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ color: '#f2f2f2', fontWeight: 800 }}>Conductores</h1>
      {/* .tarjeta, .insignia, .boton-primario */}
    </div>
  );
}
```

> El sidebar está definido en `/panel/page.tsx`. Para compartirlo entre todas las rutas del dashboard, extraerlo a `src/app/(autenticado)/layout.tsx`.
