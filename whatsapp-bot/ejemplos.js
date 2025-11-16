/**
 * Ejemplo de uso del bot de WhatsApp
 * Este archivo muestra cómo usar las funciones del bot
 */

const {
    client,
    enviarMensajesMasivos,
    enviarMensajePersonalizado,
    obtenerInfoChat
} = require('./index');

// ============================================
// EJEMPLO 1: Esperar a que el cliente esté listo
// ============================================

client.on('ready', async () => {
    console.log('Cliente listo para ejemplos');
    
    // Descomentar los ejemplos que quieras probar
    
    // await ejemplo1_enviarMensajePersonalizado();
    // await ejemplo2_enviarMensajeMasivo();
    // await ejemplo3_obtenerInfoContacto();
    // await ejemplo4_enviarConRetardo();
});

// ============================================
// EJEMPLO 1: Enviar mensaje personalizado
// ============================================

async function ejemplo1_enviarMensajePersonalizado() {
    console.log('\n📤 Ejemplo 1: Mensaje Personalizado');
    
    const numero = '34612345678'; // Cambiar por número real
    const mensaje = '¡Hola! Este es un mensaje personalizado de prueba.';
    
    const enviado = await enviarMensajePersonalizado(numero, mensaje);
    
    if (enviado) {
        console.log('✅ Mensaje personalizado enviado exitosamente');
    }
}

// ============================================
// EJEMPLO 2: Enviar mensaje masivo
// ============================================

async function ejemplo2_enviarMensajeMasivo() {
    console.log('\n📤 Ejemplo 2: Mensaje Masivo');
    
    const mensajeMasivo = `
🎉 ¡Hola!

Te informamos sobre nuestra nueva promoción:
- 20% de descuento
- Envío gratis
- Válido hasta fin de mes

¡No te lo pierdas!

Saludos,
El equipo
    `.trim();
    
    await enviarMensajesMasivos(mensajeMasivo);
}

// ============================================
// EJEMPLO 3: Obtener información de contacto
// ============================================

async function ejemplo3_obtenerInfoContacto() {
    console.log('\n📊 Ejemplo 3: Información de Contacto');
    
    const numero = '34612345678'; // Cambiar por número real
    const info = await obtenerInfoChat(numero);
    
    if (info) {
        console.log('Información del chat:');
        console.log('- Nombre:', info.nombre);
        console.log('- Es grupo:', info.esGrupo);
        console.log('- Mensajes no leídos:', info.noLeidos);
    }
}

// ============================================
// EJEMPLO 4: Enviar mensajes con retardo
// ============================================

async function ejemplo4_enviarConRetardo() {
    console.log('\n⏱️ Ejemplo 4: Mensajes con Retardo');
    
    const clientes = [
        { numero: '34612345678', nombre: 'Cliente 1' },
        { numero: '34687654321', nombre: 'Cliente 2' },
        // Agregar más clientes
    ];
    
    for (const cliente of clientes) {
        const mensaje = `Hola ${cliente.nombre}, ¡gracias por ser parte de nuestra comunidad!`;
        
        await enviarMensajePersonalizado(cliente.numero, mensaje);
        
        // Esperar 5 segundos entre mensajes
        console.log('⏳ Esperando 5 segundos...');
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log('✅ Todos los mensajes fueron enviados');
}

// ============================================
// EJEMPLO 5: Responder a palabras clave
// ============================================

client.on('message', async (message) => {
    const texto = message.body.toLowerCase();
    
    // Responder a comandos específicos
    if (texto === '!menu') {
        await message.reply(`
📋 *Menú de Opciones*

1️⃣ Productos
2️⃣ Precios
3️⃣ Horarios
4️⃣ Ubicación
5️⃣ Contacto

Responde con el número de la opción.
        `);
    }
    
    if (texto === '1' || texto === 'productos') {
        await message.reply('🛍️ Estos son nuestros productos disponibles...');
    }
    
    if (texto === '2' || texto === 'precios') {
        await message.reply('💰 Aquí está nuestra lista de precios...');
    }
});

// ============================================
// EJEMPLO 6: Programar mensaje específico
// ============================================

const cron = require('node-cron');

// Enviar mensaje todos los lunes a las 9 AM
cron.schedule('0 9 * * 1', async () => {
    console.log('📅 Enviando mensaje programado del lunes');
    
    const mensajeLunes = '¡Feliz lunes! 🌟 Comenzamos la semana con energía.';
    await enviarMensajesMasivos(mensajeLunes);
});

// Recordatorio diario a las 6 PM
cron.schedule('0 18 * * *', async () => {
    console.log('🔔 Recordatorio de las 6 PM');
    
    const recordatorio = '⏰ Recordatorio: No olvides revisar tu pedido.';
    await enviarMensajesMasivos(recordatorio);
});

console.log('✅ Ejemplos cargados. Edita el archivo para activarlos.');
