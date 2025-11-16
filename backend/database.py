from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configuración de base de datos
# Usar PostgreSQL/Supabase si está disponible, sino SQLite como fallback
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mobicorp.db")

# Si estamos usando PostgreSQL desde Supabase, asegurar que la URL sea válida
if DATABASE_URL.startswith("postgresql://"):
    # Supabase usa postgresql://, SQLAlchemy 2.0+ requiere postgresql+psycopg2://
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

print(
    f"📊 Conectando a base de datos: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'SQLite local'}"
)

engine = create_engine(
    DATABASE_URL,
    echo=False,  # Cambiar a True para ver las queries SQL
    pool_pre_ping=True,  # Verificar conexión antes de usar
    pool_recycle=300,  # Reciclar conexiones cada 5 minutos
    pool_size=2,  # Número máximo de conexiones permanentes
    max_overflow=3,  # Conexiones adicionales temporales
    pool_timeout=30,  # Tiempo de espera para obtener conexión
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Usar DeclarativeBase para SQLAlchemy 2.0+
class Base(DeclarativeBase):
    pass
