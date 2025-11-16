"""
Script de migración para crear la tabla productos_scraped
"""

from database import engine, SessionLocal
from models import Base, ProductoScraped
from sqlalchemy import inspect, text


def migrate():
    print("🔄 Iniciando migración de tabla productos_scraped...")

    db = SessionLocal()

    try:
        # Verificar si la tabla ya existe
        inspector = inspect(engine)
        tablas_existentes = inspector.get_table_names()

        if "productos_scraped" in tablas_existentes:
            print("⚠️  La tabla 'productos_scraped' ya existe")
            respuesta = input("¿Desea eliminarla y recrearla? (s/n): ").lower()

            if respuesta == "s":
                print("🗑️  Eliminando tabla productos_scraped...")
                db.execute(text("DROP TABLE IF EXISTS productos_scraped CASCADE"))
                db.commit()
                print("✅ Tabla eliminada")
            else:
                print("❌ Migración cancelada")
                return

        # Crear la tabla
        print("📝 Creando tabla productos_scraped...")
        Base.metadata.tables["productos_scraped"].create(engine, checkfirst=True)
        db.commit()

        print("✅ Tabla productos_scraped creada exitosamente")
        print("\n📊 Estructura de la tabla:")
        print("  - id (Integer, Primary Key)")
        print("  - nombre (String, Index)")
        print("  - precio (Float, Index)")
        print("  - categoria (String, Index)")
        print("  - link (String, Unique)")
        print("  - imagen (String, Nullable)")
        print("  - fuente (String)")
        print("  - fecha_scraping (DateTime, Index)")
        print("  - producto_id (Foreign Key a products, Nullable)")

    except Exception as e:
        print(f"❌ Error durante la migración: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
