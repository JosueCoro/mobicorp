from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
    JSON,
    BigInteger,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String)
    role = Column(String, default="sales")  # sales, admin, logistics
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    orders = relationship("Order", back_populates="user")
    price_comparisons = relationship("PriceComparison", back_populates="user")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category = Column(String)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=True)  # Precio base/costo (opcional)
    stock = Column(Integer, default=0)
    sku = Column(String, unique=True, nullable=True)
    image_url = Column(String, nullable=True)  # URL o ruta de la imagen
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    orders = relationship("Order", back_populates="product")
    price_comparisons = relationship("PriceComparison", back_populates="product")
    price_alerts = relationship("PriceAlert", back_populates="product")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    requested_price = Column(Float)  # Precio solicitado por el cliente
    final_price = Column(Float, nullable=True)  # Precio final aprobado
    status = Column(String, default="pending")  # pending, approved, rejected
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    approved_at = Column(DateTime, nullable=True)

    product = relationship("Product", back_populates="orders")
    user = relationship("User", back_populates="orders")


class PriceComparison(Base):
    __tablename__ = "price_comparisons"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    min_price = Column(Float)
    max_price = Column(Float)
    avg_price = Column(Float)
    suggested_price = Column(Float)
    source_count = Column(Integer)  # Número de fuentes consultadas
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    product = relationship("Product", back_populates="price_comparisons")
    user = relationship("User", back_populates="price_comparisons")


class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    old_price = Column(Float)
    new_price = Column(Float)
    variation_percent = Column(Float)  # Porcentaje de variación
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    product = relationship("Product", back_populates="price_alerts")


# ============================================
# MODELOS PARA COTIZACIONES DE WHATSAPP
# ============================================


class WhatsAppProveedor(Base):
    """Proveedores de WhatsApp"""

    __tablename__ = "whatsapp_proveedores"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String, unique=True, index=True)  # Número de WhatsApp
    nombre = Column(String)  # Ej: "Suplidor 1", "Suplidor 2", etc.
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    productos = relationship("WhatsAppProductoCotizado", back_populates="proveedor")


class WhatsAppProductoCotizado(Base):
    """Cada producto individual cotizado por WhatsApp"""

    __tablename__ = "whatsapp_productos_cotizados"

    id = Column(BigInteger, primary_key=True)  # ID tipo timestamp único

    # Información del proveedor
    proveedor_id = Column(Integer, ForeignKey("whatsapp_proveedores.id"))
    proveedor_numero = Column(String, index=True)
    proveedor_nombre = Column(String)  # "Suplidor 1", "Suplidor 2"

    # Información del producto
    nombre_producto = Column(String, index=True)  # Ej: "Escritorio Ejecutivo Premium"
    tipo_producto = Column(String, index=True)  # escritorio, silla, armario, estantería
    descripcion = Column(Text)  # Lo que dijo el proveedor sobre este producto

    # Información de precio
    precio = Column(Float, nullable=True)
    tiene_precio = Column(Boolean, default=False)

    # Mensaje original y contexto
    mensaje_completo = Column(Text)  # Mensaje completo del proveedor
    fecha = Column(DateTime, index=True)
    timestamp = Column(BigInteger, index=True)

    # Información adicional extraída
    caracteristicas = Column(JSON)  # Array de características mencionadas
    material = Column(String, nullable=True)  # Material mencionado
    marca = Column(String, nullable=True)  # Marca si fue mencionada
    cantidad_disponible = Column(Integer, nullable=True)  # Stock mencionado
    imagen_url = Column(
        Text, nullable=True
    )  # URL de imagen del producto (del PDF procesado)

    # Metadata
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    proveedor = relationship("WhatsAppProveedor", back_populates="productos")


class ProductoScraped(Base):
    __tablename__ = "productos_scraped"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    precio = Column(Float, index=True)
    categoria = Column(String, index=True)
    link = Column(String, unique=True)  # URL única para evitar duplicados
    imagen = Column(String, nullable=True)
    fuente = Column(String, default="livingroom.com.bo")  # Origen del scraping
    fecha_scraping = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )

    # Para comparación con productos existentes
    producto_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    producto = relationship("Product")
