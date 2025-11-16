#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cliente para interactuar con el servicio de GPT
Integración con el servidor de GPT/OpenAI
"""

import os
import json
import re
import unicodedata
from dotenv import load_dotenv
import openai
import logging
from typing import List, Dict, Optional

# Configurar logging
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

# Configurar OpenAI
api_key = os.getenv("OPENAI_API_KEY")
if api_key:
    logger.info("✅ API Key de OpenAI cargada correctamente")
    openai.api_key = api_key
else:
    logger.warning("⚠️ API Key de OpenAI NO encontrada en .env")

MODEL = os.getenv("AI_MODEL", "gpt-3.5-turbo")

# Almacenamiento en memoria para historial de conversaciones
conversaciones = {}


class GPTClient:
    """Cliente para interactuar con OpenAI GPT"""

    def __init__(self):
        self.model = MODEL
        self.api_key = api_key

    @staticmethod
    def obtener_historial_conversacion(numero: str) -> List[Dict]:
        """Obtiene el historial de conversación de una persona/proveedor"""
        if numero not in conversaciones:
            conversaciones[numero] = []
        return conversaciones[numero]

    @staticmethod
    def agregar_al_historial(numero: str, mensaje: str, tipo: str = "usuario"):
        """Agrega un mensaje al historial de conversación"""
        if numero not in conversaciones:
            conversaciones[numero] = []
        conversaciones[numero].append({"tipo": tipo, "mensaje": mensaje})

    @staticmethod
    def limpiar_historial(numero: str):
        """Limpia el historial de conversación"""
        if numero in conversaciones:
            del conversaciones[numero]
            logger.info(f"Historial limpiado para {numero}")

    @staticmethod
    def sanitizar_texto(texto: str) -> str:
        """
        Sanitiza el texto para que sea compatible con WhatsApp
        Remueve caracteres especiales, saltos de línea problemáticos, etc.
        """
        if not isinstance(texto, str):
            return str(texto)

        try:
            texto = unicodedata.normalize("NFKD", texto)
            texto = texto.encode("ascii", "ignore").decode("ascii")
        except:
            texto = "".join(
                char
                for char in texto
                if unicodedata.category(char)[0] != "C" or char in "\n\t\r"
            )

        texto = re.sub(r"\n\n+", "\n", texto)
        texto = re.sub(r" +", " ", texto)
        texto = texto.strip()

        return texto

    def llamar_openai(
        self, mensajes: List[Dict], max_tokens: int = 300, temperature: float = 0.7
    ) -> str:
        """Llamar a la API de OpenAI"""
        try:
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=mensajes,
                max_tokens=max_tokens,
                temperature=temperature,
                timeout=15,
            )
            return self.sanitizar_texto(response.choices[0].message.content.strip())
        except Exception as e:
            logger.error(f"Error llamando a OpenAI: {e}")
            raise

    @staticmethod
    def extraer_precios_regex(mensaje: str) -> Dict:
        """Extrae precios del mensaje usando regex"""
        patrones_precio = [
            r"\$[\d.,]+",
            r"[\d.,]+\s*(?:pesos|dólares|dolares|bs|soles|pesos)",
            r"(?:desde|entre|aprox|aproximadamente|costo|precio)\s*[\$]?[\d.,]+",
        ]

        precios = []
        for patron in patrones_precio:
            matches = re.findall(patron, mensaje, re.IGNORECASE)
            if matches:
                for match in matches:
                    numeros = re.findall(r"[\d.,]+", match)
                    if numeros:
                        precios.extend(numeros)

        return {
            "tienePrecio": len(precios) > 0,
            "precios": list(set(precios)),
            "metodo": "regex",
        }

    @staticmethod
    def extraer_productos_regex(mensaje: str) -> List[str]:
        """Extrae nombres de productos del mensaje"""
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

    def generar_respuesta_empresa(
        self,
        mensaje: str,
        numero_proveedor: str = "desconocido",
        tiene_precio: bool = False,
    ) -> Dict:
        """Genera una respuesta profesional para negociar con proveedores"""
        try:
            logger.info(f"Generando respuesta para proveedor {numero_proveedor}")

            # Obtener historial
            historial = self.obtener_historial_conversacion(numero_proveedor)

            # Evaluar si es necesario responder con IA
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

            mensaje_lower = mensaje.lower()
            necesita_respuesta = True

            for patron in patrones_sin_respuesta:
                if re.search(patron, mensaje_lower):
                    necesita_respuesta = False
                    logger.info(
                        f"Patrón detectado: '{patron}' - NO es necesario responder"
                    )
                    break

            if not necesita_respuesta:
                return {"exito": True, "respuesta": "", "necesita_respuesta": False}

            # Usar IA para decidir si necesita respuesta
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
                {"role": "user", "content": mensaje},
            ]

            evaluacion = self.llamar_openai(
                mensajes_evaluacion, max_tokens=5, temperature=0
            )
            evaluacion_lower = evaluacion.lower().strip()

            if "no" in evaluacion_lower:
                logger.info(f"IA evaluó: NO requiere respuesta - '{mensaje}'")
                return {"exito": True, "respuesta": "", "necesita_respuesta": False}

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
            mensajes_ia.append({"role": "user", "content": mensaje})

            # Si ya tenemos precios, indicar que debe cerrar
            if tiene_precio:
                mensajes_ia.append(
                    {
                        "role": "system",
                        "content": "Ya obtuviste información de precios. Agradece de forma profesional y menciona que evaluarás la propuesta y te pondrás en contacto pronto.",
                    }
                )

            # Llamar a OpenAI
            respuesta = self.llamar_openai(mensajes_ia, max_tokens=200, temperature=0.7)

            # Agregar respuesta al historial
            self.agregar_al_historial(numero_proveedor, respuesta, "bot")
            self.agregar_al_historial(numero_proveedor, mensaje, "usuario")

            logger.info(f"✅ Respuesta generada para proveedor {numero_proveedor}")

            return {"respuesta": respuesta, "exito": True, "necesita_respuesta": True}

        except Exception as e:
            logger.error(f"Error en generar_respuesta_empresa: {e}")
            return {"error": str(e), "exito": False}

    def extraer_precios(
        self, mensaje: str, numero_proveedor: str = "desconocido"
    ) -> Dict:
        """Extrae información de precios de un mensaje"""
        try:
            logger.info(f"Extrayendo precios del mensaje de {numero_proveedor}")

            # Primero intentar con regex
            resultado_regex = self.extraer_precios_regex(mensaje)

            if resultado_regex["tienePrecio"] and resultado_regex["precios"]:
                logger.info(
                    f"✅ Precios detectados por regex: {resultado_regex['precios']}"
                )
                return {
                    "tienePrecio": True,
                    "precios": resultado_regex["precios"],
                    "productos": self.extraer_productos_regex(mensaje),
                    "metodo": "regex",
                    "exito": True,
                }

            # Si no encuentra precios y tenemos API key, usar IA
            if not self.api_key:
                logger.warning("API Key no configurada, retornando resultado de regex")
                return {
                    "tienePrecio": False,
                    "precios": [],
                    "productos": self.extraer_productos_regex(mensaje),
                    "metodo": "regex",
                    "exito": True,
                }

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

            respuesta_ia = self.llamar_openai(
                mensajes_ia, max_tokens=300, temperature=0.3
            )
            logger.info(f"Respuesta IA: {respuesta_ia}")

            # Parsear JSON de la respuesta
            json_match = re.search(r"\{.*\}", respuesta_ia, re.DOTALL)
            if not json_match:
                logger.warning("No se pudo parsear respuesta de IA")
                return {
                    "tienePrecio": False,
                    "precios": [],
                    "productos": self.extraer_productos_regex(mensaje),
                    "metodo": "regex",
                    "exito": True,
                }

            analisis_ia = json.loads(json_match.group())

            if analisis_ia.get("tienePrecio") and analisis_ia.get("precios"):
                logger.info(f"✅ Precios detectados por IA: {analisis_ia['precios']}")
                return {
                    "tienePrecio": True,
                    "precios": analisis_ia.get("precios", []),
                    "productos": analisis_ia.get("productos", []),
                    "metodo": "ia",
                    "exito": True,
                }

            return {
                "tienePrecio": False,
                "precios": [],
                "productos": analisis_ia.get("productos", []),
                "metodo": "ia",
                "exito": True,
            }

        except Exception as e:
            logger.error(f"Error en extraer_precios: {e}")
            return {"error": str(e), "exito": False}

    def obtener_respuesta(
        self, mensaje: str, numero_usuario: str = "desconocido"
    ) -> Dict:
        """Obtiene una respuesta de IA general para usuario"""
        try:
            logger.info(f"Generando respuesta general para usuario {numero_usuario}")

            mensajes_ia = [
                {
                    "role": "system",
                    "content": f"""Eres un asistente virtual de atención al cliente llamado {os.getenv('BOT_NAME', 'Bot de Soporte')}. 
Responde de manera amable, profesional y concisa. 
Si no sabes algo, indica que transferirás la consulta a un humano.""",
                },
                {"role": "user", "content": mensaje},
            ]

            respuesta = self.llamar_openai(mensajes_ia, max_tokens=300, temperature=0.7)

            logger.info(f"✅ Respuesta generada para usuario {numero_usuario}")

            return {"respuesta": respuesta, "exito": True}

        except Exception as e:
            logger.error(f"Error en obtener_respuesta: {e}")
            return {"error": str(e), "exito": False}


# Instancia global del cliente
gpt_client = GPTClient()
