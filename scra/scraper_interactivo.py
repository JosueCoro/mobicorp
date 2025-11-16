import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import time
import sys

class ScraperPreciosRapido:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "es-ES,es;q=0.9",
        }
        self.productos_unicos = {}  # {link: producto_info}
        
    def extraer_productos(self, soup, precio, categoria_nombre):
        """Extrae productos de la página"""
        productos = soup.find_all("li", class_="product")
        if not productos:
            productos = soup.find_all("div", class_="product")
        
        resultados = []
        for prod in productos:
            # Nombre
            nombre = prod.find("p", class_="woocommerce-loop-product__title")
            if nombre:
                nombre_a = nombre.find("a")
                nombre_texto = nombre_a.text.strip() if nombre_a else nombre.text.strip()
            else:
                nombre = prod.find("h2") or prod.find("h3")
                nombre_texto = nombre.text.strip() if nombre else "Sin nombre"
            
            # Link
            link_tag = prod.find("a", href=True)
            link = link_tag["href"] if link_tag else None
            
            # Imagen
            img = prod.find("img")
            imagen = img.get("src") or img.get("data-src") if img else None
            
            if link:
                producto = {
                    "nombre": nombre_texto,
                    "precio": precio,
                    "categoria": categoria_nombre,
                    "link": link,
                    "imagen": imagen
                }
                
                # Solo agregar si es nuevo
                if link not in self.productos_unicos:
                    self.productos_unicos[link] = producto
                    resultados.append(producto)
        
        return resultados
    
    def escanear_precio(self, precio, categoria_url, categoria_nombre):
        """Escanea un precio específico"""
        url = f"{categoria_url}?min_price={precio}&max_price={precio}"
        
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, "html.parser")
                return self.extraer_productos(soup, precio, categoria_nombre)
        except Exception as e:
            pass
        return []
    
    def escanear_rango(self, min_precio, max_precio, categoria_url, categoria_nombre, delay=0.3):
        """Escanea un rango de precios"""
        print(f"\n📂 {categoria_nombre}")
        print(f"   Escaneando precios: Bs {min_precio} - Bs {max_precio}")
        
        total = max_precio - min_precio + 1
        encontrados_en_rango = 0
        
        for i, precio in enumerate(range(min_precio, max_precio + 1)):
            # Progreso
            if i % 20 == 0 or i == total - 1:
                progreso = (i + 1) / total * 100
                sys.stdout.write(f"\r   ⏳ Progreso: {progreso:.1f}% | Productos: {len(self.productos_unicos)}")
                sys.stdout.flush()
            
            productos = self.escanear_precio(precio, categoria_url, categoria_nombre)
            
            if productos:
                encontrados_en_rango += len(productos)
                print(f"\n   💰 Bs {precio}: {len(productos)} producto(s)")
                for p in productos:
                    print(f"      - {p['nombre'][:50]}")
            
            time.sleep(delay)
        
        print(f"\n   ✅ Completado: {encontrados_en_rango} productos en este rango\n")
        return encontrados_en_rango
    
    def guardar_json(self, archivo="productos_precios.json"):
        """Guarda resultados"""
        productos = list(self.productos_unicos.values())
        precios = sorted(set(p["precio"] for p in productos))
        
        datos = {
            "fecha": datetime.now().isoformat(),
            "total_productos": len(productos),
            "productos": sorted(productos, key=lambda x: x["precio"]),
            "estadisticas": {
                "precios_diferentes": len(precios),
                "precios": precios,
                "precio_min": min(precios) if precios else 0,
                "precio_max": max(precios) if precios else 0,
            }
        }
        
        with open(archivo, "w", encoding="utf-8") as f:
            json.dump(datos, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Guardado en: {archivo}")
        return archivo


if __name__ == "__main__":
    print("="*70)
    print("🚀 SCRAPER DE PRECIOS EXACTOS - LIVINGROOM BOLIVIA")
    print("="*70)
    
    scraper = ScraperPreciosRapido()
    
    # Configuración
    categoria_url = "https://www.livingroom.com.bo/product-category/sillas-de-oficina/"
    categoria_nombre = "Sillas de Oficina"
    
    # Opción para escanear
    print("\n¿Qué deseas hacer?")
    print("1. Prueba rápida (Bs 0-100)")
    print("2. Escaneo medio (Bs 0-300)")
    print("3. Escaneo completo (Bs 0-810)")
    print("4. Rango personalizado")
    
    opcion = input("\nElige una opción (1-4): ").strip()
    
    if opcion == "1":
        scraper.escanear_rango(0, 100, categoria_url, categoria_nombre, delay=0.2)
    elif opcion == "2":
        scraper.escanear_rango(0, 300, categoria_url, categoria_nombre, delay=0.3)
    elif opcion == "3":
        print("\n⚠️  ADVERTENCIA: Esto realizará ~811 consultas y puede tomar 4-5 minutos")
        confirmar = input("¿Continuar? (s/n): ").strip().lower()
        if confirmar == 's':
            scraper.escanear_rango(0, 810, categoria_url, categoria_nombre, delay=0.3)
    elif opcion == "4":
        min_p = int(input("Precio mínimo: "))
        max_p = int(input("Precio máximo: "))
        scraper.escanear_rango(min_p, max_p, categoria_url, categoria_nombre, delay=0.3)
    
    # Guardar resultados
    if scraper.productos_unicos:
        scraper.guardar_json()
        
        print("\n" + "="*70)
        print("📊 RESUMEN")
        print("="*70)
        print(f"Total productos únicos: {len(scraper.productos_unicos)}")
        
        precios = sorted(set(p["precio"] for p in scraper.productos_unicos.values()))
        print(f"Precios encontrados: {precios}")
        
        print("\n📋 Productos encontrados:")
        for p in sorted(scraper.productos_unicos.values(), key=lambda x: x["precio"]):
            print(f"  Bs {p['precio']:3d} - {p['nombre'][:55]}")
    else:
        print("\n⚠️  No se encontraron productos")
