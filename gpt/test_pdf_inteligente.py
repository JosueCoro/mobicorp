#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para testear el nuevo endpoint /api/procesar-pdf mejorado
"""

import requests
import json
import sys

BASE_URL = "http://localhost:5000"


def test_procesar_pdf():
    """Prueba el endpoint de procesamiento de PDF con análisis inteligente"""

    print("=" * 60)
    print("TEST: Endpoint /api/procesar-pdf (Versión Inteligente)")
    print("=" * 60)

    # Este test necesita un archivo PDF real
    pdf_path = r"c:\Users\LEAVIN CORO\Documents\mobicorp2\pdf\CATALOGO DE SILLAS GIRATORIAS..pdf"

    try:
        with open(pdf_path, "rb") as pdf_file:
            files = {"pdf_file": pdf_file}

            print("\n📤 Enviando PDF al servidor...")
            print(f"   Archivo: {pdf_path}")

            response = requests.post(
                f"{BASE_URL}/api/procesar-pdf", files=files, timeout=30
            )

            print(f"\n✅ Respuesta recibida (Status: {response.status_code})")

            if response.status_code == 200:
                data = response.json()

                print("\n" + "=" * 60)
                print("RESULTADO DEL ANÁLISIS")
                print("=" * 60)

                if data.get("exito"):
                    print(f"✅ Éxito: {data.get('mensaje')}")
                    print(f"📄 Archivo: {data.get('archivo')}")
                    print(f"📖 Página seleccionada: {data.get('pagina')}")
                    print(f"🏷️  Categoría: {data.get('categoria', 'N/A')}")
                    print(f"💡 Razón: {data.get('razon', 'N/A')}")

                    # Verificar que hay imagen
                    if data.get("imagen_base64"):
                        img_size = len(data.get("imagen_base64", "")) / 1024
                        print(f"🖼️  Imagen: {img_size:.1f} KB (base64)")
                    else:
                        print("⚠️  No hay imagen en respuesta")

                    print("\n✅ TEST EXITOSO")
                    return True
                else:
                    print(f"❌ Error: {data.get('error')}")
                    print("\n❌ TEST FALLIDO")
                    return False
            else:
                print(f"❌ Error HTTP {response.status_code}")
                print(response.text)
                print("\n❌ TEST FALLIDO")
                return False

    except FileNotFoundError:
        print(f"❌ Archivo PDF no encontrado: {pdf_path}")
        print("   Por favor, asegúrate que existe un PDF en esa ubicación")
        print("\n❌ TEST FALLIDO (Archivo no encontrado)")
        return False
    except requests.exceptions.ConnectionError:
        print(f"❌ No se pudo conectar a {BASE_URL}")
        print("   Asegúrate que el servidor Python está ejecutándose:")
        print("   python gpt/app.py")
        print("\n❌ TEST FALLIDO (Conexión)")
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        print("\n❌ TEST FALLIDO (Error)")
        return False


if __name__ == "__main__":
    success = test_procesar_pdf()
    sys.exit(0 if success else 1)
