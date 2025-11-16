"""
Script para eliminar precios de todos los productos, dejando solo el detalle/descripción
"""
from database import SessionLocal
from models import Product

db = SessionLocal()

# Obtener todos los productos
products = db.query(Product).all()

print(f"=== Eliminando precios de {len(products)} productos ===\n")

updated_count = 0
for product in products:
    print(f"Producto: {product.name}")
    print(f"  Precio anterior: Bs. {product.price}")
    print(f"  Descripción: {product.description or 'Sin descripción'}")
    
    # Establecer precio en None (null)
    product.price = None
    
    db.add(product)
    updated_count += 1
    print(f"  [OK] Precio eliminado\n")

db.commit()
print(f"{'='*50}")
print(f"Total de productos actualizados: {updated_count}")
print("Todos los precios han sido eliminados!")
print(f"{'='*50}")
db.close()

