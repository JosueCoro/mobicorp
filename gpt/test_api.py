#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de pruebas para validar el servidor Python
Ejecutar: python test_api.py
"""

import requests
import json
import time

# Configuración
BASE_URL = "http://localhost:5000"
TIMEOUT = 10


# Colores para terminal
class Colors:
    BLUE = "\033[94m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    RESET = "\033[0m"
    BOLD = "\033[1m"


def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*50}")
    print(f"{text}")
    print(f"{'='*50}{Colors.RESET}\n")


def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.RESET}")


def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.RESET}")


def print_info(text):
    print(f"{Colors.YELLOW}ℹ️  {text}{Colors.RESET}")


def test_health_check():
    """Prueba 1: Verificar que el servidor está activo"""
    print_header("Test 1: Health Check")

    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=TIMEOUT)

        if response.status_code == 200:
            data = response.json()
            print_success(f"Servidor activo: {data['message']}")
            print_success(f"Modelo: {data['model']}")
            return True
        else:
            print_error(f"Status code: {response.status_code}")
            return False

    except requests.exceptions.ConnectionError:
        print_error(f"No se pudo conectar a {BASE_URL}")
        print_info("Asegúrate que app.py está corriendo")
        return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_extraer_precios():
    """Prueba 2: Extrae precios de un mensaje"""
    print_header("Test 2: Extraer Precios")

    test_cases = [
        {
            "mensaje": "Tenemos sillas a $150 cada una y escritorios desde $300",
            "esperado": True,
            "nombre": "Precios en dólares",
        },
        {
            "mensaje": "El costo es 500 pesos por unidad",
            "esperado": True,
            "nombre": "Precios en pesos",
        },
        {
            "mensaje": "No tenemos precio disponible en este momento",
            "esperado": False,
            "nombre": "Sin precios",
        },
        {
            "mensaje": "Aprox 2000 por silla y 5000 por escritorio",
            "esperado": True,
            "nombre": "Precios aproximados",
        },
    ]

    resultados = []

    for test in test_cases:
        try:
            response = requests.post(
                f"{BASE_URL}/api/extraer-precios",
                json={"mensaje": test["mensaje"], "numero_proveedor": "591XXXXXXXXXX"},
                timeout=TIMEOUT,
            )

            if response.status_code == 200:
                data = response.json()

                # Verificar si el resultado es correcto
                if data["tienePrecio"] == test["esperado"]:
                    print_success(f"{test['nombre']}: Detectado correctamente")
                    if data["precios"]:
                        print_info(f"  Precios: {data['precios']}")
                    if data["productos"]:
                        print_info(f"  Productos: {data['productos']}")
                    resultados.append(True)
                else:
                    print_error(f"{test['nombre']}: Resultado incorrecto")
                    print_info(
                        f"  Esperado: {test['esperado']}, Obtenido: {data['tienePrecio']}"
                    )
                    resultados.append(False)
            else:
                print_error(f"{test['nombre']}: Error HTTP {response.status_code}")
                resultados.append(False)

        except Exception as e:
            print_error(f"{test['nombre']}: {e}")
            resultados.append(False)

    return all(resultados)


def test_generar_respuesta():
    """Prueba 3: Generar respuesta para proveedor"""
    print_header("Test 3: Generar Respuesta para Proveedor")

    test_cases = [
        {
            "mensaje": "Tenemos sillas ejecutivas en stock",
            "tiene_precio": False,
            "nombre": "Sin precio",
        },
        {
            "mensaje": "Los escritorios son de madera sólida a $800 cada uno",
            "tiene_precio": True,
            "nombre": "Con precio",
        },
    ]

    resultados = []

    for test in test_cases:
        try:
            print_info(f"Probando: {test['nombre']}")
            print_info(f"Mensaje: {test['mensaje'][:50]}...")

            response = requests.post(
                f"{BASE_URL}/api/generar-respuesta-empresa",
                json={
                    "mensaje": test["mensaje"],
                    "numero_proveedor": "591XXXXXXXXXX",
                    "tiene_precio": test["tiene_precio"],
                },
                timeout=15,  # Más tiempo para IA
            )

            if response.status_code == 200:
                data = response.json()

                if data["exito"] and data["respuesta"]:
                    print_success(f"{test['nombre']}: Respuesta generada")
                    print_info(f"Respuesta: {data['respuesta'][:80]}...")
                    resultados.append(True)
                else:
                    print_error(f"{test['nombre']}: Respuesta vacía")
                    resultados.append(False)
            else:
                print_error(f"{test['nombre']}: Error HTTP {response.status_code}")
                resultados.append(False)

        except requests.exceptions.Timeout:
            print_error(f"{test['nombre']}: Timeout (verificar OpenAI API Key)")
            resultados.append(False)
        except Exception as e:
            print_error(f"{test['nombre']}: {e}")
            resultados.append(False)

        time.sleep(1)  # Pequeño delay entre llamadas

    return all(resultados)


def test_obtener_respuesta():
    """Prueba 4: Obtener respuesta general"""
    print_header("Test 4: Obtener Respuesta General")

    mensajes = [
        "¿Cuál es tu nombre?",
        "¿Tienes disponibilidad hoy?",
        "Gracias por tu ayuda",
    ]

    resultados = []

    for msg in mensajes:
        try:
            print_info(f"Mensaje: {msg}")

            response = requests.post(
                f"{BASE_URL}/api/obtener-respuesta",
                json={"mensaje": msg, "numero_usuario": "591XXXXXXXXXX"},
                timeout=15,
            )

            if response.status_code == 200:
                data = response.json()

                if data["exito"] and data["respuesta"]:
                    print_success(f"Respuesta recibida")
                    print_info(f"Respuesta: {data['respuesta'][:80]}...")
                    resultados.append(True)
                else:
                    print_error("Respuesta vacía")
                    resultados.append(False)
            else:
                print_error(f"Error HTTP {response.status_code}")
                resultados.append(False)

        except requests.exceptions.Timeout:
            print_error("Timeout (verificar OpenAI API Key)")
            resultados.append(False)
        except Exception as e:
            print_error(f"Error: {e}")
            resultados.append(False)

        time.sleep(1)

    return all(resultados)


def test_limpiar_historial():
    """Prueba 5: Limpiar historial"""
    print_header("Test 5: Limpiar Historial")

    try:
        response = requests.post(
            f"{BASE_URL}/api/limpiar-historial",
            json={"numero": "591XXXXXXXXXX"},
            timeout=TIMEOUT,
        )

        if response.status_code == 200:
            data = response.json()
            if data["exito"]:
                print_success(f"Historial limpiado: {data['mensaje']}")
                return True
            else:
                print_error("No se pudo limpiar")
                return False
        else:
            print_error(f"Error HTTP {response.status_code}")
            return False

    except Exception as e:
        print_error(f"Error: {e}")
        return False


def main():
    """Ejecutar todas las pruebas"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("╔══════════════════════════════════════════════╗")
    print("║   PRUEBAS DEL SERVIDOR PYTHON (app.py)      ║")
    print("╚══════════════════════════════════════════════╝")
    print(f"{Colors.RESET}")

    print_info(f"URL del servidor: {BASE_URL}")
    print_info("Asegúrate que app.py está corriendo")
    print_info("Asegúrate que OPENAI_API_KEY está configurada\n")

    # Ejecutar pruebas
    resultados = {}

    resultados["Health Check"] = test_health_check()
    if not resultados["Health Check"]:
        print_error("No se puede continuar sin servidor")
        return

    resultados["Extraer Precios"] = test_extraer_precios()
    resultados["Generar Respuesta"] = test_generar_respuesta()
    resultados["Obtener Respuesta"] = test_obtener_respuesta()
    resultados["Limpiar Historial"] = test_limpiar_historial()

    # Resumen final
    print_header("RESUMEN")

    total_tests = len(resultados)
    passed = sum(1 for v in resultados.values() if v)

    for nombre, resultado in resultados.items():
        simbolo = "✅" if resultado else "❌"
        print(f"{simbolo} {nombre}")

    print()
    if passed == total_tests:
        print_success(f"¡Todas las pruebas pasaron! ({passed}/{total_tests})")
    else:
        print_error(f"Algunas pruebas fallaron ({passed}/{total_tests})")

    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Pruebas canceladas por el usuario{Colors.RESET}\n")
