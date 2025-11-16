#!/bin/bash

# Script para iniciar el Bot de Cotización de Muebles
# Uso: bash iniciar.sh

echo "╔════════════════════════════════════════╗"
echo "║  BOT DE COTIZACIÓN DE MUEBLES         ║"
echo "║  Oficinas GlobalTech                   ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Este script debe ejecutarse desde el directorio whatsapp-bot"
    echo "   Usa: cd /home/javier/Pictures/soporte/whatsapp-bot && bash iniciar.sh"
    exit 1
fi

# Detener procesos anteriores del bot
echo "🔄 Deteniendo instancias anteriores..."
pkill -f "node index.js" 2>/dev/null
sleep 2

# Verificar dependencias
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Iniciar el bot
echo ""
echo "🚀 Iniciando bot..."
echo "═══════════════════════════════════════"
echo ""

npm start
