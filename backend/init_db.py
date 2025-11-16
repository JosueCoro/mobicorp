"""
Script para inicializar la base de datos con datos de ejemplo
"""

from database import SessionLocal, engine, Base
from models import User, Product
from auth import get_password_hash
from dotenv import load_dotenv
import os

# Cargar variables de entorno
load_dotenv()

print("🔧 Inicializando base de datos...")

# Crear tablas
print("📊 Creando tablas en la base de datos...")
Base.metadata.create_all(bind=engine)
print("✅ Tablas creadas exitosamente")

db = SessionLocal()

# Crear usuario de ejemplo
if not db.query(User).filter(User.email == "admin@mobicorp.com").first():
    admin_user = User(
        email="admin@mobicorp.com",
        full_name="Administrador MobiCorp",
        hashed_password=get_password_hash("admin123"),
        role="admin",
    )
    db.add(admin_user)
    print("👤 Usuario administrador creado: admin@mobicorp.com / admin123")

# Productos de ejemplo - Mobiliario Corporativo
sample_products = [
    {
        "name": "Silla Ejecutiva Ergonómica Premium",
        "category": "Asientos - Ejecutiva",
        "description": "Silla ejecutiva de alta calidad con soporte lumbar ajustable, reposabrazos regulables y base de 5 ruedas",
        "price": 1250.00,
        "stock": 15,
        "sku": "MCP-SEJ-001",
    },
    {
        "name": "Silla Gerencial con Reposacabezas",
        "category": "Asientos - Gerencial",
        "description": "Silla gerencial con reposacabezas integrado, tapizado en cuero sintético, mecanismo de inclinación",
        "price": 980.00,
        "stock": 20,
        "sku": "MCP-SGE-002",
    },
    {
        "name": "Silla Operativa Básica",
        "category": "Asientos - Operativa",
        "description": "Silla operativa ergonómica para uso diario, tapizado en tela, altura ajustable",
        "price": 450.00,
        "stock": 35,
        "sku": "MCP-SOP-003",
    },
    {
        "name": "Escritorio Ejecutivo Directoría",
        "category": "Mobiliario Corporativo - Directoría",
        "description": "Escritorio ejecutivo de madera maciza con cajones laterales, acabado en nogal",
        "price": 3200.00,
        "stock": 8,
        "sku": "MCP-EDE-004",
    },
    {
        "name": "Escritorio Gerencial Moderno",
        "category": "Mobiliario Corporativo - Gerencial",
        "description": "Escritorio gerencial con diseño moderno, superficie laminada, cajones integrados",
        "price": 1850.00,
        "stock": 12,
        "sku": "MCP-EGM-005",
    },
    {
        "name": "Mesa de Reunión Ovalada 8 Personas",
        "category": "Mobiliario Corporativo - Reuniones",
        "description": "Mesa de reunión ovalada para 8 personas, estructura metálica, superficie en melamina",
        "price": 2800.00,
        "stock": 6,
        "sku": "MCP-MRO-006",
    },
    {
        "name": "Mesa de Reunión Rectangular 12 Personas",
        "category": "Mobiliario Corporativo - Reuniones",
        "description": "Mesa rectangular grande para 12 personas, ideal para salas de juntas",
        "price": 4500.00,
        "stock": 4,
        "sku": "MCP-MRR-007",
    },
    {
        "name": "Estación de Trabajo Individual",
        "category": "Mobiliario Corporativo - Estaciones de trabajo",
        "description": "Estación de trabajo modular con panel lateral, superficie amplia, gavetas",
        "price": 1200.00,
        "stock": 18,
        "sku": "MCP-ETI-008",
    },
    {
        "name": "Módulo de Recepción Moderno",
        "category": "Mobiliario Corporativo - Recepción",
        "description": "Módulo de recepción con mostrador curvo, cajones y espacio para computadora",
        "price": 2200.00,
        "stock": 5,
        "sku": "MCP-MRM-009",
    },
    {
        "name": "Archivero de 4 Cajones",
        "category": "Mobiliario Corporativo - Apoyo",
        "description": "Archivero metálico de 4 cajones con sistema de seguridad, color gris",
        "price": 650.00,
        "stock": 25,
        "sku": "MCP-ARC-010",
    },
    {
        "name": "Estantería de Acero 5 Niveles",
        "category": "Mobiliario Corporativo - Acero",
        "description": "Estantería metálica de 5 niveles, estructura robusta, ideal para almacenamiento",
        "price": 850.00,
        "stock": 15,
        "sku": "MCP-EAC-011",
    },
    {
        "name": "Sofá Lounge Ejecutivo",
        "category": "Asientos - Lounge",
        "description": "Sofá lounge de 3 plazas, tapizado en cuero sintético, ideal para áreas de descanso",
        "price": 2800.00,
        "stock": 7,
        "sku": "MCP-SLE-012",
    },
    {
        "name": "Mesa de Centro Moderna",
        "category": "Mobiliario Corporativo - Apoyo",
        "description": "Mesa de centro con diseño moderno, superficie de vidrio templado, base metálica",
        "price": 450.00,
        "stock": 20,
        "sku": "MCP-MCM-013",
    },
    {
        "name": "Silla Longarina para Sala de Espera",
        "category": "Asientos - Longarinas",
        "description": "Silla longarina de 3 plazas para salas de espera, estructura metálica, tapizado resistente",
        "price": 1200.00,
        "stock": 10,
        "sku": "MCP-SLO-014",
    },
    {
        "name": "Escritorio Operativo con Estante",
        "category": "Mobiliario Corporativo - Operativa",
        "description": "Escritorio operativo con estante superior, gavetas laterales, ideal para oficinas",
        "price": 750.00,
        "stock": 22,
        "sku": "MCP-EOE-015",
    },
]

for product_data in sample_products:
    if not db.query(Product).filter(Product.name == product_data["name"]).first():
        product = Product(**product_data)
        db.add(product)
        print(f"Producto creado: {product_data['name']}")

db.commit()
print("\nBase de datos inicializada correctamente!")
db.close()
