#!/bin/bash

# Script para iniciar el bot de cotizaciones de muebles
# Uso: bash iniciar-bot.sh

echo "🚀 Iniciando Bot de Cotizaciones de Muebles..."
echo ""

# Ir al directorio correcto
cd /home/javier/Pictures/soporte/whatsapp-bot

# Detener procesos anteriores
echo "🛑 Deteniendo procesos anteriores..."
pkill -f "node index.js" 2>/dev/null
sleep 2

# Iniciar el bot
echo "▶️  Iniciando bot..."
echo ""
npm start
