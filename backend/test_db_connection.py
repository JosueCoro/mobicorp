#!/usr/bin/env python3
"""
Script para verificar la conexión a la base de datos Supabase
Ejecutar: python test_db_connection.py
"""

import sys
from dotenv import load_dotenv
import os

# Cargar variables de entorno
load_dotenv()

print("🧪 Verificando conexión a Base de Datos...\n")

# Verificar que exista DATABASE_URL
database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("❌ ERROR: No se encontró DATABASE_URL en .env")
    print("   Por favor, crea un archivo .env con DATABASE_URL")
    sys.exit(1)

print(f"📌 URL (sin credenciales): postgresql://...@{database_url.split('@')[1]}")

try:
    from sqlalchemy import create_engine, text

    # Convertir postgresql:// a postgresql+psycopg2://
    db_url = database_url
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    print("\n🔌 Creando conexión con SQLAlchemy...")
    engine = create_engine(
        db_url,
        echo=False,
        pool_pre_ping=True,
        pool_recycle=3600,
    )

    print("🧪 Ejecutando query de prueba...")
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        print("✅ Query ejecutada exitosamente")

    print("\n✅ ¡CONEXIÓN EXITOSA A SUPABASE PostgreSQL!\n")

    # Obtener información de la BD
    with engine.connect() as connection:
        # Contar tablas
        result = connection.execute(
            text(
                """
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public'
        """
            )
        )
        table_count = result.scalar()
        print(f"📊 Tablas en la BD: {table_count}")

        # Listar tablas
        if table_count > 0:
            result = connection.execute(
                text(
                    """
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """
                )
            )
            print("\n📋 Tablas disponibles:")
            for table in result:
                print(f"   • {table[0]}")

    print("\n🎉 El backend está listo para usar!")
    print("   Ejecuta: python init_db.py  (para inicializar datos)")
    print("   Luego:   uvicorn main:app --reload")

except ImportError as e:
    print(f"❌ ERROR: Dependencia no instalada: {e}")
    print("   Ejecuta: pip install -r requirements.txt")
    sys.exit(1)

except Exception as e:
    print(f"❌ ERROR DE CONEXIÓN: {e}")
    print("\n🔍 Posibles causas:")
    print("   1. Credenciales incorrectas en DATABASE_URL")
    print("   2. Supabase no está disponible")
    print("   3. Error de red o firewall")
    print("   4. psycopg2 no instalado (pip install psycopg2-binary)")
    sys.exit(1)
