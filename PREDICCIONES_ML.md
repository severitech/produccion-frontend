# Predicciones con Modelos ML - Guía Rápida

## Descripción

El servicio de predicciones utiliza modelos de Machine Learning entrenados en Django para proporcionar:

1. **ETA (Tiempo de Llegada)** - Cuándo llegará un bus a su destino
2. **Congestión** - Nivel de tráfico en rutas
3. **Anomalías** - Detectar comportamientos anormales en buses

---

## Ubicación del Servicio

```
Frontend: src/services/predicciones.servicio.ts
Backend: transit-ai-backend/src/ia/ia.service.ts
ML: transit-ai-ml/ml_api/views.py + trainers.py
```

---

## Uso Rápido en Frontend

### Importar

```typescript
import { prediccionesServicio } from '@/services/predicciones.servicio';
```

### 1. Predecir ETA

```typescript
// Datos necesarios
const eta = await prediccionesServicio.predecirETA({
  distance_km: 15.5,        // Distancia a recorrer en km
  speed_kmh: 45,            // Velocidad promedio en km/h
  hour_of_day: 14,          // Hora del día (0-23)
  traffic_factor: 1.2       // Factor de tráfico (1.0 = normal)
});

// Usar resultado
if (eta) {
  console.log(`Llegará en ${eta.eta_minutes} minutos`);
  console.log(`Confianza: ${(eta.confidence * 100).toFixed(0)}%`);
} else {
  console.log('No se pudo predecir ETA');
}
```

### 2. Predecir Congestión

```typescript
const congestion = await prediccionesServicio.predecirCongestión({
  speed_kmh: 35,           // Velocidad actual
  vehicle_count: 50,       // Aproximado de vehículos en la ruta
  hour_of_day: 14,         // Hora del día
  day_of_week: 3           // Día de la semana (0=lunes, 6=domingo)
});

// Resultado
if (congestion) {
  console.log(`Nivel: ${congestion.congestion_level}`);
  // BAJO, MODERADO, ALTO, CRÍTICO
}
```

### 3. Detectar Anomalías

```typescript
const anomaly = await prediccionesServicio.detectarAnomalia({
  speed_kmh: 45,                // Velocidad actual
  acceleration_mss: 0.8,        // Aceleración en m/s²
  stops_count: 5,               // Cantidad de paradas en últimas 10 min
  route_deviation_meters: 150   // Desviación de la ruta
});

// Resultado
if (anomaly?.is_anomaly) {
  console.warn('Anomalía detectada!');
  console.log(`Score: ${anomaly.anomaly_score}`);
} else {
  console.log('Comportamiento normal');
}
```

---

## Ejemplo: Página de Búsqueda de Rutas

```typescript
'use client';

import { useState, useEffect } from 'react';
import { prediccionesServicio } from '@/services/predicciones.servicio';

interface RutaConETA {
  id: string;
  nombre: string;
  distancia: number;
  eta?: number;
  confianza?: number;
}

export default function BuscadorRutas() {
  const [rutas, setRutas] = useState<RutaConETA[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarRutasConETA();
  }, []);

  const cargarRutasConETA = async () => {
    try {
      // 1. Obtener rutas disponibles
      const rutasDisponibles = await fetch('/api/rutas')
        .then(r => r.json());

      // 2. Para cada ruta, predecir ETA
      const rutasConETA = await Promise.all(
        rutasDisponibles.map(async (ruta: any) => {
          const eta = await prediccionesServicio.predecirETA({
            distance_km: ruta.distancia,
            speed_kmh: 40,  // Velocidad promedio
            hour_of_day: new Date().getHours(),
            traffic_factor: 1.0,
          });

          return {
            ...ruta,
            eta: eta?.eta_minutes || null,
            confianza: eta?.confidence || 0,
          };
        })
      );

      setRutas(rutasConETA);
    } catch (error) {
      console.error('Error cargando rutas:', error);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) return <div>Cargando...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Rutas Disponibles</h1>

      {rutas.map(ruta => (
        <div
          key={ruta.id}
          style={{
            border: '1px solid #3d3a39',
            padding: '1rem',
            marginBottom: '1rem',
            borderRadius: '8px',
            background: '#101010',
          }}
        >
          <h3 style={{ margin: '0 0 0.5rem 0' }}>{ruta.nombre}</h3>
          <p style={{ color: '#8b949e', margin: '0 0 1rem 0' }}>
            Distancia: {ruta.distancia} km
          </p>

          {ruta.eta ? (
            <div style={{
              background: '#1a3d2a',
              padding: '0.75rem',
              borderRadius: '4px',
              color: '#00d992',
              fontWeight: 700,
            }}>
              Llegada estimada: {Math.round(ruta.eta)} minutos
              <span style={{ color: '#8b949e', fontSize: '0.875rem', marginLeft: '0.5rem' }}>
                (Confianza: {(ruta.confianza * 100).toFixed(0)}%)
              </span>
            </div>
          ) : (
            <div style={{ color: '#ff4444' }}>
              No se pudo calcular ETA
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Modelos Disponibles

### 1. ETA Model
- **Entrada**: distancia, velocidad, hora, factor de tráfico
- **Salida**: minutos estimados (5-180)
- **Precisión**: ~85-90%
- **Entrenado con**: 500+ viajes históricos

### 2. Traffic Model
- **Entrada**: velocidad actual, cantidad vehículos, hora, día
- **Salida**: nivel (BAJO/MODERADO/ALTO/CRÍTICO)
- **Precisión**: ~80%
- **Entrenado con**: 500+ registros de ubicación

### 3. Anomaly Model (Isolation Forest)
- **Entrada**: velocidad, aceleración, paradas, desviación
- **Salida**: es_anomalía (true/false), score
- **Precisión**: ~75%
- **Entrenado con**: 500+ viajes históricos

---

## Variables de Entorno

```env
# Frontend
NEXT_PUBLIC_API_URL=https://api.example.com/
NEXT_PUBLIC_ML_SERVICE_URL=https://produccion-ia.onrender.com/

# NestJS Backend
DJANGO_ML_SERVICE_URL=https://produccion-ia.onrender.com
DJANGO_ML_API_KEY=transit-ai-ml-api-key-2026

# Django
OPENAI_API_KEY=sk-...
```

---

## Fallback Pattern

El servicio implementa un patrón de fallback automático:

```
1. Intenta vía NestJS (con JWT)
   ↓
2. Si falla, intenta Django directo (CORS)
   ↓
3. Si ambos fallan, devuelve null
   ↓
4. Frontend muestra valor por defecto
```

Esto asegura que incluso si un servicio está caído, las predicciones continúan funcionando.

---

## Caché Manual

Para evitar llamadas innecesarias, el frontend puede implementar caché:

```typescript
// En el componente
const cacheETA = useRef<Map<string, any>>(new Map());

const obtenerETAConCache = async (distancia: number) => {
  const key = `eta_${Math.round(distancia)}`;

  // Verificar caché
  if (cacheETA.current.has(key)) {
    return cacheETA.current.get(key);
  }

  // Hacer predicción
  const eta = await prediccionesServicio.predecirETA({
    distance_km: distancia,
    speed_kmh: 40,
    hour_of_day: new Date().getHours(),
  });

  // Guardar en caché
  if (eta) {
    cacheETA.current.set(key, eta);
  }

  return eta;
};
```

---

## Validación de Entrada

Siempre validar datos antes de enviar:

```typescript
function validarDatosETA(datos: any): boolean {
  return (
    typeof datos.distance_km === 'number' &&
    datos.distance_km > 0 &&
    datos.distance_km < 500 &&
    typeof datos.speed_kmh === 'number' &&
    datos.speed_kmh >= 0 &&
    datos.speed_kmh < 200 &&
    typeof datos.hour_of_day === 'number' &&
    datos.hour_of_day >= 0 &&
    datos.hour_of_day < 24
  );
}

const eta = validarDatosETA(datos)
  ? await prediccionesServicio.predecirETA(datos)
  : null;
```

---

## Testing

### Obtener Estado de Modelos

```bash
curl -X GET https://produccion-ia.onrender.com/api/models/active/ \
  -H "Content-Type: application/json"
```

### Hacer Predicción Directa

```bash
curl -X POST https://produccion-ia.onrender.com/api/predictions/predict/ \
  -H "Content-Type: application/json" \
  -d '{
    "prediction_type": "ETA_ARRIVAL",
    "input_data": {
      "distance_km": 15,
      "speed_kmh": 40,
      "hour_of_day": 14,
      "traffic_factor": 1.0
    }
  }'
```

### Desde Console del Navegador

```javascript
// Obtener modelos disponibles
fetch('https://produccion-ia.onrender.com/api/models/active/')
  .then(r => r.json())
  .then(d => console.log(d))

// Hacer predicción
fetch('https://produccion-ia.onrender.com/api/predictions/predict/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prediction_type: 'ETA_ARRIVAL',
    input_data: {
      distance_km: 15,
      speed_kmh: 40,
      hour_of_day: 14,
      traffic_factor: 1.0
    }
  })
})
  .then(r => r.json())
  .then(d => console.log(d))
```

---

## Troubleshooting

### Predicción devuelve null

**Causas**:
1. Django no está disponible
2. Datos de entrada inválidos
3. Modelos no están entrenados

**Solución**:
```bash
# Verificar estado de Django
curl https://produccion-ia.onrender.com/health/

# Verificar modelos entrenados
curl https://produccion-ia.onrender.com/api/models/active/
```

### Valores no realistas

**Ejemplo**: ETA predice 999 minutos

**Causa**: Datos de entrada fuera de rango

**Solución**:
```typescript
// Validar entrada
if (eta && eta.eta_minutes > 180) {
  // Usar valor por defecto
  eta.eta_minutes = 30;
}
```

### Confianza baja

Si `confidence < 0.5`, el modelo no es muy seguro.

**Opciones**:
1. Usar valor por defecto
2. Mostrar rango: "15-30 minutos"
3. Insistir al usuario que recargue

---

## Mejoras Futuras

- [ ] Entrenamiento automático con datos nuevos
- [ ] Soporte para múltiples rutas simultáneas
- [ ] Predicción de demanda
- [ ] Análisis de satisfacción del usuario
- [ ] Integración con servicios externos (clima, eventos)

---

## Referencias

- **Servicio Frontend**: `src/services/predicciones.servicio.ts`
- **Servicio Backend**: `src/ia/ia.service.ts`
- **API Django**: `ml_api/views.py`
- **Documentación ML**: Revisar `transit-ai-ml/ARQUITECTURA.md`

---

**Última actualización**: 2026-06-23
**Versión**: 1.0
**Idioma**: Español
