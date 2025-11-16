#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Servidor de API para funciones de ChatGPT
Maneja todas las llamadas a OpenAI desde el bot de WhatsApp
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import re
import unicodedata
from dotenv import load_dotenv
import openai
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Cargar variables de entorno - especificar ruta explícita
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)
logger.info(f"Cargando .env desde: {env_path}")

# Configurar OpenAI
api_key = os.getenv("OPENAI_API_KEY")
if api_key:
    logger.info("✅ API Key cargada correctamente")
    openai.api_key = api_key
else:
    logger.warning("⚠️ API Key NO encontrada en .env")

MODEL = os.getenv("AI_MODEL", "gpt-3.5-turbo")

# Crear aplicación Flask
app = Flask(__name__)
CORS(app)

# Almacenamiento en memoria para historial de conversaciones
# En producción usar una base de datos real
conversaciones = {}


# ============================================
# FUNCIONES AUXILIARES
# ============================================


def obtener_historial_conversacion(numero):
    """Obtiene el historial de conversación de una persona/proveedor"""
    if numero not in conversaciones:
        conversaciones[numero] = []
    return conversaciones[numero]


def agregar_al_historial(numero, mensaje, tipo="usuario"):
    """Agrega un mensaje al historial de conversación"""
    if numero not in conversaciones:
        conversaciones[numero] = []

    conversaciones[numero].append({"tipo": tipo, "mensaje": mensaje})


def sanitizar_texto(texto):
    """
    Sanitiza el texto para que sea compatible con WhatsApp
    Remueve caracteres especiales, saltos de línea problemáticos, etc.

    Args:
        texto: Texto a sanitizar

    Returns:
        str: Texto sanitizado
    """
    if not isinstance(texto, str):
        return str(texto)

    # Intentar conversión a ASCII y de vuelta para eliminar caracteres problemáticos
    try:
        # Normalizar Unicode a forma NFKD
        texto = unicodedata.normalize("NFKD", texto)
        # Codificar a ASCII ignorando caracteres que no sean ASCII
        texto = texto.encode("ascii", "ignore").decode("ascii")
    except:
        # Si falla, intentar remover solo caracteres de control
        texto = "".join(
            char
            for char in texto
            if unicodedata.category(char)[0] != "C" or char in "\n\t\r"
        )

    # Reemplazar saltos de línea múltiples con un simple
    texto = re.sub(r"\n\n+", "\n", texto)

    # Reemplazar múltiples espacios
    texto = re.sub(r" +", " ", texto)

    # Remover espacios al inicio y final
    texto = texto.strip()

    return texto


def llamar_openai(mensajes, max_tokens=300, temperature=0.7):
    """
    Llamar a la API de OpenAI

    Args:
        mensajes: Lista de mensajes en formato OpenAI
        max_tokens: Número máximo de tokens
        temperature: Temperatura de creatividad

    Returns:
        str: Respuesta del modelo
    """
    try:
        response = openai.ChatCompletion.create(
            model=MODEL,
            messages=mensajes,
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=15,
        )
        return sanitizar_texto(response.choices[0].message.content.strip())
    except Exception as e:
        logger.error(f"Error llamando a OpenAI: {e}")
        raise


def extraer_precios_regex(mensaje):
    """
    Extrae precios del mensaje usando regex

    Args:
        mensaje: Texto del mensaje

    Returns:
        dict: Información de precios encontrados
    """
    # Patrones para detectar precios
    patrones_precio = [
        r"\$[\d.,]+",  # $100, $1,000.50
        r"[\d.,]+\s*(?:pesos|dólares|dolares|bs|soles|pesos)",  # 100 pesos, 50 dólares
        r"(?:desde|entre|aprox|aproximadamente|costo|precio)\s*[\$]?[\d.,]+",  # desde $100
    ]

    precios = []
    for patron in patrones_precio:
        matches = re.findall(patron, mensaje, re.IGNORECASE)
        if matches:
            # Extraer solo los números
            for match in matches:
                numeros = re.findall(r"[\d.,]+", match)
                if numeros:
                    precios.extend(numeros)

    return {
        "tienePrecio": len(precios) > 0,
        "precios": list(set(precios)),  # Eliminar duplicados
        "metodo": "regex",
    }


def extraer_productos_regex(mensaje):
    """
    Extrae nombres de productos del mensaje

    Args:
        mensaje: Texto del mensaje

    Returns:
        list: Productos encontrados
    """
    productos_buscados = [
        "silla",
        "escritorio",
        "mesa",
        "armario",
        "estante",
        "cajonera",
        "oficina",
    ]
    productos_encontrados = []

    mensaje_lower = mensaje.lower()
    for producto in productos_buscados:
        if producto in mensaje_lower:
            productos_encontrados.append(producto)

    return list(set(productos_encontrados))


# ============================================
# RUTAS DE API
# ============================================


@app.route("/api/health", methods=["GET"])
def health():
    """Verifica el estado del servidor"""
    return jsonify(
        {"status": "ok", "message": "Servidor de GPT activo", "model": MODEL}
    )


@app.route("/api/generar-respuesta-empresa", methods=["POST"])
def generar_respuesta_empresa():
    """
    Genera una respuesta profesional para negociar con proveedores

    Body JSON:
    {
        "mensaje": "texto del proveedor",
        "numero_proveedor": "591XXXXXXXXXX",
        "tiene_precio": false
    }
    """
    try:
        data = request.get_json()

        if not data or "mensaje" not in data:
            return jsonify({"error": 'Falta el campo "mensaje"'}), 400

        mensaje_proveedor = data.get("mensaje")
        numero_proveedor = data.get("numero_proveedor", "desconocido")
        tiene_precio = data.get("tiene_precio", False)

        logger.info(f"Generando respuesta para proveedor {numero_proveedor}")

        # Obtener historial
        historial = obtener_historial_conversacion(numero_proveedor)

        # ============================================
        # EVALUAR SI ES NECESARIO RESPONDER CON IA
        # ============================================

        # Primero usar patrones simples rápidos
        patrones_sin_respuesta = [
            r"enseguida te contesto",
            r"luego te contesto",
            r"ahorita te contesto",
            r"un momento",
            r"espera un segundo",
            r"deja que",
            r"dame un minuto",
            r"estoy ocupado",
            r"en un momento",
            r"después te contesto",
            r"ahora no puedo",
            r"gracias por esperar",
            r"recibido",
            r"copiar",
            r"entendido",
        ]

        mensaje_lower = mensaje_proveedor.lower()

        # Verificar si contiene algún patrón de "no responder"
        necesita_respuesta = True
        for patron in patrones_sin_respuesta:
            if re.search(patron, mensaje_lower):
                necesita_respuesta = False
                logger.info(f"Patrón detectado: '{patron}' - NO es necesario responder")
                break

        # Si no necesita respuesta por patrón, retornar vacío
        if not necesita_respuesta:
            return jsonify(
                {"exito": True, "respuesta": "", "necesita_respuesta": False}
            )

        # Usar IA para decidir si necesita respuesta
        # (útil para mensajes más complejos)
        mensajes_evaluacion = [
            {
                "role": "system",
                "content": """Evalúa si el siguiente mensaje REQUIERE una respuesta inmediata.

NO requiere respuesta si:
- Es una confirmación/reconocimiento (ok, recibido, entendido, listo)
- Pide esperar (espera, un momento, después)
- Es solo cortesía (gracias, ok)
- Es un mensaje de transición (deja que, dame un segundo)

SÍ requiere respuesta si:
- Hace una pregunta
- Proporciona información importante
- Necesita clarificación

Responde SOLO con "NO" o "SÍ".""",
            },
            {"role": "user", "content": mensaje_proveedor},
        ]

        # Llamar a IA para evaluar
        evaluacion = llamar_openai(mensajes_evaluacion, max_tokens=5, temperature=0)
        evaluacion_lower = evaluacion.lower().strip()

        if "no" in evaluacion_lower:
            logger.info(f"IA evaluó: NO requiere respuesta - '{mensaje_proveedor}'")
            return jsonify(
                {"exito": True, "respuesta": "", "necesita_respuesta": False}
            )

        logger.info(f"IA evaluó: SÍ requiere respuesta")

        # Construir mensajes para IA
        mensajes_ia = [
            {
                "role": "system",
                "content": f"""Eres un comprador de una empresa nueva que se acaba de establecer. Necesitas equipar las oficinas con muebles de calidad a largo plazo.

TU PERFIL:
- Eres de una startup o empresa reciente
- Buscas proveedores confiables para equipar la oficina
- Tienes presupuesto moderado pero buscas buen valor
- Necesitas sillas y escritorios de calidad para el equipo

TU ESTILO DE RESPUESTA:
- Corto y directo, como en un chat normal
- Amable pero sin ser formal ni robótico
- Colegial y natural, como habla un emprendedor
- Sin emojis
- Sin comillas y sin puntos (lenguaje muy relajado)
- Máximo 2-3 líneas por mensaje
- Responde de forma casual, como hablando con colegas en negocios

TU OBJETIVO: obtener información sobre PRECIOS, MODELOS, DISPONIBILIDAD y ENTREGA de escritorios y sillas.

EJEMPLOS DE CÓMO RESPONDER (sin puntos ni comillas):
- Oka y cuál sería el precio para equipo de 5 personas
- Dale eso me sirve, me pasas los precios y disponibilidad
- Perfecto con eso tengo lo que necesitaba para la oficina nos contactaremos pronto
- Ok entendido gracias por los datos, cuándo pueden entregar

Si no tienen precios, pregunta de forma simple
Si ya tienes precios, agradece y cierra de forma natural
Siempre sé breve y natural, como hablas por chat con colegas de negocios""",
            }
        ]

        # Agregar historial
        for msg in historial:
            mensajes_ia.append(
                {
                    "role": "assistant" if msg["tipo"] == "bot" else "user",
                    "content": msg["mensaje"],
                }
            )

        # Agregar mensaje actual del proveedor
        mensajes_ia.append({"role": "user", "content": mensaje_proveedor})

        # Si ya tenemos precios, indicar que debe cerrar
        if tiene_precio:
            mensajes_ia.append(
                {
                    "role": "system",
                    "content": "Ya obtuviste información de precios. Agradece de forma profesional y menciona que evaluarás la propuesta y te pondrás en contacto pronto.",
                }
            )

        # Llamar a OpenAI
        respuesta = llamar_openai(mensajes_ia, max_tokens=200, temperature=0.7)

        # Sanitizar la respuesta
        respuesta = sanitizar_texto(respuesta)

        # Agregar respuesta al historial
        agregar_al_historial(numero_proveedor, respuesta, "bot")
        agregar_al_historial(numero_proveedor, mensaje_proveedor, "usuario")

        logger.info(f"✅ Respuesta generada para proveedor {numero_proveedor}")

        return jsonify(
            {"respuesta": respuesta, "exito": True, "necesita_respuesta": True}
        )

    except Exception as e:
        logger.error(f"Error en generar_respuesta_empresa: {e}")
        return jsonify({"error": str(e), "exito": False}), 500


@app.route("/api/extraer-precios", methods=["POST"])
def extraer_precios():
    """
    Extrae información de precios de un mensaje
    Primero intenta con regex, luego con IA si es necesario

    Body JSON:
    {
        "mensaje": "texto con precios",
        "numero_proveedor": "591XXXXXXXXXX"
    }
    """
    try:
        data = request.get_json()

        if not data or "mensaje" not in data:
            return jsonify({"error": 'Falta el campo "mensaje"'}), 400

        mensaje = data.get("mensaje")
        numero_proveedor = data.get("numero_proveedor", "desconocido")

        logger.info(f"Extrayendo precios del mensaje de {numero_proveedor}")

        # Primero intentar con regex (rápido)
        resultado_regex = extraer_precios_regex(mensaje)

        # Si encuentra precios con regex, retornarlos
        if resultado_regex["tienePrecio"] and resultado_regex["precios"]:
            logger.info(
                f"✅ Precios detectados por regex: {resultado_regex['precios']}"
            )
            return jsonify(
                {
                    "tienePrecio": True,
                    "precios": resultado_regex["precios"],
                    "productos": extraer_productos_regex(mensaje),
                    "metodo": "regex",
                    "exito": True,
                }
            )

        # Si no encuentra precios y tenemos API key, usar IA
        if not os.getenv("OPENAI_API_KEY"):
            logger.warning("API Key no configurada, retornando resultado de regex")
            return jsonify(
                {
                    "tienePrecio": False,
                    "precios": [],
                    "productos": extraer_productos_regex(mensaje),
                    "metodo": "regex",
                    "exito": True,
                }
            )

        logger.info("Usando IA para analizar precios")

        # Usar IA para analizar el mensaje
        mensajes_ia = [
            {
                "role": "system",
                "content": """Eres un experto en análisis de mensajes comerciales. Tu tarea es extraer información de precios de mensajes de proveedores.

Analiza el mensaje y extrae:
1. ¿Hay menciones de precios? (sí/no)
2. ¿Cuáles son los precios mencionados? (lista de números)
3. ¿Qué productos se mencionan? (sillas, escritorios, armarios, etc)

Responde SIEMPRE en formato JSON como este:
{
  "tienePrecio": true/false,
  "precios": [número1, número2, ...],
  "productos": ["silla", "escritorio"],
  "analisis": "texto explicativo"
}

Importante:
- Si hay frases como "desde $100", "entre $100 y $200", "aproximadamente 500", detecta los números
- Si dice "no tengo precio", "precio a consultar", etc → tienePrecio: false
- Sé flexible: "cien dólares" = 100, "dos mil" = 2000, "un millón" = 1000000
- Analiza CUALQUIER formato de precio que veas""",
            },
            {
                "role": "user",
                "content": f'Analiza este mensaje y extrae los precios:\n\n"{mensaje}"',
            },
        ]

        respuesta_ia = llamar_openai(mensajes_ia, max_tokens=300, temperature=0.3)

        logger.info(f"Respuesta IA: {respuesta_ia}")

        # Parsear JSON de la respuesta
        json_match = re.search(r"\{.*\}", respuesta_ia, re.DOTALL)
        if not json_match:
            logger.warning("No se pudo parsear respuesta de IA")
            return jsonify(
                {
                    "tienePrecio": False,
                    "precios": [],
                    "productos": extraer_productos_regex(mensaje),
                    "metodo": "regex",
                    "exito": True,
                }
            )

        analisis_ia = json.loads(json_match.group())

        # Usar datos de IA si encuentra precios
        if analisis_ia.get("tienePrecio") and analisis_ia.get("precios"):
            logger.info(f"✅ Precios detectados por IA: {analisis_ia['precios']}")
            return jsonify(
                {
                    "tienePrecio": True,
                    "precios": analisis_ia.get("precios", []),
                    "productos": analisis_ia.get("productos", []),
                    "metodo": "ia",
                    "exito": True,
                }
            )

        # No hay precios
        return jsonify(
            {
                "tienePrecio": False,
                "precios": [],
                "productos": analisis_ia.get("productos", []),
                "metodo": "ia",
                "exito": True,
            }
        )

    except Exception as e:
        logger.error(f"Error en extraer_precios: {e}")
        return jsonify({"error": str(e), "exito": False}), 500


@app.route("/api/obtener-respuesta", methods=["POST"])
def obtener_respuesta():
    """
    Obtiene una respuesta de IA general para usuario

    Body JSON:
    {
        "mensaje": "mensaje del usuario",
        "numero_usuario": "591XXXXXXXXXX"
    }
    """
    try:
        data = request.get_json()

        if not data or "mensaje" not in data:
            return jsonify({"error": 'Falta el campo "mensaje"'}), 400

        mensaje_usuario = data.get("mensaje")
        numero_usuario = data.get("numero_usuario", "desconocido")

        logger.info(f"Generando respuesta general para usuario {numero_usuario}")

        mensajes_ia = [
            {
                "role": "system",
                "content": f"""Eres un asistente virtual de atención al cliente llamado {os.getenv('BOT_NAME', 'Bot de Soporte')}. 
Responde de manera amable, profesional y concisa. 
Si no sabes algo, indica que transferirás la consulta a un humano.""",
            },
            {"role": "user", "content": mensaje_usuario},
        ]

        respuesta = llamar_openai(mensajes_ia, max_tokens=300, temperature=0.7)

        logger.info(f"✅ Respuesta generada para usuario {numero_usuario}")

        return jsonify({"respuesta": respuesta, "exito": True})

    except Exception as e:
        logger.error(f"Error en obtener_respuesta: {e}")
        return jsonify({"error": str(e), "exito": False}), 500


@app.route("/api/limpiar-historial", methods=["POST"])
def limpiar_historial():
    """
    Limpia el historial de conversación de un usuario

    Body JSON:
    {
        "numero": "591XXXXXXXXXX"
    }
    """
    try:
        data = request.get_json()
        numero = data.get("numero")

        if numero in conversaciones:
            del conversaciones[numero]
            logger.info(f"Historial limpiado para {numero}")

        return jsonify({"exito": True, "mensaje": "Historial limpiado"})

    except Exception as e:
        logger.error(f"Error en limpiar_historial: {e}")
        return jsonify({"error": str(e), "exito": False}), 500


# ============================================
# MANEJO DE ERRORES
# ============================================
# MANEJO DE ERRORES
# ============================================


@app.route("/api/procesar-pdf", methods=["POST"])
def procesar_pdf():
    """
    Procesa un PDF de manera inteligente:
    1. Extrae texto de todas las páginas
    2. Usa OpenAI para analizar y seleccionar la página de muebles más relevante
    3. Extrae esa página a un PDF separado
    4. Retorna el PDF recortado en base64 (NO imagen)
    """
    try:
        import base64
        from PyPDF2 import PdfReader, PdfWriter
        from io import BytesIO

        # Verificar que se envió un archivo
        if "pdf_file" not in request.files:
            return jsonify({"error": "No se envió archivo PDF", "exito": False}), 400

        pdf_file = request.files["pdf_file"]

        if pdf_file.filename == "":
            return jsonify({"error": "Archivo vacío", "exito": False}), 400

        # Validar que es un PDF
        if not pdf_file.filename.lower().endswith(".pdf"):
            return jsonify({"error": "El archivo no es un PDF", "exito": False}), 400

        logger.info(f"📄 Procesando PDF: {pdf_file.filename}")

        # Leer el PDF en memoria
        pdf_bytes = pdf_file.read()
        pdf_reader = PdfReader(BytesIO(pdf_bytes))

        num_paginas = len(pdf_reader.pages)
        logger.info(f"📖 Total de páginas: {num_paginas}")

        # ============================================
        # PASO 1: Extraer texto de todas las páginas
        # ============================================
        logger.info("📝 Extrayendo texto de todas las páginas...")
        contenido_paginas = []

        for idx, page in enumerate(pdf_reader.pages):
            try:
                texto = page.extract_text()
                contenido_paginas.append(
                    {
                        "pagina": idx + 1,
                        "texto": (
                            texto[:500] if texto else ""
                        ),  # Primeros 500 caracteres
                    }
                )
            except Exception as e:
                logger.warning(f"⚠️ Error extrayendo texto de página {idx + 1}: {e}")
                contenido_paginas.append({"pagina": idx + 1, "texto": ""})

        # ============================================
        # PASO 2: Usar OpenAI para analizar el contenido
        # ============================================
        logger.info(
            "🤖 Analizando contenido con OpenAI para encontrar página de muebles..."
        )

        # Crear resumen de contenido
        resumen_paginas = "\n---\n".join(
            [f"Página {p['pagina']}:\n{p['texto']}" for p in contenido_paginas]
        )

        prompt_analisis = f"""Analiza el siguiente contenido de un catálogo PDF y encuentra la página que hable de MUEBLES DE OFICINA.

Si hay varias páginas sobre muebles de oficina, selecciona SOLO UNA (preferiblemente la que tenga más contenido relevante y detalles sobre muebles).

Debes responder ÚNICAMENTE en formato JSON válido sin explicaciones adicionales:
{{
    "page_number": <número de página>,
    "categoria": "<categoría encontrada>",
    "razon": "<breve razón de la selección>"
}}

Contenido del PDF:
{resumen_paginas}"""

        try:
            response = openai.ChatCompletion.create(
                model=MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "Eres un asistente especializado en analizar catálogos PDF de muebles. Debes identificar páginas sobre muebles de oficina y responder SOLO con JSON válido.",
                    },
                    {"role": "user", "content": prompt_analisis},
                ],
                temperature=0.3,
                max_tokens=200,
                timeout=15,
            )

            resultado_texto = response.choices[0].message.content.strip()
            logger.info(f"📊 Respuesta de OpenAI: {resultado_texto}")

            # Parsear respuesta JSON
            try:
                resultado = json.loads(resultado_texto)
                pagina_producto = resultado.get("page_number", 1)
                categoria = resultado.get("categoria", "Muebles")
                razon = resultado.get("razon", "")
                logger.info(
                    f"✅ OpenAI seleccionó página {pagina_producto}: {categoria}"
                )
            except json.JSONDecodeError:
                logger.warning(
                    "⚠️ No se pudo parsear JSON de OpenAI, usando keyword matching"
                )
                # Fallback: buscar por keywords
                pagina_producto = 1
                for p in contenido_paginas:
                    palabras_clave = [
                        "silla",
                        "escritorio",
                        "mesa",
                        "armario",
                        "estante",
                        "mueble",
                        "oficina",
                    ]
                    if any(palabra in p["texto"].lower() for palabra in palabras_clave):
                        pagina_producto = p["pagina"]
                        break

        except Exception as e:
            logger.error(f"❌ Error llamando a OpenAI: {e}")
            # Fallback: usar búsqueda por keywords
            pagina_producto = 1
            for p in contenido_paginas:
                palabras_clave = [
                    "silla",
                    "escritorio",
                    "mesa",
                    "armario",
                    "estante",
                    "mueble",
                    "oficina",
                ]
                if any(palabra in p["texto"].lower() for palabra in palabras_clave):
                    pagina_producto = p["pagina"]
                    break

        # Validar número de página
        pagina_producto = max(1, min(pagina_producto, num_paginas))

        # ============================================
        # PASO 3: Extraer la página seleccionada a PDF
        # ============================================
        logger.info(f"📥 Extrayendo página {pagina_producto} a nuevo PDF...")

        pdf_writer = PdfWriter()
        pdf_writer.add_page(pdf_reader.pages[pagina_producto - 1])

        # Guardar el PDF extraído en memoria
        pdf_extraido = BytesIO()
        pdf_writer.write(pdf_extraido)
        pdf_extraido.seek(0)

        # ============================================
        # PASO 4: Codificar PDF a base64
        # ============================================
        logger.info("🔄 Codificando PDF a base64...")

        pdf_base64 = base64.b64encode(pdf_extraido.getvalue()).decode("utf-8")

        # Generar nombre del archivo
        nombre_archivo = f"muebles_pagina_{pagina_producto}.pdf"

        logger.info(f"✅ PDF extraído y codificado: {nombre_archivo}")

        # ============================================
        # PASO 5: Convertir página a imagen PNG
        # ============================================
        logger.info("🖼️ Convirtiendo página a imagen PNG...")

        try:
            import pypdfium2 as pdfium
            from PIL import Image
            import numpy as np
            from io import BytesIO

            # Convertir PDF a imagen usando pypdfium2 (no requiere Poppler)
            pdf_extraido.seek(0)
            pdf_document = pdfium.PdfDocument(pdf_extraido)

            # Obtener la primera página del PDF extraído
            page = pdf_document[0]

            # Renderizar página a imagen (200 DPI)
            bitmap = page.render(scale=200 / 72).to_pil()
            imagen = bitmap

            if imagen:
                # ============================================
                # PASO 6: Crop inteligente de imagen
                # ============================================
                logger.info("✂️ Realizando crop inteligente...")

                try:
                    # Convertir imagen a numpy array
                    img_array = np.array(imagen)

                    # Buscar bordes blancos/vacíos
                    if len(img_array.shape) == 3:  # Color
                        gris = np.mean(img_array, axis=2)
                    else:  # Escala de grises
                        gris = img_array

                    # Encontrar filas y columnas con contenido
                    umbral = 250
                    filas_con_contenido = np.where(np.min(gris, axis=1) < umbral)[0]
                    cols_con_contenido = np.where(np.min(gris, axis=0) < umbral)[0]

                    if len(filas_con_contenido) > 0 and len(cols_con_contenido) > 0:
                        # Hacer crop
                        margen = 10
                        top = max(0, filas_con_contenido[0] - margen)
                        bottom = min(
                            img_array.shape[0], filas_con_contenido[-1] + margen
                        )
                        left = max(0, cols_con_contenido[0] - margen)
                        right = min(img_array.shape[1], cols_con_contenido[-1] + margen)

                        imagen_crop = imagen.crop((left, top, right, bottom))
                        imagen = imagen_crop
                        logger.info(f"✅ Crop realizado")
                except Exception as e:
                    logger.warning(f"⚠️ Error en crop: {e}")

                # Codificar imagen a base64
                img_bytes = BytesIO()
                imagen.save(img_bytes, format="PNG")
                img_bytes.seek(0)
                imagen_base64 = base64.b64encode(img_bytes.getvalue()).decode("utf-8")

                logger.info("✅ Imagen PNG generada")
            else:
                logger.warning("⚠️ No se pudo convertir PDF a imagen")
                imagen_base64 = None

        except Exception as e:
            logger.warning(f"⚠️ Error convirtiendo a imagen: {e}")
            imagen_base64 = None

        return jsonify(
            {
                "exito": True,
                "mensaje": "PDF analizado y página extraída correctamente",
                "imagen_base64": imagen_base64,
                "archivo": nombre_archivo,
                "archivo_original": pdf_file.filename,
                "pagina": pagina_producto,
                "categoria": categoria if "categoria" in locals() else "Muebles",
                "razon": razon if "razon" in locals() else "",
            }
        )

    except Exception as e:
        logger.error(f"❌ Error en procesar_pdf: {e}")
        import traceback

        logger.error(traceback.format_exc())
        return jsonify({"error": str(e), "exito": False}), 500


# ============================================
# MANEJO DE ERRORES
# ============================================
def no_encontrado(e):
    return jsonify({"error": "Ruta no encontrada", "exito": False}), 404


@app.errorhandler(500)
def error_interno(e):
    return jsonify({"error": "Error interno del servidor", "exito": False}), 500


# ============================================
# PUNTO DE ENTRADA
# ============================================

if __name__ == "__main__":
    puerto = int(os.getenv("PYTHON_PORT", 5000))
    debug = os.getenv("DEBUG", "False").lower() == "true"

    logger.info(f"Iniciando servidor en puerto {puerto}")
    logger.info(f"Modelo: {MODEL}")
    logger.info(f"Debug: {debug}")

    app.run(host="0.0.0.0", port=puerto, debug=debug)
