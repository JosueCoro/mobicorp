#!/usr/bin/env python3
"""
Scraper de Google con Selenium
Busca: "busco oficina" Santa Cruz
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import json
import time


class GoogleSeleniumScraper:
    def _init_(self):
        self.resultados = []

    def iniciar_driver(self):
        """Inicia el navegador Chrome"""
        print("🚀 Iniciando navegador Chrome...")

        chrome_options = Options()
        chrome_options.add_argument("--headless")  # Sin ventana
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_argument(
            "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )

        try:
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=chrome_options)
            print("✅ Chrome iniciado correctamente\n")
            return driver
        except Exception as e:
            print(f"❌ Error al iniciar Chrome: {e}")
            print("\n💡 Intentando con Firefox...")
            return None

    def buscar(self, query, max_resultados=10):
        """Busca en Google"""
        driver = self.iniciar_driver()

        if not driver:
            print("❌ No se pudo iniciar el navegador")
            return []

        try:
            print(f"🔍 Buscando: {query}")
            print("=" * 70)

            # Construir URL
            url = f"https://www.google.com/search?q={query}&hl=es&num={max_resultados}"
            print(f"🌐 URL: {url}\n")

            # Ir a Google
            driver.get(url)

            # Esperar a que cargue
            print("⏳ Esperando a que cargue la página...")
            time.sleep(3)

            # Tomar screenshot para debug
            driver.save_screenshot("google_screenshot.png")
            print("📸 Screenshot guardado: google_screenshot.png\n")

            # Buscar resultados
            print("📊 Buscando resultados...\n")

            try:
                # Esperar a que aparezcan los resultados
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located(
                        (By.CSS_SELECTOR, "div.g, div#search")
                    )
                )
            except:
                print("⚠️  Timeout esperando resultados")

            # Método 1: Buscar divs con clase 'g' (resultados orgánicos)
            resultados_elementos = driver.find_elements(By.CSS_SELECTOR, "div.g")
            print(f"   Método 1 (div.g): {len(resultados_elementos)} elementos")

            if not resultados_elementos:
                # Método 2: Buscar en contenedor de búsqueda
                resultados_elementos = driver.find_elements(
                    By.CSS_SELECTOR, "#search div"
                )
                print(
                    f"   Método 2 (#search div): {len(resultados_elementos)} elementos"
                )

            for i, elemento in enumerate(resultados_elementos[:max_resultados], 1):
                try:
                    # Título
                    try:
                        titulo_elem = elemento.find_element(By.CSS_SELECTOR, "h3")
                        titulo = titulo_elem.text
                    except:
                        titulo = None

                    # Link
                    try:
                        link_elem = elemento.find_element(By.CSS_SELECTOR, "a")
                        link = link_elem.get_attribute("href")
                    except:
                        link = None

                    # Descripción
                    try:
                        desc_elem = elemento.find_element(
                            By.CSS_SELECTOR, "div.VwiC3b, span.aCOpRe"
                        )
                        descripcion = desc_elem.text
                    except:
                        descripcion = None

                    # URL visible
                    try:
                        cite_elem = elemento.find_element(By.TAG_NAME, "cite")
                        url_visible = cite_elem.text
                    except:
                        url_visible = None

                    # Solo guardar si tiene título y link
                    if titulo and link and "google.com" not in link:
                        resultado = {
                            "posicion": i,
                            "titulo": titulo,
                            "link": link,
                            "descripcion": descripcion,
                            "url_visible": url_visible,
                        }

                        self.resultados.append(resultado)

                        print(f"✅ Resultado #{len(self.resultados)}")
                        print(f"   📌 {titulo}")
                        print(f"   🔗 {link}")
                        if descripcion:
                            print(f"   📝 {descripcion[:100]}...")
                        print()

                except Exception as e:
                    continue

            print("=" * 70)
            print(f"📊 Total resultados: {len(self.resultados)}")
            print("=" * 70)

            return self.resultados

        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback

            traceback.print_exc()
            return []

        finally:
            driver.quit()
            print("\n✅ Navegador cerrado")

    def guardar_json(self, archivo="resultados_google.json"):
        """Guarda resultados en JSON"""
        if not self.resultados:
            print("⚠️  No hay resultados para guardar")
            return None

        datos = {
            "fecha_busqueda": time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_resultados": len(self.resultados),
            "resultados": self.resultados,
        }

        with open(archivo, "w", encoding="utf-8") as f:
            json.dump(datos, f, indent=2, ensure_ascii=False)

        print(f"\n💾 Guardado en: {archivo}")
        return archivo

    def mostrar_resultados(self):
        """Muestra resultados"""
        if not self.resultados:
            print("⚠️  No hay resultados")
            return

        print("\n" + "=" * 70)
        print("📋 RESULTADOS DE BÚSQUEDA")
        print("=" * 70 + "\n")

        for r in self.resultados:
            print(f"🔢 Posición: {r['posicion']}")
            print(f"📌 Título: {r['titulo']}")
            print(f"🔗 Link: {r['link']}")
            if r.get("url_visible"):
                print(f"🌐 Dominio: {r['url_visible']}")
            if r.get("descripcion"):
                print(f"📝 Descripción: {r['descripcion'][:150]}...")
            print("-" * 70 + "\n")


if _name_ == "_main_":
    print("🚀 GOOGLE SCRAPER CON SELENIUM")
    print("=" * 70 + "\n")

    scraper = GoogleSeleniumScraper()

    # Query de búsqueda
    query = '"busco oficina" Santa Cruz'

    # Buscar
    resultados = scraper.buscar(query, max_resultados=10)

    # Mostrar y guardar
    if resultados:
        scraper.mostrar_resultados()
        scraper.guardar_json()
        print("\n✅ ¡Proceso completado!")
    else:
        print("\n⚠️  No se encontraron resultados")
        print("💡 Revisa google_screenshot.png para ver qué retornó Google")
