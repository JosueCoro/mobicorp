"""
Script de migración para agregar la columna image_url a la tabla products
"""
import sqlite3
from pathlib import Path

# Ruta a la base de datos
db_path = Path("mobicorp.db")

if not db_path.exists():
    print("La base de datos no existe. Se creará automáticamente al iniciar el servidor.")
    exit(0)

# Conectar a la base de datos
conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

try:
    # Verificar si la columna ya existe
    cursor.execute("PRAGMA table_info(products)")
    columns = [column[1] for column in cursor.fetchall()]
    
    if 'image_url' in columns:
        print("La columna 'image_url' ya existe en la tabla 'products'.")
    else:
        # Agregar la columna image_url
        print("Agregando columna 'image_url' a la tabla 'products'...")
        cursor.execute("ALTER TABLE products ADD COLUMN image_url TEXT")
        conn.commit()
        print("[OK] Columna 'image_url' agregada exitosamente.")
    
    # Verificar el resultado
    cursor.execute("PRAGMA table_info(products)")
    columns = cursor.fetchall()
    print("\nColumnas actuales en la tabla 'products':")
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")
    
except sqlite3.Error as e:
    print(f"Error al migrar la base de datos: {e}")
    conn.rollback()
finally:
    conn.close()

print("\nMigración completada!")

