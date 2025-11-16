# 📸 Ejemplos de Uso: Extracción de Imágenes de PDFs

## Caso 1: Proveedor Envía Catálogo Completo

### Entrada

```
Proveedor: [Envía: catalogo_muebles_2025.pdf (5 páginas)]
```

### Procesamiento Automático

```
📨 Mensaje recibido de: 5491166666666
💬 Tipo de mensaje: document
📄 Documento detectado
✅ PDF descargado exitosamente
   Tipo: application/pdf
   Tamaño: 245.32 KB
📄 Procesando tu PDF... Por favor espera.
📄 PDF procesado exitosamente
   Páginas: 5
   Texto total: 8547 caracteres
📊 Productos encontrados: 3
   1. Escritorio
   2. Silla
   3. Armario
🖼️ Intentando extraer imágenes del PDF...
🖼️ Procesando PDF para extraer imágenes...
📄 Analizando 5 páginas del PDF para extraer imágenes
   ✅ Página 1 capturada como imagen
   ✅ Página 2 capturada como imagen
   ✅ Página 3 capturada como imagen
✅ 3 imagen(s) extraída(s) del PDF
📤 Iniciando envío de imágenes de productos...
✅ Imagen de Escritorio enviada
✅ Imagen de Silla enviada
✅ Imagen de Armario enviada
✅ 3 imagen(s) de productos enviada(s) correctamente
```

### Salida (Mensajes a WhatsApp)

El proveedor recibe:

**Mensaje 1 - Imagen del Escritorio:**

```
[IMAGEN DE PÁGINA 1]
🛋️ Escritorio
Estamos interesados en este producto y queremos conocer el precio.
Por favor, comparte tu cotización.
```

**Mensaje 2 - Imagen de la Silla:**

```
[IMAGEN DE PÁGINA 2]
🪑 Silla
Estamos interesados en este producto y queremos conocer el precio.
Por favor, comparte tu cotización.
```

**Mensaje 3 - Imagen del Armario:**

```
[IMAGEN DE PÁGINA 3]
📦 Armario
Estamos interesados en este producto y queremos conocer el precio.
Por favor, comparte tu cotización.
```

**Mensaje 4 - Solicitud de Precios:**

```
✅ Hola! Vi tu catálogo y encontré los siguientes productos de interés:

1. Escritorio
2. Silla
3. Armario

Me gustaría conocer los precios de estos productos principales:
• ¿Cuál es el precio del escritorio?
• ¿Cuál es el precio de la silla?
• ¿Cuál es el precio del armario?

Por favor, comparte los precios para poder evaluar tu oferta.

Saludos cordiales,
Oficinas GlobalTech
```

---

## Caso 2: PDF Sin Imágenes (Solo Texto)

### Entrada

```
Proveedor: [Envía: lista_de_precios.pdf (texto solamente)]
```

### Procesamiento

```
📄 PDF procesado exitosamente
📊 Productos encontrados: 2
   1. Escritorio Ejecutivo
   2. Silla Ergonómica
🖼️ Intentando extraer imágenes del PDF...
⚠️ No se pudieron extraer imágenes del PDF
📤 Iniciando envío de imágenes de productos...
⚠️ No hay imágenes de productos para enviar
```

### Salida (Fallback a Texto)

```
✅ Hola! Vi tu catálogo y encontré los siguientes productos de interés:

1. Escritorio Ejecutivo
2. Silla Ergonómica

Me gustaría conocer los precios de estos productos principales:
• ¿Cuál es el precio del escritorio ejecutivo?
• ¿Cuál es el precio de la silla ergonómica?

Por favor, comparte los precios para poder evaluar tu oferta.
```

---

## Caso 3: PDF sin Productos Reconocibles

### Entrada

```
Proveedor: [Envía: documentacion_general.pdf]
```

### Procesamiento

```
📄 PDF procesado exitosamente
📊 Productos encontrados: 0
```

### Salida

```
⚠️ No pude detectar productos de muebles en el PDF.
Por favor, asegúrate que sea un catálogo de muebles para
oficina (escritorios, sillas, etc.).
```

---

## Caso 4: Envío Fallido (Recuperación)

### Situación

El bot intenta enviar imágenes pero WhatsApp tiene throttling temporal

### Respuesta

```
📤 Iniciando envío de imágenes de productos...
✅ Imagen de Escritorio enviada
⚠️ Error enviando imagen de Silla: (219) (...message rate)
⚠️ Error enviando imagen de Armario: (219) (...message rate)
⚠️ No se pudieron enviar imágenes, usando solo texto
```

El bot continúa enviando mensaje de texto:

```
✅ Hola! Vi tu catálogo y encontré los siguientes productos:
1. Escritorio
2. Silla
3. Armario

Me gustaría conocer los precios...
```

---

## Integración con Sistema de Cotizaciones

Cuando el proveedor responde con precios, el bot:

1. **Extrae información de precios**

   ```
   Proveedor: El escritorio está a $1.200, silla $450, armario $890
   ```

2. **Guarda en cotizaciones.json**

   ```json
   {
     "id": 1763241357062,
     "proveedor": "5491166666666",
     "fecha": "2025-11-15T21:35:00.000Z",
     "productosInteresantes": ["Escritorio", "Silla", "Armario"],
     "precios": [1200, 450, 890],
     "mensajeCompleto": "El escritorio está a $1.200...",
     "tienePrecio": true
   }
   ```

3. **Genera CSV para análisis**
   ```
   ID,Proveedor,Fecha,Escritorios,Sillas,Armarios,Precios
   1763241357062,5491166666666,2025-11-15,Sí,Sí,Sí,"$1.200,$450,$890"
   ```

---

## Optimizaciones Implementadas

### 1. **Renderización Selectiva**

```javascript
// Solo renderiza primeras 5 páginas
const cantidadPaginas = Math.min(pdfDoc.numPages, 5);

// Uno por producto (máx 3)
if (imagenes.length >= productosDetectados.length) break;
```

### 2. **Pausa entre Mensajes**

```javascript
// Evita throttling de WhatsApp
await new Promise((resolve) => setTimeout(resolve, 500));
```

### 3. **Manejo de Errores Graceful**

```javascript
// Si canvas falla, continúa sin imágenes
try {
  const imagenes = await extraerImagenesDePDF(...)
} catch (error) {
  console.log('⚠️ Continuando sin extracción de imágenes...')
}
```

### 4. **Fallback a Texto**

```javascript
// Si no hay imágenes, solo envía texto
if (!imagenesEnviadas) {
  const respuesta = await preguntarPreciosProductos(...)
  await message.reply(respuesta)
}
```

---

## Métricas de Rendimiento

### Tiempos Típicos

| Acción                 | Tiempo             |
| ---------------------- | ------------------ |
| Descargar PDF (200 KB) | ~2s                |
| Extraer texto          | ~1s                |
| Detectar productos     | ~0.5s              |
| Renderizar 3 imágenes  | ~3-5s              |
| Enviar 3 imágenes      | ~2-3s              |
| **Total por PDF**      | **~9-13 segundos** |

### Consumo de Recursos

| Recurso                     | Consumo     |
| --------------------------- | ----------- |
| Memoria (por PDF)           | ~50-100 MB  |
| CPU (renderizado)           | ~80-100%    |
| Ancho de banda (3 imágenes) | ~300-500 KB |

---

## Configuración Recomendada

Para máximo rendimiento:

```javascript
// En procesarPDF()
const cantidadPaginas = Math.min(pdfDoc.numPages, 5); // Máximo 5
const limite_productos = 3; // Máximo 3 productos
const escala_renderizado = 1.5; // Balance calidad/velocidad
const pausa_entre_mensajes = 500; // ms entre envíos
```

---

## Solucionar Problemas Comunes

### 1. "Error: El módulo canvas no puede compilarse"

**Solución:**

```bash
npm install --build-from-source canvas
# O reinstalar:
npm remove canvas
npm install canvas
```

### 2. "Las imágenes se envían pero solo texto"

**Causa:** Probablemente WhatsApp está throttling

**Solución:**

- Aumentar pausa entre mensajes: `setTimeout(resolve, 1000)`
- Enviar menos imágenes por sesión
- Espaciar los PDFs entre diferentes horarios

### 3. "PDF se procesa lentamente"

**Causa:** PDF grande o muchas páginas

**Solución:**

- Reducir: `Math.min(pdfDoc.numPages, 3)`
- Reducir escala: `{ scale: 1.0 }` en lugar de `1.5`
- Pedir PDFs más comprimidos a proveedores

### 4. "Memoria insuficiente con múltiples PDFs"

**Solución:**

```javascript
// Procesar uno por uno, no en paralelo
await procesarPDF(pdf1);
await new Promise((resolve) => setTimeout(resolve, 2000));
await procesarPDF(pdf2);
```

---

## Llamadas de Función Directas

### Procesar un PDF manualmente:

```javascript
const productosDetectados = await procesarPDF(pdfBuffer, "5491166666666");
console.log(productosDetectados);
// Output:
// [
//   { nombre: "Escritorio", tipo: "escritorio", imagen: "data:image/png;..." },
//   { nombre: "Silla", tipo: "silla", imagen: "data:image/png;..." },
//   { nombre: "Armario", tipo: "armario", imagen: "data:image/png;..." }
// ]
```

### Enviar imágenes específicamente:

```javascript
const resultado = await enviarImagenesProductos(
  productosDetectados,
  "5491166666666",
  message
);
console.log(resultado); // true si exitoso
```

### Extraer solo imágenes:

```javascript
const imagenes = await extraerImagenesDePDF(pdfBuffer, productos);
// Retorna: ["data:image/png;base64,...", "data:image/png;base64,..."]
```
