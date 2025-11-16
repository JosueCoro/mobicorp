from sqlalchemy import create_engine, text
from database import DATABASE_URL

engine = create_engine(DATABASE_URL)
conn = engine.connect()

result = conn.execute(
    text(
        """
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name='whatsapp_productos_cotizados' 
    ORDER BY ordinal_position
"""
    )
)

print("\n📋 Estructura de whatsapp_productos_cotizados:")
print("=" * 60)
for row in result:
    print(f"  {row[0]}: {row[1]}")

conn.close()
