"""
Servicio de WhatsApp Bot
Maneja la conexión, estado y operaciones del bot de WhatsApp
"""

import asyncio
import base64
from typing import Optional, Dict, List
from datetime import datetime
import json
import os
import subprocess
import signal
from pathlib import Path
from whatsapp_bridge import WhatsAppBridge


class WhatsAppBotService:
    """Servicio para gestionar el bot de WhatsApp"""

    def __init__(self):
        self.estado = "desconectado"  # desconectado, iniciando, escaneando, conectado
        self.qr_code = None
        self.qr_image = None  # Imagen del QR en base64
        self.ultima_actualizacion = None
        self.info_sesion = None
        self.cotizaciones = []
        self.bridge = None
        self.bot_path = None
        self._inicializar_ruta_bot()

    def _inicializar_ruta_bot(self):
        """Encuentra la ruta del bot de WhatsApp"""
        # Obtener directorio actual del backend
        backend_dir = Path(__file__).parent
        # Subir un nivel y buscar whatsapp-bot
        proyecto_dir = backend_dir.parent
        self.bot_path = proyecto_dir / "whatsapp-bot"

        if not self.bot_path.exists():
            print(
                f"⚠️ Advertencia: No se encontró el directorio del bot en {self.bot_path}"
            )
        else:
            # Inicializar bridge
            self.bridge = WhatsAppBridge(self.bot_path)
            self.bridge.on_qr_callback = self._on_qr_recibido
            self.bridge.on_estado_callback = self._on_estado_cambiado

    def _on_qr_recibido(self, qr_code: str):
        """Callback cuando se recibe un QR"""
        print(f"📱 QR recibido: {qr_code[:50]}...")
        self.set_qr_code(qr_code)

    def _on_estado_cambiado(self, nuevo_estado: str):
        """Callback cuando cambia el estado"""
        print(f"🔄 Estado cambiado a: {nuevo_estado}")
        if nuevo_estado == "conectado":
            self.set_conectado({})
        elif nuevo_estado == "escaneando":
            self.estado = "escaneando"
            self.ultima_actualizacion = datetime.now().isoformat()
        elif nuevo_estado == "desconectado":
            self.set_desconectado()

    async def iniciar_bot(self) -> Dict:
        """Inicia el proceso del bot de WhatsApp"""
        try:
            if not self.bridge:
                return {"exito": False, "mensaje": "Bridge de WhatsApp no inicializado"}

            if self.bridge.esta_corriendo():
                return {
                    "exito": False,
                    "mensaje": "El bot ya está en ejecución",
                    "estado": self.estado,
                }

            # Iniciar bridge
            if self.bridge.iniciar():
                self.estado = "iniciando"
                self.ultima_actualizacion = datetime.now().isoformat()

                return {
                    "exito": True,
                    "mensaje": "Bot de WhatsApp iniciado correctamente. Esperando código QR...",
                    "estado": self.estado,
                }
            else:
                return {
                    "exito": False,
                    "mensaje": "No se pudo iniciar el bot de WhatsApp",
                }

        except Exception as e:
            return {"exito": False, "mensaje": f"Error al iniciar el bot: {str(e)}"}

    async def detener_bot(self) -> Dict:
        """Detiene el proceso del bot de WhatsApp"""
        try:
            if not self.bridge:
                return {"exito": False, "mensaje": "Bridge de WhatsApp no inicializado"}

            self.bridge.detener()
            self.set_desconectado()

            return {"exito": True, "mensaje": "Bot de WhatsApp detenido correctamente"}

        except Exception as e:
            return {"exito": False, "mensaje": f"Error al detener el bot: {str(e)}"}

    def verificar_bot_corriendo(self) -> bool:
        """Verifica si el proceso del bot está corriendo"""
        if not self.bridge:
            return False
        return self.bridge.esta_corriendo()

    def get_estado(self) -> Dict:
        """Obtiene el estado actual del bot"""
        # Actualizar estado si el proceso murió
        if self.estado != "desconectado" and not self.verificar_bot_corriendo():
            self.set_desconectado()

        return {
            "estado": self.estado,
            "qr_disponible": self.qr_code is not None,
            "ultima_actualizacion": self.ultima_actualizacion,
            "info_sesion": self.info_sesion,
            "total_cotizaciones": len(self.cotizaciones),
            "proceso_corriendo": self.verificar_bot_corriendo(),
        }

    def set_qr_code(self, qr_data: str):
        """Establece el código QR"""
        self.qr_code = qr_data
        self.estado = "escaneando"
        self.ultima_actualizacion = datetime.now().isoformat()

    def set_conectado(self, info_sesion: Dict):
        """Marca el bot como conectado"""
        self.estado = "conectado"
        self.info_sesion = info_sesion
        self.qr_code = None
        self.qr_image = None
        self.ultima_actualizacion = datetime.now().isoformat()

    def set_desconectado(self):
        """Marca el bot como desconectado"""
        self.estado = "desconectado"
        self.info_sesion = None
        self.qr_code = None
        self.qr_image = None
        self.ultima_actualizacion = datetime.now().isoformat()

    def agregar_cotizacion(self, cotizacion: Dict):
        """Agrega una nueva cotización"""
        self.cotizaciones.append(cotizacion)

    def get_cotizaciones(self, limit: int = 100) -> List[Dict]:
        """Obtiene las cotizaciones"""
        return self.cotizaciones[-limit:]

    def limpiar_cotizaciones(self):
        """Limpia todas las cotizaciones"""
        self.cotizaciones = []


# Instancia global del servicio
whatsapp_service = WhatsAppBotService()
