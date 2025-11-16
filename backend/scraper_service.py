import requests
from bs4 import BeautifulSoup
import time
from typing import List, Dict
from sqlalchemy.orm import Session
from models import ProductoScraped
from datetime import datetime


class ScraperService:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "es-ES,es;q=0.9",
        }

    def extraer_productos(self, soup, precio: int, categoria_nombre: str) -> List[Dict]:
        """Extrae productos de una página"""
        productos = soup.find_all("li", class_="product")
        if not productos:
            productos = soup.find_all("div", class_="product")

        resultados = []
        for prod in productos:
            # Nombre
            nombre = prod.find("p", class_="woocommerce-loop-product__title")
            if nombre:
                nombre_a = nombre.find("a")
                nombre_texto = (
                    nombre_a.text.strip() if nombre_a else nombre.text.strip()
                )
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
                    "precio": float(precio),
                    "categoria": categoria_nombre,
                    "link": link,
                    "imagen": imagen,
                    "fuente": "livingroom.com.bo",
                }
                resultados.append(producto)

        return resultados

    def escanear_precio(
        self, precio: int, categoria_url: str, categoria_nombre: str
    ) -> List[Dict]:
        """Escanea un precio específico"""
        url = f"{categoria_url}?min_price={precio}&max_price={precio}"

        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, "html.parser")
                return self.extraer_productos(soup, precio, categoria_nombre)
        except Exception as e:
            print(f"Error escaneando precio {precio}: {e}")
        return []

    def escanear_rango_rapido(
        self,
        db: Session,
        min_precio: int,
        max_precio: int,
        categoria_url: str,
        categoria_nombre: str,
        delay: float = 0.3,
    ) -> Dict:
        """Escanea un rango de precios y guarda en BD evitando duplicados"""
        productos_unicos = {}
        productos_nuevos = 0
        productos_duplicados = 0

        for precio in range(min_precio, max_precio + 1):
            productos = self.escanear_precio(precio, categoria_url, categoria_nombre)

            for producto_data in productos:
                link = producto_data["link"]

                # Verificar si ya existe en productos_unicos de esta sesión
                if link not in productos_unicos:
                    productos_unicos[link] = producto_data

                    # Verificar si existe en BD
                    existe = (
                        db.query(ProductoScraped)
                        .filter(ProductoScraped.link == link)
                        .first()
                    )

                    if not existe:
                        # Crear nuevo producto
                        nuevo_producto = ProductoScraped(
                            nombre=producto_data["nombre"],
                            precio=producto_data["precio"],
                            categoria=producto_data["categoria"],
                            link=producto_data["link"],
                            imagen=producto_data["imagen"],
                            fuente=producto_data["fuente"],
                        )
                        db.add(nuevo_producto)
                        productos_nuevos += 1
                    else:
                        productos_duplicados += 1

            time.sleep(delay)

        db.commit()

        # Obtener todos los productos guardados
        productos_guardados = (
            db.query(ProductoScraped)
            .filter(ProductoScraped.link.in_(productos_unicos.keys()))
            .all()
        )

        precios = sorted(set(p["precio"] for p in productos_unicos.values()))

        return {
            "total_productos": len(productos_unicos),
            "productos_nuevos": productos_nuevos,
            "productos_duplicados": productos_duplicados,
            "productos": productos_guardados,
            "estadisticas": {
                "precios_diferentes": len(precios),
                "precios": precios,
                "precio_min": min(precios) if precios else 0,
                "precio_max": max(precios) if precios else 0,
            },
        }

    def escanear_completo(
        self,
        db: Session,
        categoria_url: str,
        categoria_nombre: str,
        delay: float = 0.3,
    ) -> Dict:
        """Escaneo completo optimizado: primero detecta el rango máximo"""
        # Intentar detectar precio máximo
        max_precio = 810  # Por defecto

        # Escanear de 0 al máximo
        return self.escanear_rango_rapido(
            db, 0, max_precio, categoria_url, categoria_nombre, delay
        )


scraper_service = ScraperService()
