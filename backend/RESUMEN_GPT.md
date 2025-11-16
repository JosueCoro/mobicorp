# Implementación de Endpoints GPT - Resumen

## ✅ Archivos Creados/Modificados

### Nuevos Archivos

1. **`backend/gpt_client.py`** - Cliente para interactuar con OpenAI GPT
2. **`backend/README_GPT_ENDPOINTS.md`** - Documentación completa de los endpoints
3. **`backend/test_gpt_endpoints.py`** - Suite de pruebas para los endpoints

### Archivos Modificados

1. **`backend/schemas.py`** - Agregados schemas de Pydantic para requests/responses de GPT
2. **`backend/main.py`** - Agregados 6 nuevos endpoints de GPT
3. **`backend/requirements.txt`** - Agregadas dependencias necesarias
4. **`backend/.env.example`** - Agregadas variables de entorno para OpenAI

## 📋 Endpoints Implementados

### 1. **GET** `/api/gpt/health`

- Verifica estado del servicio de GPT
- No requiere parámetros

### 2. **POST** `/api/gpt/generar-respuesta-empresa`

- Genera respuestas profesionales para negociar con proveedores
- Evalúa automáticamente si requiere respuesta
- Mantiene historial de conversación

### 3. **POST** `/api/gpt/extraer-precios`

- Extrae precios de mensajes
- Usa regex primero, IA como fallback
- Detecta productos mencionados

### 4. **POST** `/api/gpt/obtener-respuesta`

- Respuesta general de IA para atención al cliente
- Configurable con nombre del bot

### 5. **POST** `/api/gpt/limpiar-historial`

- Limpia historial de conversación
- Útil para resetear contexto

### 6. **POST** `/api/gpt/procesar-pdf`

- Analiza PDFs inteligentemente
- Extrae página relevante de muebles
- Convierte a imagen PNG con crop inteligente
- Retorna imagen en base64

## 🔧 Configuración Necesaria

### Variables de Entorno (.env)

```env
OPENAI_API_KEY=tu-api-key-de-openai
AI_MODEL=gpt-3.5-turbo
BOT_NAME=Asistente MobiCorp
```

### Instalar Dependencias

```bash
cd backend
pip install -r requirements.txt
```

### Dependencias Agregadas

- `openai==0.27.8` - Cliente de OpenAI
- `PyPDF2>=3.0.1` - Manipulación de PDFs
- `pypdfium2>=4.0.0` - Renderizado de PDFs
- `Pillow>=10.0.0` - Procesamiento de imágenes
- `numpy>=1.24.3` - Procesamiento numérico

## 🚀 Cómo Usar

### 1. Iniciar el Backend

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Acceder a la Documentación

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 3. Ejecutar Tests

```bash
cd backend
python test_gpt_endpoints.py
```

## 🎯 Características Principales

### GPTClient (`gpt_client.py`)

- **Gestión de historial**: Mantiene contexto de conversaciones
- **Sanitización de texto**: Limpia caracteres especiales
- **Extracción híbrida**: Regex + IA para detectar precios
- **Evaluación inteligente**: Decide si mensaje requiere respuesta
- **Manejo de errores**: Fallbacks y logging completo

### Procesamiento de PDFs

- Análisis inteligente con GPT para seleccionar página relevante
- Fallback a búsqueda por palabras clave
- Conversión a imagen PNG de alta calidad
- Crop automático de márgenes blancos
- Retorno de imagen en base64 para fácil integración

### Extracción de Precios

- **Método Regex**: Rápido, para precios estándar ($100, 200 pesos, etc.)
- **Método IA**: Inteligente, para precios en texto ("ciento cincuenta dólares")
- Detecta múltiples formatos de precio
- Identifica productos mencionados

### Generación de Respuestas

- Estilo casual y empresarial
- Contexto conversacional
- Evaluación automática de necesidad de respuesta
- Cierre natural cuando se obtienen precios

## 📊 Estructura de Respuestas

### Respuesta Empresa

```json
{
  "respuesta": "Oka y cuál sería el precio para equipo de 5 personas",
  "exito": true,
  "necesita_respuesta": true
}
```

### Extracción de Precios

```json
{
  "tienePrecio": true,
  "precios": ["150", "300", "500"],
  "productos": ["sillas", "escritorios"],
  "metodo": "regex",
  "exito": true
}
```

### Procesar PDF

```json
{
  "exito": true,
  "mensaje": "PDF analizado y página extraída correctamente",
  "imagen_base64": "iVBORw0KGgoAAAANSUhEUg...",
  "archivo": "muebles_pagina_3.pdf",
  "archivo_original": "catalogo.pdf",
  "pagina": 3,
  "categoria": "Muebles de Oficina",
  "razon": "Contiene información detallada..."
}
```

## 🔐 Autenticación

Todos los endpoints requieren token JWT:

```javascript
headers: {
  'Authorization': 'Bearer <token>',
  'Content-Type': 'application/json'
}
```

## ⚠️ Consideraciones

### Limitaciones Actuales

- Historial almacenado en memoria (se pierde al reiniciar)
- Rate limits de OpenAI aplican
- Tamaño de PDF limitado por memoria

### Mejoras Sugeridas

- [ ] Almacenar historial en base de datos
- [ ] Implementar caché de respuestas
- [ ] Agregar rate limiting por usuario
- [ ] Soporte para más formatos de documentos
- [ ] Métricas y analytics de uso
- [ ] Respuestas multiidioma

## 📖 Documentación Adicional

- **README_GPT_ENDPOINTS.md**: Documentación detallada de cada endpoint
- **Swagger UI**: Documentación interactiva en `/docs`
- **test_gpt_endpoints.py**: Ejemplos de uso práctico

## 🧪 Testing

El archivo `test_gpt_endpoints.py` incluye:

- ✅ Test de health check
- ✅ Test de generación de respuestas (3 casos)
- ✅ Test de extracción de precios (3 casos)
- ✅ Test de respuesta general
- ✅ Test de limpieza de historial
- ✅ Test de procesamiento de PDF

## 🔄 Flujo de Integración

```
1. Frontend/WhatsApp Bot
   ↓
2. Backend API (/api/gpt/*)
   ↓
3. GPTClient (gpt_client.py)
   ↓
4. OpenAI API
   ↓
5. Respuesta procesada
   ↓
6. Return a Frontend/Bot
```

## 📝 Notas Finales

- La implementación está lista para usar
- Todos los archivos están documentados
- Incluye manejo robusto de errores
- Diseñado para producción
- Fácilmente extensible

Para preguntas o mejoras, consulta la documentación en `README_GPT_ENDPOINTS.md`.
