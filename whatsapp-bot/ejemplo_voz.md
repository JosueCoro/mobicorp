# 🎙️ Ejemplo: Reconocimiento de Voz

Este archivo muestra ejemplos prácticos de cómo funciona el reconocimiento de mensajes de voz en el bot.

## 📱 Escenarios de Uso

### Escenario 1: Proveedor envía nota de voz con precios

**Lo que sucede:**

1. **Proveedor envía voz:**

```
🎙️ "Hola, buenos días. Nosotros tenemos escritorios disponibles.
   El modelo ejecutivo cuesta Bs 500 y el modelo operativo cuesta Bs 350.
   Las sillas ergonómicas están a Bs 250 cada una."
```

2. **Bot detecta y procesa:**

```
📨 Mensaje recibido de: 59179001725@c.us
💬 Tipo de mensaje: ptt
🎙️ Mensaje de voz detectado
✅ Audio descargado exitosamente
   Tipo de media: audio/ogg
   Tamaño: 18.54 KB
🎙️ Enviando audio a Whisper API de OpenAI...
✅ Transcripción exitosa
📝 Texto: "Hola, buenos días. Nosotros tenemos..."
✅ Audio transcrito correctamente
💰 Precios detectados: [500, 350, 250]
✓ Escritorios mencionados
✓ Sillas mencionadas
💾 Cotización guardada (de audio): 59179001725
```

3. **Bot responde:**

```
✅ Muchas gracias por la información y los precios. 👍

Vamos a evaluar su propuesta junto con otras cotizaciones
que estamos recibiendo y nos pondremos en contacto con ustedes pronto.

Saludos cordiales,
Oficinas GlobalTech
```

4. **Se guarda en `cotizaciones.json`:**

```json
{
  "id": 1731671445123,
  "proveedor": "59179001725",
  "fecha": "2025-11-15T14:30:45.123Z",
  "mensajeCompleto": "[TRANSCRITO DE VOZ] Hola, buenos días...",
  "tienePrecio": true,
  "precios": [500, 350, 250],
  "escritorios": true,
  "sillas": true,
  "timestamp": 1731671445123
}
```

### Escenario 2: Proveedor envía voz sin precios

**Lo que sucede:**

1. **Proveedor envía voz:**

```
🎙️ "Hola, qué tal. Nosotros ofrecemos muebles de oficina de muy buena calidad.
   Tenemos varios modelos disponibles. ¿Cuántos escritorios necesitan?"
```

2. **Bot procesa:**

```
📨 Mensaje recibido de: 59163448209@c.us
💬 Tipo de mensaje: ptt
🎙️ Mensaje de voz detectado
✅ Audio descargado
📝 Texto: "Hola, qué tal. Nosotros ofrecemos muebles..."
💭 Generando respuesta para continuar...
✅ Respuesta enviada
```

3. **Bot responde:**

```
Estamos evaluando entre 10-15 escritorios y 20-30 sillas aproximadamente.
Pero primero necesitamos conocer sus precios para ver si se ajustan
a nuestro presupuesto. ¿Qué precios manejan? 💼
```

4. **Se guarda en historial (sin cotización):**

```
[Mensaje guardado en memoria, esperando precios]
```

### Escenario 3: Audio que no se puede transcribir

**Lo que sucede:**

1. **Proveedor envía voz muy ruidosa o incomprensible**

2. **Bot intenta:**

```
🎙️ Mensaje de voz detectado
✅ Audio descargado
🎙️ Enviando audio a Whisper API...
❌ Error en transcripción Whisper: Could not parse audio
💡 Intentando método alternativo...
```

3. **Bot responde:**

```
⚠️ No pude transcribir tu mensaje de voz.
Por favor, intenta con otro o envía texto.
```

## 🎯 Características Detectadas

El bot puede detectar automáticamente:

### Precios en estos formatos:

- `Bs 500` o `500 Bs`
- `$500` o `500$`
- `500 bolivianos`
- `500 pesos`

### Productos mencionados:

- `escritorio`, `desk`, `mesa`, `table`
- `silla`, `chair`, `asiento`, `seat`

### Ejemplo de detección:

```javascript
// Texto transcrito
"Tenemos dos escritorios disponibles. El primero cuesta Bs 450
y el segundo Bs 520. También ofrecemos sillas a Bs 200 cada una."

// Resultado de análisis
{
  escritorios: true,    // Detectó "escritorios"
  sillas: true,         // Detectó "sillas"
  precios: [450, 520, 200],  // Detectó 3 precios
  tienePrecio: true
}
```

## 📊 Ver Cotizaciones Guardadas

Después de recibir mensajes de voz con precios, puedes ver el resumen:

```bash
# En la terminal, mientras el bot corre:
cotizaciones
```

**Salida:**

```
════════════════════════════════════════
📊 RESUMEN DE COTIZACIONES RECIBIDAS
════════════════════════════════════════
Total de cotizaciones: 2
Última actualización: 2025-11-15T14:35:20.456Z

📱 Proveedor: 59179001725
   Respuestas: 1

   Cotización 1:
      ID: 1731671445123
      Fecha: 2025-11-15T14:30:45.123Z
      ✓ Escritorios mencionados
      ✓ Sillas mencionadas
      💰 Precios: Bs 500, Bs 350, Bs 250
      📝 Mensaje: "[TRANSCRITO DE VOZ] Hola, buenos días..."

📱 Proveedor: 59163448209
   Respuestas: 1

   Cotización 2:
      ID: 1731671460789
      Fecha: 2025-11-15T14:35:20.789Z
      ✓ Escritorios mencionados
      ✓ Sillas mencionadas
      💰 Precios: Bs 600, Bs 400
      📝 Mensaje: "[TRANSCRITO DE VOZ] Nosotros contamos con escritorios..."

════════════════════════════════════════
```

## 💡 Tips y Buenas Prácticas

### Para obtener mejor transcripción:

1. **Habla claro:**

   - Evita ruidos de fondo
   - Haz pausas entre frases
   - Habla a un volumen moderado

2. **Menciona precios explícitamente:**

   ```
   ❌ "Es barato"
   ✅ "Cuesta Bs 500"
   ```

3. **Especifica productos:**

   ```
   ❌ "Tenemos ese que dijiste"
   ✅ "Tenemos escritorio modelo ejecutivo"
   ```

4. **Proporciona información completa:**
   ```
   ❌ "Silla a $20"
   ✅ "Silla ergonómica a 200 bolivianos"
   ```

## 🔍 Archivo de Configuración

Para configurar el reconocimiento de voz, edita tu `.env`:

```env
# API Key OBLIGATORIA para transcripción de voz
OPENAI_API_KEY=sk-your-key-here

# Modelo de IA para respuestas
AI_MODEL=gpt-3.5-turbo

# Configuración del bot
BOT_NAME=Oficinas GlobalTech
AUTO_REPLY_ENABLED=true
```

## 📁 Almacenamiento de Datos

### Estructura de archivos generados:

```
whatsapp-bot/
├── cotizaciones.json          # Todas las cotizaciones guardadas
├── cotizaciones_2025-11-15.csv  # Exportación a CSV
├── cotizaciones.backup.*.json   # Backups automáticos
└── .wwebjs_cache/             # Cache de WhatsApp Web
```

### Ejemplo de cotización desde voz en `cotizaciones.json`:

```json
{
  "cotizaciones": [
    {
      "id": 1731671445123,
      "proveedor": "59179001725",
      "fecha": "2025-11-15T14:30:45.123Z",
      "mensajeCompleto": "[TRANSCRITO DE VOZ] Hola, buenos días. Nosotros tenemos escritorios disponibles. El modelo ejecutivo cuesta Bs 500 y el modelo operativo cuesta Bs 350. Las sillas ergonómicas están a Bs 250 cada una.",
      "tienePrecio": true,
      "precios": [500, 350, 250],
      "escritorios": true,
      "sillas": true,
      "timestamp": 1731671445123
    }
  ],
  "ultimaActualizacion": "2025-11-15T14:30:45.123Z",
  "totalCotizaciones": 1
}
```

## ⚡ Rendimiento

### Tiempo típico de procesamiento:

| Paso                    | Tiempo    |
| ----------------------- | --------- |
| Descarga de audio       | <1s       |
| Envío a Whisper API     | <1s       |
| Transcripción           | 2-5s      |
| Análisis de texto       | <1s       |
| Generación de respuesta | 1-3s      |
| **Total**               | **5-10s** |

## 🚀 Ejemplo Completo de Conversación por Voz

### Día 1:

```
Bot:       💡 Escribe "solicitar" para enviar la solicitud a proveedores
Empresa:   solicitar
Bot:       ✅ Enviando solicitud a 2 proveedores...

Proveedor 1:  🎙️ [nota de voz con precios]
Bot:           ✅ Gracias por los precios
               💾 Cotización guardada

Proveedor 2:  🎙️ [nota de voz sin precios]
Bot:           💬 ¿Cuáles son sus precios?

Proveedor 2:  🎙️ [nota de voz con precios]
Bot:           ✅ Gracias por los precios
               💾 Cotización guardada
```

### Día 2:

```
Empresa:   cotizaciones

Bot:       📊 RESUMEN DE COTIZACIONES
           - Proveedor 1: Bs 500 (escritorio), Bs 250 (silla)
           - Proveedor 2: Bs 550 (escritorio), Bs 280 (silla)
```

---

**Última actualización:** 15 de noviembre de 2025
