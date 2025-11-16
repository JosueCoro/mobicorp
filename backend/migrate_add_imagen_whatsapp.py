"""
Migración: Agregar campo imagen_url a whatsapp_productos_cotizados
"""

from sqlalchemy import create_engine, text
from database import DATABASE_URL
import sys


def migrate():
    """Agrega campo imagen_url a la tabla whatsapp_productos_cotizados"""
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        try:
            # Verificar si la columna ya existe
            result = conn.execute(
                text(
                    """
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='whatsapp_productos_cotizados' 
                AND column_name='imagen_url'
            """
                )
            )

            if result.fetchone():
                print(
                    "✅ La columna 'imagen_url' ya existe en whatsapp_productos_cotizados"
                )
                return

            # Agregar columna imagen_url
            print("📝 Agregando columna imagen_url...")
            conn.execute(
                text(
                    """
                ALTER TABLE public.whatsapp_productos_cotizados
                ADD COLUMN imagen_url TEXT
            """
                )
            )
            conn.commit()

            print("✅ Migración completada exitosamente")
            print("   - Campo 'imagen_url' agregado a whatsapp_productos_cotizados")

        except Exception as e:
            print(f"❌ Error en la migración: {e}")
            conn.rollback()
            sys.exit(1)


if __name__ == "__main__":
    print("=" * 60)
    print("MIGRACIÓN: Agregar imagen_url a whatsapp_productos_cotizados")
    print("=" * 60)
    migrate()
