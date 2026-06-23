# Integración de Servicios: IA/ML + NestJS + Frontend

## Descripción General

Este documento explica cómo se integran los tres componentes principales del sistema:

1. **Django ML Service** (`transit-ai-ml`) - Servicio de IA/ML para predicciones y reportes
2. **NestJS Backend** (`transit-ai-backend`) - API principal y proxy a servicios
3. **Next.js Frontend** (`frontend`) - Aplicación cliente web

---

## Arquitectura de Servicios

```
┌─────────────────────────────────────────────────────────┐
│                    Cliente Web (Next.js)                │
│         (Frontend + Predicciones + Reportes)            │
└────────┬─────────────────────────────────────────────────┘
         │
         │ HTTP + WebSocket
         │
┌────────▼─────────────────────────────────────────────────┐
│          NestJS Backend (API Principal)                  │
│    - Autenticación JWT                                  │
│    - Gestión de datos (BD PostgreSQL)                   │
│    - Proxy a Django ML Service                          │
│    - WebSocket en tiempo real                           │
└────────┬─────────────────────────────────────────────────┘
         │
         │ HTTP (Python/Requests)
         │
┌────────▼─────────────────────────────────────────────────┐
│       Django ML Service (Servicio Especializado)         │
│    - Modelos entrenados (ETA, Tráfico, Anomalías)       │
│    - Transcripción de voz (Whisper API)                 │
│    - Análisis de reportes con ML                        │
│    - Celery para tareas asincrónicas                    │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Django ML Service

### URL en Producción
```
https://produccion-ia.onrender.com
```

### Endpoints Principales

#### Reportes (Voz + Texto)
```http
POST /api/reports/create/
Content-Type: multipart/form-data

{
  "report_type": "INCIDENT",
  "title": "Problema en el motor",
  "description": "Motor haciendo ruido extraño",
  "usuario_id": 123,
  "linea_id": 1,
  "voice_file": <audio.mp3>,
  "voice_duration_seconds": 15
}
```

#### Predicciones (ETA, Tráfico, Anomalías)
```http
POST /api/predictions/predict/

{
  "prediction_type": "ETA_ARRIVAL",
  "input_data": {
    "distance_km": 15.5,
    "speed_kmh": 45,
    "hour_of_day": 14,
    "traffic_factor": 1.2
  }
}
```

### Configuración de CORS

El Django está configurado para permitir CORS desde:
- Frontend en Vercel: `https://produccion-frontend-beige.vercel.app`
- CloudFront: `https://d24b2ge9tptla9.cloudfront.net`
- NestJS Backend: `http://localhost:4000`
- Desarrollo local: `http://localhost:3000`

---

## 2. NestJS Backend - Proxy a Django

### Configuración

Variables de entorno en `.env`:
```env
DJANGO_ML_SERVICE_URL=https://produccion-ia.onrender.com
DJANGO_ML_API_KEY=transit-ai-ml-api-key-2026
```

### Rutas del Proxy

Todas las llamadas al módulo `ia/` son proxied a Django:

```
POST   /ia/reportes/crear            → Django: POST /api/reports/create/
GET    /ia/reportes                  → Django: GET  /api/reports/
GET    /ia/reportes/:id              → Django: GET  /api/reports/:id/
PATCH  /ia/reportes/:id/estado       → Django: PATCH /api/reports/:id/update_status/
GET    /ia/reportes/analytics/dashboard → Django: GET /api/reports/analytics/

POST   /ia/predictions/predict/      → Django: POST /api/predictions/predict/
GET    /ia/status                    → Django: GET  /api/models/active/
GET    /ia/metricas/:tipo            → Django: GET  /api/models/
```

---

## 3. Frontend Next.js - Servicio de Predicciones

### Instalación y Uso

El servicio está ubicado en `src/services/predicciones.servicio.ts` y proporciona:

```typescript
import { prediccionesServicio } from '@/services/predicciones.servicio';

// Predecir ETA (Tiempo de Llegada)
const eta = await prediccionesServicio.predecirETA({
  distance_km: 15.5,
  speed_kmh: 45,
  hour_of_day: new Date().getHours(),
  traffic_factor: 1.2
});

// Resultado
if (eta) {
  console.log(`Llegará en ${eta.eta_minutes} minutos`);
  console.log(`Confianza: ${(eta.confidence * 100).toFixed(1)}%`);
}
```

### Métodos Disponibles

#### 1. predecirETA(datos)
Predice el tiempo de llegada de un bus.

```typescript
const eta = await prediccionesServicio.predecirETA({
  distance_km: 10,
  speed_kmh: 40,
  hour_of_day: 14,
  traffic_factor: 1.0
});

// Devuelve: { eta_minutes: 22, confidence: 0.89 }
```

#### 2. predecirCongestión(datos)
Predice el nivel de congestión de tráfico.

```typescript
const congestion = await prediccionesServicio.predecirCongestión({
  speed_kmh: 30,
  vehicle_count: 50,
  hour_of_day: 14,
  day_of_week: 3
});

// Devuelve: { congestion_level: "MODERADO", level_numeric: 1 }
```

#### 3. detectarAnomalia(datos)
Detecta anomalías en el comportamiento del bus.

```typescript
const anomaly = await prediccionesServicio.detectarAnomalia({
  speed_kmh: 45,
  acceleration_mss: 0.5,
  stops_count: 8,
  route_deviation_meters: 250
});

// Devuelve: { is_anomaly: false, anomaly_score: 0.15 }
```

### Variables de Entorno

```env
# .env.local
NEXT_PUBLIC_API_URL=https://api.example.com/
NEXT_PUBLIC_WS_URL=wss://api.example.com/
NEXT_PUBLIC_ML_SERVICE_URL=https://produccion-ia.onrender.com/
```

### Patrón: Página de Búsqueda de Rutas con ETA

```typescript
'use client';

import { useState, useEffect } from 'react';
import { prediccionesServicio } from '@/services/predicciones.servicio';

export default function PaginaRutas() {
  const [rutas, setRutas] = useState<any[]>([]);
  const [etasMap, setEtasMap] = useState<Record<string, any>>({});

  useEffect(() => {
    cargarRutasYPrediciones();
  }, []);

  const cargarRutasYPrediciones = async () => {
    // Obtener rutas disponibles
    const rutasData = await obtenerRutas();
    setRutas(rutasData);

    // Para cada ruta, hacer una predicción de ETA
    const etas: Record<string, any> = {};

    for (const ruta of rutasData) {
      const eta = await prediccionesServicio.predecirETA({
        distance_km: ruta.distancia,
        speed_kmh: 40,
        hour_of_day: new Date().getHours(),
        traffic_factor: 1.1
      });

      if (eta) {
        etas[ruta.id] = eta;
      }
    }

    setEtasMap(etas);
  };

  return (
    <div>
      {rutas.map(ruta => (
        <div key={ruta.id} style={{
          padding: '1rem',
          border: '1px solid #3d3a39',
          marginBottom: '1rem',
          borderRadius: '8px'
        }}>
          <h3>{ruta.nombre}</h3>
          <p>Distancia: {ruta.distancia} km</p>

          {etasMap[ruta.id] && (
            <div style={{ color: '#00d992', fontWeight: 700 }}>
              Llegada estimada: {etasMap[ruta.id].eta_minutes} minutos
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Variables de Entorno - Resumen

### Django (.env)
```env
DEBUG=False
DJANGO_SECRET_KEY=tu-secret-key-aqui
ALLOWED_HOSTS=localhost,produccion-ia.onrender.com

CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000,https://produccion-frontend-beige.vercel.app,https://d24b2ge9tptla9.cloudfront.net
CORS_ALLOW_ALL_ORIGINS=False

DB_NAME=transit_ai
DB_USER=postgres
DB_PASSWORD=tu-password
DB_HOST=localhost

CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

OPENAI_API_KEY=sk-tu-api-key-aqui
```

### NestJS (.env)
```env
DJANGO_ML_SERVICE_URL=https://produccion-ia.onrender.com
DJANGO_ML_API_KEY=transit-ai-ml-api-key-2026

# Mantener todas las variables existentes
DATABASE_URL=postgresql://...
JWT_SECRET=...
FRONTEND_URL=...
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://d24b2ge9tptla9.cloudfront.net/
NEXT_PUBLIC_WS_URL=wss://d24b2ge9tptla9.cloudfront.net/
NEXT_PUBLIC_ML_SERVICE_URL=https://produccion-ia.onrender.com/
```

---

## CORS - Configuración Pública

Ambos servicios (Django y NestJS) están configurados para permitir acceso desde múltiples orígenes:

- **Frontend Vercel**: `https://produccion-frontend-beige.vercel.app`
- **CloudFront**: `https://d24b2ge9tptla9.cloudfront.net`
- **Localhost (desarrollo)**: `http://localhost:3000`, `http://localhost:4000`

Esto permite que el frontend acceda directamente a Django para predicciones y reportes sin pasar por NestJS (fallback pattern).

---

## Documentación Interna (En Español)

### IaService (NestJS)

El servicio mantiene:

1. **proxyToDjango()** - Llama a endpoints de Django
2. **proxyFormDataToDjango()** - Llama a Django con archivos (multipart)
3. Métodos para cada predicción (ETA, tráfico, anomalías)
4. Métodos para reportes (crear, listar, obtener)

Todos incluyen manejo de errores con fallbacks.

### PrediccionesServicio (Frontend)

El servicio implementa:

1. **Try-First Pattern**: Intenta vía NestJS primero, fallback a Django directo
2. **Caché Implícito**: El cliente puede implementar su propio caché
3. **Logging**: Console.error para debugging
4. **Tipos Tipados**: TypeScript para seguridad de tipos

---

## Testing

### Verificar Conectividad Django

```bash
curl -X GET https://produccion-ia.onrender.com/api/models/active/ \
  -H "Content-Type: application/json"
```

### Verificar Proxy NestJS

```bash
curl -X GET http://localhost:4000/ia/status \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Desde Console Frontend

```javascript
// Abrir DevTools → Console
fetch('https://produccion-ia.onrender.com/api/models/active/')
  .then(r => r.json())
  .then(d => console.log(d))
```

---

## Troubleshooting

### CORS Error en Frontend

**Síntoma**: `Access-Control-Allow-Origin` error

**Solución**:
1. Verificar URL en `.env.local`
2. Verificar CORS en Django `settings.py`
3. Verificar CORS en NestJS `main.ts`

### Django no responde

**Verificar**:
```bash
curl -v https://produccion-ia.onrender.com/api/models/active/
# Si timeout: servicio está en pausa en Render (plan gratuito)
```

### Predicciones devuelven null

**Razones**:
1. Modelos no entrenados en Django
2. Datos de entrada inválidos
3. Django está en pausa (Render free tier)

**Solución**:
- Verificar en Django Admin: `/admin/ml_api/mlmodel/`
- Entrenar modelos si es necesario
- Upgrade a plan de pago en Render

---

## Deployment Checklist

- [ ] Variables de entorno actualizadas en todos los servicios
- [ ] CORS configurado correctamente
- [ ] Modelos de ML entrenados en Django
- [ ] NestJS puede conectar a Django
- [ ] Frontend puede conectar a ambos servicios
- [ ] Reportes con voz funcionan
- [ ] Predicciones devuelven resultados válidos

---

**Última actualización**: 2026-06-23
**Versión**: 1.0
**Lenguaje**: Español
