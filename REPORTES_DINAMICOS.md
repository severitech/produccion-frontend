# Reportes Dinámicos - Guía Rápida

## Descripción

Los reportes dinámicos permiten que conductores y operadores reporten incidentes en tiempo real mediante:
- **Texto**: Descripción escrita del problema
- **Voz**: Grabación de audio que se transcribe automáticamente

El sistema analiza automáticamente los reportes con ML para:
- Detectar severidad (BAJA, MEDIA, ALTA, CRÍTICA)
- Extraer palabras clave
- Clasificar tipo de incidente

---

## Flujo del Usuario

### 1. Acceder a Reportes
```
Frontend → Menú → Reportes → Pestaña "Dinámicos"
```

### 2. Crear un Reporte

#### Opción A: Reporte por Texto
```
1. Escribir descripción en la caja de texto
2. Clic en "Enviar"
```

#### Opción B: Reporte por Voz
```
1. Clic en botón "Grabar"
2. Hablar describiendo el problema (hasta 5 minutos)
3. Clic en "Detener"
4. El audio se transcribe automáticamente
5. Clic en "Enviar"
```

#### Opción C: Texto + Voz
```
1. Escribir descripción
2. Grabar audio adicional
3. Clic en "Enviar"
```

### 3. Sistema Procesa el Reporte

Backend Django:
```
Transcripción (si hay voz)
        ↓
Análisis ML (extracción de keywords, severidad)
        ↓
Almacenamiento en BD
        ↓
Respuesta al usuario
```

---

## Interfaz - Vista Simplificada

```
┌─────────────────────────────────────┐
│  CREAR NUEVO REPORTE                │
├─────────────────────────────────────┤
│                                     │
│  [Caja de texto grande]             │
│  "Describe el problema..."          │
│                                     │
│  [Grabar]  [Enviar]                 │
│                                     │
│  [Estado si hay audio grabado]      │
│                                     │
├─────────────────────────────────────┤
│  REPORTES GENERADOS                 │
├─────────────────────────────────────┤
│  • Reporte 1                        │
│  • Reporte 2                        │
│  ...                                │
└─────────────────────────────────────┘
```

---

## Tipos de Reporte

```typescript
enum TipoReporteDinamico {
  INCIDENT = 'INCIDENT',        // Incidente (accidente, choque, etc)
  ANOMALY = 'ANOMALY',          // Anomalía detectada
  MAINTENANCE = 'MAINTENANCE',  // Problema de mantenimiento
  TRAFFIC = 'TRAFFIC',          // Reporte de tráfico
  DELAY = 'DELAY',              // Retrasos
  GENERAL = 'GENERAL',          // Otro
}
```

---

## Respuesta del Sistema

Cada reporte genera automáticamente:

```json
{
  "id": "uuid-reporte",
  "report_type": "INCIDENT",
  "title": "Problema en el motor",
  "description": "El motor está haciendo ruido extraño",
  "transcription": "el motor está haciendo ruido extraño",
  "predicted_severity": "HIGH",
  "ml_analysis": {
    "severity": "HIGH",
    "keywords": ["motor", "ruido", "problema"],
    "confidence": 0.92,
    "anomaly_score": 0.45
  },
  "status": "COMPLETED",
  "created_at": "2024-12-15T10:30:00Z"
}
```

### Severidad

- **BAJA**: Problemas menores, no urgentes
- **MEDIA**: Problemas moderados, requieren atención
- **ALTA**: Problemas importantes, afectan servicio
- **CRÍTICA**: Emergencias, seguridad en riesgo

---

## Backend - Flujo Técnico

### 1. Frontend envía reporte

```typescript
// src/app/(autenticado)/reportes/page.tsx

const enviarReporte = async () => {
  const dataToSend: CrearReporteDinamico = {
    report_type: formReporte.report_type,
    title: formReporte.title,
    description: formReporte.description,
    usuario_id: userId,
    voice_file: recordedAudio,  // Si existe
    voice_duration_seconds: recordingTime,
  };

  await reportesServicio.crearReporteDinamico(dataToSend);
};
```

### 2. NestJS recibe y proxea

```typescript
// transit-ai-backend/src/ia/ia.controller.ts

@Post('reportes/crear')
async crearReporte(@Body() body: any) {
  return this.iaService.crearReporte(body);
  // → Proxy a Django
}
```

### 3. Django procesa

```python
# transit-ai-ml/ml_api/views.py

@action(detail=False, methods=['post'])
def create_report(self, request):
    # 1. Recibir datos
    # 2. Transcribir voz (si existe)
    # 3. Analizar con ML
    # 4. Guardar en BD
    # 5. Retornar respuesta
```

---

## APIs Utilizadas

### 1. Transcripción de Voz
```
OpenAI Whisper API
- Modelo: whisper-1
- Idioma: Español
- Entrada: audio/mp3
- Salida: texto transcrito
```

### 2. Análisis ML
```
Django ML Models:
- Extracción de keywords
- Predicción de severidad
- Detección de anomalías
```

---

## Variables de Entorno

### Django
```env
OPENAI_API_KEY=sk-...  # Para transcripción
NESTJS_BACKEND_URL=http://localhost:4000
```

### NestJS
```env
DJANGO_ML_SERVICE_URL=https://produccion-ia.onrender.com
```

### Frontend
```env
NEXT_PUBLIC_API_URL=https://api.example.com/
NEXT_PUBLIC_ML_SERVICE_URL=https://produccion-ia.onrender.com/
```

---

## Ejemplos de Uso

### Crear Reporte Texto

```typescript
import { reportesServicio, TipoReporteDinamico } from '@/services/reportes.servicio';

const crearReporte = async () => {
  const resultado = await reportesServicio.crearReporteDinamico({
    report_type: TipoReporteDinamico.INCIDENT,
    title: 'Problema en el motor',
    description: 'El motor está haciendo ruido extraño y perdiendo potencia',
    usuario_id: 123,
    linea_id: 5,
  });

  if (resultado.ok) {
    console.log('Reporte creado:', resultado.data.id);
  }
};
```

### Crear Reporte con Voz

```typescript
const crearReporteVoz = async () => {
  // Grabar audio (ya implementado en la UI)
  const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });

  const resultado = await reportesServicio.crearReporteDinamico({
    report_type: TipoReporteDinamico.MAINTENANCE,
    title: 'Problema de mantenimiento',
    usuario_id: 123,
    voice_file: new File([audioBlob], 'reporte.mp3', { type: 'audio/mp3' }),
    voice_duration_seconds: 45,
  });

  if (resultado.ok) {
    const reporte = resultado.data;
    console.log('Transcripción:', reporte.transcription);
    console.log('Severidad:', reporte.predicted_severity);
  }
};
```

### Listar Reportes

```typescript
const obtenerReportes = async () => {
  const resultado = await reportesServicio.listarReportesDinamicos({
    usuario_id: 123,
    status: 'COMPLETED',
  });

  if (resultado.ok) {
    resultado.data.forEach(reporte => {
      console.log(`${reporte.title} - Severidad: ${reporte.predicted_severity}`);
    });
  }
};
```

### Obtener Analítica

```typescript
const obtenerAnalytics = async () => {
  const resultado = await reportesServicio.obtenerAnalyticsReportes();

  if (resultado.ok) {
    const analytics = resultado.data;
    console.log(`Total reportes: ${analytics.total_reports}`);
    console.log(`Por tipo:`, analytics.reports_by_type);
    console.log(`Por severidad:`, analytics.reports_by_severity);
  }
};
```

---

## Testing

### Crear Reporte de Prueba

```bash
curl -X POST http://localhost:4000/ia/reportes/crear \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "INCIDENT",
    "title": "Prueba de reporte",
    "description": "Este es un reporte de prueba",
    "usuario_id": 1,
    "linea_id": 1
  }'
```

### Listar Reportes

```bash
curl -X GET "http://localhost:4000/ia/reportes" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Ver Analítica

```bash
curl -X GET "http://localhost:4000/ia/reportes/analytics/dashboard" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

---

## Troubleshooting

### Error: "Micrófono no disponible"

**Causa**: Navegador no tiene acceso a micrófono

**Solución**:
1. Verificar permisos del navegador
2. Usar HTTPS (requerido para acceso a micrófono)
3. Permitir micrófono en configuración del navegador

### Error: "Reporte no procesado"

**Causa**: Django no disponible o error en transcripción

**Solución**:
1. Verificar Django está corriendo
2. Verificar OpenAI API key es válida
3. Revisar logs de Django

### Transcripción vacía

**Causa**: Audio de baja calidad o muy corto

**Solución**:
1. Grabar en ambiente más silencioso
2. Hablar más lentamente
3. Usar audio con duración > 3 segundos

---

## Mejoras Futuras

- [ ] Soporte para múltiples idiomas
- [ ] Integración con MapBox para ubicación
- [ ] Asignación automática a operadores
- [ ] Notificaciones en tiempo real
- [ ] Historial y filtrado de reportes
- [ ] Exportar reportes a PDF

---

## Referencias

- **Página de reportes**: `/reportes`
- **Servicio**: `src/services/reportes.servicio.ts`
- **Backend**: `src/ia/ia.controller.ts`
- **Django**: `/api/reports/`
- **OpenAI Whisper**: https://platform.openai.com/docs/guides/speech-to-text

---

**Última actualización**: 2026-06-23
**Versión**: 1.0
**Idioma**: Español
