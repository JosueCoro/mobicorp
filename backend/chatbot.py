from sqlalchemy.orm import Session
from models import User, Product, Order, PriceComparison
from typing import Dict, List

class ChatbotAssistant:
    """
    Chatbot inteligente para asistencia al personal de ventas
    Proporciona información sobre productos, precios, pedidos y ayuda general
    """
    
    def __init__(self):
        self.greetings = [
            "hola", "buenos días", "buenas tardes", "buenas noches",
            "hi", "hello", "saludos"
        ]
        self.help_keywords = ["ayuda", "help", "comandos", "qué puedo", "cómo"]
        self.price_keywords = ["precio", "price", "costo", "cuánto", "valor"]
        self.product_keywords = ["producto", "product", "artículo", "item"]
        self.order_keywords = ["pedido", "order", "venta", "orden"]
    
    def process_message(self, message: str, db: Session, user: User) -> str:
        """Procesar mensaje del usuario y generar respuesta"""
        message_lower = message.lower().strip()
        
        # Detectar intención
        if any(greeting in message_lower for greeting in self.greetings):
            return self._handle_greeting(user)
        
        elif any(keyword in message_lower for keyword in self.help_keywords):
            return self._handle_help()
        
        elif any(keyword in message_lower for keyword in self.price_keywords):
            return self._handle_price_query(message_lower, db)
        
        elif any(keyword in message_lower for keyword in self.product_keywords):
            return self._handle_product_query(message_lower, db)
        
        elif any(keyword in message_lower for keyword in self.order_keywords):
            return self._handle_order_query(message_lower, db, user)
        
        elif "comparar" in message_lower or "comparación" in message_lower:
            return self._handle_comparison_query(message_lower, db)
        
        elif "reporte" in message_lower or "estadística" in message_lower:
            return self._handle_report_query(db, user)
        
        else:
            return self._handle_general(message)
    
    def _handle_greeting(self, user: User) -> str:
        """Manejar saludos"""
        return f"¡Hola {user.full_name}! 👋\n\nSoy tu asistente virtual de MobiCorp. Puedo ayudarte con:\n\n" \
               f"• Consultar precios de productos\n" \
               f"• Información sobre pedidos\n" \
               f"• Comparaciones de mercado\n" \
               f"• Reportes y estadísticas\n\n" \
               f"¿En qué puedo ayudarte hoy?"
    
    def _handle_help(self) -> str:
        """Mostrar ayuda"""
        return "📋 **Comandos disponibles:**\n\n" \
               "• **Precios**: '¿Cuál es el precio de [producto]?' o 'Comparar precios de [producto]'\n" \
               "• **Productos**: 'Listar productos' o 'Mostrar productos de [categoría]'\n" \
               "• **Pedidos**: 'Ver mis pedidos' o 'Estado del pedido [ID]'\n" \
               "• **Reportes**: 'Mostrar reporte de ventas' o 'Estadísticas de márgenes'\n" \
               "• **Comparaciones**: 'Comparar precios de [producto]'\n\n" \
               "También puedes hacer preguntas generales sobre el sistema."
    
    def _handle_price_query(self, message: str, db: Session) -> str:
        """Manejar consultas de precios"""
        # Buscar productos mencionados
        products = db.query(Product).all()
        
        mentioned_products = []
        for product in products:
            if product.name.lower() in message:
                mentioned_products.append(product)
        
        if mentioned_products:
            response = "💰 **Información de precios:**\n\n"
            for product in mentioned_products[:3]:  # Limitar a 3
                response += f"• **{product.name}**: Bs. {product.price:.2f}\n"
                response += f"  Categoría: {product.category}\n"
                response += f"  Stock: {product.stock} unidades\n\n"
            
            if len(mentioned_products) > 3:
                response += f"_... y {len(mentioned_products) - 3} productos más_\n\n"
            
            response += "💡 **Tip**: Usa 'Comparar precios de [producto]' para ver precios del mercado."
            return response
        
        return "No encontré productos específicos en tu consulta. " \
               "Puedes preguntar por ejemplo: '¿Cuál es el precio de [nombre del producto]?'"
    
    def _handle_product_query(self, message: str, db: Session) -> str:
        """Manejar consultas de productos"""
        if "listar" in message or "mostrar" in message or "todos" in message:
            products = db.query(Product).limit(10).all()
            
            if not products:
                return "No hay productos registrados en el sistema."
            
            response = "📦 **Productos disponibles:**\n\n"
            for product in products:
                response += f"• **{product.name}** (ID: {product.id})\n"
                response += f"  Precio: Bs. {product.price:.2f} | Stock: {product.stock}\n"
                response += f"  Categoría: {product.category}\n\n"
            
            return response
        
        # Buscar por categoría
        categories = db.query(Product.category).distinct().all()
        for cat_tuple in categories:
            if cat_tuple[0] and cat_tuple[0].lower() in message:
                products = db.query(Product).filter(Product.category == cat_tuple[0]).limit(10).all()
                response = f"📦 **Productos en categoría '{cat_tuple[0]}':**\n\n"
                for product in products:
                    response += f"• {product.name} - Bs. {product.price:.2f}\n"
                return response
        
        return "Puedo ayudarte a listar productos. Prueba con: 'Listar productos' o 'Mostrar productos de [categoría]'"
    
    def _handle_order_query(self, message: str, db: Session, user: User) -> str:
        """Manejar consultas de pedidos"""
        if "mis pedidos" in message or "pedidos" in message:
            orders = db.query(Order).filter(Order.user_id == user.id).order_by(Order.created_at.desc()).limit(5).all()
            
            if not orders:
                return "No tienes pedidos registrados."
            
            response = "📋 **Tus pedidos recientes:**\n\n"
            for order in orders:
                status_emoji = "✅" if order.status == "approved" else "⏳" if order.status == "pending" else "❌"
                response += f"{status_emoji} **Pedido #{order.id}**\n"
                response += f"  Producto: {order.product.name}\n"
                response += f"  Cantidad: {order.quantity}\n"
                response += f"  Estado: {order.status}\n"
                if order.final_price:
                    response += f"  Precio final: Bs. {order.final_price:.2f}\n"
                response += f"  Fecha: {order.created_at.strftime('%d/%m/%Y %H:%M')}\n\n"
            
            return response
        
        # Buscar por ID
        import re
        order_ids = re.findall(r'\d+', message)
        if order_ids:
            order = db.query(Order).filter(Order.id == int(order_ids[0])).first()
            if order:
                return f"📋 **Pedido #{order.id}**\n\n" \
                       f"Producto: {order.product.name}\n" \
                       f"Cantidad: {order.quantity}\n" \
                       f"Estado: {order.status}\n" \
                       f"Precio solicitado: Bs. {order.requested_price:.2f}\n" \
                       f"Precio final: Bs. {order.final_price:.2f if order.final_price else 'Pendiente'}\n" \
                       f"Fecha: {order.created_at.strftime('%d/%m/%Y %H:%M')}"
            else:
                return f"No se encontró el pedido #{order_ids[0]}"
        
        return "Puedo ayudarte con tus pedidos. Prueba con: 'Ver mis pedidos' o 'Estado del pedido [ID]'"
    
    def _handle_comparison_query(self, message: str, db: Session) -> str:
        """Manejar consultas de comparación"""
        products = db.query(Product).all()
        
        for product in products:
            if product.name.lower() in message:
                # Buscar última comparación
                comparison = db.query(PriceComparison).filter(
                    PriceComparison.product_id == product.id
                ).order_by(PriceComparison.created_at.desc()).first()
                
                if comparison:
                    return f"📊 **Comparación de precios: {product.name}**\n\n" \
                           f"Precio sugerido: **Bs. {comparison.suggested_price:.2f}**\n" \
                           f"Precio mínimo del mercado: Bs. {comparison.min_price:.2f}\n" \
                           f"Precio máximo del mercado: Bs. {comparison.max_price:.2f}\n" \
                           f"Precio promedio: Bs. {comparison.avg_price:.2f}\n" \
                           f"Fuentes consultadas: {comparison.source_count}\n" \
                           f"Fecha: {comparison.created_at.strftime('%d/%m/%Y %H:%M')}\n\n" \
                           f"💡 Usa el sistema para generar una nueva comparación actualizada."
                else:
                    return f"No hay comparaciones registradas para '{product.name}'. " \
                           f"Puedes generar una nueva comparación desde el sistema."
        
        return "No encontré el producto en tu consulta. Prueba con: 'Comparar precios de [nombre del producto]'"
    
    def _handle_report_query(self, db: Session, user: User) -> str:
        """Manejar consultas de reportes"""
        total_orders = db.query(Order).count()
        pending_orders = db.query(Order).filter(Order.status == "pending").count()
        approved_orders = db.query(Order).filter(Order.status == "approved").count()
        
        total_revenue = sum(
            order.final_price for order in 
            db.query(Order).filter(Order.status == "approved", Order.final_price.isnot(None)).all()
        )
        
        return f"📈 **Reporte General:**\n\n" \
               f"Total de pedidos: {total_orders}\n" \
               f"Pedidos pendientes: {pending_orders}\n" \
               f"Pedidos aprobados: {approved_orders}\n" \
               f"Ingresos totales: Bs. {total_revenue:.2f}\n\n" \
               f"💡 Para reportes detallados, usa la sección de Reportes en el sistema."
    
    def _handle_general(self, message: str) -> str:
        """Manejar mensajes generales"""
        return "Entiendo tu consulta. Puedo ayudarte con:\n\n" \
               "• Consultas de precios y productos\n" \
               "• Información sobre pedidos\n" \
               "• Comparaciones de mercado\n" \
               "• Reportes y estadísticas\n\n" \
               "Escribe 'ayuda' para ver todos los comandos disponibles."

