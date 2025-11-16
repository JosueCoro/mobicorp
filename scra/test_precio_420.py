import requests
from bs4 import BeautifulSoup

# Probar precio específico 420
precio = 420
url = f"https://www.livingroom.com.bo/product-category/sillas-de-oficina/?min_price={precio}&max_price={precio}"

print("="*70)
print(f"🔍 PRUEBA DE PRECIO ESPECÍFICO: Bs {precio}")
print("="*70)
print(f"URL: {url}\n")

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9",
}

try:
    print("📡 Haciendo request...")
    response = requests.get(url, headers=headers, timeout=30, allow_redirects=True)
    print(f"✅ Status Code: {response.status_code}")
    print(f"📦 Content Length: {len(response.content)} bytes")
    print(f"🔗 URL Final: {response.url}\n")
    
    if response.status_code == 200:
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Buscar productos con diferentes selectores
        print("🔍 Buscando productos...\n")
        
        # Método 1: li.product
        productos_li = soup.find_all("li", class_="product")
        print(f"Método 1 (li.product): {len(productos_li)} productos")
        
        # Método 2: div.product
        productos_div = soup.find_all("div", class_="product")
        print(f"Método 2 (div.product): {len(productos_div)} productos")
        
        # Método 3: CSS selector
        productos_css = soup.select("ul.products li")
        print(f"Método 3 (ul.products li): {len(productos_css)} productos")
        
        # Usar el que tenga resultados
        productos = productos_li or productos_div or productos_css
        
        print(f"\n📊 Total productos encontrados: {len(productos)}")
        print("="*70)
        
        if productos:
            print("\n📋 PRODUCTOS ENCONTRADOS:\n")
            for i, prod in enumerate(productos, 1):
                print(f"Producto #{i}:")
                
                # Extraer nombre
                nombre = prod.find("p", class_="woocommerce-loop-product__title")
                if nombre:
                    nombre_a = nombre.find("a")
                    nombre_texto = nombre_a.text.strip() if nombre_a else nombre.text.strip()
                else:
                    nombre_h2 = prod.find("h2", class_="woocommerce-loop-product__title")
                    nombre_texto = nombre_h2.text.strip() if nombre_h2 else "Sin nombre"
                
                # Extraer link
                link = prod.find("a", href=True)
                link_url = link["href"] if link else "Sin link"
                
                # Asignar el precio buscado (si lo encuentra, ese ES su precio)
                precio_asignado = f"Bs {precio}"
                
                print(f"  Nombre: {nombre_texto}")
                print(f"  Link: {link_url}")
                print(f"  Precio: {precio_asignado} ")
                print()
        else:
            print("\n⚠️  NO SE ENCONTRARON PRODUCTOS")
            print("\n🔍 Buscando mensajes de 'no productos'...")
            
            no_products = soup.find("p", class_="woocommerce-info")
            if no_products:
                print(f"   Mensaje: {no_products.text.strip()}")
            
            # Guardar HTML para inspección
            print("\n💾 Guardando HTML para debug...")
            with open(f"debug_precio_{precio}.html", "w", encoding="utf-8") as f:
                f.write(response.text)
            print(f"   Guardado en: debug_precio_{precio}.html")
            
            # Buscar el texto "No se encontraron productos"
            if "No se encontraron productos" in response.text or "no products" in response.text.lower():
                print("   ❌ La página confirma que no hay productos en este rango")
            else:
                print("   ⚠️  La página no muestra mensaje claro de 'sin productos'")
                
    else:
        print(f"❌ Error HTTP: {response.status_code}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*70)
