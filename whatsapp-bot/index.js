/**
 * Bot de WhatsApp Automatizado
 * Características:
 * - Conexión con WhatsApp Web
 * - Envío de mensajes automáticos
 * - Lectura de mensajes entrantes
 * - Respuestas automáticas con IA
 * - Programación de mensajes
 * - Persistencia de sesión
 * - Reconocimiento de mensajes de voz
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Importar cliente de Python para funciones de GPT
const gptClient = require('./gptClient');

// Importar MessageMedia para enviar archivos
const { MessageMedia } = require('whatsapp-web.js');

// Importar servidor QR para interfaz web
const QRServer = require('./qr-server');

// ============================================
// CONFIGURACIÓN DEL CLIENTE DE WHATSAPP
// ============================================

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "bot-session",
        dataPath: "./session-data"
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

// ============================================
// GESTIÓN DINÁMICA DE CONTACTOS
// ============================================

const CONTACTOS_FILE = path.join(__dirname, 'contactos.json');

// Cargar o inicializar lista de contactos
let contactosList = [];

function cargarContactos() {
    try {
        if (fs.existsSync(CONTACTOS_FILE)) {
            const data = fs.readFileSync(CONTACTOS_FILE, 'utf8');
            contactosList = JSON.parse(data);
            console.log(`✅ ${contactosList.length} contactos cargados`);
        } else {
            // Contactos predeterminados
            contactosList = [
                { id: 1, nombre: 'Proveedor 1', numero: '59179001752', activo: true },
                { id: 2, nombre: 'Proveedor 2', numero: '59163448209', activo: true }
            ];
            guardarContactos();
            console.log('✅ Contactos inicializados con valores predeterminados');
        }
    } catch (error) {
        console.error('❌ Error al cargar contactos:', error);
        contactosList = [];
    }
    return contactosList; // Devolver la lista
}

function guardarContactos() {
    try {
        fs.writeFileSync(CONTACTOS_FILE, JSON.stringify(contactosList, null, 2));
        console.log('💾 Contactos guardados exitosamente');
    } catch (error) {
        console.error('❌ Error al guardar contactos:', error);
    }
}

function obtenerContactosActivos() {
    return contactosList
        .filter(c => c.activo)
        .map(c => `${c.numero}@c.us`);
}

function agregarContacto(nombre, numero) {
    const nuevoId = contactosList.length > 0 ? Math.max(...contactosList.map(c => c.id)) + 1 : 1;
    const nuevoContacto = {
        id: nuevoId,
        nombre,
        numero: numero.replace(/[^0-9]/g, ''),
        activo: true
    };
    contactosList.push(nuevoContacto);
    guardarContactos();
    return nuevoContacto;
}

function editarContacto(id, nombre, numero) {
    const contacto = contactosList.find(c => c.id === id);
    if (contacto) {
        contacto.nombre = nombre;
        contacto.numero = numero.replace(/[^0-9]/g, '');
        guardarContactos();
        return contacto;
    }
    return null;
}

function eliminarContacto(id) {
    const index = contactosList.findIndex(c => c.id === id);
    if (index !== -1) {
        contactosList.splice(index, 1);
        guardarContactos();
        return true;
    }
    return false;
}

function toggleContacto(id) {
    const contacto = contactosList.find(c => c.id === id);
    if (contacto) {
        contacto.activo = !contacto.activo;
        guardarContactos();
        return contacto;
    }
    return null;
}

// Cargar contactos al iniciar
cargarContactos();

// Compatibilidad: getter para clientesList
Object.defineProperty(global, 'clientesList', {
    get: () => obtenerContactosActivos()
});

// ============================================
// FUNCIONES PARA SUBIR IMÁGENES AL BACKEND
// ============================================

/**
 * Sube una imagen base64 al backend y devuelve la URL pública
 * @param {string} base64Data - Datos de la imagen en formato base64
 * @param {string} fileName - Nombre del archivo (opcional)
 * @returns {Promise<string|null>} URL de la imagen o null si falla
 */
async function uploadImageToBackend(base64Data, fileName = 'producto.jpg') {
    try {
        // Convertir base64 a buffer
        const base64WithoutPrefix = base64Data.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64WithoutPrefix, 'base64');
        
        // Crear FormData
        const FormData = require('form-data');
        const form = new FormData();
        form.append('file', buffer, {
            filename: fileName,
            contentType: 'image/jpeg'
        });

        // Subir al backend
        const response = await axios.post('http://localhost:8001/api/whatsapp/upload-image', form, {
            headers: {
                ...form.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (response.data && response.data.url) {
            console.log(`✅ Imagen subida exitosamente: ${response.data.url}`);
            return response.data.url;
        }

        console.warn('⚠️ Backend no devolvió URL de imagen');
        return null;
    } catch (error) {
        console.error('❌ Error al subir imagen al backend:', error.message);
        if (error.response) {
            console.error('Respuesta del servidor:', error.response.data);
        }
        return null;
    }
}

// Inicializar servidor QR con acceso al cliente y funciones de contactos
const qrServer = new QRServer(3001, {
    getClient: () => client,
    contactos: {
        obtener: () => contactosList,
        agregar: agregarContacto,
        editar: editarContacto,
        eliminar: eliminarContacto,
        toggle: toggleContacto,
        obtenerActivos: obtenerContactosActivos
    }
});

// ============================================
// CONFIGURACIÓN DE MENSAJES
// ============================================

const mensajesAutomaticos = {
    solicitudCotizacion: `Hola, estamos buscando muebles para oficina: escritorios, sillas ergonómicas y estanterías. Podrías ayudarnos con una cotización? Necesitamos información sobre modelos, precios, materiales y tiempos de entrega. Gracias.`,
    
    agradecimiento: 'Gracias por la información, la revisaremos y nos pondremos en contacto para confirmar los detalles.',
};

// ============================================
// EVENTO: GENERACIÓN DE QR CODE
// ============================================

client.on('qr', (qr) => {
    console.log('📱 Código QR generado');
    console.log('====================================');
    console.log('🌐 Abre tu navegador en: http://localhost:3001');
    console.log('====================================');
    
    // Mostrar QR en consola (opcional, como respaldo)
    qrcode.generate(qr, { small: true });
    
    // Enviar QR al servidor web
    qrServer.updateQR(qr);
    
    console.log('⏳ Esperando escaneo...');
});

// ============================================
// EVENTO: CLIENTE AUTENTICADO
// ============================================

client.on('authenticated', () => {
    console.log('✅ Autenticación exitosa!');
    console.log('🔐 Sesión guardada localmente');
    
    // Notificar al servidor web
    qrServer.setAuthenticated();
});

// ============================================
// EVENTO: CLIENTE LISTO
// ============================================

client.on('ready', async () => {
    console.log('✅ Bot de WhatsApp está listo!');
    console.log('🤖 Bot iniciado:', new Date().toLocaleString());
    console.log('====================================');
    console.log('🏢 Modo: SOLICITUD DE COTIZACIONES DE MUEBLES');
    console.log('====================================');
    
    // Verificar conexión con servidor Python de GPT
    console.log('\n🔗 Verificando conexión con servidor Python...');
    const pythonConnected = await gptClient.verificarConexion();
    
    if (pythonConnected) {
        console.log('✅ Servidor Python conectado y funcional');
    } else {
        console.log('⚠️ Advertencia: No se pudo conectar con servidor Python');
        console.log('   El bot seguirá funcionando pero con respuestas predeterminadas');
    }
    console.log('====================================\n');
    
    // Iniciar tareas programadas
    iniciarTareasProgramadas();
    
    console.log('💡 Escribe "solicitar" para enviar la solicitud a proveedores');
    console.log('💡 Escribe "ayuda" para ver todos los comandos\n');
});

// ============================================
// EVENTO: MENSAJE RECIBIDO
// ============================================

client.on('message', async (message) => {
    try {
        console.log('📨 Mensaje recibido de:', message.from);
        console.log('💬 Tipo de mensaje:', message.type);
        
        // Evitar responder a mensajes de grupos o propios
        if (message.from.includes('@g.us') || message.fromMe) {
            return;
        }
        
        // ============================================
        // PROCESAR MENSAJE CON PDF
        // ============================================
        if (message.type === 'document' || message.type === 'ptt' || message.type === 'audio') {
            // Verificar si es un PDF
            if (message.type === 'document') {
                console.log('📄 Documento detectado');
                
                try {
                    // Descargar el documento
                    const media = await message.downloadMedia();
                    
                    if (!media) {
                        console.log('❌ No se pudo descargar el documento');
                        return;
                    }
                    
                    // Verificar si es PDF
                    if (!media.mimetype.includes('pdf')) {
                        console.log('⚠️ El archivo no es un PDF');
                        return;
                    }
                    
                    console.log('✅ PDF descargado exitosamente');
                    console.log(`   Tipo: ${media.mimetype}`);
                    console.log(`   Tamaño: ${(media.data.length / 1024).toFixed(2)} KB`);
                    
                    // Convertir base64 a Buffer para que PyPDF2 pueda leerlo
                    const pdfBuffer = Buffer.from(media.data, 'base64');
                    
                    const resultadoPDF = await gptClient.procesarPDF(pdfBuffer, media.filename || 'catalogo.pdf', message.from);
                    
                    if (resultadoPDF.exito && (resultadoPDF.pdfBase64 || resultadoPDF.imagenBase64)) {
                        console.log('✅ PDF procesado correctamente');
                        console.log(`   Página extraída: ${resultadoPDF.pagina}`);
                        console.log(`   Categoría: ${resultadoPDF.categoria}`);
                        console.log(`   Archivo generado: ${resultadoPDF.archivoNombre}`);
                        
                        // Guardar el procesamiento en el historial
                        guardarMensajeConversacion(message.from, `[PDF PROCESADO] - Página ${resultadoPDF.pagina} extraída: ${resultadoPDF.categoria}`, 'proveedor');
                        
                        // Enviar la imagen recortada
                        try {
                            if (resultadoPDF.imagenBase64) {
                                console.log('📤 Enviando imagen PNG recortada...');
                                
                                // Convertir base64 a buffer
                                const imagenBuffer = Buffer.from(resultadoPDF.imagenBase64, 'base64');
                                
                                // Guardar temporalmente en disco
                                const imagenTempPath = path.join(__dirname, 'temp', `producto_pagina_${resultadoPDF.pagina}.png`);
                                const tempDir = path.join(__dirname, 'temp');
                                
                                // Crear directorio temp si no existe
                                if (!fs.existsSync(tempDir)) {
                                    fs.mkdirSync(tempDir);
                                }
                                
                                // Guardar archivo
                                fs.writeFileSync(imagenTempPath, imagenBuffer);
                                
                                // Enviar desde archivo
                                const imagenMedia = MessageMedia.fromFilePath(imagenTempPath);
                                await message.reply(imagenMedia);
                                
                                // Limpiar archivo temporal
                                setTimeout(() => {
                                    try {
                                        if (fs.existsSync(imagenTempPath)) {
                                            fs.unlinkSync(imagenTempPath);
                                        }
                                    } catch (e) {
                                        console.warn('⚠️ Error limpiando archivo temporal:', e.message);
                                    }
                                }, 2000);
                                
                                console.log('✅ Imagen enviada correctamente');
                                
                                // Guardar la imagen en una cotización asociada y retornarla
                                const imagenGuardada = guardarImagenEnCotizacion(message.from, resultadoPDF.imagenBase64, resultadoPDF.categoria);
                                
                                // Guardar la imagen en memoria temporal para asociarla después
                                if (!global.imagenesTemporales) {
                                    global.imagenesTemporales = {};
                                }
                                global.imagenesTemporales[message.from] = imagenGuardada;
                                
                                // Pequeña pausa antes de enviar mensaje
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        } catch (errImagen) {
                            console.error('⚠️ Error enviando imagen:', errImagen.message);
                        }
                        
                        // Enviar mensaje con información de la extracción
                        try {
                            const mensajeInfo = `Encontré esta página de ${resultadoPDF.categoria} en tu catálogo (página ${resultadoPDF.pagina}). Cuál es tu cotización para estos productos? Necesito precio unitario, cantidad disponible y términos de entrega. Gracias.`;
                            await message.reply(mensajeInfo);
                            console.log('✅ Información y solicitud de cotización enviadas');
                        } catch (errMsg) {
                            console.error('⚠️ Error enviando mensaje:', errMsg.message);
                        }
                        
                        console.log('✅ Imagen recortada enviada y solicitud de cotización realizada');
                    } else {
                        console.log('❌ Error procesando PDF:', resultadoPDF.error);
                    }
                    
                } catch (error) {
                    console.error('❌ Error procesando PDF:', error.message);
                }
                
                return;
            }
        
            console.log('🎙️ Mensaje de voz detectado');
            
            try {
                // Descargar el audio
                const media = await message.downloadMedia();
                
                if (!media) {
                    console.log('❌ No se pudo descargar el audio');
                    return;
                }
                
                console.log('✅ Audio descargado exitosamente');
                console.log(`   Tipo de media: ${media.mimetype}`);
                console.log(`   Tamaño: ${(media.data.length / 1024).toFixed(2)} KB`);
                
                // Guardar el audio localmente (opcional)
                const audioBuffer = Buffer.from(media.data, 'base64');
                const audioPath = path.join(__dirname, `audio_temp_${Date.now()}.ogg`);
                
                fs.writeFileSync(audioPath, audioBuffer);
                console.log(`📁 Audio guardado en: ${audioPath}`);
                
                // Procesar sin enviar confirmación
                
                // Intentar transcribir con Whisper API de OpenAI
                const textoTranscrito = await transcribirAudioConWhisper(media.data);
                
                if (textoTranscrito) {
                    console.log('✅ Audio transcrito correctamente');
                    console.log(`📝 Texto: ${textoTranscrito}`);
                    
                    // Procesar el texto transcrito como si fuera un mensaje normal
                    await procesarMensajeTranscrito(message, textoTranscrito);
                } else {
                    console.log('⚠️ No se pudo transcribir el audio');
                }
                
                // Limpiar archivo temporal
                if (fs.existsSync(audioPath)) {
                    fs.unlinkSync(audioPath);
                    console.log('🗑️ Audio temporal eliminado');
                }
                
            } catch (error) {
                console.error('❌ Error procesando audio:', error.message);
            }
            
            return;
        }
        
        // ============================================
        // PROCESAR IMAGEN DEL PRODUCTO
        // ============================================
        if (message.type === 'image') {
            console.log('🖼️ Imagen detectada');
            
            try {
                // Descargar la imagen
                const media = await message.downloadMedia();
                
                if (!media) {
                    console.log('❌ No se pudo descargar la imagen');
                    return;
                }
                
                console.log('✅ Imagen descargada exitosamente');
                console.log(`   Tipo: ${media.mimetype}`);
                console.log(`   Tamaño: ${(media.data.length / 1024).toFixed(2)} KB`);
                
                // Procesar la imagen con Vision API
                const productoDetectado = await analizarImagenProducto(media.data, media.mimetype, message.from);
                
                if (productoDetectado && productoDetectado.nombre) {
                    console.log('✅ Producto detectado en la imagen');
                    console.log(`   Nombre: ${productoDetectado.nombre}`);
                    console.log(`   Descripción: ${productoDetectado.descripcion}`);
                    
                    // Guardar el análisis en el historial
                    guardarMensajeConversacion(message.from, '[IMAGEN RECIBIDA] ' + productoDetectado.nombre, 'proveedor');
                    
                    // Preguntar por el precio del producto detectado
                    const respuesta = `🖼️ Vi que enviaste una imagen de: ${productoDetectado.nombre}

${productoDetectado.descripcion ? '📝 ' + productoDetectado.descripcion + '\n' : ''}
¿Cuál es el precio de este producto? Puedes escribirlo en cualquier formato:
- $120
- 120 dólares
- Bs 500
- Cualquier otra forma

¡Gracias! 😊`;
                    
                    await message.reply(respuesta);
                    guardarMensajeConversacion(message.from, respuesta, 'bot');
                    console.log('✅ Pregunta de precio enviada');
                } else {
                    console.log('⚠️ No se pudo identificar el producto en la imagen');
                }
                
            } catch (error) {
                console.error('❌ Error procesando imagen:', error.message);
            }
            
            return;
        }
        
        // ============================================
        // PROCESAR MENSAJE DE TEXTO
        // ============================================
        
        console.log('💬 Contenido:', message.body);
        
        // Extraer información de precios usando IA + regex
        const infoExtraida = await extraerInformacionPreciosConIA(message.body, message.from);
        
        // Siempre guardar el mensaje en el historial de conversación
        guardarMensajeConversacion(message.from, message.body, 'proveedor');
        
        if (infoExtraida.tienePrecio) {
            // Agregar imagen temporal si existe
            if (global.imagenesTemporales && global.imagenesTemporales[message.from]) {
                infoExtraida.imagenBase64 = global.imagenesTemporales[message.from];
                console.log('🖼️ Imagen asociada a la cotización');
                delete global.imagenesTemporales[message.from]; // Limpiar después de usar
            }
            
            // Guardar SIEMPRE la cotización (sin verificar duplicados)
            guardarCotizacion(infoExtraida);
            marcarCotizacionGuardada(message.from);
            console.log('💾 Cotización guardada:', infoExtraida.proveedor);
            console.log('   Precios detectados:', infoExtraida.precios);
            console.log('   Analizado por:', infoExtraida.analizadoPor || 'regex');
            
            // Mensaje de despedida natural y coloquial
            const respuestaFinal = `Listo, gracias por los precios. Los vamos a revisar y te contactamos en los próximos días para confirmar todo.`;
            
            await enviarMensajeConDelay(message.from, respuestaFinal);
            console.log('✅ Confirmación enviada');
        } else {
            // Continuar la conversación de forma natural hasta obtener precios
            console.log('💭 Esperando información de precios...');
            console.log('   Mensaje no contiene precios, continuar conversación');
            
            // Responder a cualquier mensaje sin adjuntar el anterior
            const respuestaObj = await generarRespuestaEmpresa(message.body, message.from, false);
            
            // Guardar el mensaje del proveedor
            guardarMensajeConversacion(message.from, message.body, 'proveedor');
            
            // Verificar si es necesario responder
            if (respuestaObj.necesita_respuesta === false || !respuestaObj.respuesta || respuestaObj.respuesta.trim() === '') {
                console.log('⏭️ Mensaje recibido pero no requiere respuesta inmediata');
                // Solo guardar el mensaje sin responder
            } else {
                console.log('   Respuesta generada:', respuestaObj.respuesta);
                await enviarMensajeConDelay(message.from, respuestaObj.respuesta);
                guardarMensajeConversacion(message.from, respuestaObj.respuesta, 'bot');
                console.log('✅ Respuesta enviada, continuando conversación hasta obtener cotización');
            }
        }
        
        
    } catch (error) {
        console.error('❌ Error al procesar mensaje:', error.message);
    }
});

// ============================================
// EVENTO: DESCONEXIÓN
// ============================================

client.on('disconnected', (reason) => {
    console.log('⚠️ Cliente desconectado:', reason);
    console.log('🔄 Intentando reconectar...');
});

// ============================================
// FUNCIÓN: ENVIAR MENSAJE CON DELAY (SIMULAR ESCRITURA)
// ============================================

async function enviarMensajeConDelay(chat, mensaje, delayMin = 3000, delayMax = 6000) {
    // Calcular delay aleatorio entre delayMin y delayMax
    const delay = Math.random() * (delayMax - delayMin) + delayMin;
    
    console.log(`⏳ Esperando ${Math.floor(delay)}ms antes de enviar respuesta (simulando escritura)...`);
    
    // Esperar el delay
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Enviar el mensaje
    await client.sendMessage(chat, mensaje);
}

// ============================================
// HISTORIAL DE CONVERSACIONES
// ============================================

// Almacenar conversaciones en memoria (por sesión)
const conversaciones = new Map();

// Almacenar estado de cotizaciones para evitar duplicados
const cotizacionesProcesadas = new Map();

function guardarMensajeConversacion(numero, mensaje, tipo) {
    if (!conversaciones.has(numero)) {
        conversaciones.set(numero, []);
    }
    
    const historial = conversaciones.get(numero);
    historial.push({
        tipo: tipo, // 'bot' o 'proveedor'
        mensaje: mensaje,
        fecha: new Date().toISOString()
    });
    
    // Limitar a últimos 20 mensajes para no sobrecargar
    if (historial.length > 20) {
        historial.shift();
    }
    
    conversaciones.set(numero, historial);
}

function obtenerHistorialConversacion(numero) {
    return conversaciones.get(numero) || [];
}

// Marcar que ya se guardó una cotización para este proveedor
function marcarCotizacionGuardada(numeroProveedor) {
    cotizacionesProcesadas.set(numeroProveedor, Date.now());
}

// Verificar si ya se guardó cotización recientemente (últimas 2 horas)
function yaSeGuardoCotizacion(numeroProveedor) {
    const timestamp = cotizacionesProcesadas.get(numeroProveedor);
    if (!timestamp) return false;
    
    const ahora = Date.now();
    const dosHoras = 2 * 60 * 60 * 1000;
    
    return (ahora - timestamp) < dosHoras;
}

// ============================================
// FUNCIÓN: GENERAR RESPUESTA COMO EMPRESA
// ============================================

async function generarRespuestaEmpresa(mensajeProveedor, numeroProveedor, tienePrecio) {
    try {
        // Usar el cliente Python para generar la respuesta
        const respuesta = await gptClient.generarRespuestaEmpresa(
            mensajeProveedor,
            numeroProveedor,
            tienePrecio
        );
        
        return respuesta;
        
    } catch (error) {
        console.error('❌ Error al generar respuesta con Python:', error.message);
        return generarRespuestaPredeterminada(mensajeProveedor, tienePrecio);
    }
}

// ============================================
// FUNCIÓN: RESPUESTA PREDETERMINADA (SIN IA)
// ============================================

function generarRespuestaPredeterminada(mensaje, tienePrecio) {
    const mensajeLower = mensaje.toLowerCase();
    
    if (tienePrecio) {
        // Si ya tenemos precios, agradecer y cerrar
        return `Muchas gracias por la información y los precios. 👍

Vamos a evaluar su propuesta junto con otras cotizaciones que estamos recibiendo y nos pondremos en contacto con ustedes pronto.

Saludos cordiales,
${process.env.BOT_NAME || 'Oficinas GlobalTech'}`;
    }
    
    // Respuestas basadas en el contexto del mensaje
    if (mensajeLower.includes('disponible') || mensajeLower.includes('tenemos') || mensajeLower.includes('ofrecemos')) {
        return '¡Perfecto! Me interesa conocer los precios. ¿Podrían enviarme una lista con los precios de los escritorios y sillas que tienen disponibles? 📋';
    }
    
    if (mensajeLower.includes('modelo') || mensajeLower.includes('tipo') || mensajeLower.includes('diseño')) {
        return 'Suena bien. ¿Cuáles son los precios de cada modelo? Necesitamos esta información para poder tomar una decisión. 💰';
    }
    
    if (mensajeLower.includes('catalogo') || mensajeLower.includes('catálogo') || mensajeLower.includes('foto')) {
        return 'Gracias por el catálogo. ¿Me pueden confirmar los precios de los productos? Es lo principal que necesitamos saber. 💵';
    }
    
    if (mensajeLower.includes('hola') || mensajeLower.includes('buenos') || mensajeLower.includes('buenas')) {
        return `Hola, gracias por responder. Como mencioné, estamos buscando escritorios y sillas para nuestras oficinas. ¿Me pueden enviar información sobre los precios que manejan? 🏢`;
    }
    
    if (mensajeLower.includes('cantidad') || mensajeLower.includes('cuántos') || mensajeLower.includes('cuantos')) {
        return 'Estamos evaluando entre 10-15 escritorios y 20-30 sillas aproximadamente. Pero primero necesitamos conocer sus precios para ver si se ajustan a nuestro presupuesto. ¿Qué precios manejan? 💼';
    }
    
    // Respuesta genérica si no hay precios
    return 'Gracias por la información. Lo que más nos urge saber son los PRECIOS de los escritorios y sillas. ¿Nos pueden enviar una lista con los precios? Es fundamental para nosotros. 📊';
}

// ============================================
// FUNCIÓN: EXTRAER INFORMACIÓN DE PRECIOS (CON IA)
// ============================================

async function extraerInformacionPreciosConIA(mensaje, numeroProveedor) {
    try {
        // Usar el cliente Python para extraer precios
        const resultado = await gptClient.extraerInformacionPreciosConIA(mensaje, numeroProveedor);
        
        // Complementar con información local
        const nombreProveedor = numeroProveedor.replace('@c.us', '');
        
        return {
            proveedor: nombreProveedor,
            fecha: new Date().toISOString(),
            mensajeCompleto: mensaje,
            tienePrecio: resultado.tienePrecio,
            precios: resultado.precios,
            productos: resultado.productos,
            escritorios: resultado.productos.includes('escritorio'),
            sillas: resultado.productos.includes('silla'),
            armarios: resultado.productos.includes('armario'),
            estanterias: resultado.productos.includes('estantería'),
            timestamp: Date.now(),
            analizadoPor: 'Python-' + resultado.metodo
        };
        
    } catch (error) {
        console.error('❌ Error en extraer precios con Python:', error.message);
        // Caer a regex simple
        return extraerInformacionPrecios(mensaje, numeroProveedor);
    }
}

// ============================================
// FUNCIÓN: ANALIZAR IMAGEN DE PRODUCTO CON VISIÓN IA
// ============================================

async function analizarImagenProducto(imageData, mimetype, numeroProveedor) {
    try {
        // Si no tenemos API key, no podemos analizar
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'tu_api_key_aqui') {
            console.log('⚠️ API Key no configurada, no se puede analizar imagen');
            return null;
        }
        
        console.log('🤖 Analizando imagen con Vision API...');
        
        // Convertir imagen a base64 si no lo está ya
        let base64Image = imageData;
        if (!imageData.includes('base64') && imageData.length > 100 && !imageData.startsWith('/')) {
            // Si es un buffer o base64 puro, usarlo tal cual
            if (typeof imageData !== 'string') {
                base64Image = Buffer.from(imageData).toString('base64');
            }
        }
        
        // Determinar el tipo de media para Vision API
        let mediaType = 'image/jpeg';
        if (mimetype) {
            if (mimetype.includes('png')) mediaType = 'image/png';
            else if (mimetype.includes('webp')) mediaType = 'image/webp';
            else if (mimetype.includes('gif')) mediaType = 'image/gif';
            else mediaType = 'image/jpeg';
        }
        
        console.log(`   Tipo de media: ${mediaType}`);
        
        // Llamar a Vision API de OpenAI
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: process.env.AI_MODEL || 'gpt-4-vision',
                messages: [
                    {
                        role: 'system',
                        content: `Eres un experto en análisis de imágenes de productos de muebles para oficina.
                        
Tu tarea es analizar la imagen y extraer:
1. ¿Qué tipo de mueble es? (silla, escritorio, armario, estantería, mesa, sofá, etc)
2. ¿Cuál es el nombre o modelo específico del producto?
3. ¿Cuáles son las características principales visibles?
4. ¿En qué condición se ve el producto? (nuevo, usado, etc)

Responde SIEMPRE en formato JSON:
{
  "nombre": "nombre específico del producto",
  "tipo": "tipo de mueble",
  "descripcion": "breve descripción del producto y sus características",
  "condicion": "nuevo/usado/sin determinar",
  "confianza": "alta/media/baja"
}

IMPORTANTE:
- Si no es un mueble, responde con confianza: "baja"
- Sé específico con el nombre del producto (no solo "silla", sino "Silla Ejecutiva Giratoria" o similar)
- Si ves precio en la imagen, NO lo incluyas aquí (será procesado después)
- Si no puedes ver claramente el producto, usa confianza "baja"`
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Analiza esta imagen de un producto de muebles y extrae la información en JSON:'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mediaType};base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 500,
                temperature: 0.3
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 20000
            }
        );
        
        const iaResponse = response.data.choices[0].message.content;
        console.log('🤖 Respuesta Vision API:', iaResponse);
        
        // Parsear respuesta JSON
        const jsonMatch = iaResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.log('⚠️ No se pudo parsear respuesta de Vision API');
            return null;
        }
        
        const analisisProducto = JSON.parse(jsonMatch[0]);
        
        // Validar confianza
        if (analisisProducto.confianza === 'baja') {
            console.log('⚠️ Confianza baja en la detección del producto');
            return null;
        }
        
        console.log('✅ Producto detectado:', analisisProducto.nombre);
        
        return {
            nombre: analisisProducto.nombre || 'Producto desconocido',
            tipo: analisisProducto.tipo || 'Mueble',
            descripcion: analisisProducto.descripcion || '',
            condicion: analisisProducto.condicion || 'sin determinar',
            confianza: analisisProducto.confianza || 'media'
        };
        
    } catch (error) {
        console.error('❌ Error en Vision API:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Error:', error.response.data?.error?.message);
        }
        return null;
    }
}

// ============================================
// FUNCIÓN: EXTRAER DETALLES COMPLETOS DE PRODUCTOS
// ============================================

function extraerDetallesProductos(mensaje) {
    const productos = [];
    
    // Patrones para detectar productos con detalles - AMPLIADO
    const tiposProductos = [
        {
            tipo: 'silla',
            patrones: /silla(?:s)?(?:\s+(?:de|para|ergonómica|ejecutiva|gamer|de oficina|de escritorio|tapizada|giratoria|con respaldo|sin respaldo))?/gi,
            palabrasDetalle: {
                material: /cuero|tela|mesh|plástico|madera|aluminio|acero/gi,
                estilo: /ergonómica|ejecutiva|gamer|office|moderna|clásica|industrial|minimalista|tapizada|giratoria|sin respaldo|con respaldo/gi,
                caracteristicas: /altura ajustable|reposabrazos|ruedas|apoyo lumbar|base cromada|certificada/gi
            }
        },
        {
            tipo: 'escritorio',
            patrones: /escritorio(?:s)?(?:\s+(?:de|para|ejecutivo|gamer|standing|regulable|eléctrico|modular))?|mesa(?:s)?(?:\s+(?:de trabajo|de oficina|ejecutiva|de reuniones?))?/gi,
            palabrasDetalle: {
                material: /madera|vidrio|metal|acero|aluminio|bambú|MDF|laminado/gi,
                estilo: /ejecutivo|gamer|standing|regulable|eléctrico|modular|pedestal|doble|compacto/gi,
                caracteristicas: /altura ajustable|motor eléctrico|cable management|gavetas|estantes|superficie amplia/gi
            }
        },
        {
            tipo: 'mezon',
            patrones: /mez[oó]n(?:es)?|mesón(?:es)?|mostrador(?:es)?|counter/gi,
            palabrasDetalle: {
                material: /madera|granito|mármol|cuarzo|acero|laminado|formica/gi,
                estilo: /moderno|clásico|industrial|minimalista|rústico/gi,
                caracteristicas: /con lavabo|esquinero|tipo isla|empotrado|extraíble/gi
            }
        },
        {
            tipo: 'lampara',
            patrones: /l[aá]mpara(?:s)?|luminaria(?:s)?|luz(?:ces)?(?:\s+(?:de|para|de techo|de piso|de mesa|colgante))?/gi,
            palabrasDetalle: {
                material: /metal|vidrio|madera|plástico|cristal|acero/gi,
                estilo: /moderna|clásica|industrial|vintage|minimalista|led|colgante|de pie|de mesa/gi,
                caracteristicas: /regulable|con dimmer|ahorradora|led|sensor de movimiento/gi
            }
        },
        {
            tipo: 'taburete',
            patrones: /taburete(?:s)?|banqueta(?:s)?|banco(?:s)?(?:\s+(?:alto|bajo|giratorio|de bar))?/gi,
            palabrasDetalle: {
                material: /madera|metal|acero|cuero|tela|plástico/gi,
                estilo: /moderno|industrial|clásico|de bar|alto|bajo|giratorio/gi,
                caracteristicas: /altura ajustable|con respaldo|sin respaldo|apilable|plegable/gi
            }
        },
        {
            tipo: 'casillero',
            patrones: /casillero(?:s)?|locker(?:s)?|taquilla(?:s)?/gi,
            palabrasDetalle: {
                material: /metal|acero|madera|laminado/gi,
                estilo: /individual|doble|triple|con cerradura|sin cerradura/gi,
                caracteristicas: /con llave|con candado|ventilado|reforzado|apilable/gi
            }
        },
        {
            tipo: 'armario',
            patrones: /armario(?:s)?|closet(?:s)?|gabinete(?:s)?|archivador(?:es)?|cajonera(?:s)?|ropero(?:s)?/gi,
            palabrasDetalle: {
                material: /madera|metal|acero|MDF|laminado/gi,
                estilo: /ejecutivo|modular|de pared|de piso|con espejo|sin puertas|con puertas/gi,
                caracteristicas: /puertas corredizas|con llave|iluminado|espacio interno|estantes ajustables/gi
            }
        },
        {
            tipo: 'estanteria',
            patrones: /estanter[ií]a(?:s)?|estante(?:s)?|repisa(?:s)?|librero(?:s)?|shelving|mueble(?:s)?\s+de\s+almacenaje/gi,
            palabrasDetalle: {
                material: /madera|metal|acero|vidrio|MDF/gi,
                estilo: /modular|flotante|industrial|minimalista|abierto|cerrado|pared|piso/gi,
                caracteristicas: /estantes ajustables|carga pesada|desmontable|con respaldo|sin respaldo/gi
            }
        },
        {
            tipo: 'sillon',
            patrones: /sill[oó]n(?:es)?|sof[aá](?:s)?|poltrona(?:s)?/gi,
            palabrasDetalle: {
                material: /cuero|tela|terciopelo|microfibra|lino/gi,
                estilo: /moderno|clásico|chesterfield|escandinavo|industrial/gi,
                caracteristicas: /reclinable|cama|esquinero|modular|con patas de madera/gi
            }
        },
        {
            tipo: 'archivador',
            patrones: /archivador(?:es)?|archivo(?:s)?|filing\s+cabinet/gi,
            palabrasDetalle: {
                material: /metal|acero|madera|laminado/gi,
                estilo: /vertical|horizontal|rodante|fijo|de piso/gi,
                caracteristicas: /con llave|con ruedas|ignífugo|suspendido|lateral/gi
            }
        },
        {
            tipo: 'pizarra',
            patrones: /pizarra(?:s)?|whiteboard(?:s)?|tablero(?:s)?(?:\s+(?:blanco|acr[ií]lico|de corcho))?/gi,
            palabrasDetalle: {
                material: /acero|acrílico|vidrio|corcho|magnético/gi,
                estilo: /de pared|con trípode|rodante|magnético|con marco/gi,
                caracteristicas: /borrable|magnético|con soporte|plegable|portátil/gi
            }
        },
        {
            tipo: 'perchero',
            patrones: /perchero(?:s)?|colgador(?:es)?|gancho(?:s)?(?:\s+(?:de pared|de pie|de puerta))?/gi,
            palabrasDetalle: {
                material: /madera|metal|acero|plástico/gi,
                estilo: /de pie|de pared|de puerta|moderno|clásico/gi,
                caracteristicas: /giratorio|múltiple|con repisa|con espejo/gi
            }
        }
    ];
    
    // Buscar cada tipo de producto
    tiposProductos.forEach(tipo => {
        let matchProducto;
        const regexTipo = new RegExp(tipo.patrones.source, 'gi');
        
        while ((matchProducto = regexTipo.exec(mensaje)) !== null) {
            const textoProducto = matchProducto[0];
            
            // Extraer detalles del producto
            const detalles = {
                tipo: tipo.tipo,
                nombreCompleto: textoProducto.trim(),
                marca: extraerMarca(mensaje),
                material: extraerDetalleProducto(mensaje, tipo.palabrasDetalle.material),
                estilo: extraerDetalleProducto(mensaje, tipo.palabrasDetalle.estilo),
                caracteristicas: extraerDetalleProducto(mensaje, tipo.palabrasDetalle.caracteristicas),
                contexto: textoProducto
            };
            
            // Filtrar campos vacíos
            Object.keys(detalles).forEach(key => {
                if (Array.isArray(detalles[key]) && detalles[key].length === 0) {
                    delete detalles[key];
                } else if (detalles[key] === null || detalles[key] === '') {
                    delete detalles[key];
                }
            });
            
            productos.push(detalles);
        }
    });
    
    return productos;
}

// ============================================
// FUNCIÓN: EXTRAER MARCA DEL MENSAJE
// ============================================

function extraerMarca(mensaje) {
    // Buscar patrones comunes de marca mencionadas
    const marcasComunes = [
        'Herman Miller', 'Steelcase', 'Knoll', 'Vitra', 'Eames', 
        'Ikea', 'Conforama', 'La Redoute', 'Sofology',
        'Aeron', 'Leap', 'Mirra', 'Celle',
        'DXRacer', 'Secretlab', 'Autonomous', 'Uplift'
    ];
    
    const mensaje_lower = mensaje.toLowerCase();
    const marcaEncontrada = marcasComunes.find(marca => 
        mensaje_lower.includes(marca.toLowerCase())
    );
    
    return marcaEncontrada || null;
}

// ============================================
// FUNCIÓN: EXTRAER DETALLE ESPECÍFICO DEL PRODUCTO
// ============================================

function extraerDetalleProducto(mensaje, patron) {
    if (!patron) return [];
    
    const detalles = [];
    let match;
    const regexLocal = new RegExp(patron.source, 'gi');
    
    while ((match = regexLocal.exec(mensaje)) !== null) {
        if (!detalles.includes(match[0])) {
            detalles.push(match[0]);
        }
    }
    
    return detalles;
}

function extraerInformacionPrecios(mensaje, numeroProveedor) {
    const fs = require('fs');
    
    // Obtener nombre del proveedor
    const nombreProveedor = numeroProveedor.replace('@c.us', '');
    
    const preciosEncontrados = [];
    const productosDetallados = [];
    let match;
    
    // Múltiples patrones para detectar precios en diferentes formatos
    const patronesPrecios = [
        // Formatos: "Bs 500", "500 Bs", "$500", "500$"
        /(?:Bs\.?\s*)?(\d{1,6}(?:[.,]\d{1,2})?)\s*(?:Bs|bolivianos?|pesos?|\$|usd?|dólares?)/gi,
        // Formatos: "120 dólares", "500 bolivianos", "100 pesos"
        /(\d{1,6}(?:[.,]\d{1,2})?)\s+(?:dólares?|bolivianos?|pesos?|usd?)/gi,
        // Formatos: "$100", "€100", "100 €"
        /[$€]\s*(\d{1,6}(?:[.,]\d{1,2})?)|(\d{1,6}(?:[.,]\d{1,2})?)\s*[$€]/gi,
        // Formatos: "precio: 500", "costo: $500"
        /(?:precio|costo|valor):\s*[$]?\s*(\d{1,6}(?:[.,]\d{1,2})?)/gi,
        // Formato simple: solo número con contexto de precio
        /(?:es|está|a)?\s*(\d{1,6}(?:[.,]\d{1,2})?)\s*(?:cada|por|unidad|la|el)/gi
    ];
    
    // Intentar con cada patrón
    for (const patron of patronesPrecios) {
        while ((match = patron.exec(mensaje)) !== null) {
            // Tomar el grupo que no sea undefined
            const precio = match[1] || match[2];
            if (precio) {
                const precioNumero = parseFloat(precio.replace(',', '.'));
                if (!preciosEncontrados.includes(precioNumero)) {
                    preciosEncontrados.push(precioNumero);
                    console.log(`   💰 Precio detectado: ${precioNumero}`);
                }
            }
        }
    }
    
    // Si aún no encontró precios, buscar números simples que podrían ser precios
    if (preciosEncontrados.length === 0) {
        const patronSimple = /\b(\d{1,6}(?:[.,]\d{1,2})?)\b/g;
        const numerosEncontrados = [];
        
        while ((match = patronSimple.exec(mensaje)) !== null) {
            numerosEncontrados.push(match[1]);
        }
        
        // Si el mensaje contiene palabras relacionadas con precio y hay números, considerarlos
        if (numerosEncontrados.length > 0 && 
            /precio|costo|valor|dólar|boliviano|peso|bs|\$/gi.test(mensaje)) {
            // Tomar solo números que parezcan precios (rango sensible)
            for (const num of numerosEncontrados) {
                const precio = parseFloat(num.replace(',', '.'));
                if (precio > 0 && precio < 100000) {
                    preciosEncontrados.push(precio);
                    console.log(`   💰 Precio estimado: ${precio}`);
                }
            }
        }
    }
    
    // Extraer detalles detallados de productos mencionados
    const detallesProductos = extraerDetallesProductos(mensaje);
    
    // Detectar palabras clave relacionadas con muebles
    const esEscritorio = /escritorio|desk|mesa|table/gi.test(mensaje);
    const esSilla = /silla|chair|asiento|seat/gi.test(mensaje);
    const esArmario = /armario|closet|gabinete|archivador|cajonera/gi.test(mensaje);
    const esEstanteria = /estantería|estante|repisa|librero|shelving/gi.test(mensaje);
    
    const info = {
        proveedor: nombreProveedor,
        fecha: new Date().toISOString(),
        mensajeCompleto: mensaje,
        tienePrecio: preciosEncontrados.length > 0,
        precios: preciosEncontrados,
        productosDetallados: detallesProductos,
        escritorios: esEscritorio,
        sillas: esSilla,
        armarios: esArmario,
        estanterias: esEstanteria,
        timestamp: Date.now()
    };
    
    console.log(`📊 Información extraída:`, {
        tienePrecio: info.tienePrecio,
        preciosDetectados: preciosEncontrados,
        productosDetectados: detallesProductos.length,
        palabrasClave: { escritorio: esEscritorio, silla: esSilla, armario: esArmario }
    });
    
    return info;
}

// ============================================
// FUNCIÓN: TRANSCRIBIR AUDIO CON WHISPER API
// ============================================

async function transcribirAudioConWhisper(audioBuffer) {
    try {
        // Verificar si hay API key configurada
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'tu_api_key_aqui') {
            console.log('⚠️ API Key no configurada, no se puede transcribir audio');
            return null;
        }
        
        console.log('🎙️ Enviando audio a Whisper API de OpenAI...');
        
        // Crear FormData para enviar el audio
        const FormData = require('form-data');
        const form = new FormData();
        
        // Convertir buffer a stream
        form.append('file', Buffer.from(audioBuffer, 'base64'), {
            filename: `audio_${Date.now()}.ogg`,
            contentType: 'audio/ogg'
        });
        form.append('model', 'whisper-1');
        form.append('language', 'es'); // Español
        
        // Enviar a API de Whisper
        const response = await axios.post(
            'https://api.openai.com/v1/audio/transcriptions',
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                timeout: 30000 // 30 segundos
            }
        );
        
        const textoTranscrito = response.data.text;
        console.log('✅ Transcripción exitosa:', textoTranscrito);
        
        return textoTranscrito;
        
    } catch (error) {
        console.error('❌ Error en transcripción Whisper:', error.message);
        
        // Si falla la API de Whisper, intentar con método alternativo
        console.log('💡 Intentando método alternativo de transcripción...');
        return null;
    }
}

// ============================================
// FUNCIÓN: PROCESAR MENSAJE TRANSCRITO
// ============================================

async function procesarMensajeTranscrito(message, textoTranscrito) {
    try {
        console.log('📝 Procesando mensaje transcrito...');
        
        // Extraer información de precios del audio transcrito
        const infoExtraida = extraerInformacionPrecios(textoTranscrito, message.from);
        
        // Guardar en historial como si fuera un mensaje de texto
        guardarMensajeConversacion(message.from, `[VOZ] ${textoTranscrito}`, 'proveedor');
        
        if (infoExtraida.tienePrecio) {
            // Guardar la cotización en JSON
            guardarCotizacion({
                ...infoExtraida,
                mensajeCompleto: `[TRANSCRITO DE VOZ] ${textoTranscrito}`
            });
            console.log('💾 Cotización guardada (de audio):', infoExtraida.proveedor);
            
            // Responder con agradecimiento
            const respuestaObj = await generarRespuestaEmpresa(textoTranscrito, message.from, true);
            const respuestaFinal = typeof respuestaObj === 'string' ? respuestaObj : respuestaObj.respuesta;
            
            if (respuestaFinal && respuestaFinal.trim()) {
                await message.reply(respuestaFinal);
                console.log('✅ Agradecimiento final enviado');
            }
        } else {
            // Continuar la conversación
            console.log('💭 Generando respuesta para continuar...');
            const respuestaObj = await generarRespuestaEmpresa(textoTranscrito, message.from, false);
            const respuesta = typeof respuestaObj === 'string' ? respuestaObj : respuestaObj.respuesta;
            
            if (respuesta && respuesta.trim()) {
                await message.reply(respuesta);
                guardarMensajeConversacion(message.from, respuesta, 'bot');
                console.log('✅ Respuesta enviada');
            }
        }
        
    } catch (error) {
        console.error('❌ Error procesando mensaje transcrito:', error.message);
    }
}



// ============================================
// FUNCIÓN: GUARDAR IMAGEN EN COTIZACIÓN
// ============================================

function guardarImagenEnCotizacion(numeroProveedor, imagenBase64, categoria) {
    const fs = require('fs');
    const path = require('path');
    
    const archivoJSON = path.join(__dirname, 'cotizaciones.json');
    
    try {
        console.log('📸 Guardando imagen en cotización...');
        
        // Leer cotizaciones existentes
        if (!fs.existsSync(archivoJSON)) {
            console.log('⚠️ No hay archivo de cotizaciones aún');
            return imagenBase64; // Retornar la imagen aunque no se guarde en JSON
        }
        
        const contenido = fs.readFileSync(archivoJSON, 'utf8');
        if (!contenido.trim()) {
            console.log('⚠️ Archivo de cotizaciones vacío');
            return imagenBase64;
        }
        
        const datos = JSON.parse(contenido);
        
        if (!datos.cotizaciones || datos.cotizaciones.length === 0) {
            console.log('⚠️ Sin cotizaciones para asociar imagen');
            return imagenBase64;
        }
        
        // Buscar la cotización más reciente del proveedor
        const cotizacionesProveedor = datos.cotizaciones.filter(cot => cot.proveedor === numeroProveedor);
        
        if (cotizacionesProveedor.length === 0) {
            console.log('⚠️ No hay cotizaciones del proveedor para guardar imagen');
            return imagenBase64;
        }
        
        // Tomar la más reciente
        const cotizacionMasReciente = cotizacionesProveedor[cotizacionesProveedor.length - 1];
        
        // Actualizar con la imagen
        cotizacionMasReciente.imagen = {
            categoria: categoria || 'PDF',
            timestamp: new Date().toISOString(),
            tamanio: imagenBase64.length
        };
        cotizacionMasReciente.imagenBase64 = imagenBase64;
        
        // Guardar
        fs.writeFileSync(archivoJSON, JSON.stringify(datos, null, 2), 'utf8');
        console.log('✅ Imagen asociada a la cotización correctamente');
        console.log(`   Categoría: ${categoria}`);
        console.log(`   Tamaño: ${(imagenBase64.length / 1024).toFixed(2)} KB`);
        
        return imagenBase64; // Retornar la imagen para usarla en BD
        
    } catch (error) {
        console.error('❌ Error guardando imagen en cotización:', error.message);
        return imagenBase64; // Retornar la imagen aunque falle el guardado en JSON
    }
}

// ============================================
// FUNCIÓN: GUARDAR COTIZACIÓN EN JSON
// ============================================

// ============================================
// FUNCIÓN: GUARDAR COTIZACIÓN EN BASE DE DATOS
// ============================================

async function guardarCotizacion(infoProveedor) {
    const fs = require('fs');
    const path = require('path');
    const axios = require('axios');
    
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001';
    
    try {
        console.log('💾 Iniciando guardado de cotización en base de datos...');
        console.log('   Proveedor:', infoProveedor.proveedor);
        console.log('   Precios:', infoProveedor.precios);
        console.log('   Productos detectados:', infoProveedor.productosDetallados?.length || 0);
        
        // Obtener o crear nombre del proveedor
        const proveedorNombre = await obtenerNombreProveedor(infoProveedor.proveedor);
        
        // SEPARAR PRODUCTOS Y PRECIOS INDIVIDUALMENTE
        const productosIndividuales = await separarProductosConPrecios(infoProveedor, proveedorNombre);
        
        if (productosIndividuales.length === 0) {
            console.log('⚠️ No se detectaron productos individuales, guardando como registro único');
            // Guardar como registro único sin producto específico
            const productoGenerico = await crearProductoGenerico(infoProveedor, proveedorNombre);
            productosIndividuales.push(productoGenerico);
        }
        
        console.log(`📦 Guardando ${productosIndividuales.length} producto(s) individual(es)...`);
        
        // Guardar cada producto individualmente
        let productosGuardados = 0;
        for (const producto of productosIndividuales) {
            try {
                console.log(`🔄 Intentando guardar producto: ${producto.nombre_producto}`);
                console.log(`   URL: ${BACKEND_URL}/api/whatsapp/productos`);
                console.log(`   Datos:`, JSON.stringify(producto, null, 2));
                
                const response = await axios.post(
                    `${BACKEND_URL}/api/whatsapp/productos`,
                    producto,
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 5000
                    }
                );
                
                if (response.status === 200 || response.status === 201) {
                    productosGuardados++;
                    console.log(`✅ Producto guardado: ${producto.nombre_producto} - ${producto.precio ? 'Bs ' + producto.precio : 'Sin precio'}`);
                }
            } catch (errorProducto) {
                console.error(`❌ Error guardando producto ${producto.nombre_producto}:`);
                console.error('   Error completo:', errorProducto);
                if (errorProducto.response) {
                    console.error('   Status:', errorProducto.response.status);
                    console.error('   Data:', errorProducto.response.data);
                } else if (errorProducto.request) {
                    console.error('   No response received from backend');
                } else {
                    console.error('   Error message:', errorProducto.message);
                }
            }
        }
        
        console.log(`✅ ${productosGuardados}/${productosIndividuales.length} productos guardados exitosamente`);
        
        // También guardar backup en JSON local como respaldo
        await guardarBackupJSON(infoProveedor);
        
    } catch (error) {
        console.error('❌ Error guardando en base de datos:', error.message);
        console.log('⚠️ Guardando en archivo JSON local como respaldo...');
        
        // Si falla el backend, guardar en JSON
        await guardarBackupJSON(infoProveedor);
    }
}

// ============================================
// FUNCIÓN: SEPARAR PRODUCTOS CON SUS PRECIOS
// ============================================

async function separarProductosConPrecios(infoProveedor, proveedorNombre) {
    const productos = [];
    const productosDetectados = infoProveedor.productosDetallados || [];
    const precios = infoProveedor.precios || [];
    const fecha = infoProveedor.fecha || new Date().toISOString();
    const timestamp = infoProveedor.timestamp || Date.now();
    
    console.log(`   🔍 Separando productos: ${productosDetectados.length} productos, ${precios.length} precios`);
    
    // Subir imagen al backend si existe (una sola vez para todos los productos)
    let imagenUrl = null;
    if (infoProveedor.imagenBase64) {
        console.log('📤 Subiendo imagen al backend...');
        const fileName = `producto_${timestamp}.jpg`;
        imagenUrl = await uploadImageToBackend(infoProveedor.imagenBase64, fileName);
        
        if (!imagenUrl) {
            console.warn('⚠️ No se pudo subir la imagen, continuando sin URL');
        }
    }
    
    // Si tenemos productos detallados, usarlos
    if (productosDetectados.length > 0) {
        productosDetectados.forEach((prod, index) => {
            // Asignar precio si hay disponible
            const precio = precios[index] || null;
            
            // Generar ID único basado en timestamp + índice
            const productoId = timestamp + index;
            
            // MEJORADO: Capitalizar el nombre del tipo para usarlo como nombre base
            const nombreBase = prod.tipo.charAt(0).toUpperCase() + prod.tipo.slice(1);
            const nombreCompleto = prod.nombreCompleto || nombreBase;
            
            const producto = {
                id: productoId,
                proveedor_numero: infoProveedor.proveedor,
                proveedor_nombre: proveedorNombre,
                nombre_producto: nombreCompleto,  // Usar el nombre completo detectado o tipo capitalizado
                tipo_producto: prod.tipo,
                descripcion: generarDescripcionProducto(prod, infoProveedor.mensajeCompleto),
                precio: precio,
                tiene_precio: precio !== null && precio > 0,
                mensaje_completo: infoProveedor.mensajeCompleto,
                fecha: fecha,
                timestamp: productoId,
                caracteristicas: prod.caracteristicas || [],
                material: prod.material ? (Array.isArray(prod.material) ? prod.material.join(', ') : prod.material) : null,
                marca: prod.marca || null,
                cantidad_disponible: null,
                imagen_url: imagenUrl  // URL del backend
            };
            
            productos.push(producto);
            console.log(`      📦 Producto ${index + 1}: ${producto.nombre_producto} (${producto.tipo}) - ${precio ? 'Bs ' + precio : 'Sin precio'}`);
        });
    } else if (precios.length > 0) {
        // Si solo tenemos precios sin productos específicos, intentar extraer del mensaje
        const productosSimples = extraerProductosSimples(infoProveedor.mensajeCompleto);
        
        if (productosSimples.length > 0) {
            // Asociar precios con productos detectados
            precios.forEach((precio, index) => {
                const prodSimple = productosSimples[Math.min(index, productosSimples.length - 1)];
                const productoId = timestamp + index;
                
                const producto = {
                    id: productoId,
                    proveedor_numero: infoProveedor.proveedor,
                    proveedor_nombre: proveedorNombre,
                    nombre_producto: prodSimple.nombre,  // Nombre detectado del mensaje
                    tipo_producto: prodSimple.tipo,
                    descripcion: extraerDescripcionConPrecio(infoProveedor.mensajeCompleto, precio),
                    precio: precio,
                    tiene_precio: true,
                    mensaje_completo: infoProveedor.mensajeCompleto,
                    fecha: fecha,
                    timestamp: productoId,
                    caracteristicas: [],
                    material: null,
                    marca: null,
                    cantidad_disponible: null,
                    imagen_url: imagenUrl  // URL del backend
                };
                
                productos.push(producto);
                console.log(`      💰 Precio ${index + 1}: ${prodSimple.nombre} - Bs ${precio}`);
            });
        } else {
            // Fallback: usar categorías detectadas por palabras clave
            const categorias = [];
            if (infoProveedor.escritorios) categorias.push({ tipo: 'escritorio', nombre: 'Escritorio' });
            if (infoProveedor.sillas) categorias.push({ tipo: 'silla', nombre: 'Silla' });
            if (infoProveedor.armarios) categorias.push({ tipo: 'armario', nombre: 'Armario' });
            if (infoProveedor.estanterias) categorias.push({ tipo: 'estanteria', nombre: 'Estantería' });
            
            if (categorias.length > 0) {
                precios.forEach((precio, index) => {
                    const categoria = categorias[Math.min(index, categorias.length - 1)];
                    const productoId = timestamp + index;
                    
                    const producto = {
                        id: productoId,
                        proveedor_numero: infoProveedor.proveedor,
                        proveedor_nombre: proveedorNombre,
                        nombre_producto: categoria.nombre,  // Nombre de la categoría
                        tipo_producto: categoria.tipo,
                        descripcion: extraerDescripcionConPrecio(infoProveedor.mensajeCompleto, precio),
                        precio: precio,
                        tiene_precio: true,
                        mensaje_completo: infoProveedor.mensajeCompleto,
                        fecha: fecha,
                        timestamp: productoId,
                        caracteristicas: [],
                        material: null,
                        marca: null,
                        cantidad_disponible: null,
                        imagen_url: imagenUrl  // URL del backend
                    };
                    
                    productos.push(producto);
                    console.log(`      💰 Precio ${index + 1}: ${categoria.nombre} - Bs ${precio}`);
                });
            }
        }
    }
    
    return productos;
}

// ============================================
// FUNCIÓN: EXTRAER PRODUCTOS SIMPLES DEL MENSAJE
// ============================================

function extraerProductosSimples(mensaje) {
    const productos = [];
    const mensajeLower = mensaje.toLowerCase();
    
    // Lista ampliada de productos comunes y sus variaciones
    const productosComunes = [
        { regex: /\b(silla|sillas)\b/gi, tipo: 'silla', nombre: 'Silla' },
        { regex: /\b(escritorio|escritorios)\b/gi, tipo: 'escritorio', nombre: 'Escritorio' },
        { regex: /\b(mesa|mesas)(?:\s+de\s+(?:trabajo|oficina|reuniones?))?\b/gi, tipo: 'escritorio', nombre: 'Mesa' },
        { regex: /\b(mez[oó]n|mezones|mesón|mesones|mostrador|mostradores)\b/gi, tipo: 'mezon', nombre: 'Mezón' },
        { regex: /\b(l[aá]mpara|lámparas|lampara|lamparas|luminaria|luminarias)\b/gi, tipo: 'lampara', nombre: 'Lámpara' },
        { regex: /\b(taburete|taburetes|banqueta|banquetas|banco|bancos)\b/gi, tipo: 'taburete', nombre: 'Taburete' },
        { regex: /\b(casillero|casilleros|locker|lockers|taquilla|taquillas)\b/gi, tipo: 'casillero', nombre: 'Casillero' },
        { regex: /\b(armario|armarios|closet|closets|ropero|roperos)\b/gi, tipo: 'armario', nombre: 'Armario' },
        { regex: /\b(estanter[ií]a|estanterías|estante|estantes|repisa|repisas)\b/gi, tipo: 'estanteria', nombre: 'Estantería' },
        { regex: /\b(librero|libreros)\b/gi, tipo: 'estanteria', nombre: 'Librero' },
        { regex: /\b(sill[oó]n|sillones|sofá|sofas|poltrona|poltronas)\b/gi, tipo: 'sillon', nombre: 'Sillón' },
        { regex: /\b(archivador|archivadores|archivo|archivos)\b/gi, tipo: 'archivador', nombre: 'Archivador' },
        { regex: /\b(cajonera|cajoneras|gavetero|gaveteros)\b/gi, tipo: 'armario', nombre: 'Cajonera' },
        { regex: /\b(gabinete|gabinetes)\b/gi, tipo: 'armario', nombre: 'Gabinete' },
        { regex: /\b(pizarra|pizarras|whiteboard|whiteboards|tablero|tableros)\b/gi, tipo: 'pizarra', nombre: 'Pizarra' },
        { regex: /\b(perchero|percheros|colgador|colgadores)\b/gi, tipo: 'perchero', nombre: 'Perchero' },
        { regex: /\b(vitrina|vitrinas)\b/gi, tipo: 'estanteria', nombre: 'Vitrina' },
        { regex: /\b(pupitre|pupitres)\b/gi, tipo: 'escritorio', nombre: 'Pupitre' },
        { regex: /\b(banca|bancas)\b/gi, tipo: 'taburete', nombre: 'Banca' }
    ];
    
    // Buscar cada tipo de producto en el mensaje
    productosComunes.forEach(prod => {
        const matches = mensaje.match(prod.regex);
        if (matches && matches.length > 0) {
            // Evitar duplicados
            const yaExiste = productos.some(p => p.tipo === prod.tipo);
            if (!yaExiste) {
                productos.push({
                    tipo: prod.tipo,
                    nombre: prod.nombre
                });
                console.log(`      🔍 Producto detectado: ${prod.nombre} (${prod.tipo})`);
            }
        }
    });
    
    return productos;
}

// ============================================
// FUNCIÓN: CREAR PRODUCTO GENÉRICO
// ============================================

async function crearProductoGenerico(infoProveedor, proveedorNombre) {
    // Intentar extraer productos del mensaje primero
    const productosSimples = extraerProductosSimples(infoProveedor.mensajeCompleto);
    
    let tipoProducto = 'producto';
    let nombreProducto = 'Producto';
    
    if (productosSimples.length > 0) {
        // Usar el primer producto detectado
        tipoProducto = productosSimples[0].tipo;
        nombreProducto = productosSimples[0].nombre;
    } else {
        // Fallback a categorías por palabras clave
        if (infoProveedor.escritorios) {
            tipoProducto = 'escritorio';
            nombreProducto = 'Escritorio';
        } else if (infoProveedor.sillas) {
            tipoProducto = 'silla';
            nombreProducto = 'Silla';
        } else if (infoProveedor.armarios) {
            tipoProducto = 'armario';
            nombreProducto = 'Armario';
        } else if (infoProveedor.estanterias) {
            tipoProducto = 'estanteria';
            nombreProducto = 'Estantería';
        }
    }
    
    const precio = infoProveedor.precios && infoProveedor.precios.length > 0 ? infoProveedor.precios[0] : null;
    
    // Subir imagen al backend si existe
    let imagenUrl = null;
    if (infoProveedor.imagenBase64) {
        console.log('📤 Subiendo imagen al backend...');
        const timestamp = Date.now();
        const fileName = `producto_${timestamp}.jpg`;
        imagenUrl = await uploadImageToBackend(infoProveedor.imagenBase64, fileName);
        
        if (!imagenUrl) {
            console.warn('⚠️ No se pudo subir la imagen, continuando sin URL');
        }
    }
    
    return {
        id: infoProveedor.timestamp || Date.now(),
        proveedor_numero: infoProveedor.proveedor,
        proveedor_nombre: proveedorNombre,
        nombre_producto: nombreProducto,  // Nombre detectado, no genérico
        tipo_producto: tipoProducto,
        descripcion: infoProveedor.mensajeCompleto,
        precio: precio,
        tiene_precio: precio !== null && precio > 0,
        mensaje_completo: infoProveedor.mensajeCompleto,
        fecha: infoProveedor.fecha || new Date().toISOString(),
        timestamp: infoProveedor.timestamp || Date.now(),
        caracteristicas: [],
        material: null,
        marca: null,
        cantidad_disponible: null,
        imagen_url: imagenUrl  // Usar la URL del backend en lugar de base64
    };
}

// ============================================
// FUNCIÓN: GENERAR DESCRIPCIÓN DEL PRODUCTO
// ============================================

function generarDescripcionProducto(producto, mensajeCompleto) {
    let descripcion = `${producto.nombreCompleto}`;
    
    if (producto.marca) {
        descripcion += ` de ${producto.marca}`;
    }
    
    if (producto.material && producto.material.length > 0) {
        const materiales = Array.isArray(producto.material) ? producto.material.join(', ') : producto.material;
        descripcion += `, material: ${materiales}`;
    }
    
    if (producto.estilo && producto.estilo.length > 0) {
        const estilos = Array.isArray(producto.estilo) ? producto.estilo.join(', ') : producto.estilo;
        descripcion += `, estilo: ${estilos}`;
    }
    
    // Extraer contexto cercano del mensaje completo
    const contexto = extraerContextoProducto(mensajeCompleto, producto.nombreCompleto);
    if (contexto && contexto.length > 0) {
        descripcion += `. ${contexto}`;
    }
    
    return descripcion;
}

// ============================================
// FUNCIÓN: EXTRAER CONTEXTO DEL PRODUCTO
// ============================================

function extraerContextoProducto(mensaje, nombreProducto) {
    // Buscar el contexto alrededor del nombre del producto (100 caracteres antes y después)
    const index = mensaje.toLowerCase().indexOf(nombreProducto.toLowerCase());
    if (index === -1) return '';
    
    const inicio = Math.max(0, index - 50);
    const fin = Math.min(mensaje.length, index + nombreProducto.length + 100);
    
    return mensaje.substring(inicio, fin).trim();
}

// ============================================
// FUNCIÓN: EXTRAER DESCRIPCIÓN CON PRECIO
// ============================================

function extraerDescripcionConPrecio(mensaje, precio) {
    // Buscar el contexto alrededor del precio en el mensaje
    const precioStr = precio.toString();
    const index = mensaje.indexOf(precioStr);
    
    if (index === -1) return mensaje;
    
    const inicio = Math.max(0, index - 100);
    const fin = Math.min(mensaje.length, index + precioStr.length + 100);
    
    return mensaje.substring(inicio, fin).trim();
}

// ============================================
// FUNCIÓN: OBTENER NOMBRE DEL PROVEEDOR
// ============================================

async function obtenerNombreProveedor(numeroProveedor) {
    try {
        const contactos = cargarContactos();
        
        // Limpiar el número (quitar @c.us si existe)
        const numeroLimpio = numeroProveedor.replace('@c.us', '');
        
        // Buscar en contactos por coincidencia de número
        const contacto = contactos.find(c => {
            const numeroContactoLimpio = c.numero.replace('@c.us', '');
            return numeroContactoLimpio === numeroLimpio || 
                   numeroContactoLimpio.includes(numeroLimpio) ||
                   numeroLimpio.includes(numeroContactoLimpio);
        });
        
        if (contacto && contacto.nombre) {
            console.log(`   ✅ Nombre encontrado: ${contacto.nombre} para ${numeroLimpio}`);
            return contacto.nombre;
        }
        
        // Si no está en contactos, asignar nombre genérico basado en número
        const ultimoDigitos = numeroLimpio.slice(-4);
        const nombreGenerico = `Suplidor ${ultimoDigitos}`;
        console.log(`   ⚠️  Nombre no encontrado, usando genérico: ${nombreGenerico}`);
        return nombreGenerico;
        
    } catch (error) {
        console.error('❌ Error obteniendo nombre proveedor:', error.message);
        return 'Suplidor Desconocido';
    }
}

// Función auxiliar para guardar en JSON (backup)
async function guardarBackupJSON(infoProveedor) {
    const fs = require('fs');
    const path = require('path');
    const archivoJSON = path.join(__dirname, 'cotizaciones.json');
    
    try {
        let cotizaciones = { 
            cotizaciones: [], 
            ultimaActualizacion: null,
            totalCotizaciones: 0,
            informacion: {
                descripcion: "Archivo de almacenamiento de cotizaciones de proveedores (BACKUP)",
                creadoEn: "2025-11-15",
                version: "1.0"
            }
        };
        
        if (fs.existsSync(archivoJSON)) {
            try {
                const contenido = fs.readFileSync(archivoJSON, 'utf8');
                if (contenido.trim()) {
                    const datosExistentes = JSON.parse(contenido);
                    if (datosExistentes && Array.isArray(datosExistentes.cotizaciones)) {
                        cotizaciones = datosExistentes;
                    }
                }
            } catch (error) {
                console.log('⚠️ Error leyendo JSON existente:', error.message);
            }
        }
        
        const cotizacionConID = {
            id: Date.now(),
            proveedor: infoProveedor.proveedor,
            fecha: infoProveedor.fecha || new Date().toISOString(),
            mensajeCompleto: infoProveedor.mensajeCompleto,
            tienePrecio: infoProveedor.tienePrecio,
            precios: infoProveedor.precios || [],
            escritorios: infoProveedor.escritorios || false,
            sillas: infoProveedor.sillas || false,
            armarios: infoProveedor.armarios || false,
            estanterias: infoProveedor.estanterias || false,
            timestamp: infoProveedor.timestamp || Date.now()
        };
        
        cotizaciones.cotizaciones.push(cotizacionConID);
        cotizaciones.ultimaActualizacion = new Date().toISOString();
        cotizaciones.totalCotizaciones = cotizaciones.cotizaciones.length;
        
        fs.writeFileSync(archivoJSON, JSON.stringify(cotizaciones, null, 2), 'utf8');
        console.log('✅ Cotización guardada en JSON local (backup)');
        
    } catch (error) {
        console.error('❌ Error crítico guardando backup JSON:', error.message);
    }
}

// ============================================
// FUNCIÓN: MOSTRAR RESUMEN DE COTIZACIONES
// ============================================

function mostrarResumenCotizaciones() {
    const fs = require('fs');
    const path = require('path');
    const archivoJSON = path.join(__dirname, 'cotizaciones.json');
    
    if (!fs.existsSync(archivoJSON)) {
        console.log('📊 No hay cotizaciones registradas aún');
        return;
    }
    
    try {
        const contenido = fs.readFileSync(archivoJSON, 'utf8');
        if (!contenido.trim()) {
            console.log('📊 El archivo de cotizaciones está vacío');
            return;
        }
        
        const datos = JSON.parse(contenido);
        
        if (!datos.cotizaciones || datos.cotizaciones.length === 0) {
            console.log('📊 No hay cotizaciones registradas aún');
            return;
        }
        
        console.log('\n════════════════════════════════════════');
        console.log('📊 RESUMEN DE COTIZACIONES RECIBIDAS');
        console.log('════════════════════════════════════════');
        console.log(`Total de cotizaciones: ${datos.totalCotizaciones || 0}`);
        console.log(`Última actualización: ${datos.ultimaActualizacion || 'N/A'}`);
        
        // Agrupar por proveedor
        const porProveedor = {};
        datos.cotizaciones.forEach(cot => {
            if (!porProveedor[cot.proveedor]) {
                porProveedor[cot.proveedor] = [];
            }
            porProveedor[cot.proveedor].push(cot);
        });
        
        Object.keys(porProveedor).forEach(proveedor => {
            const cotizacionesProveedor = porProveedor[proveedor];
            console.log(`\n📱 Proveedor: ${proveedor}`);
            console.log(`   Respuestas: ${cotizacionesProveedor.length}`);
            
            cotizacionesProveedor.forEach((cot, index) => {
                console.log(`\n   Cotización ${index + 1}:`);
                console.log(`      ID: ${cot.id || 'N/A'}`);
                console.log(`      Fecha: ${cot.fecha || 'N/A'}`);
                
                // Mostrar si tiene imagen
                if (cot.imagen) {
                    console.log(`      🖼️ Imagen: ${cot.imagen.categoria} (${(cot.imagenBase64?.length / 1024 || 0).toFixed(2)} KB)`);
                } else if (cot.imagenBase64) {
                    console.log(`      🖼️ Imagen: ${(cot.imagenBase64.length / 1024).toFixed(2)} KB`);
                }
                
                // Mostrar productos detallados si existen
                if (cot.productosDetallados && cot.productosDetallados.length > 0) {
                    cot.productosDetallados.forEach(prod => {
                        console.log(`      📦 Producto: ${prod.tipo}`);
                        if (prod.marca) console.log(`         • Marca: ${prod.marca}`);
                        if (prod.material && prod.material.length > 0) console.log(`         • Material: ${prod.material.join(', ')}`);
                        if (prod.estilo && prod.estilo.length > 0) console.log(`         • Estilo: ${prod.estilo.join(', ')}`);
                        if (prod.caracteristicas && prod.caracteristicas.length > 0) console.log(`         • Características: ${prod.caracteristicas.join(', ')}`);
                    });
                }
                
                // Mostrar productos detectados (respaldo)
                if (cot.detalleProductos) {
                    const productosDetectados = [];
                    if (cot.detalleProductos.escritorios) productosDetectados.push('Escritorios');
                    if (cot.detalleProductos.sillas) productosDetectados.push('Sillas');
                    if (cot.detalleProductos.armarios) productosDetectados.push('Armarios');
                    if (cot.detalleProductos.estanterias) productosDetectados.push('Estanterías');
                    if (cot.detalleProductos.otrosProductos && cot.detalleProductos.otrosProductos.length > 0) {
                        productosDetectados.push(...cot.detalleProductos.otrosProductos);
                    }
                    
                    if (productosDetectados.length > 0 && (!cot.productosDetallados || cot.productosDetallados.length === 0)) {
                        console.log(`      📦 Productos: ${productosDetectados.join(', ')}`);
                    }
                } else if (cot.productos && cot.productos.length > 0) {
                    console.log(`      📦 Productos: ${cot.productos.join(', ')}`);
                }
                
                // Mostrar precios
                if (cot.precios && cot.precios.length > 0) {
                    console.log(`      💰 Precios: ${cot.precios.map(p => 'Bs ' + p.toLocaleString('es-BO')).join(', ')}`);
                } else {
                    console.log('      💰 Sin precios detectados');
                }
                
                // Mostrar mensaje
                if (cot.mensajeCompleto) {
                    const preview = cot.mensajeCompleto.substring(0, 100);
                    console.log(`      📝 Mensaje: "${preview}${cot.mensajeCompleto.length > 100 ? '...' : ''}"`);
                }
            });
        });
        
        console.log('\n════════════════════════════════════════\n');
    } catch (error) {
        console.error('❌ Error mostrando resumen:', error.message);
    }
}

// ============================================
// FUNCIÓN: EXPORTAR COTIZACIONES A CSV
// ============================================

function exportarCotizacionesCSV() {
    const fs = require('fs');
    const path = require('path');
    const archivoJSON = path.join(__dirname, 'cotizaciones.json');
    
    try {
        if (!fs.existsSync(archivoJSON)) {
            console.log('❌ No hay archivo de cotizaciones para exportar');
            return;
        }
        
        const contenido = fs.readFileSync(archivoJSON, 'utf8');
        const datos = JSON.parse(contenido);
        
        if (!datos.cotizaciones || datos.cotizaciones.length === 0) {
            console.log('❌ No hay cotizaciones para exportar');
            return;
        }
        
        // Crear CSV
        const headers = ['ID', 'Proveedor', 'Fecha', 'Escritorios', 'Sillas', 'Precios', 'Mensaje'];
        const rows = datos.cotizaciones.map(cot => [
            cot.id || '',
            cot.proveedor || '',
            cot.fecha || '',
            cot.escritorios ? 'Sí' : 'No',
            cot.sillas ? 'Sí' : 'No',
            cot.precios && cot.precios.length > 0 ? cot.precios.join('; ') : '',
            cot.mensajeCompleto ? cot.mensajeCompleto.replace(/"/g, '""') : ''
        ]);
        
        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const archivoCSV = path.join(__dirname, `cotizaciones_${new Date().toISOString().split('T')[0]}.csv`);
        fs.writeFileSync(archivoCSV, csv, 'utf8');
        
        console.log(`✅ Cotizaciones exportadas a: ${archivoCSV}`);
        return archivoCSV;
        
    } catch (error) {
        console.error('❌ Error exportando a CSV:', error.message);
    }
}

// ============================================
// FUNCIÓN: OBTENER RESPUESTA DE IA
// ============================================

async function obtenerRespuestaIA(mensajeUsuario, numeroUsuario) {
    try {
        // Verificar si la respuesta automática está habilitada
        if (process.env.AUTO_REPLY_ENABLED !== 'true') {
            return null;
        }
        
        // Usar el cliente Python para obtener la respuesta
        const respuesta = await gptClient.obtenerRespuestaIA(mensajeUsuario, numeroUsuario);
        
        return respuesta;
        
    } catch (error) {
        console.error('❌ Error al obtener respuesta de Python:', error.message);
        
        // Respuesta de fallback
        return respuestaPredeterminada(mensajeUsuario);
    }
}

// ============================================
// FUNCIÓN: RESPUESTA PREDETERMINADA
// ============================================

function respuestaPredeterminada(mensaje) {
    const mensajeLower = mensaje.toLowerCase();
    
    // Respuestas simples basadas en palabras clave
    if (mensajeLower.includes('hola') || mensajeLower.includes('buenos')) {
        return mensajesAutomaticos.bienvenida;
    }
    
    if (mensajeLower.includes('precio') || mensajeLower.includes('costo')) {
        return 'Para información sobre precios, un agente te contactará pronto. ¿Hay algo más en lo que pueda ayudarte?';
    }
    
    if (mensajeLower.includes('horario') || mensajeLower.includes('hora')) {
        return 'Nuestro horario de atención es de Lunes a Viernes de 9:00 AM a 6:00 PM.';
    }
    
    if (mensajeLower.includes('gracias')) {
        return '¡De nada! 😊 ¿Hay algo más en lo que pueda ayudarte?';
    }
    
    // Respuesta genérica
    return 'He recibido tu mensaje. Un agente te responderá pronto. ¿Hay algo específico que necesites?';
}

// ============================================
// FUNCIÓN: ENVIAR MENSAJE A LISTA DE CLIENTES
// ============================================

async function enviarMensajesMasivos(mensaje) {
    console.log('📤 Iniciando envío masivo de mensajes...');
    console.log(`📊 Total de destinatarios: ${clientesList.length}`);
    
    let enviados = 0;
    let fallidos = 0;
    
    for (const numero of clientesList) {
        try {
            // Obtener el chat
            const chat = await client.getChatById(numero);
            
            // Enviar mensaje
            await chat.sendMessage(mensaje);
            
            console.log(`✅ Mensaje enviado a: ${numero}`);
            enviados++;
            
            // Esperar entre 2-5 segundos entre mensajes para evitar bloqueos
            const delay = Math.floor(Math.random() * 3000) + 2000;
            await new Promise(resolve => setTimeout(resolve, delay));
            
        } catch (error) {
            console.error(`❌ Error enviando a ${numero}:`, error.message);
            fallidos++;
        }
    }
    
    console.log('====================================');
    console.log(`📊 Resumen del envío:`);
    console.log(`✅ Enviados: ${enviados}`);
    console.log(`❌ Fallidos: ${fallidos}`);
    console.log('====================================');
}

// ============================================
// FUNCIÓN: INICIAR TAREAS PROGRAMADAS
// ============================================

function iniciarTareasProgramadas() {
    console.log('⏰ Configurando bot para solicitud de cotizaciones...');
    console.log('� Proveedores configurados:');
    clientesList.forEach((num, index) => {
        console.log(`   ${index + 1}. ${num}`);
    });
    console.log('====================================');
    
    // Ejemplo de tarea adicional: Recordatorio cada hora
    // Descomenta para activar
    /*
    cron.schedule('0 * * * *', () => {
        console.log('⏰ Recordatorio horario:', new Date().toLocaleString());
    });
    */
}

// ============================================
// FUNCIÓN: ENVIAR MENSAJE A NÚMERO ESPECÍFICO
// ============================================

async function enviarMensajePersonalizado(numero, mensaje) {
    try {
        const chatId = numero.includes('@c.us') ? numero : `${numero}@c.us`;
        const chat = await client.getChatById(chatId);
        await chat.sendMessage(mensaje);
        console.log(`✅ Mensaje personalizado enviado a: ${numero}`);
        return true;
    } catch (error) {
        console.error(`❌ Error enviando mensaje a ${numero}:`, error.message);
        return false;
    }
}

// ============================================
// FUNCIÓN: OBTENER INFORMACIÓN DEL CHAT
// ============================================

async function obtenerInfoChat(numero) {
    try {
        const chatId = numero.includes('@c.us') ? numero : `${numero}@c.us`;
        const chat = await client.getChatById(chatId);
        
        return {
            nombre: chat.name,
            esGrupo: chat.isGroup,
            ultimoMensaje: chat.lastMessage,
            noLeidos: chat.unreadCount
        };
    } catch (error) {
        console.error('❌ Error obteniendo info del chat:', error.message);
        return null;
    }
}

// ============================================
// COMANDOS DE CONSOLA (OPCIONAL)
// ============================================

// Escuchar comandos desde la consola
process.stdin.on('data', async (data) => {
    const comando = data.toString().trim();
    
    if (comando === 'solicitar' || comando === 'enviar') {
        console.log('📤 Enviando solicitud de cotización a proveedores...');
        await enviarMensajesMasivos(mensajesAutomaticos.solicitudCotizacion);
    }
    
    if (comando === 'cotizaciones' || comando === 'resumen') {
        mostrarResumenCotizaciones();
    }
    
    if (comando === 'exportar' || comando === 'csv') {
        console.log('📥 Exportando cotizaciones a CSV...');
        exportarCotizacionesCSV();
    }
    
    if (comando === 'estado') {
        const state = await client.getState();
        console.log('📊 Estado del cliente:', state);
    }
    
    if (comando === 'salir') {
        console.log('👋 Cerrando bot...');
        await client.destroy();
        process.exit(0);
    }
    
    if (comando === 'ayuda' || comando === 'help') {
        console.log('\n════════════════════════════════════════');
        console.log('📋 COMANDOS DISPONIBLES:');
        console.log('════════════════════════════════════════');
        console.log('  solicitar    - Enviar solicitud de cotización a proveedores');
        console.log('  enviar       - Alias de "solicitar"');
        console.log('  cotizaciones - Ver resumen de cotizaciones recibidas');
        console.log('  resumen      - Alias de "cotizaciones"');
        console.log('  exportar     - Exportar cotizaciones a archivo CSV');
        console.log('  csv          - Alias de "exportar"');
        console.log('  estado       - Ver estado de conexión del bot');
        console.log('  ayuda        - Mostrar esta ayuda');
        console.log('  help         - Alias de "ayuda"');
        console.log('  salir        - Cerrar el bot');
        console.log('════════════════════════════════════════\n');
    }
});

// ============================================
// MANEJO DE ERRORES GLOBALES
// ============================================

process.on('unhandledRejection', (error) => {
    console.error('❌ Error no manejado:', error);
});

process.on('SIGINT', async () => {
    console.log('\n👋 Cerrando bot de manera segura...');
    await client.destroy();
    process.exit(0);
});

// ============================================
// INICIAR EL CLIENTE
// ============================================

console.log('🚀 Iniciando bot de WhatsApp...');
console.log('====================================');

// Iniciar servidor web para QR
qrServer.start();

// Iniciar cliente de WhatsApp
client.initialize();

// ============================================
// EXPORTAR FUNCIONES (para uso externo)
// ============================================

module.exports = {
    client,
    enviarMensajesMasivos,
    enviarMensajePersonalizado,
    obtenerInfoChat,
    guardarCotizacion,
    mostrarResumenCotizaciones,
    exportarCotizacionesCSV
};
