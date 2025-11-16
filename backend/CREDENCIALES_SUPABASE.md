# ⚠️ Verificación de Credenciales Supabase

## Estado Actual

❌ **Error de autenticación**: `password authentication failed for user "postgres"`

## Para Resolver

Necesitas proporcionar las credenciales correctas de Supabase:

### Opción 1: Desde el Dashboard de Supabase

1. Abre https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a **Settings → Database**
4. Busca:
   - **Connection URL** (con credenciales)
   - O bien:
     - **Host** (servidor)
     - **Database** (nombre BD)
     - **User** (usuario)
     - **Password** (contraseña)

### Opción 2: Actualizar el Archivo `.env`

El archivo `.env` está ubicado en: `c:\Users\LEAVIN CORO\Documents\mobicorp2\backend\.env`

Reemplaza la línea:

```env
DATABASE_URL=postgresql://usuario:contraseña@aws-1-us-east-1.pooler.supabase.com:5432/postgres
```

Con tus credenciales reales.

### Verificación

Una vez actualizado, ejecuta:

```powershell
cd "c:\Users\LEAVIN CORO\Documents\mobicorp2\backend"
python test_db_connection.py
```

Debería mostrar: ✅ Conexión exitosa

## Credenciales Actuales (Incorrectas)

- **User**: `postgres.zfnrcleedglijnhounjn`
- **Password**: `104245JC104245`
- **Host**: `aws-1-us-east-1.pooler.supabase.com`
- **Database**: `postgres`

⚠️ Si estas credenciales son públicas, **cámbia la contraseña en Supabase inmediatamente**
