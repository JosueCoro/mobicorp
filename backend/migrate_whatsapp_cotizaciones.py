"""
Script de migración para crear tablas de cotizaciones de WhatsApp
"""

from database import engine, Base
from models import WhatsAppProveedor, WhatsAppCotizacion
import sys


def migrate():
    print("🔄 Creando tablas de WhatsApp Cotizaciones...")
    try:
        # Crear solo las tablas nuevas
        WhatsAppProveedor.__table__.create(bind=engine, checkfirst=True)
        WhatsAppCotizacion.__table__.create(bind=engine, checkfirst=True)
        print("✅ Tablas creadas exitosamente!")
        print("   - whatsapp_proveedores")
        print("   - whatsapp_cotizaciones")
        return True
    except Exception as e:
        print(f"❌ Error al crear tablas: {e}")
        return False


if __name__ == "__main__":
    success = migrate()
    sys.exit(0 if success else 1)
