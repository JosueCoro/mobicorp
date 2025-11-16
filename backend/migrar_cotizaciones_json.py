# Script para migrar cotizaciones existentes de JSON a base de datos

import json
import sys
import os
from pathlib import Path

# Agregar el directorio backend al path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database import SessionLocal
from models import WhatsAppProveedor, WhatsAppCotizacion
from datetime import datetime


def migrar_cotizaciones():
    """Migrar cotizaciones desde JSON a base de datos"""

    # Ruta al archivo JSON del bot de WhatsApp
    json_file = backend_dir.parent / "whatsapp-bot" / "cotizaciones.json"

    if not json_file.exists():
        print(f"❌ No se encontró el archivo: {json_file}")
        return False

    print(f"📂 Leyendo cotizaciones desde: {json_file}")

    try:
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        cotizaciones = data.get("cotizaciones", [])
        print(f"📊 Encontradas {len(cotizaciones)} cotizaciones")

        if not cotizaciones:
            print("✅ No hay cotizaciones para migrar")
            return True

        db = SessionLocal()

        try:
            migradas = 0
            errores = 0

            for cot in cotizaciones:
                try:
                    # Buscar o crear proveedor
                    proveedor_numero = cot.get("proveedor", "desconocido")

                    proveedor = (
                        db.query(WhatsAppProveedor)
                        .filter(WhatsAppProveedor.numero == proveedor_numero)
                        .first()
                    )

                    if not proveedor:
                        proveedor = WhatsAppProveedor(
                            numero=proveedor_numero,
                            nombre=f"Proveedor {proveedor_numero}",
                            activo=True,
                        )
                        db.add(proveedor)
                        db.flush()

                    # Verificar si ya existe esta cotización
                    cot_id = cot.get(
                        "id",
                        cot.get("timestamp", int(datetime.now().timestamp() * 1000)),
                    )

                    existe = (
                        db.query(WhatsAppCotizacion)
                        .filter(WhatsAppCotizacion.id == cot_id)
                        .first()
                    )

                    if existe:
                        print(f"⏭️ Cotización {cot_id} ya existe, saltando...")
                        continue

                    # Extraer información de productos
                    detalle = cot.get("detalleProductos", {})

                    # Crear cotización
                    cotizacion = WhatsAppCotizacion(
                        id=cot_id,
                        proveedor_id=proveedor.id,
                        proveedor_numero=proveedor_numero,
                        fecha=datetime.fromisoformat(
                            cot.get("fecha", datetime.now().isoformat()).replace(
                                "Z", "+00:00"
                            )
                        ),
                        mensaje_completo=cot.get("mensajeCompleto", ""),
                        tiene_precio=cot.get("tienePrecio", False),
                        precios=cot.get("precios", []),
                        escritorios=(
                            detalle.get("escritorios", False)
                            if detalle
                            else cot.get("escritorios", False)
                        ),
                        sillas=(
                            detalle.get("sillas", False)
                            if detalle
                            else cot.get("sillas", False)
                        ),
                        armarios=(
                            detalle.get("armarios", False)
                            if detalle
                            else cot.get("armarios", False)
                        ),
                        estanterias=(
                            detalle.get("estanterias", False)
                            if detalle
                            else cot.get("estanterias", False)
                        ),
                        timestamp=cot.get("timestamp", cot_id),
                    )

                    db.add(cotizacion)
                    migradas += 1

                    if migradas % 10 == 0:
                        print(f"   Migradas {migradas}...")

                except Exception as e:
                    errores += 1
                    print(f"❌ Error migrando cotización: {e}")
                    continue

            # Commit final
            db.commit()

            print("\n" + "=" * 50)
            print("✅ MIGRACIÓN COMPLETADA")
            print("=" * 50)
            print(f"✅ Migradas: {migradas}")
            print(f"❌ Errores: {errores}")
            print(f"📊 Total: {len(cotizaciones)}")

            return True

        except Exception as e:
            db.rollback()
            print(f"❌ Error en la transacción: {e}")
            return False
        finally:
            db.close()

    except Exception as e:
        print(f"❌ Error leyendo archivo JSON: {e}")
        return False


if __name__ == "__main__":
    print("🔄 INICIANDO MIGRACIÓN DE COTIZACIONES")
    print("=" * 50)
    success = migrar_cotizaciones()
    sys.exit(0 if success else 1)
