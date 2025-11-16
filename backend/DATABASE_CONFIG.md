# Configuración de Base de Datos - PostgreSQL Supabase

## ✅ Estado: CONFIGURADO Y FUNCIONANDO

La base de datos PostgreSQL de Supabase está configurada y funcionando correctamente.

## 📋 Información de Conexión

### Credenciales Actuales

- **Host**: `aws-1-us-east-1.pooler.supabase.com`
- **Puerto**: `5432`
- **Database**: `postgres`
- **Usuario**: `postgres.faqtkhxhuypuxvpdaflc`
- **Password**: `104245SC104245`

### URL de Conexión

```
postgresql://postgres.faqtkhxhuypuxvpdaflc:104245SC104245@aws-1-us-east-1.pooler.supabase.com:5432/postgres
```

## 📊 Estado de la Base de Datos

### Tablas Existentes

1. ✅ **users** - Usuarios del sistema
2. ✅ **products** - Productos/muebles
3. ✅ **orders** - Pedidos
4. ✅ **price_comparisons** - Comparaciones de precios
5. ✅ **price_alerts** - Alertas de precios

### Datos Existentes

- **Usuarios**: 2 usuarios registrados
- **Productos**: (verificar con consultas)
- **Pedidos**: (verificar con consultas)

## 🔧 Archivos Configurados

### `.env` (Archivo principal)

```env
DATABASE_URL=postgresql://postgres.faqtkhxhuypuxvpdaflc:104245SC104245@aws-1-us-east-1.pooler.supabase.com:5432/postgres
```

### `.env.example` (Template)

```env
DATABASE_URL=postgresql://postgres.faqtkhxhuypuxvpdaflc:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres
```

## 🚀 Comandos Útiles

### Verificar Conexión

```bash
python test_db_connection.py
```

### Inicializar/Reiniciar Tablas

```bash
python init_db.py
```

### Iniciar el Backend

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Acceder a la BD con psql

```bash
psql postgresql://postgres.faqtkhxhuypuxvpdaflc:104245SC104245@aws-1-us-east-1.pooler.supabase.com:5432/postgres
```

## 🔐 Seguridad

⚠️ **IMPORTANTE**: Las credenciales están en el archivo `.env` que NO debe compartirse públicamente.

### Buenas Prácticas

- ✅ `.env` está en `.gitignore`
- ✅ Usa `.env.example` para templates sin credenciales
- ⚠️ Cambia `SECRET_KEY` en producción
- ⚠️ Considera usar variables de entorno del sistema en producción

## 🧪 Testing

### Consultas Útiles

```python
# Contar usuarios
from database import SessionLocal
from models import User, Product, Order

db = SessionLocal()

# Ver usuarios
users = db.query(User).all()
print(f"Total usuarios: {len(users)}")
for user in users:
    print(f"- {user.email} ({user.role})")

# Ver productos
products = db.query(Product).all()
print(f"\nTotal productos: {len(products)}")

# Ver pedidos
orders = db.query(Order).all()
print(f"\nTotal pedidos: {len(orders)}")

db.close()
```

## 📡 Endpoints de la API

Una vez iniciado el backend, puedes acceder a:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/api/health (si existe)
- **GPT Health**: http://localhost:8000/api/gpt/health

## 🔄 Migraciones

Si necesitas actualizar el esquema de la base de datos:

```bash
# Crear migración
alembic revision --autogenerate -m "descripcion_cambio"

# Aplicar migración
alembic upgrade head

# Ver historial
alembic history
```

## 🐛 Troubleshooting

### Error de Conexión

Si aparece error de conexión:

1. Verifica que el password sea correcto: `104245SC104245`
2. Verifica que el host sea accesible
3. Verifica que Supabase esté activo
4. Revisa el archivo `.env`

### Error de SSL

Si aparece error de SSL, puedes agregar `?sslmode=require` al final de la URL:

```
postgresql://postgres.faqtkhxhuypuxvpdaflc:104245SC104245@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

### Tablas No Existen

Si las tablas no existen, ejecuta:

```bash
python init_db.py
```

## 📝 Notas

- La conexión pooler de Supabase optimiza las conexiones
- El puerto por defecto es 5432 (PostgreSQL estándar)
- Las tablas se crean automáticamente al iniciar la app
- Los usuarios existentes están listos para usar

## ✅ Próximos Pasos

1. ✅ Base de datos configurada
2. ✅ Conexión verificada
3. ✅ Tablas existentes
4. 🔜 Iniciar backend: `uvicorn main:app --reload`
5. 🔜 Configurar OPENAI_API_KEY en `.env` para usar endpoints de GPT
6. 🔜 Probar endpoints en http://localhost:8000/docs

---

**Última actualización**: 16 de noviembre de 2025  
**Estado**: ✅ Operacional
