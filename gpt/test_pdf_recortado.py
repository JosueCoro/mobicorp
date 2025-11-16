#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test del nuevo sistema: Procesamiento de PDF → Extrae página → Devuelve PDF
"""

import requests
import json
import sys
import base64

BASE_URL = "http://localhost:5000"


def test_procesar_pdf_nuevo():
    """Prueba el endpoint mejorado que devuelve PDF en lugar de imagen"""

    print("=" * 70)
    print("TEST: Nuevo Sistema - PDF Inteligente → PDF Recortado")
    print("=" * 70)

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

                print("\n" + "=" * 70)
                print("RESULTADO DEL ANÁLISIS")
                print("=" * 70)

                if data.get("exito"):
                    print(f"✅ Éxito: {data.get('mensaje')}")
                    print(f"\n📄 Información del PDF:")
                    print(f"   • Archivo original: {data.get('archivo_original')}")
                    print(f"   • Archivo generado: {data.get('archivo')}")
                    print(f"   • Página extraída: {data.get('pagina')}")

                    print(f"\n🏷️  Análisis de OpenAI:")
                    print(f"   • Categoría: {data.get('categoria', 'N/A')}")
                    print(f"   • Razón: {data.get('razon', 'N/A')}")

                    # Verificar que hay PDF
                    if data.get("pdf_base64"):
                        pdf_size = len(data.get("pdf_base64", "")) / 1024
                        print(f"\n📦 PDF Codificado:")
                        print(f"   • Tamaño: {pdf_size:.1f} KB (base64)")
                        print(f"   • Formato: application/pdf")

                        # Opcional: guardar el PDF recortado para verificar
                        try:
                            pdf_bytes = base64.b64decode(data.get("pdf_base64", ""))
                            output_path = r"c:\Users\LEAVIN CORO\Documents\mobicorp2\pdf\prueba_pdf_extraido.pdf"
                            with open(output_path, "wb") as f:
                                f.write(pdf_bytes)
                            print(f"\n💾 PDF de prueba guardado en: {output_path}")
                        except Exception as e:
                            print(f"\n⚠️  No se pudo guardar PDF: {e}")
                    else:
                        print("⚠️  No hay PDF en respuesta")

                    print("\n" + "=" * 70)
                    print("✅ TEST EXITOSO - Sistema funcionando correctamente")
                    print("=" * 70)
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
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_procesar_pdf_nuevo()
    sys.exit(0 if success else 1)
