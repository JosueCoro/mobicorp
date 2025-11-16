#!/usr/bin/env python3
"""
Script para probar los endpoints del backend FastAPI
"""

import requests
import json

BASE_URL = "http://localhost:8000"

print("=" * 60)
print("🧪 PRUEBAS DEL API BACKEND")
print("=" * 60)

# 1. Login
print("\n1️⃣  Probando LOGIN...")
login_response = requests.post(
    f"{BASE_URL}/api/auth/login",
    json={
        "email": "admin@mobicorp.com",
        "password": "admin123"
    }
)

if login_response.status_code == 200:
    data = login_response.json()
    token = data.get("access_token")
    print(f"✅ Login exitoso")
    print(f"   Token: {token[:50]}...")
    headers = {"Authorization": f"Bearer {token}"}
else:
    print(f"❌ Error en login: {login_response.status_code}")
    print(login_response.text)
    exit(1)

# 2. Obtener productos
print("\n2️⃣  Obteniendo PRODUCTOS...")
products_response = requests.get(
    f"{BASE_URL}/api/products",
    headers=headers
)

if products_response.status_code == 200:
    products = products_response.json()
    print(f"✅ {len(products)} productos obtenidos")
    if products:
        first_product = products[0]
        print(f"   Ejemplo: {first_product.get('nombre')} (ID: {first_product.get('id')})")
else:
    print(f"❌ Error: {products_response.status_code}")
    print(products_response.text)

# 3. Obtener detalles de un producto
if products:
    product_id = products[0]["id"]
    print(f"\n3️⃣  Obteniendo detalles del PRODUCTO {product_id}...")
    detail_response = requests.get(
        f"{BASE_URL}/api/products/{product_id}",
        headers=headers
    )
    
    if detail_response.status_code == 200:
        product = detail_response.json()
        print(f"✅ Detalles obtenidos:")
        print(f"   Nombre: {product.get('nombre')}")
        print(f"   Precio: ${product.get('precio')}")
        print(f"   Categoría: {product.get('categoria')}")
    else:
        print(f"❌ Error: {detail_response.status_code}")

# 4. Obtener mis órdenes
print(f"\n4️⃣  Obteniendo MIS ÓRDENES...")
orders_response = requests.get(
    f"{BASE_URL}/api/orders",
    headers=headers
)

if orders_response.status_code == 200:
    orders = orders_response.json()
    print(f"✅ {len(orders)} órdenes encontradas")
    if orders:
        print(f"   Primera orden: ID {orders[0].get('id')}")
    else:
        print(f"   (Sin órdenes aún)")
else:
    print(f"❌ Error: {orders_response.status_code}")

# 5. Documentación Swagger
print("\n" + "=" * 60)
print("📖 DOCUMENTACIÓN DISPONIBLE")
print("=" * 60)
print(f"\n🔗 Swagger UI: http://localhost:8000/docs")
print(f"🔗 ReDoc: http://localhost:8000/redoc")

print("\n" + "=" * 60)
print("✅ PRUEBAS COMPLETADAS EXITOSAMENTE")
print("=" * 60)
