#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test de endpoints de GPT/OpenAI
Prueba los endpoints de IA implementados en el backend
"""

import requests
import json
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configuración
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

# Credenciales de prueba (cambiar según tu configuración)
TEST_EMAIL = "admin@mobicorp.com"
TEST_PASSWORD = "admin123"


def obtener_token():
    """Obtiene un token de autenticación"""
    print("🔐 Obteniendo token de autenticación...")

    response = requests.post(
        f"{API_BASE}/auth/login",
        data={"username": TEST_EMAIL, "password": TEST_PASSWORD},
    )

    if response.status_code == 200:
        token = response.json()["access_token"]
        print("✅ Token obtenido correctamente")
        return token
    else:
        print(f"❌ Error al obtener token: {response.status_code}")
        print(response.text)
        return None


def test_health(token):
    """Prueba el endpoint de health check"""
    print("\n" + "=" * 60)
    print("TEST: Health Check")
    print("=" * 60)

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_BASE}/gpt/health", headers=headers)

    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

    return response.status_code == 200


def test_generar_respuesta_empresa(token):
    """Prueba el endpoint de generar respuesta empresa"""
    print("\n" + "=" * 60)
    print("TEST: Generar Respuesta Empresa")
    print("=" * 60)

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Caso 1: Mensaje que requiere respuesta
    print("\n📝 Caso 1: Mensaje que requiere respuesta")
    data = {
        "mensaje": "Tengo sillas ejecutivas de muy buena calidad para oficina",
        "numero_proveedor": "591XXXXX001",
        "tiene_precio": False,
    }

    response = requests.post(
        f"{API_BASE}/gpt/generar-respuesta-empresa", headers=headers, json=data
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

    # Caso 2: Mensaje que NO requiere respuesta
    print("\n📝 Caso 2: Mensaje que NO requiere respuesta")
    data = {
        "mensaje": "Ok, entendido. Un momento por favor",
        "numero_proveedor": "591XXXXX002",
        "tiene_precio": False,
    }

    response = requests.post(
        f"{API_BASE}/gpt/generar-respuesta-empresa", headers=headers, json=data
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

    # Caso 3: Mensaje con precios
    print("\n📝 Caso 3: Ya tenemos precios, debe cerrar negociación")
    data = {
        "mensaje": "Los precios son $150 la silla y $500 el escritorio",
        "numero_proveedor": "591XXXXX003",
        "tiene_precio": True,
    }

    response = requests.post(
        f"{API_BASE}/gpt/generar-respuesta-empresa", headers=headers, json=data
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")


def test_extraer_precios(token):
    """Prueba el endpoint de extraer precios"""
    print("\n" + "=" * 60)
    print("TEST: Extraer Precios")
    print("=" * 60)

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Caso 1: Mensaje con precios claros (regex)
    print("\n💰 Caso 1: Precios claros - debería usar regex")
    data = {
        "mensaje": "Tengo sillas ejecutivas desde $150 hasta $300, y escritorios en $500",
        "numero_proveedor": "591XXXXX004",
    }

    response = requests.post(
        f"{API_BASE}/gpt/extraer-precios", headers=headers, json=data
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

    # Caso 2: Mensaje sin precios
    print("\n💰 Caso 2: Sin precios")
    data = {
        "mensaje": "Tengo sillas ejecutivas de muy buena calidad",
        "numero_proveedor": "591XXXXX005",
    }

    response = requests.post(
        f"{API_BASE}/gpt/extraer-precios", headers=headers, json=data
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

    # Caso 3: Precios en texto (requiere IA)
    print("\n💰 Caso 3: Precios en texto - debería usar IA")
    data = {
        "mensaje": "Las sillas cuestan ciento cincuenta dólares y los escritorios quinientos",
        "numero_proveedor": "591XXXXX006",
    }

    response = requests.post(
        f"{API_BASE}/gpt/extraer-precios", headers=headers, json=data
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")


def test_obtener_respuesta(token):
    """Prueba el endpoint de obtener respuesta general"""
    print("\n" + "=" * 60)
    print("TEST: Obtener Respuesta General")
    print("=" * 60)

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    data = {
        "mensaje": "¿Tienen muebles de oficina disponibles?",
        "numero_usuario": "591XXXXX007",
    }

    response = requests.post(
        f"{API_BASE}/gpt/obtener-respuesta", headers=headers, json=data
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")


def test_limpiar_historial(token):
    """Prueba el endpoint de limpiar historial"""
    print("\n" + "=" * 60)
    print("TEST: Limpiar Historial")
    print("=" * 60)

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    data = {"numero": "591XXXXX001"}

    response = requests.post(
        f"{API_BASE}/gpt/limpiar-historial", headers=headers, json=data
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")


def test_procesar_pdf(token):
    """Prueba el endpoint de procesar PDF"""
    print("\n" + "=" * 60)
    print("TEST: Procesar PDF")
    print("=" * 60)

    headers = {"Authorization": f"Bearer {token}"}

    # Verificar si existe un PDF de prueba
    pdf_test_path = "test_catalogo.pdf"

    if not os.path.exists(pdf_test_path):
        print("⚠️ No se encontró archivo de prueba 'test_catalogo.pdf'")
        print(
            "Crea un PDF de prueba con contenido de muebles para probar este endpoint"
        )
        return

    with open(pdf_test_path, "rb") as pdf_file:
        files = {"pdf_file": (pdf_test_path, pdf_file, "application/pdf")}

        response = requests.post(
            f"{API_BASE}/gpt/procesar-pdf", headers=headers, files=files
        )

    print(f"Status Code: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print(f"Exito: {result.get('exito')}")
        print(f"Mensaje: {result.get('mensaje')}")
        print(f"Archivo: {result.get('archivo')}")
        print(f"Archivo Original: {result.get('archivo_original')}")
        print(f"Página: {result.get('pagina')}")
        print(f"Categoría: {result.get('categoria')}")
        print(f"Razón: {result.get('razon')}")
        print(f"Tiene Imagen: {result.get('imagen_base64') is not None}")

        if result.get("imagen_base64"):
            print(f"Longitud Imagen Base64: {len(result['imagen_base64'])} caracteres")
    else:
        print(f"Error: {response.text}")


def main():
    """Ejecuta todos los tests"""
    print("=" * 60)
    print("PRUEBA DE ENDPOINTS DE GPT/OPENAI")
    print("=" * 60)
    print(f"URL Base: {BASE_URL}")
    print(f"Email de prueba: {TEST_EMAIL}")

    # Obtener token
    token = obtener_token()

    if not token:
        print("\n❌ No se pudo obtener el token. Verifica las credenciales.")
        return

    # Ejecutar tests
    try:
        # Test 1: Health Check
        if test_health(token):
            print("✅ Health Check PASSED")
        else:
            print("❌ Health Check FAILED")

        # Test 2: Generar Respuesta Empresa
        test_generar_respuesta_empresa(token)

        # Test 3: Extraer Precios
        test_extraer_precios(token)

        # Test 4: Obtener Respuesta General
        test_obtener_respuesta(token)

        # Test 5: Limpiar Historial
        test_limpiar_historial(token)

        # Test 6: Procesar PDF (opcional)
        test_procesar_pdf(token)

        print("\n" + "=" * 60)
        print("TESTS COMPLETADOS")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error durante los tests: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
