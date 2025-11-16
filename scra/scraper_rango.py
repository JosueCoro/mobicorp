import requests
from bs4 import BeautifulSoup
import json
import time
from datetime import datetime

# Configuración del rango
PRECIO_MIN = 100
PRECIO_MAX = 200
DELAY = 0.3  # segundos entre requests

url_base = "https://www.livingroom.com.bo/product-category/sillas-de-oficina/"
categoria_nombre = "Sillas de Oficina"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9",
}

# Diccionario para almacenar productos únicos (usando el link como clave)
productos_unicos = {}
productos_lista = []

print("="*75)
print(f"🚀 SCRAPER DE PRECIOS - LIVINGROOM BOLIVIA")
print("="*75)
print(f"📂 Categoría: {categoria_nombre}")
print(f"💰 Rango de precios: Bs {PRECIO_MIN} - Bs {PRECIO_MAX}")
print(f"⏱️  Delay entre requests: {DELAY}s")
print(f"📊 Total de consultas: {PRECIO_MAX - PRECIO_MIN + 1}")
print("="*75)
print()

inicio = time.time()
total_productos_encontrados = 0

# BUCLE PRINCIPAL - Recorrer todos los precios
for precio in range(PRECIO_MIN, PRECIO_MAX + 1):
    url = f"{url_base}?min_price={precio}&max_price={precio}"
    
    # Mostrar progreso
    progreso = ((precio - PRECIO_MIN + 1) / (PRECIO_MAX - PRECIO_MIN + 1)) * 100
    print(f"[{progreso:5.1f}%] Buscando precio Bs {precio}...", end=" ", flush=True)
    
    try:
        response = requests.get(url, headers=headers, timeout=30, allow_redirects=True)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            
            # Buscar productos (primero div.product, luego li.product)
            productos = soup.find_all("div", class_="product")
            if not productos:
                productos = soup.find_all("li", class_="product")
            
            if productos:
                print(f"✅ {len(productos)} producto(s) encontrado(s)")
                
                for prod in productos:
                    # Extraer nombre
                    nombre = prod.find("p", class_="woocommerce-loop-product__title")
                    if nombre:
                        nombre_a = nombre.find("a")
                        nombre_texto = nombre_a.text.strip() if nombre_a else nombre.text.strip()
                    else:
                        nombre_h2 = prod.find("h2", class_="woocommerce-loop-product__title")
                        nombre_texto = nombre_h2.text.strip() if nombre_h2 else "Sin nombre"
                    
                    # Extraer link
                    link_tag = prod.find("a", href=True)
                    link = link_tag["href"] if link_tag else None
                    
                    # Extraer imagen
                    img = prod.find("img")
                    imagen = img.get("src") or img.get("data-src") if img else None
                    
                    if link and nombre_texto != "Sin nombre":
                        # Crear objeto producto
                        producto = {
                            "nombre": nombre_texto,
                            "precio": precio,  # ⭐ PRECIO EXACTO DEL FILTRO
                            "link": link,
                            "imagen": imagen,
                            "categoria": categoria_nombre,
                            "fuente": "LivingRoom Bolivia"
                        }
                        
                        # Guardar solo si es único (evitar duplicados por link)
                        if link not in productos_unicos:
                            productos_unicos[link] = producto
                            productos_lista.append(producto)
                            total_productos_encontrados += 1
                            print(f"   📦 {nombre_texto[:55]}")
            else:
                print("⚪ Sin productos")
        else:
            print(f"❌ Error {response.status_code}")
    
    except Exception as e:
        print(f"❌ Error: {str(e)[:40]}")
    
    # Delay para no saturar el servidor
    time.sleep(DELAY)

# Calcular tiempo total
duracion = time.time() - inicio

print()
print("="*75)
print("✅ SCRAPING COMPLETADO")
print("="*75)
print(f"⏱️  Tiempo total: {duracion:.1f} segundos ({duracion/60:.1f} minutos)")
print(f"📦 Productos únicos encontrados: {len(productos_unicos)}")
print(f"📊 Consultas realizadas: {PRECIO_MAX - PRECIO_MIN + 1}")
print("="*75)

# Guardar resultados en JSON
if productos_lista:
    # Ordenar por precio
    productos_ordenados = sorted(productos_lista, key=lambda x: x["precio"])
    
    # Calcular estadísticas
    precios = [p["precio"] for p in productos_ordenados]
    precios_unicos = sorted(set(precios))
    
    datos = {
        "metadata": {
            "fecha_scraping": datetime.now().isoformat(),
            "fuente": "LivingRoom Bolivia",
            "categoria": categoria_nombre,
            "rango_buscado": {
                "min": PRECIO_MIN,
                "max": PRECIO_MAX
            },
            "duracion_segundos": round(duracion, 2),
            "total_consultas": PRECIO_MAX - PRECIO_MIN + 1
        },
        "estadisticas": {
            "total_productos": len(productos_ordenados),
            "precios_diferentes": len(precios_unicos),
            "precio_minimo": min(precios),
            "precio_maximo": max(precios),
            "precio_promedio": round(sum(precios) / len(precios), 2),
            "lista_precios": precios_unicos
        },
        "productos": productos_ordenados
    }
    
    # Guardar JSON
    archivo_json = f"productos_{PRECIO_MIN}_{PRECIO_MAX}.json"
    with open(archivo_json, "w", encoding="utf-8") as f:
        json.dump(datos, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Datos guardados en: {archivo_json}")
    
    # Guardar también en CSV
    archivo_csv = f"productos_{PRECIO_MIN}_{PRECIO_MAX}.csv"
    with open(archivo_csv, "w", encoding="utf-8") as f:
        f.write("Precio,Nombre,Link,Categoria\n")
        for p in productos_ordenados:
            f.write(f'{p["precio"]},"{p["nombre"]}",{p["link"]},{p["categoria"]}\n')
    
    print(f"📊 CSV guardado en: {archivo_csv}")
    
    # Mostrar resumen de productos
    print()
    print("="*75)
    print("📋 RESUMEN DE PRODUCTOS ENCONTRADOS")
    print("="*75)
    print(f"{'PRECIO':<10} {'NOMBRE':<63}")
    print("-"*75)
    for p in productos_ordenados:
        nombre = p['nombre'][:60] + "..." if len(p['nombre']) > 60 else p['nombre']
        print(f"Bs {p['precio']:<7} {nombre}")
    print("="*75)
    
    # Mostrar distribución de precios
    print()
    print("📊 DISTRIBUCIÓN DE PRECIOS:")
    print("-"*50)
    for precio_val in precios_unicos:
        cantidad = sum(1 for p in productos_ordenados if p["precio"] == precio_val)
        barra = "█" * cantidad
        print(f"Bs {precio_val:3d}: {barra} ({cantidad})")
    print("-"*50)
    
else:
    print("\n⚠️  No se encontraron productos en este rango de precios")

print("\n✅ Proceso finalizado exitosamente!")
