import requests
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime

class ScraperMuebles:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "es-ES,es;q=0.9",
        }
        self.resultados = []
    
    def extraer_precio_numerico(self, precio_texto):
        """Extrae el valor numérico del precio"""
        numeros = re.findall(r'[\d,]+\.?\d*', precio_texto.replace(',', ''))
        if numeros:
            try:
                return float(numeros[0])
            except:
                return None
        return None
    
    def guardar_html_debug(self, html_content, nombre_archivo="debug_page.html"):
        """Guarda el HTML de la página para debugging"""
        with open(nombre_archivo, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"🔍 HTML guardado en: {nombre_archivo}")
    
    def buscar_livingroom(self, min_price=None, max_price=None, paginas=2):
        """Busca en LivingRoom Bolivia
        
        Args:
            min_price: Precio mínimo para filtrar (Bs)
            max_price: Precio máximo para filtrar (Bs)
            paginas: Número de páginas a buscar por categoría
        """
        print("\n" + "="*60)
        print("🔍 BUSCANDO EN LIVINGROOM BOLIVIA")
        print("="*60)
        
        if min_price or max_price:
            print(f"💰 Filtro de precio: Bs {min_price or 0} - Bs {max_price or '∞'}")
        
        # Definir categorías base
        categorias_base = [
            ("https://www.livingroom.com.bo/product-category/sillas-de-oficina/", "Sillas de Oficina"),
            ("https://www.livingroom.com.bo/product-category/escritorios/", "Escritorios"),
        ]
        
        # Generar URLs con paginación y filtros
        categorias = []
        for url_base, nombre_cat in categorias_base:
            for pagina in range(1, paginas + 1):
                # Construir URL con parámetros
                if pagina == 1:
                    url = url_base
                else:
                    url = f"{url_base}page/{pagina}/"
                
                # Agregar filtros de precio si existen
                params = []
                if min_price is not None:
                    params.append(f"min_price={min_price}")
                if max_price is not None:
                    params.append(f"max_price={max_price}")
                
                if params:
                    url += "?" + "&".join(params)
                
                nombre_completo = f"{nombre_cat} - Página {pagina}" if pagina > 1 else nombre_cat
                categorias.append((url, nombre_completo))
        
        for url, categoria in categorias:
            print(f"\n📂 Categoría: {categoria}")
            print(f"🌐 URL: {url}")
            
            try:
                response = requests.get(url, headers=self.headers, timeout=15)
                
                if response.status_code != 200:
                    print(f"❌ Error {response.status_code}")
                    continue
                
                soup = BeautifulSoup(response.text, "html.parser")
                
                # Guardar HTML para debug en la primera iteración
                if categoria == "Sillas de Oficina":
                    self.guardar_html_debug(response.text, "livingroom_debug.html")
                
                # Buscar productos con múltiples selectores
                productos = soup.find_all("li", class_="product")
                
                if not productos:
                    productos = soup.find_all("div", class_="product")
                if not productos:
                    productos = soup.find_all(class_=lambda x: x and 'product' in str(x).lower())
                if not productos:
                    # Intentar con selectores CSS más específicos
                    productos = soup.select("ul.products li") or soup.select(".products .product")
                
                print(f"✅ Encontrados: {len(productos)} productos")
                
                for i, prod in enumerate(productos, 1):
                    # Nombre - con múltiples estrategias
                    nombre = None
                    
                    # Estrategia 1: Buscar en tag <p> con clase woocommerce-loop-product__title
                    nombre = prod.find("p", class_="woocommerce-loop-product__title")
                    if nombre:
                        nombre_a = nombre.find("a")
                        nombre_texto = nombre_a.text.strip() if nombre_a else nombre.text.strip()
                    else:
                        # Estrategia 2: Buscar en h2
                        nombre = prod.find("h2", class_="woocommerce-loop-product__title")
                        if not nombre:
                            nombre = prod.find("h3") or prod.find("h2")
                        nombre_texto = nombre.text.strip() if nombre else "Sin nombre"
                    
                    # Precio - con múltiples estrategias
                    precio = prod.find("span", class_="woocommerce-Price-amount")
                    if not precio:
                        precio = prod.find("bdi")
                    if not precio:
                        precio = prod.find(class_=lambda x: x and 'price' in str(x).lower())
                    if not precio:
                        # Buscar en price-wrapper si no hay precio directo
                        price_wrapper = prod.find("div", class_="price-wrapper")
                        if price_wrapper:
                            precio_texto = price_wrapper.get_text(strip=True)
                        else:
                            precio_texto = "Consultar precio"
                    else:
                        precio_texto = precio.text.strip()
                    
                    precio_numerico = self.extraer_precio_numerico(precio_texto) if precio else None
                    
                    # Link
                    link_tag = prod.find("a", href=True)
                    link = link_tag["href"] if link_tag else "Sin link"
                    
                    # Imagen
                    img = prod.find("img")
                    imagen = img.get("src") or img.get("data-src") if img else None
                    
                    resultado = {
                        "fuente": "LivingRoom Bolivia",
                        "categoria": categoria,
                        "nombre": nombre_texto,
                        "precio_texto": precio_texto,
                        "precio_numerico": precio_numerico,
                        "link": link,
                        "imagen": imagen
                    }
                    
                    self.resultados.append(resultado)
                    
                    print(f"\n  🪑 Producto {i}: {nombre_texto}")
                    print(f"     💰 Precio: {precio_texto}")
                    if precio_numerico:
                        print(f"     💵 Valor: Bs {precio_numerico:,.2f}")
                    print(f"     🔗 Link: {link[:50]}...")
                
            except Exception as e:
                print(f"❌ Error en {categoria}: {e}")
        
        return self.resultados
    
    def guardar_json(self, archivo="precios_web.json"):
        """Guarda los resultados en JSON"""
        datos = {
            "fecha_busqueda": datetime.now().isoformat(),
            "total_productos": len(self.resultados),
            "productos": self.resultados,
            "resumen": {
                "sillas": len([p for p in self.resultados if "silla" in p["categoria"].lower()]),
                "escritorios": len([p for p in self.resultados if "escritorio" in p["categoria"].lower()]),
                "precio_min": min([p["precio_numerico"] for p in self.resultados if p["precio_numerico"]], default=0),
                "precio_max": max([p["precio_numerico"] for p in self.resultados if p["precio_numerico"]], default=0),
            }
        }
        
        with open(archivo, "w", encoding="utf-8") as f:
            json.dump(datos, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Resultados guardados en: {archivo}")
        return archivo
    
    def mostrar_resumen(self):
        """Muestra un resumen de los resultados"""
        if not self.resultados:
            print("\n⚠️  No hay resultados para mostrar")
            return
        
        print("\n" + "="*60)
        print("📊 RESUMEN DE BÚSQUEDA")
        print("="*60)
        print(f"Total de productos encontrados: {len(self.resultados)}")
        
        # Por categoría
        categorias = {}
        for prod in self.resultados:
            cat = prod["categoria"]
            if cat not in categorias:
                categorias[cat] = []
            categorias[cat].append(prod)
        
        for cat, prods in categorias.items():
            print(f"\n📂 {cat}: {len(prods)} productos")
            precios = [p["precio_numerico"] for p in prods if p["precio_numerico"]]
            if precios:
                print(f"   💰 Precio mínimo: Bs {min(precios):,.2f}")
                print(f"   💰 Precio máximo: Bs {max(precios):,.2f}")
                print(f"   💰 Precio promedio: Bs {sum(precios)/len(precios):,.2f}")

if __name__ == "__main__":
    print("🚀 INICIANDO BÚSQUEDA DE MUEBLES DE OFICINA")
    print("="*60)
    
    scraper = ScraperMuebles()
    
    # EJEMPLO 1: Buscar productos entre Bs 100 y Bs 500
    print("\n📍 PRUEBA 1: Productos entre Bs 100 - Bs 500")
    resultados = scraper.buscar_livingroom(min_price=100, max_price=500, paginas=1)
    
    # EJEMPLO 2: Buscar productos menores a Bs 300
    # scraper2 = ScraperMuebles()
    # print("\n📍 PRUEBA 2: Productos menores a Bs 300")
    # resultados = scraper2.buscar_livingroom(max_price=300, paginas=1)
    
    # EJEMPLO 3: Buscar productos mayores a Bs 600
    # scraper3 = ScraperMuebles()
    # print("\n📍 PRUEBA 3: Productos mayores a Bs 600")
    # resultados = scraper3.buscar_livingroom(min_price=600, paginas=1)
    
    # EJEMPLO 4: Buscar sin filtro de precio (todos)
    # scraper4 = ScraperMuebles()
    # print("\n📍 PRUEBA 4: Todos los productos sin filtro")
    # resultados = scraper4.buscar_livingroom(paginas=2)
    
    # Guardar resultados
    if resultados:
        archivo = scraper.guardar_json()
        scraper.mostrar_resumen()
        print(f"\n✅ Proceso completado!")
        print(f"📁 Resultados en: {archivo}")
    else:
        print("\n⚠️  No se encontraron productos")
        print("💡 Guardando HTML para debug...")
        # Guardar HTML para debug si falla
