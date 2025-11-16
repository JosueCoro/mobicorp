/**
 * Configuración centralizada del bot
 */

module.exports = {
    // Configuración del bot
    bot: {
        name: process.env.BOT_NAME || 'Bot de Soporte',
        autoReply: process.env.AUTO_REPLY_ENABLED === 'true',
        sessionPath: './session-data',
        sessionId: 'bot-session'
    },
    
    // Configuración de IA
    ai: {
        provider: 'openai', // openai, custom, none
        apiKey: process.env.OPENAI_API_KEY,
        apiUrl: process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions',
        model: process.env.AI_MODEL || 'gpt-3.5-turbo',
        maxTokens: 300,
        temperature: 0.7,
        timeout: 10000
    },
    
    // Configuración de mensajes masivos
    masivos: {
        delayMin: 2000, // 2 segundos mínimo
        delayMax: 5000, // 5 segundos máximo
        maxPorHora: 50, // Máximo de mensajes por hora
        reintentos: 3
    },
    
    // Configuración de cron
    cron: {
        schedule: process.env.CRON_SCHEDULE || '0 9 * * *',
        enabled: true
    },
    
    // Configuración de seguridad
    seguridad: {
        bloquearGrupos: true,
        bloquearPropios: true,
        numerosPermitidos: [], // Lista blanca (vacío = todos)
        numerosBloqueados: [] // Lista negra
    },
    
    // Mensajes predefinidos
    mensajes: {
        bienvenida: '¡Hola! 👋 Bienvenido a nuestro servicio de atención. ¿En qué puedo ayudarte hoy?',
        ausencia: 'Gracias por tu mensaje. En este momento no estoy disponible, pero responderé pronto.',
        programado: '🔔 Recordatorio: Este es un mensaje programado automáticamente.',
        error: 'Lo siento, ocurrió un error. Por favor, intenta nuevamente.',
        despedida: '¡Hasta pronto! 👋 Gracias por contactarnos.',
        fueraHorario: 'Nuestro horario de atención es de Lunes a Viernes de 9:00 AM a 6:00 PM. Te responderemos pronto.'
    },
    
    // Respuestas automáticas por palabras clave
    respuestasAutomaticas: {
        'hola': '¡Hola! 👋 ¿En qué puedo ayudarte?',
        'precio': 'Para información sobre precios, un agente te contactará pronto.',
        'horario': 'Nuestro horario es de Lunes a Viernes de 9:00 AM a 6:00 PM.',
        'ubicacion': 'Estamos ubicados en [Tu dirección aquí].',
        'gracias': '¡De nada! 😊 ¿Hay algo más en lo que pueda ayudarte?',
        'adios': '¡Hasta pronto! 👋',
    },
    
    // Configuración de logs
    logs: {
        nivel: 'info', // debug, info, warn, error
        guardarArchivo: false,
        archivoPath: './logs/bot.log'
    }
};
