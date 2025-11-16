from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime

# ==================== USUARIOS ====================


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: Optional[str] = "sales"


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str


# ==================== PRODUCTOS ====================


class ProductBase(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    price: Optional[float] = None
    stock: int = 0
    sku: Optional[str] = None
    image_url: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    sku: Optional[str] = None
    image_url: Optional[str] = None


class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# ==================== PEDIDOS ====================


class OrderBase(BaseModel):
    product_id: int
    quantity: int
    requested_price: float


class OrderCreate(OrderBase):
    pass


class OrderResponse(OrderBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    final_price: Optional[float]
    status: str
    user_id: int
    created_at: datetime
    approved_at: Optional[datetime]
    product: ProductResponse


# ==================== COMPARACIÓN DE PRECIOS ====================


class MarketSource(BaseModel):
    source: str
    price: float
    url: Optional[str] = None


class PriceSuggestion(BaseModel):
    suggested_price: float
    min_price: float
    max_price: float
    avg_price: float
    market_sources: List[MarketSource]
    comparison_id: int


class PriceComparisonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    min_price: float
    max_price: float
    avg_price: float
    suggested_price: float
    source_count: int
    created_at: datetime
    product: ProductResponse


# ==================== CHATBOT ====================


class ChatMessage(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


# ==================== GPT / AI ====================


class GPTRespuestaEmpresaRequest(BaseModel):
    mensaje: str
    numero_proveedor: Optional[str] = "desconocido"
    tiene_precio: bool = False


class GPTRespuestaEmpresaResponse(BaseModel):
    respuesta: str
    exito: bool
    necesita_respuesta: bool = True


class GPTExtraerPreciosRequest(BaseModel):
    mensaje: str
    numero_proveedor: Optional[str] = "desconocido"


class GPTExtraerPreciosResponse(BaseModel):
    tienePrecio: bool
    precios: List[str]
    productos: List[str]
    metodo: str
    exito: bool


class GPTObtenerRespuestaRequest(BaseModel):
    mensaje: str
    numero_usuario: Optional[str] = "desconocido"


class GPTObtenerRespuestaResponse(BaseModel):
    respuesta: str
    exito: bool


class GPTLimpiarHistorialRequest(BaseModel):
    numero: str


class GPTProcesarPDFResponse(BaseModel):
    exito: bool
    mensaje: str
    imagen_base64: Optional[str] = None
    archivo: str
    archivo_original: str
    pagina: int
    categoria: str
    razon: str


# ==================== COTIZACIONES WHATSAPP ====================


class WhatsAppProveedorBase(BaseModel):
    numero: str
    nombre: str  # "Suplidor 1", "Suplidor 2", etc.
    activo: bool = True


class WhatsAppProveedorCreate(WhatsAppProveedorBase):
    pass


class WhatsAppProveedorResponse(WhatsAppProveedorBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class WhatsAppProductoCotizadoBase(BaseModel):
    proveedor_numero: str
    proveedor_nombre: str  # "Suplidor 1", "Suplidor 2"
    nombre_producto: str  # "Escritorio Ejecutivo Premium"
    tipo_producto: str  # "escritorio", "silla", "armario", "estanteria"
    descripcion: Optional[str] = None
    precio: Optional[float] = None
    tiene_precio: bool = False
    mensaje_completo: str
    fecha: datetime
    caracteristicas: List[str] = []
    material: Optional[str] = None
    marca: Optional[str] = None
    cantidad_disponible: Optional[int] = None
    imagen_url: Optional[str] = None  # URL de imagen del producto


class WhatsAppProductoCotizadoCreate(WhatsAppProductoCotizadoBase):
    id: int  # timestamp ID único
    timestamp: int


class WhatsAppProductoCotizadoResponse(WhatsAppProductoCotizadoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    proveedor_id: Optional[int]
    timestamp: int
    created_at: datetime


class WhatsAppProductoCotizadoList(BaseModel):
    productos: List[WhatsAppProductoCotizadoResponse]
    total: int
    ultima_actualizacion: Optional[datetime]


# ==================== WEB SCRAPING ====================


class ProductoScrapedBase(BaseModel):
    nombre: str
    precio: float
    categoria: str
    link: str
    imagen: Optional[str] = None
    fuente: str = "livingroom.com.bo"


class ProductoScrapedCreate(ProductoScrapedBase):
    pass


class ProductoScrapedResponse(ProductoScrapedBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    fecha_scraping: datetime
    producto_id: Optional[int] = None


class ScrapingRequest(BaseModel):
    categoria: int = 1  # 1=Bar, 2=Muebles Oficina, 3=Educativo, 4=Sillas Oficina
    min_precio: int = 0
    max_precio: int = 100
    delay: float = 0.3


class ScrapingFullRequest(BaseModel):
    categoria: int = 1  # 1=Bar, 2=Muebles Oficina, 3=Educativo, 4=Sillas Oficina
    delay: float = 0.3


class ScrapingResponse(BaseModel):
    total_productos: int
    productos_nuevos: int
    productos_duplicados: int
    productos: List[ProductoScrapedResponse]
    estadisticas: dict
