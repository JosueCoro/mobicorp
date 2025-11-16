from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    status,
    Query,
    UploadFile,
    File,
    Form,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import uvicorn
import os
import shutil
import time
from pathlib import Path
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

from database import SessionLocal, engine, Base
from models import (
    User,
    Product,
    Order,
    PriceComparison,
    PriceAlert,
    WhatsAppProveedor,
    WhatsAppProductoCotizado,
    ProductoScraped,
)
from schemas import (
    UserCreate,
    UserResponse,
    Token,
    OrderCreate,
    OrderResponse,
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    PriceComparisonResponse,
    PriceSuggestion,
    ChatMessage,
    ChatResponse,
    GPTRespuestaEmpresaRequest,
    GPTRespuestaEmpresaResponse,
    GPTExtraerPreciosRequest,
    GPTExtraerPreciosResponse,
    GPTObtenerRespuestaRequest,
    GPTObtenerRespuestaResponse,
    GPTLimpiarHistorialRequest,
    GPTProcesarPDFResponse,
    WhatsAppProveedorCreate,
    WhatsAppProveedorResponse,
    WhatsAppProductoCotizadoCreate,
    WhatsAppProductoCotizadoResponse,
    WhatsAppProductoCotizadoList,
    ProductoScrapedResponse,
    ScrapingRequest,
    ScrapingFullRequest,
    ScrapingResponse,
)
from auth import (
    get_current_user,
    create_access_token,
    verify_password,
    get_password_hash,
)
from price_scraper import PriceScraper
from chatbot import ChatbotAssistant
from gpt_client import gpt_client
from whatsapp_service import whatsapp_service
from scraper_service import scraper_service

# Crear tablas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MobiCorp - Sistema de Gestión de Muebles y Mobiliario",
    description="Sistema especializado en la gestión de ventas de muebles y mobiliario de oficina (sillas ejecutivas, escritorios, mesas, etc.)",
    version="1.0.0",
)

# CORS
# Dominios permitidos: localhost para desarrollo y Vercel para producción
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:5173",
    "https://innova-hack-mobi-corp-git-main-jorge-penas-projects-e24e6692.vercel.app",
    "https://innova-hack-mobi-corp-pw2iimr8e-jorge-penas-projects-e24e6692.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


# Dependencia para obtener DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Inicializar servicios
price_scraper = PriceScraper()
chatbot = ChatbotAssistant()

# Configurar directorio para imágenes
UPLOAD_DIR = Path("uploads/images")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ==================== AUTENTICACIÓN ====================


@app.post("/api/auth/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Registrar nuevo usuario"""
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email ya registrado")

    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        role=user.role or "sales",
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/api/auth/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    """Iniciar sesión"""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/auth/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Obtener información del usuario actual"""
    return current_user


# ==================== PRODUCTOS ====================


@app.get("/api/products", response_model=List[ProductResponse])
def get_products(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtener lista de productos"""
    query = db.query(Product)
    if category:
        query = query.filter(Product.category == category)
    products = query.offset(skip).limit(limit).all()
    return products


@app.post("/api/products", response_model=ProductResponse)
async def create_product(
    name: str = Form(...),
    category: str = Form(...),
    description: Optional[str] = Form(None),
    price: Optional[str] = Form(None),
    stock: str = Form("0"),
    sku: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crear nuevo producto con imagen opcional"""
    try:
        image_url = None

        # Guardar imagen si se proporciona
        if image and image.filename:
            # Generar nombre único para la imagen
            file_extension = (
                os.path.splitext(image.filename)[1] if image.filename else ".jpg"
            )
            # Sanitizar nombre del producto para el nombre del archivo
            safe_name = "".join(
                c if c.isalnum() or c in ("-", "_") else "_" for c in name
            )[:50]
            unique_filename = f"{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{safe_name}{file_extension}"
            file_path = UPLOAD_DIR / unique_filename

            # Guardar archivo
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)

            # Guardar URL relativa
            image_url = f"/uploads/images/{unique_filename}"

        # Validar campos requeridos
        if not name or not name.strip():
            raise HTTPException(
                status_code=400, detail="El nombre del producto es requerido"
            )
        if not category or not category.strip():
            raise HTTPException(
                status_code=400, detail="La categoría del producto es requerida"
            )

        # Convertir tipos
        price_float = None
        if price and price.strip():
            try:
                price_float = float(price)
                if price_float < 0:
                    price_float = None
            except (ValueError, TypeError):
                price_float = None

        stock_int = 0
        try:
            stock_int = int(stock) if stock and stock.strip() else 0
            if stock_int < 0:
                stock_int = 0
        except (ValueError, TypeError):
            stock_int = 0

        # Crear producto
        db_product = Product(
            name=name.strip(),
            category=category.strip(),
            description=(
                description.strip() if description and description.strip() else None
            ),
            price=price_float,
            stock=stock_int,
            sku=sku.strip() if sku and sku.strip() else None,
            image_url=image_url,
        )
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        return db_product
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error completo al crear producto: {type(e).__name__}: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=400, detail=f"Error al crear producto: {str(e)}"
        )


@app.get("/api/products/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtener producto por ID"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product


@app.put("/api/products/{product_id}", response_model=ProductResponse)
@app.post("/api/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    name: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    price: Optional[str] = Form(None),
    stock: Optional[str] = Form(None),
    sku: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Actualizar producto existente con imagen opcional"""
    try:
        # Buscar producto
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        # Actualizar imagen si se proporciona
        if image and image.filename:
            # Generar nombre único para la imagen
            file_extension = (
                os.path.splitext(image.filename)[1] if image.filename else ".jpg"
            )
            safe_name = "".join(
                c if c.isalnum() or c in ("-", "_") else "_"
                for c in (name or product.name)
            )[:50]
            unique_filename = f"{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{safe_name}{file_extension}"
            file_path = UPLOAD_DIR / unique_filename

            # Guardar archivo
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)

            # Eliminar imagen anterior si existe
            if product.image_url:
                old_file = UPLOAD_DIR / os.path.basename(product.image_url)
                if old_file.exists():
                    old_file.unlink()

            # Actualizar URL
            product.image_url = f"/uploads/images/{unique_filename}"

        # Actualizar campos si se proporcionan
        if name is not None and name.strip():
            product.name = name.strip()

        if category is not None and category.strip():
            product.category = category.strip()

        if description is not None:
            product.description = description.strip() if description.strip() else None

        if price is not None:
            if price.strip():
                try:
                    price_float = float(price)
                    product.price = price_float if price_float >= 0 else None
                except (ValueError, TypeError):
                    pass
            else:
                product.price = None

        if stock is not None:
            if stock.strip():
                try:
                    stock_int = int(stock)
                    product.stock = stock_int if stock_int >= 0 else 0
                except (ValueError, TypeError):
                    pass
            else:
                product.stock = 0

        if sku is not None:
            product.sku = sku.strip() if sku.strip() else None

        db.commit()
        db.refresh(product)
        return product
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error al actualizar producto: {type(e).__name__}: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=400, detail=f"Error al actualizar producto: {str(e)}"
        )


# ==================== PEDIDOS ====================


@app.get("/api/orders", response_model=List[OrderResponse])
def get_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtener lista de pedidos"""
    orders = (
        db.query(Order)
        .offset(skip)
        .limit(limit)
        .order_by(Order.created_at.desc())
        .all()
    )
    return orders


@app.post("/api/orders", response_model=OrderResponse)
def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crear nuevo pedido"""
    # Verificar que el producto existe
    product = db.query(Product).filter(Product.id == order.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    db_order = Order(
        product_id=order.product_id,
        quantity=order.quantity,
        requested_price=order.requested_price,
        user_id=current_user.id,
        status="pending",
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order


@app.get("/api/orders/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtener pedido por ID"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return order


@app.post("/api/orders/{order_id}/approve")
def approve_order(
    order_id: int,
    final_price: float = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aprobar pedido con precio final"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    order.final_price = final_price
    order.status = "approved"
    order.approved_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Pedido aprobado exitosamente"}


# ==================== COMPARACIÓN DE PRECIOS ====================


@app.post("/api/prices/suggest", response_model=PriceSuggestion)
def suggest_price(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtener precio sugerido basado en comparación de mercado"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Realizar web scraping para obtener precios del mercado
    market_prices = price_scraper.scrape_prices(product.name, product.category)

    if not market_prices:
        raise HTTPException(
            status_code=404,
            detail="No se encontraron precios en el mercado para este producto",
        )

    # Calcular estadísticas
    prices = [p["price"] for p in market_prices]
    min_price = min(prices)
    max_price = max(prices)
    avg_price = sum(prices) / len(prices)

    # Precio sugerido basado en promedio de mercado
    suggested_price = avg_price

    # Guardar comparación en BD
    comparison = PriceComparison(
        product_id=product_id,
        min_price=min_price,
        max_price=max_price,
        avg_price=avg_price,
        suggested_price=suggested_price,
        source_count=len(market_prices),
        user_id=current_user.id,
    )
    db.add(comparison)
    db.commit()

    # Verificar alertas de precio
    if (
        product.price and abs(product.price - avg_price) / product.price > 0.1
    ):  # 10% de variación
        alert = PriceAlert(
            product_id=product_id,
            old_price=product.price,
            new_price=avg_price,
            variation_percent=((avg_price - product.price) / product.price) * 100,
        )
        db.add(alert)
        db.commit()

    return {
        "suggested_price": suggested_price,
        "min_price": min_price,
        "max_price": max_price,
        "avg_price": avg_price,
        "market_sources": market_prices,
        "comparison_id": comparison.id,
    }


@app.get("/api/prices/comparisons", response_model=List[PriceComparisonResponse])
def get_price_comparisons(
    product_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtener historial de comparaciones de precios"""
    query = db.query(PriceComparison)
    if product_id:
        query = query.filter(PriceComparison.product_id == product_id)
    comparisons = (
        query.offset(skip)
        .limit(limit)
        .order_by(PriceComparison.created_at.desc())
        .all()
    )
    return comparisons


@app.get("/api/prices/alerts")
def get_price_alerts(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Obtener alertas de variación de precios"""
    alerts = db.query(PriceAlert).order_by(PriceAlert.created_at.desc()).limit(50).all()
    return [
        {
            "id": alert.id,
            "product_id": alert.product_id,
            "product_name": alert.product.name if alert.product else "N/A",
            "old_price": alert.old_price,
            "new_price": alert.new_price,
            "variation_percent": alert.variation_percent,
            "created_at": alert.created_at,
        }
        for alert in alerts
    ]


# ==================== CHATBOT ====================


@app.post("/api/chat", response_model=ChatResponse)
def chat(
    message: ChatMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Chatbot para asistencia al personal de ventas"""
    response = chatbot.process_message(message.message, db, current_user)
    return {"response": response}


# ==================== GPT / OPENAI ====================


@app.get("/api/gpt/health")
def gpt_health():
    """Verifica el estado del servicio de GPT"""
    return {
        "status": "ok",
        "message": "Servicio de GPT activo",
        "model": gpt_client.model,
        "api_key_configured": gpt_client.api_key is not None,
    }


@app.post(
    "/api/gpt/generar-respuesta-empresa", response_model=GPTRespuestaEmpresaResponse
)
def gpt_generar_respuesta_empresa(
    request: GPTRespuestaEmpresaRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Genera una respuesta profesional para negociar con proveedores
    Utiliza IA para crear respuestas contextuales y naturales
    """
    try:
        resultado = gpt_client.generar_respuesta_empresa(
            mensaje=request.mensaje,
            numero_proveedor=request.numero_proveedor,
            tiene_precio=request.tiene_precio,
        )

        if not resultado.get("exito"):
            raise HTTPException(
                status_code=500,
                detail=resultado.get("error", "Error al generar respuesta"),
            )

        return {
            "respuesta": resultado.get("respuesta", ""),
            "exito": resultado.get("exito", False),
            "necesita_respuesta": resultado.get("necesita_respuesta", True),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/gpt/extraer-precios", response_model=GPTExtraerPreciosResponse)
def gpt_extraer_precios(
    request: GPTExtraerPreciosRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Extrae información de precios de un mensaje
    Primero intenta con regex, luego con IA si es necesario
    """
    try:
        resultado = gpt_client.extraer_precios(
            mensaje=request.mensaje,
            numero_proveedor=request.numero_proveedor,
        )

        if not resultado.get("exito"):
            raise HTTPException(
                status_code=500,
                detail=resultado.get("error", "Error al extraer precios"),
            )

        return {
            "tienePrecio": resultado.get("tienePrecio", False),
            "precios": resultado.get("precios", []),
            "productos": resultado.get("productos", []),
            "metodo": resultado.get("metodo", "regex"),
            "exito": resultado.get("exito", False),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/gpt/obtener-respuesta", response_model=GPTObtenerRespuestaResponse)
def gpt_obtener_respuesta(
    request: GPTObtenerRespuestaRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Obtiene una respuesta de IA general para usuario
    Asistente virtual de atención al cliente
    """
    try:
        resultado = gpt_client.obtener_respuesta(
            mensaje=request.mensaje,
            numero_usuario=request.numero_usuario,
        )

        if not resultado.get("exito"):
            raise HTTPException(
                status_code=500,
                detail=resultado.get("error", "Error al obtener respuesta"),
            )

        return {
            "respuesta": resultado.get("respuesta", ""),
            "exito": resultado.get("exito", False),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/gpt/limpiar-historial")
def gpt_limpiar_historial(
    request: GPTLimpiarHistorialRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Limpia el historial de conversación de un usuario
    """
    try:
        gpt_client.limpiar_historial(request.numero)
        return {"exito": True, "mensaje": "Historial limpiado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/gpt/procesar-pdf", response_model=GPTProcesarPDFResponse)
async def gpt_procesar_pdf(
    pdf_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Procesa un PDF de manera inteligente:
    1. Extrae texto de todas las páginas
    2. Usa OpenAI para analizar y seleccionar la página de muebles más relevante
    3. Extrae esa página a un PDF separado
    4. Retorna el PDF recortado en base64 (NO imagen)
    """
    try:
        import base64
        from PyPDF2 import PdfReader, PdfWriter
        from io import BytesIO
        import json
        import openai

        # Validar que se envió un archivo
        if not pdf_file or pdf_file.filename == "":
            raise HTTPException(status_code=400, detail="No se envió archivo PDF")

        # Validar que es un PDF
        if not pdf_file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="El archivo no es un PDF")

        # Leer el PDF en memoria
        pdf_bytes = await pdf_file.read()
        pdf_reader = PdfReader(BytesIO(pdf_bytes))

        num_paginas = len(pdf_reader.pages)

        # Extraer texto de todas las páginas
        contenido_paginas = []
        for idx, page in enumerate(pdf_reader.pages):
            try:
                texto = page.extract_text()
                contenido_paginas.append(
                    {"pagina": idx + 1, "texto": (texto[:500] if texto else "")}
                )
            except Exception as e:
                contenido_paginas.append({"pagina": idx + 1, "texto": ""})

        # Usar OpenAI para analizar el contenido
        resumen_paginas = "\n---\n".join(
            [f"Página {p['pagina']}:\n{p['texto']}" for p in contenido_paginas]
        )

        prompt_analisis = f"""Analiza el siguiente contenido de un catálogo PDF y encuentra la página que hable de MUEBLES DE OFICINA.

Si hay varias páginas sobre muebles de oficina, selecciona SOLO UNA (preferiblemente la que tenga más contenido relevante y detalles sobre muebles).

Debes responder ÚNICAMENTE en formato JSON válido sin explicaciones adicionales:
{{
    "page_number": <número de página>,
    "categoria": "<categoría encontrada>",
    "razon": "<breve razón de la selección>"
}}

Contenido del PDF:
{resumen_paginas}"""

        try:
            response = openai.ChatCompletion.create(
                model=gpt_client.model,
                messages=[
                    {
                        "role": "system",
                        "content": "Eres un asistente especializado en analizar catálogos PDF de muebles. Debes identificar páginas sobre muebles de oficina y responder SOLO con JSON válido.",
                    },
                    {"role": "user", "content": prompt_analisis},
                ],
                temperature=0.3,
                max_tokens=200,
                timeout=15,
            )

            resultado_texto = response.choices[0].message.content.strip()

            # Parsear respuesta JSON
            try:
                resultado = json.loads(resultado_texto)
                pagina_producto = resultado.get("page_number", 1)
                categoria = resultado.get("categoria", "Muebles")
                razon = resultado.get("razon", "")
            except json.JSONDecodeError:
                # Fallback: buscar por keywords
                pagina_producto = 1
                categoria = "Muebles"
                razon = "Selección automática por palabras clave"
                for p in contenido_paginas:
                    palabras_clave = [
                        "silla",
                        "escritorio",
                        "mesa",
                        "armario",
                        "estante",
                        "mueble",
                        "oficina",
                    ]
                    if any(palabra in p["texto"].lower() for palabra in palabras_clave):
                        pagina_producto = p["pagina"]
                        break

        except Exception as e:
            # Fallback: usar búsqueda por keywords
            pagina_producto = 1
            categoria = "Muebles"
            razon = "Selección automática por palabras clave"
            for p in contenido_paginas:
                palabras_clave = [
                    "silla",
                    "escritorio",
                    "mesa",
                    "armario",
                    "estante",
                    "mueble",
                    "oficina",
                ]
                if any(palabra in p["texto"].lower() for palabra in palabras_clave):
                    pagina_producto = p["pagina"]
                    break

        # Validar número de página
        pagina_producto = max(1, min(pagina_producto, num_paginas))

        # Extraer la página seleccionada a PDF
        pdf_writer = PdfWriter()
        pdf_writer.add_page(pdf_reader.pages[pagina_producto - 1])

        # Guardar el PDF extraído en memoria
        pdf_extraido = BytesIO()
        pdf_writer.write(pdf_extraido)
        pdf_extraido.seek(0)

        # Convertir página a imagen PNG
        imagen_base64 = None
        try:
            import pypdfium2 as pdfium
            from PIL import Image
            import numpy as np

            pdf_extraido.seek(0)
            pdf_document = pdfium.PdfDocument(pdf_extraido)
            page = pdf_document[0]
            bitmap = page.render(scale=200 / 72).to_pil()
            imagen = bitmap

            if imagen:
                # Crop inteligente de imagen
                try:
                    img_array = np.array(imagen)

                    if len(img_array.shape) == 3:
                        gris = np.mean(img_array, axis=2)
                    else:
                        gris = img_array

                    umbral = 250
                    filas_con_contenido = np.where(np.min(gris, axis=1) < umbral)[0]
                    cols_con_contenido = np.where(np.min(gris, axis=0) < umbral)[0]

                    if len(filas_con_contenido) > 0 and len(cols_con_contenido) > 0:
                        margen = 10
                        top = max(0, filas_con_contenido[0] - margen)
                        bottom = min(
                            img_array.shape[0], filas_con_contenido[-1] + margen
                        )
                        left = max(0, cols_con_contenido[0] - margen)
                        right = min(img_array.shape[1], cols_con_contenido[-1] + margen)

                        imagen_crop = imagen.crop((left, top, right, bottom))
                        imagen = imagen_crop
                except Exception:
                    pass

                # Codificar imagen a base64
                img_bytes = BytesIO()
                imagen.save(img_bytes, format="PNG")
                img_bytes.seek(0)
                imagen_base64 = base64.b64encode(img_bytes.getvalue()).decode("utf-8")

        except Exception:
            pass

        # Generar nombre del archivo
        nombre_archivo = f"muebles_pagina_{pagina_producto}.pdf"

        return {
            "exito": True,
            "mensaje": "PDF analizado y página extraída correctamente",
            "imagen_base64": imagen_base64,
            "archivo": nombre_archivo,
            "archivo_original": pdf_file.filename,
            "pagina": pagina_producto,
            "categoria": categoria,
            "razon": razon,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== WHATSAPP BOT ====================


@app.get("/api/whatsapp/estado")
def whatsapp_estado(current_user: User = Depends(get_current_user)):
    """
    Obtiene el estado actual del bot de WhatsApp
    """
    return whatsapp_service.get_estado()


@app.get("/api/whatsapp/qr")
def whatsapp_qr(current_user: User = Depends(get_current_user)):
    """
    Obtiene el código QR para vincular WhatsApp
    """
    estado = whatsapp_service.get_estado()

    if estado["estado"] == "conectado":
        return {
            "conectado": True,
            "mensaje": "WhatsApp ya está conectado",
            "info_sesion": estado["info_sesion"],
        }

    if not estado["qr_disponible"]:
        return {
            "conectado": False,
            "qr_disponible": False,
            "mensaje": "Esperando generación de código QR. Asegúrate de que el bot esté corriendo.",
        }

    return {
        "conectado": False,
        "qr_disponible": True,
        "qr_code": whatsapp_service.qr_code,
        "qr_image": whatsapp_service.qr_image,  # Imagen del QR para mostrar en el navegador
        "mensaje": "Escanea el código QR con WhatsApp",
    }


@app.post("/api/whatsapp/desconectar")
def whatsapp_desconectar(current_user: User = Depends(get_current_user)):
    """
    Desconecta el bot de WhatsApp
    """
    whatsapp_service.set_desconectado()
    return {"exito": True, "mensaje": "Bot desconectado"}


@app.post("/api/whatsapp/iniciar")
async def whatsapp_iniciar(current_user: User = Depends(get_current_user)):
    """
    Inicia el proceso del bot de WhatsApp
    """
    resultado = await whatsapp_service.iniciar_bot()
    return resultado


@app.post("/api/whatsapp/detener")
async def whatsapp_detener(current_user: User = Depends(get_current_user)):
    """
    Detiene el proceso del bot de WhatsApp
    """
    resultado = await whatsapp_service.detener_bot()
    return resultado


@app.post("/api/whatsapp/estado-interno")
async def whatsapp_estado_interno(data: dict):
    """
    Endpoint interno para que el bot de Node.js reporte su estado
    No requiere autenticación porque es llamado desde el bot
    """
    try:
        print(f"📥 Recibiendo estado del bot: {data}")

        estado = data.get("estado")
        qr_code = data.get("qr_code")
        qr_image = data.get("qr_image")
        info_sesion = data.get("info_sesion")

        if estado == "escaneando" and qr_code:
            print(
                f"📱 QR recibido, longitud imagen: {len(qr_image) if qr_image else 0}"
            )
            whatsapp_service.qr_code = qr_code
            whatsapp_service.qr_image = qr_image  # Guardar imagen del QR
            whatsapp_service.estado = "escaneando"
            whatsapp_service.ultima_actualizacion = datetime.now().isoformat()
        elif estado == "conectado":
            print(f"✅ Bot conectado: {info_sesion}")
            whatsapp_service.set_conectado(info_sesion or {})
        elif estado == "desconectado":
            print(f"⚠️ Bot desconectado")
            whatsapp_service.set_desconectado()

        return {"exito": True, "mensaje": "Estado actualizado"}
    except Exception as e:
        print(f"❌ Error actualizando estado: {e}")
        return {"exito": False, "mensaje": str(e)}


@app.get("/api/whatsapp/cotizaciones")
def whatsapp_cotizaciones(
    limit: int = 100, current_user: User = Depends(get_current_user)
):
    """
    Obtiene las cotizaciones recibidas por WhatsApp
    """
    cotizaciones = whatsapp_service.get_cotizaciones(limit)
    return {"total": len(cotizaciones), "cotizaciones": cotizaciones}


@app.post("/api/whatsapp/enviar-mensaje")
def whatsapp_enviar_mensaje(
    numero: str = Form(...),
    mensaje: str = Form(...),
    current_user: User = Depends(get_current_user),
):
    """
    Envía un mensaje personalizado a un proveedor
    Nota: Esta función requiere que el bot de WhatsApp esté corriendo
    """
    estado = whatsapp_service.get_estado()

    if estado["estado"] != "conectado":
        raise HTTPException(
            status_code=400, detail="El bot de WhatsApp no está conectado"
        )

    # Aquí se integraría con el bot real de WhatsApp
    # Por ahora retornamos éxito simulado
    return {"exito": True, "mensaje": f"Mensaje enviado a {numero}", "numero": numero}


@app.post("/api/whatsapp/solicitar-cotizaciones")
def whatsapp_solicitar_cotizaciones(current_user: User = Depends(get_current_user)):
    """
    Envía solicitud de cotización a todos los proveedores
    """
    estado = whatsapp_service.get_estado()

    if estado["estado"] != "conectado":
        raise HTTPException(
            status_code=400, detail="El bot de WhatsApp no está conectado"
        )

    # Aquí se integraría con el bot real de WhatsApp
    return {
        "exito": True,
        "mensaje": "Solicitudes enviadas a todos los proveedores",
        "total_proveedores": 2,  # Ajustar según la configuración real
    }


# ==================== REPORTES ====================


@app.get("/api/reports/orders")
def get_orders_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generar reporte de pedidos"""
    query = db.query(Order)

    if start_date:
        query = query.filter(Order.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(Order.created_at <= datetime.fromisoformat(end_date))

    orders = query.all()

    return {
        "total_orders": len(orders),
        "total_revenue": sum(o.final_price or 0 for o in orders),
        "pending_orders": len([o for o in orders if o.status == "pending"]),
        "approved_orders": len([o for o in orders if o.status == "approved"]),
        "orders": [
            {
                "id": o.id,
                "product_name": o.product.name,
                "quantity": o.quantity,
                "final_price": o.final_price,
                "status": o.status,
                "created_at": o.created_at,
            }
            for o in orders
        ],
    }


@app.get("/api/reports/margins")
def get_margins_report(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Generar reporte de márgenes"""
    orders = db.query(Order).filter(Order.status == "approved").all()

    margins = []
    for order in orders:
        if order.final_price and order.product.price:
            cost = order.product.price * order.quantity
            revenue = order.final_price * order.quantity
            margin = ((revenue - cost) / revenue) * 100 if revenue > 0 else 0
            margins.append(
                {
                    "order_id": order.id,
                    "product_name": order.product.name,
                    "cost": cost,
                    "revenue": revenue,
                    "margin_percent": margin,
                }
            )

    return {
        "total_margin": sum(m["revenue"] - m["cost"] for m in margins),
        "avg_margin_percent": (
            sum(m["margin_percent"] for m in margins) / len(margins) if margins else 0
        ),
        "margins": margins,
    }


# ==================== ENDPOINTS WHATSAPP COTIZACIONES ====================


@app.post("/api/whatsapp/proveedores", response_model=WhatsAppProveedorResponse)
def crear_proveedor(proveedor: WhatsAppProveedorCreate, db: Session = Depends(get_db)):
    """Crear o actualizar un proveedor de WhatsApp"""
    # Buscar si existe
    db_proveedor = (
        db.query(WhatsAppProveedor)
        .filter(WhatsAppProveedor.numero == proveedor.numero)
        .first()
    )

    if db_proveedor:
        # Actualizar
        db_proveedor.nombre = proveedor.nombre
        db_proveedor.activo = proveedor.activo
    else:
        # Crear nuevo
        db_proveedor = WhatsAppProveedor(**proveedor.model_dump())
        db.add(db_proveedor)

    db.commit()
    db.refresh(db_proveedor)
    return db_proveedor


@app.get("/api/whatsapp/proveedores", response_model=List[WhatsAppProveedorResponse])
def obtener_proveedores(db: Session = Depends(get_db), activo: Optional[bool] = None):
    """Obtener lista de proveedores"""
    query = db.query(WhatsAppProveedor)
    if activo is not None:
        query = query.filter(WhatsAppProveedor.activo == activo)
    return query.all()


@app.post("/api/whatsapp/upload-image")
async def upload_whatsapp_image(file: UploadFile = File(...)):
    """Subir imagen desde WhatsApp bot y devolver URL pública"""
    try:
        # Validar que sea una imagen
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=400, detail="El archivo debe ser una imagen"
            )

        # Generar nombre único
        timestamp = int(time.time() * 1000)
        file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        unique_filename = f"whatsapp_{timestamp}.{file_extension}"

        # Guardar archivo
        file_path = UPLOAD_DIR / unique_filename
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Devolver URL completa
        image_url = f"http://localhost:8001/uploads/images/{unique_filename}"

        return {"success": True, "url": image_url, "filename": unique_filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir imagen: {str(e)}")


@app.post("/api/whatsapp/productos", response_model=WhatsAppProductoCotizadoResponse)
def crear_producto_cotizado(
    producto: WhatsAppProductoCotizadoCreate, db: Session = Depends(get_db)
):
    """Guardar un producto individual cotizado por WhatsApp"""
    # Buscar o crear proveedor
    proveedor = (
        db.query(WhatsAppProveedor)
        .filter(WhatsAppProveedor.numero == producto.proveedor_numero)
        .first()
    )

    if not proveedor:
        # Crear proveedor automáticamente
        proveedor = WhatsAppProveedor(
            numero=producto.proveedor_numero,
            nombre=producto.proveedor_nombre,
            activo=True,
        )
        db.add(proveedor)
        db.commit()
        db.refresh(proveedor)

    # Crear producto cotizado
    db_producto = WhatsAppProductoCotizado(
        **producto.model_dump(), proveedor_id=proveedor.id
    )
    db.add(db_producto)
    db.commit()
    db.refresh(db_producto)
    return db_producto


@app.get("/api/whatsapp/productos", response_model=WhatsAppProductoCotizadoList)
def obtener_productos_cotizados(
    db: Session = Depends(get_db),
    proveedor_numero: Optional[str] = None,
    tipo_producto: Optional[str] = None,
    tiene_precio: Optional[bool] = None,
    nombre_producto: Optional[str] = None,
    limite: int = Query(100, le=1000),
    offset: int = 0,
):
    """Obtener lista de productos cotizados con filtros avanzados"""
    query = db.query(WhatsAppProductoCotizado)

    # Filtros
    if proveedor_numero:
        query = query.filter(
            WhatsAppProductoCotizado.proveedor_numero == proveedor_numero
        )

    if tipo_producto:
        query = query.filter(WhatsAppProductoCotizado.tipo_producto == tipo_producto)

    if tiene_precio is not None:
        query = query.filter(WhatsAppProductoCotizado.tiene_precio == tiene_precio)

    if nombre_producto:
        query = query.filter(
            WhatsAppProductoCotizado.nombre_producto.ilike(f"%{nombre_producto}%")
        )

    total = query.count()
    productos = (
        query.order_by(WhatsAppProductoCotizado.timestamp.desc())
        .offset(offset)
        .limit(limite)
        .all()
    )

    ultima = (
        db.query(WhatsAppProductoCotizado)
        .order_by(WhatsAppProductoCotizado.timestamp.desc())
        .first()
    )
    ultima_actualizacion = ultima.fecha if ultima else None

    return {
        "productos": productos,
        "total": total,
        "ultima_actualizacion": ultima_actualizacion,
    }


@app.get(
    "/api/whatsapp/productos/{producto_id}",
    response_model=WhatsAppProductoCotizadoResponse,
)
def obtener_producto_cotizado(producto_id: int, db: Session = Depends(get_db)):
    """Obtener un producto cotizado específico"""
    producto = (
        db.query(WhatsAppProductoCotizado)
        .filter(WhatsAppProductoCotizado.id == producto_id)
        .first()
    )

    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    return producto


@app.delete("/api/whatsapp/productos/{producto_id}")
def eliminar_producto_cotizado(producto_id: int, db: Session = Depends(get_db)):
    """Eliminar un producto cotizado"""
    producto = (
        db.query(WhatsAppProductoCotizado)
        .filter(WhatsAppProductoCotizado.id == producto_id)
        .first()
    )

    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    db.delete(producto)
    db.commit()
    return {"message": "Producto eliminado exitosamente"}


@app.get("/api/whatsapp/productos/proveedor/{proveedor_numero}/resumen")
def obtener_resumen_proveedor(proveedor_numero: str, db: Session = Depends(get_db)):
    """Obtener resumen de productos por proveedor"""
    productos = (
        db.query(WhatsAppProductoCotizado)
        .filter(WhatsAppProductoCotizado.proveedor_numero == proveedor_numero)
        .all()
    )

    if not productos:
        raise HTTPException(
            status_code=404, detail="No se encontraron productos de este proveedor"
        )

    # Calcular estadísticas
    total_productos = len(productos)
    con_precio = sum(1 for p in productos if p.tiene_precio)
    sin_precio = total_productos - con_precio

    # Agrupar por tipo
    por_tipo = {}
    for p in productos:
        if p.tipo_producto not in por_tipo:
            por_tipo[p.tipo_producto] = {"cantidad": 0, "con_precio": 0, "precios": []}
        por_tipo[p.tipo_producto]["cantidad"] += 1
        if p.tiene_precio and p.precio:
            por_tipo[p.tipo_producto]["con_precio"] += 1
            por_tipo[p.tipo_producto]["precios"].append(p.precio)

    # Calcular promedios
    for tipo in por_tipo:
        if por_tipo[tipo]["precios"]:
            por_tipo[tipo]["precio_promedio"] = sum(por_tipo[tipo]["precios"]) / len(
                por_tipo[tipo]["precios"]
            )
            por_tipo[tipo]["precio_minimo"] = min(por_tipo[tipo]["precios"])
            por_tipo[tipo]["precio_maximo"] = max(por_tipo[tipo]["precios"])
        del por_tipo[tipo]["precios"]  # No enviar array completo

    return {
        "proveedor_numero": proveedor_numero,
        "proveedor_nombre": productos[0].proveedor_nombre if productos else None,
        "total_productos": total_productos,
        "productos_con_precio": con_precio,
        "productos_sin_precio": sin_precio,
        "productos_por_tipo": por_tipo,
    }


# ==================== WEB SCRAPING ====================


@app.post("/api/scraping/rango", response_model=ScrapingResponse)
def scraping_rango(
    request: ScrapingRequest,
    db: Session = Depends(get_db),
):
    """
    Escanea un rango de precios específico
    - categoria: 1=Bar, 2=Muebles de Oficina, 3=Mobiliario Educativo, 4=Sillas de Oficina
    - Rápido: min_precio=0, max_precio=100
    - Medio: min_precio=0, max_precio=300
    """
    # Mapeo de categorías
    categorias = {
        1: {
            "url": "https://www.livingroom.com.bo/product-category/bar/",
            "nombre": "Bar",
        },
        2: {
            "url": "https://www.livingroom.com.bo/product-category/muebles-de-oficina/",
            "nombre": "Muebles de Oficina",
        },
        3: {
            "url": "https://www.livingroom.com.bo/product-category/mobiliario_educativo/",
            "nombre": "Mobiliario Educativo",
        },
        4: {
            "url": "https://www.livingroom.com.bo/product-category/sillas-de-oficina/",
            "nombre": "Sillas de Oficina",
        },
    }

    if request.categoria not in categorias:
        raise HTTPException(
            status_code=400, detail="Categoría inválida. Use 1, 2, 3 o 4"
        )

    cat_info = categorias[request.categoria]

    resultado = scraper_service.escanear_rango_rapido(
        db=db,
        min_precio=request.min_precio,
        max_precio=request.max_precio,
        categoria_url=cat_info["url"],
        categoria_nombre=cat_info["nombre"],
        delay=request.delay,
    )

    return resultado


@app.post("/api/scraping/completo", response_model=ScrapingResponse)
def scraping_completo(
    request: ScrapingFullRequest,
    db: Session = Depends(get_db),
):
    """
    Escaneo completo de todos los precios disponibles (0-810)
    - categoria: 1=Bar, 2=Muebles de Oficina, 3=Mobiliario Educativo, 4=Sillas de Oficina
    - Más lento pero exhaustivo
    """
    # Mapeo de categorías
    categorias = {
        1: {
            "url": "https://www.livingroom.com.bo/product-category/bar/",
            "nombre": "Bar",
        },
        2: {
            "url": "https://www.livingroom.com.bo/product-category/muebles-de-oficina/",
            "nombre": "Muebles de Oficina",
        },
        3: {
            "url": "https://www.livingroom.com.bo/product-category/mobiliario_educativo/",
            "nombre": "Mobiliario Educativo",
        },
        4: {
            "url": "https://www.livingroom.com.bo/product-category/sillas-de-oficina/",
            "nombre": "Sillas de Oficina",
        },
    }

    if request.categoria not in categorias:
        raise HTTPException(
            status_code=400, detail="Categoría inválida. Use 1, 2, 3 o 4"
        )

    cat_info = categorias[request.categoria]

    resultado = scraper_service.escanear_completo(
        db=db,
        categoria_url=cat_info["url"],
        categoria_nombre=cat_info["nombre"],
        delay=request.delay,
    )

    return resultado


@app.get("/api/scraping/productos", response_model=List[ProductoScrapedResponse])
def obtener_productos_scraped(
    limite: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    categoria: Optional[str] = Query(None),
    precio_min: Optional[float] = Query(None),
    precio_max: Optional[float] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Obtener productos scraped con filtros
    """
    query = db.query(ProductoScraped).order_by(ProductoScraped.fecha_scraping.desc())

    if categoria:
        query = query.filter(ProductoScraped.categoria.ilike(f"%{categoria}%"))

    if precio_min is not None:
        query = query.filter(ProductoScraped.precio >= precio_min)

    if precio_max is not None:
        query = query.filter(ProductoScraped.precio <= precio_max)

    productos = query.offset(offset).limit(limite).all()
    return productos


@app.delete("/api/scraping/productos/{producto_id}")
def eliminar_producto_scraped(
    producto_id: int,
    db: Session = Depends(get_db),
):
    """
    Eliminar un producto scraped
    """
    producto = (
        db.query(ProductoScraped).filter(ProductoScraped.id == producto_id).first()
    )

    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    db.delete(producto)
    db.commit()

    return {"message": "Producto eliminado correctamente"}


@app.get("/api/scraping/estadisticas")
def obtener_estadisticas_scraping(db: Session = Depends(get_db)):
    """
    Obtener estadísticas generales de scraping
    """
    total = db.query(ProductoScraped).count()
    categorias = db.query(ProductoScraped.categoria).distinct().all()

    precios = db.query(ProductoScraped.precio).all()
    precios_lista = [p[0] for p in precios if p[0] is not None]

    return {
        "total_productos": total,
        "categorias": [c[0] for c in categorias],
        "precio_min": min(precios_lista) if precios_lista else 0,
        "precio_max": max(precios_lista) if precios_lista else 0,
        "precio_promedio": (
            sum(precios_lista) / len(precios_lista) if precios_lista else 0
        ),
    }


# ============================================
# BÚSQUEDA EN GOOGLE CON SELENIUM
# ============================================


@app.post("/api/google/buscar")
async def buscar_google(query: str, num_results: int = 10):
    """
    Realiza una búsqueda en Google usando Selenium y devuelve los resultados
    """
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from webdriver_manager.chrome import ChromeDriverManager
    import time as time_lib

    # Configurar Chrome
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )

    driver = None
    try:
        # Iniciar Chrome
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)

        # Construir URL
        url = f"https://www.google.com/search?q={query}&hl=es&num={num_results}"
        driver.get(url)

        # Esperar a que cargue
        time_lib.sleep(3)

        # Esperar resultados
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.g, div#search"))
            )
        except:
            pass

        # Buscar resultados
        resultados_elementos = driver.find_elements(By.CSS_SELECTOR, "div.g")

        if not resultados_elementos:
            resultados_elementos = driver.find_elements(By.CSS_SELECTOR, "#search div")

        resultados = []

        for i, elemento in enumerate(resultados_elementos[:num_results], 1):
            try:
                # Título
                try:
                    titulo_elem = elemento.find_element(By.CSS_SELECTOR, "h3")
                    titulo = titulo_elem.text
                except:
                    titulo = None

                # Link
                try:
                    link_elem = elemento.find_element(By.CSS_SELECTOR, "a")
                    link = link_elem.get_attribute("href")
                except:
                    link = None

                # Descripción
                try:
                    desc_elem = elemento.find_element(
                        By.CSS_SELECTOR, "div.VwiC3b, span.aCOpRe"
                    )
                    descripcion = desc_elem.text
                except:
                    descripcion = ""

                # URL visible (dominio)
                try:
                    cite_elem = elemento.find_element(By.TAG_NAME, "cite")
                    dominio = cite_elem.text
                except:
                    dominio = ""

                # Solo guardar si tiene título y link válido
                if titulo and link and "google.com" not in link:
                    resultado = {
                        "posicion": len(resultados) + 1,
                        "titulo": titulo,
                        "url": link,
                        "descripcion": descripcion,
                        "dominio": dominio,
                    }
                    resultados.append(resultado)

            except:
                continue

        return {
            "query": query,
            "total_resultados": len(resultados),
            "resultados": resultados,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error en búsqueda con Selenium: {str(e)}"
        )

    finally:
        if driver:
            driver.quit()


@app.post("/api/google/buscar-estricta")
async def buscar_google_estricta(query: str, num_results: int = 10):
    """
    Realiza una búsqueda estricta en Google usando comillas y operadores avanzados
    - Usa comillas para frases exactas
    - Filtra resultados más relevantes
    - Excluye contenido no deseado
    """
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from webdriver_manager.chrome import ChromeDriverManager
    import time as time_lib
    from urllib.parse import quote

    # Configurar Chrome
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )

    driver = None
    try:
        # Iniciar Chrome
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)

        # Construir query estricta
        # Si no tiene comillas, las agregamos para búsqueda exacta
        if not (query.startswith('"') and query.endswith('"')):
            query_estricta = f'"{query}"'
        else:
            query_estricta = query

        # Agregar filtros para excluir contenido no deseado
        query_estricta += " -site:facebook.com -site:twitter.com -site:instagram.com"

        # Construir URL con query codificada
        query_encoded = quote(query_estricta)
        url = f"https://www.google.com/search?q={query_encoded}&hl=es&num={num_results}"
        driver.get(url)

        # Esperar a que cargue
        time_lib.sleep(3)

        # Esperar resultados
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.g, div#search"))
            )
        except:
            pass

        # Buscar resultados
        resultados_elementos = driver.find_elements(By.CSS_SELECTOR, "div.g")

        if not resultados_elementos:
            resultados_elementos = driver.find_elements(By.CSS_SELECTOR, "#search div")

        resultados = []

        for i, elemento in enumerate(resultados_elementos[:num_results], 1):
            try:
                # Título
                try:
                    titulo_elem = elemento.find_element(By.CSS_SELECTOR, "h3")
                    titulo = titulo_elem.text
                except:
                    titulo = None

                # Link
                try:
                    link_elem = elemento.find_element(By.CSS_SELECTOR, "a")
                    link = link_elem.get_attribute("href")
                except:
                    link = None

                # Descripción
                try:
                    desc_elem = elemento.find_element(
                        By.CSS_SELECTOR, "div.VwiC3b, span.aCOpRe"
                    )
                    descripcion = desc_elem.text
                except:
                    descripcion = ""

                # URL visible (dominio)
                try:
                    cite_elem = elemento.find_element(By.TAG_NAME, "cite")
                    dominio = cite_elem.text
                except:
                    dominio = ""

                # Solo guardar si tiene título y link válido
                if titulo and link and "google.com" not in link:
                    # Filtro adicional: verificar que el título o descripción contengan palabras clave
                    query_words = query.lower().replace('"', "").split()
                    titulo_lower = titulo.lower()
                    desc_lower = descripcion.lower()

                    # Al menos 2 palabras clave deben estar presentes
                    matches = sum(
                        1
                        for word in query_words
                        if word in titulo_lower or word in desc_lower
                    )

                    if matches >= min(2, len(query_words)):
                        resultado = {
                            "posicion": len(resultados) + 1,
                            "titulo": titulo,
                            "url": link,
                            "descripcion": descripcion,
                            "dominio": dominio,
                            "relevancia": matches,  # Número de palabras clave encontradas
                        }
                        resultados.append(resultado)

            except:
                continue

        # Ordenar por relevancia
        resultados.sort(key=lambda x: x.get("relevancia", 0), reverse=True)

        # Reajustar posiciones después de ordenar
        for i, resultado in enumerate(resultados, 1):
            resultado["posicion"] = i

        return {
            "query": query,
            "query_estricta": query_estricta,
            "total_resultados": len(resultados),
            "resultados": resultados,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error en búsqueda estricta con Selenium: {str(e)}"
        )

    finally:
        if driver:
            driver.quit()


# Montar directorio estático para servir imágenes (al final, después de todas las rutas)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

if __name__ == "__main__":
    import uvicorn

    print("🚀 Iniciando servidor backend en http://localhost:8001")
    print("📡 API disponible en http://localhost:8001/docs")
    uvicorn.run(app, host="127.0.0.1", port=8001)
