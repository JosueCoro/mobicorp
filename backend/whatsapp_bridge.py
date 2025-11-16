"""
Bridge entre Python y el bot de WhatsApp Node.js
Captura el QR y estado en tiempo real
"""

import subprocess
import threading
import re
import time
from pathlib import Path
from typing import Optional, Callable
import json


class WhatsAppBridge:
    """Puente para comunicación con el bot de WhatsApp"""

    def __init__(self, bot_path: Path):
        self.bot_path = bot_path
        self.proceso = None
        self.qr_code = None
        self.estado = "desconectado"
        self.info_sesion = None
        self.thread_output = None
        self.on_qr_callback = None
        self.on_estado_callback = None

    def iniciar(self):
        """Inicia el proceso del bot de WhatsApp"""
        if self.proceso and self.proceso.poll() is None:
            return False

        try:
            # Iniciar proceso
            self.proceso = subprocess.Popen(
                ["npm", "start"],
                cwd=str(self.bot_path),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                shell=True,
                creationflags=(
                    subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
                ),
            )

            # Iniciar thread para capturar output
            self.thread_output = threading.Thread(
                target=self._capturar_output, daemon=True
            )
            self.thread_output.start()

            self.estado = "iniciando"
            return True

        except Exception as e:
            print(f"Error iniciando bot: {e}")
            return False

    def _capturar_output(self):
        """Captura la salida del bot para detectar QR y eventos"""
        qr_lines = []
        capturando_qr = False

        for line in iter(self.proceso.stdout.readline, ""):
            if not line:
                break

            line = line.strip()

            # Detectar inicio de QR
            if "📱 Escanea el código QR" in line or "Esperando escaneo" in line:
                capturando_qr = True
                qr_lines = []
                self.estado = "escaneando"
                if self.on_estado_callback:
                    self.on_estado_callback("escaneando")
                continue

            # Capturar líneas del QR
            if capturando_qr:
                if "====" in line:
                    if qr_lines:  # Ya capturamos el QR
                        # Convertir QR ASCII a string
                        qr_text = self._extraer_qr_de_ascii(qr_lines)
                        if qr_text:
                            self.qr_code = qr_text
                            if self.on_qr_callback:
                                self.on_qr_callback(qr_text)
                        capturando_qr = False
                        qr_lines = []
                elif line and not "⏳" in line:
                    qr_lines.append(line)

            # Detectar conexión exitosa
            if "✅ Bot de WhatsApp está listo" in line or "Cliente listo" in line:
                self.estado = "conectado"
                self.qr_code = None
                if self.on_estado_callback:
                    self.on_estado_callback("conectado")

            # Detectar autenticación
            if "✅ Autenticación exitosa" in line:
                self.estado = "autenticado"

            # Detectar desconexión
            if "⚠️ Cliente desconectado" in line or "disconnected" in line.lower():
                self.estado = "desconectado"
                if self.on_estado_callback:
                    self.on_estado_callback("desconectado")

            print(f"[BOT] {line}")

    def _extraer_qr_de_ascii(self, lines):
        """Extrae el código QR del ASCII art"""
        # El QR en terminal es código ASCII art, necesitamos la URL original
        # Por ahora, generamos un placeholder
        # TODO: Mejorar esto para capturar el QR real
        return f"QR_{int(time.time())}"

    def detener(self):
        """Detiene el proceso del bot"""
        if self.proceso:
            self.proceso.terminate()
            try:
                self.proceso.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.proceso.kill()
            self.proceso = None

        self.estado = "desconectado"
        self.qr_code = None

    def esta_corriendo(self):
        """Verifica si el proceso está corriendo"""
        return self.proceso is not None and self.proceso.poll() is None

    def get_estado(self):
        """Obtiene el estado actual"""
        return {
            "estado": self.estado,
            "qr_code": self.qr_code,
            "info_sesion": self.info_sesion,
            "proceso_corriendo": self.esta_corriendo(),
        }


import os
