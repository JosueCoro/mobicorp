"""
Script de migración para crear la nueva tabla de productos cotizados individuales
Reemplaza whatsapp_cotizaciones por whatsapp_productos_cotizados

Ejecutar:
    python migrate_productos_individuales.py
"""

from database import SessionLocal, engine
from models import Base, WhatsAppProveedor, WhatsAppProductoCotizado
from sqlalchemy import text, inspect
import sys


def migrate():
    """Crear nueva tabla y eliminar la antigua"""
    db = SessionLocal()

    try:
        print("🔄 Iniciando migración a productos individuales...")
        print("=" * 60)

        # 1. Verificar si existe la tabla antigua (compatible con PostgreSQL y SQLite)
        inspector = inspect(engine)
        tablas_existentes = inspector.get_table_names()
        tabla_antigua_existe = "whatsapp_cotizaciones" in tablas_existentes

        if tabla_antigua_existe:
            print("⚠️  Tabla antigua 'whatsapp_cotizaciones' detectada")
            print("   Se eliminará y se creará la nueva estructura")

            respuesta = input("\n¿Continuar con la migración? (s/n): ").lower()
            if respuesta != "s":
                print("❌ Migración cancelada")
                return

            # Eliminar tabla antigua
            with engine.connect() as conn:
                conn.execute(text("DROP TABLE IF EXISTS whatsapp_cotizaciones CASCADE"))
                conn.commit()
            print("✅ Tabla antigua eliminada")

        # 2. Crear nueva tabla
        print("\n📦 Creando tabla 'whatsapp_productos_cotizados'...")
        Base.metadata.create_all(bind=engine)
        print("✅ Tabla creada exitosamente")

        # 3. Verificar estructura
        inspector = inspect(engine)
        columnas = inspector.get_columns("whatsapp_productos_cotizados")

        print("\n📋 Estructura de la tabla:")
        print("-" * 60)
        for col in columnas:
            nullable = "" if col["nullable"] else "NOT NULL"
            print(f"   • {col['name']:25} {str(col['type']):15} {nullable}")

        print("\n" + "=" * 60)
        print("✅ Migración completada exitosamente")
        print("\n📌 Próximos pasos:")
        print("   1. Reiniciar el backend: python main.py")
        print("   2. Reiniciar el bot de WhatsApp: node index.js")
        print("   3. Los nuevos mensajes se guardarán como productos individuales")
        print(
            "\n💡 Cada producto cotizado será un registro separado en la base de datos"
        )

    except Exception as e:
        print(f"\n❌ Error durante la migración: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("   MIGRACIÓN A PRODUCTOS INDIVIDUALES")
    print("=" * 60)
    print("\nEsta migración:")
    print("  ✓ Eliminará la tabla 'whatsapp_cotizaciones' antigua")
    print("  ✓ Creará la nueva tabla 'whatsapp_productos_cotizados'")
    print("  ✓ Cada producto será un registro independiente")
    print("  ✓ Incluirá: nombre, precio, tipo, descripción, proveedor")
    print("\n⚠️  NOTA: Los datos antiguos se perderán")
    print("   Si necesitas conservarlos, haz backup primero\n")

    migrate()
