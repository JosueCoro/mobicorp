#!/usr/bin/env python3
"""Script para probar filtros de precios en LivingRoom Bolivia"""

from a import ScraperMuebles

def main():
    print("🎯 PROBANDO FILTROS DE PRECIO EN LIVINGROOM BOLIVIA")
    print("="*70)
    
    # PRUEBA 1: Productos entre Bs 100 y Bs 500
    print("\n" + "─"*70)
    print("📊 PRUEBA 1: Productos entre Bs 100 - Bs 500")
    print("─"*70)
    scraper1 = ScraperMuebles()
    resultados1 = scraper1.buscar_livingroom(min_price=100, max_price=500, paginas=1)
    if resultados1:
        scraper1.guardar_json("precios_100_500.json")
        scraper1.mostrar_resumen()
    
    # PRUEBA 2: Productos menores a Bs 300
    print("\n" + "─"*70)
    print("📊 PRUEBA 2: Productos menores a Bs 300")
    print("─"*70)
    scraper2 = ScraperMuebles()
    resultados2 = scraper2.buscar_livingroom(max_price=300, paginas=1)
    if resultados2:
        scraper2.guardar_json("precios_hasta_300.json")
        scraper2.mostrar_resumen()
    
    # PRUEBA 3: Productos mayores a Bs 600
    print("\n" + "─"*70)
    print("📊 PRUEBA 3: Productos mayores a Bs 600")
    print("─"*70)
    scraper3 = ScraperMuebles()
    resultados3 = scraper3.buscar_livingroom(min_price=600, paginas=1)
    if resultados3:
        scraper3.guardar_json("precios_desde_600.json")
        scraper3.mostrar_resumen()
    
    # PRUEBA 4: Todos los productos sin filtro
    print("\n" + "─"*70)
    print("📊 PRUEBA 4: Todos los productos (sin filtro)")
    print("─"*70)
    scraper4 = ScraperMuebles()
    resultados4 = scraper4.buscar_livingroom(paginas=1)
    if resultados4:
        scraper4.guardar_json("precios_todos.json")
        scraper4.mostrar_resumen()
    
    print("\n" + "="*70)
    print("✅ TODAS LAS PRUEBAS COMPLETADAS")
    print("="*70)
    print("\n📁 Archivos generados:")
    print("  - precios_100_500.json (Bs 100-500)")
    print("  - precios_hasta_300.json (hasta Bs 300)")
    print("  - precios_desde_600.json (desde Bs 600)")
    print("  - precios_todos.json (todos los productos)")

if __name__ == "__main__":
    main()
