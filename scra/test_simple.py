import requests
from bs4 import BeautifulSoup
import json
import time
from datetime import datetime

class ScraperPreciosExactos:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "es-ES,es;q=0.9",
        }
        self.productos_unicos = {}  # {link: producto_info}
        
    def extraer_productos(self, soup, precio, categoria_nombre):
        """Extrae productos y les asigna el precio filtrado"""
        # Probar diferentes métodos
        productos = soup.find_all("div", class_="product")
        if not productos:
            productos = soup.find_all("li", class_="product")
        
        resultados = []
        for prod in productos:
            # Nombre
            nombre = prod.find("p", class_="woocommerce-loop-product__title")
            if nombre:
                nombre_a = nombre.find("a")
                nombre_texto = nombre_a.text.strip() if nombre_a else nombre.text.strip()
            else:
                nombre_h2 = prod.find("h2", class_="woocommerce-loop-product__title")
                nombre_texto = nombre_h2.text.strip() if nombre_h2 else "Sin nombre"
            
            # Link
            link_tag = prod.find("a", href=True)
            link = link_tag["href"] if link_tag else None
            
            # Imagen
            img = prod.find("img")
            imagen = img.get("src") or img.get("data-src") if img else None
            
            if link and nombre_texto != "Sin nombre":
                producto = {
                    "nombre": nombre_texto,
                    "precio": precio,  # ⭐ ASIGNAMOS EL PRECIO DEL FILTRO
                    "link": link,
                    "imagen": imagen,
                    "categoria": categoria_nombre,
                    "fecha_encontrado": datetime.now().isoformat()
                }
                
                # Guardar por link único
                if link not in self.productos_unicos:
                    self.productos_unicos[link] = producto
                    resultados.append(producto)
        
        return resultados
    
    def escanear_precio(self, precio, categoria_url, categoria_nombre):
        """Escanea un precio específico"""
        url = f"{categoria_url}?min_price={precio}&max_price={precio}"
        
        try:
            response = requests.get(url, headers=self.headers, timeout=30, allow_redirects=True)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, "html.parser")
                productos = self.extraer_productos(soup, precio, categoria_nombre)
                return productos
        except Exception as e:
            print(f"   ⚠️  Error en precio {precio}: {e}")
        return []
    
    def escanear_rango(self, min_precio, max_precio, categoria_url, categoria_nombre, delay=0.3):
        """Escanea un rango de precios"""
        print(f"\n{'='*70}")
        print(f"📂 CATEGORÍA: {categoria_nombre}")
        print(f"💰 RANGO: Bs {min_precio} - Bs {max_precio}")
        print(f"{'='*70}\n")
        
        total = max_precio - min_precio + 1
        productos_totales = 0
        
        for i, precio in enumerate(range(min_precio, max_precio + 1), 1):
            # Progreso visual
            porcentaje = (i / total) * 100
            barra = "█" * int(porcentaje / 5) + "░" * (20 - int(porcentaje / 5))
            
            print(f"\r[{barra}] {porcentaje:.1f}% | Bs {precio} | Productos: {len(self.productos_unicos)}", end="", flush=True)
            
            productos = self.escanear_precio(precio, categoria_url, categoria_nombre)
            
            if productos:
                productos_totales += len(productos)
                print(f"\n   ✅ Bs {precio}: {len(productos)} producto(s) encontrado(s)")
                for p in productos:
                    print(f"      • {p['nombre']}")
            
            time.sleep(delay)
        
        print(f"\n\n{'='*70}")
        print(f"✅ COMPLETADO: {len(self.productos_unicos)} productos únicos encontrados")
        print(f"{'='*70}\n")
        
        return len(self.productos_unicos)
    
    def guardar_json(self, archivo="productos_precios.json"):
        """Guarda resultados en JSON"""
        productos = list(self.productos_unicos.values())
        
        if not productos:
            print("⚠️  No hay productos para guardar")
            return None
        
        precios = sorted(set(p["precio"] for p in productos))
        
        datos = {
            "fecha_scraping": datetime.now().isoformat(),
            "total_productos": len(productos),
            "estadisticas": {
                "precios_diferentes": len(precios),
                "precio_min": min(precios),
                "precio_max": max(precios),
                "precio_promedio": sum(precios) / len(precios),
                "precios_encontrados": precios
            },
            "productos": sorted(productos, key=lambda x: x["precio"])
        }
        
        with open(archivo, "w", encoding="utf-8") as f:
            json.dump(datos, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Guardado en: {archivo}")
        print(f"\n📊 RESUMEN:")
        print(f"   • Total productos: {len(productos)}")
        print(f"   • Precios diferentes: {len(precios)}")
        print(f"   • Rango: Bs {min(precios)} - Bs {max(precios)}")
        print(f"   • Promedio: Bs {sum(precios) / len(precios):.2f}")
        
        return archivo
    
    def mostrar_productos(self):
        """Muestra tabla de productos encontrados"""
        if not self.productos_unicos:
            print("⚠️  No hay productos para mostrar")
            return
        
        productos = sorted(self.productos_unicos.values(), key=lambda x: x["precio"])
        
        print(f"\n{'='*90}")
        print(f"{'PRECIO':<10} {'NOMBRE':<50} {'CATEGORÍA':<30}")
        print(f"{'='*90}")
        
        for p in productos:
            nombre = p['nombre'][:47] + "..." if len(p['nombre']) > 50 else p['nombre']
            print(f"Bs {p['precio']:<7} {nombre:<50} {p['categoria']:<30}")
        
        print(f"{'='*90}\n")


if __name__ == "__main__":
    print("🚀 SCRAPER DE PRECIOS EXACTOS - LIVINGROOM BOLIVIA")
    print("="*70 + "\n")
    
    scraper = ScraperPreciosExactos()
    
    # Configuración
    categoria_url = "https://www.livingroom.com.bo/product-category/sillas-de-oficina/"
    categoria_nombre = "Sillas de Oficina"
    
    # Opciones
    print("OPCIONES DE ESCANEO:")
    print("1. 🧪 Prueba rápida (Bs 0-50)")
    print("2. ⚡ Escaneo rápido (Bs 0-200)")
    print("3. 📊 Escaneo medio (Bs 0-500)")
    print("4. 🎯 Escaneo completo (Bs 0-810)")
    print("5. ✏️  Rango personalizado")
    print("6. 🔍 Precio específico")
    
    opcion = input("\nElige una opción (1-6): ").strip()
    
    if opcion == "1":
        scraper.escanear_rango(0, 50, categoria_url, categoria_nombre, delay=0.2)
    elif opcion == "2":
        scraper.escanear_rango(0, 200, categoria_url, categoria_nombre, delay=0.3)
    elif opcion == "3":
        scraper.escanear_rango(0, 500, categoria_url, categoria_nombre, delay=0.3)
    elif opcion == "4":
        print("\n⚠️  ADVERTENCIA: ~811 consultas, ~4-5 minutos")
        confirmar = input("¿Continuar? (s/n): ").strip().lower()
        if confirmar == 's':
            scraper.escanear_rango(0, 810, categoria_url, categoria_nombre, delay=0.3)
    elif opcion == "5":
        min_p = int(input("Precio mínimo (Bs): "))
        max_p = int(input("Precio máximo (Bs): "))
        scraper.escanear_rango(min_p, max_p, categoria_url, categoria_nombre, delay=0.3)
    elif opcion == "6":
        precio = int(input("Precio a buscar (Bs): "))
        productos = scraper.escanear_precio(precio, categoria_url, categoria_nombre)
        if productos:
            print(f"\n✅ Encontrados {len(productos)} producto(s) con precio Bs {precio}:")
            for p in productos:
                print(f"   • {p['nombre']}")
            scraper.productos_unicos = {p['link']: p for p in productos}
        else:
            print(f"\n⚠️  No se encontraron productos con precio Bs {precio}")
    
    # Guardar y mostrar resultados
    if scraper.productos_unicos:
        scraper.mostrar_productos()
        scraper.guardar_json()
    else:
        print("\n⚠️  No se encontraron productos")