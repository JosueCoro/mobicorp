/**
 * Cliente para comunicarse con el servidor Python de GPT
 * Reemplaza las llamadas directas a OpenAI
 */

const axios = require('axios');

// Configuración
const GPT_SERVER_URL = process.env.GPT_SERVER_URL || 'http://localhost:5000';
const TIMEOUT = 15000; // 15 segundos

// Cliente Axios
const cliente = axios.create({
    baseURL: GPT_SERVER_URL,
    timeout: TIMEOUT,
    headers: {
        'Content-Type': 'application/json'
    }
});

// ============================================
// FUNCIÓN: VERIFICAR CONEXIÓN CON SERVIDOR
// ============================================

async function verificarConexion() {
    try {
        const response = await cliente.get('/api/health');
        console.log('✅ Conexión con servidor Python OK');
        console.log(`   Modelo: ${response.data.model}`);
        return true;
    } catch (error) {
        console.error('❌ No se pudo conectar con servidor Python');
        console.error(`   URL: ${GPT_SERVER_URL}`);
        console.error(`   Error: ${error.message}`);
        return false;
    }
}

// ============================================
// FUNCIÓN: GENERAR RESPUESTA PARA PROVEEDOR
// ============================================

async function generarRespuestaEmpresa(mensajeProveedor, numeroProveedor, tienePrecio = false) {
    try {
        console.log('🤖 Consultando Python para generar respuesta...');
        
        const response = await cliente.post('/api/generar-respuesta-empresa', {
            mensaje: mensajeProveedor,
            numero_proveedor: numeroProveedor,
            tiene_precio: tienePrecio
        });
        
        if (!response.data.exito) {
            throw new Error(response.data.error || 'Error desconocido');
        }
        
        console.log('✅ Respuesta generada por Python');
        console.log(`   Respuesta: "${response.data.respuesta}"`);
        
        // Sanitizar respuesta en JavaScript también (validación adicional)
        let respuesta = response.data.respuesta || '';
        respuesta = respuesta.replace(/[\x00-\x1F\x7F]/g, ''); // Remover caracteres de control
        respuesta = respuesta.trim();
        
        // Retornar objeto con respuesta y bandera de necesidad de responder
        return {
            respuesta: respuesta,
            necesita_respuesta: response.data.necesita_respuesta !== false && respuesta.length > 0
        };
        
    } catch (error) {
        console.error('❌ Error al generar respuesta con Python:', error.message);
        console.error('   La conversación se termina sin enviar mensaje');
        
        // En caso de error, no enviar nada - terminar la conversación silenciosamente
        return {
            respuesta: '',
            necesita_respuesta: false
        };
    }
}

// ============================================
// FUNCIÓN: EXTRAER INFORMACIÓN DE PRECIOS
// ============================================

async function extraerInformacionPreciosConIA(mensaje, numeroProveedor) {
    try {
        console.log('🤖 Analizando mensaje con Python para detectar precios...');
        
        const response = await cliente.post('/api/extraer-precios', {
            mensaje: mensaje,
            numero_proveedor: numeroProveedor
        });
        
        if (!response.data.exito) {
            throw new Error(response.data.error || 'Error desconocido');
        }
        
        console.log(`✅ Análisis completado (Método: ${response.data.metodo})`);
        
        return {
            tienePrecio: response.data.tienePrecio,
            precios: response.data.precios || [],
            productos: response.data.productos || [],
            metodo: response.data.metodo
        };
        
    } catch (error) {
        console.error('❌ Error al extraer precios con Python:', error.message);
        
        // Retornar resultado vacío en caso de error
        return {
            tienePrecio: false,
            precios: [],
            productos: [],
            metodo: 'error'
        };
    }
}

// ============================================
// FUNCIÓN: OBTENER RESPUESTA GENERAL DE IA
// ============================================

async function obtenerRespuestaIA(mensajeUsuario, numeroUsuario) {
    try {
        // Verificar si la respuesta automática está habilitada
        if (process.env.AUTO_REPLY_ENABLED !== 'true') {
            return null;
        }
        
        console.log('🤖 Consultando Python para respuesta general...');
        
        const response = await cliente.post('/api/obtener-respuesta', {
            mensaje: mensajeUsuario,
            numero_usuario: numeroUsuario
        });
        
        if (!response.data.exito) {
            throw new Error(response.data.error || 'Error desconocido');
        }
        
        console.log('✅ Respuesta de Python generada');
        return response.data.respuesta;
        
    } catch (error) {
        console.error('❌ Error al obtener respuesta de Python:', error.message);
        
        // Respuesta de fallback
        return 'Gracias por tu mensaje. En este momento no estoy disponible, pero responderé pronto.';
    }
}

// ============================================
// FUNCIÓN: LIMPIAR HISTORIAL
// ============================================

async function limpiarHistorial(numero) {
    try {
        const response = await cliente.post('/api/limpiar-historial', {
            numero: numero
        });
        
        if (response.data.exito) {
            console.log(`✅ Historial limpiado para ${numero}`);
        }
        
        return response.data.exito;
        
    } catch (error) {
        console.error('❌ Error al limpiar historial:', error.message);
        return false;
    }
}

// ============================================
// FUNCIÓN: PROCESAR PDF
// ============================================

async function procesarPDF(pdfBuffer, nombreArchivo, numeroProveedor) {
    try {
        console.log('🤖 Enviando PDF a Python para procesamiento inteligente...');
        
        const FormData = require('form-data');
        const form = new FormData();
        form.append('pdf_file', pdfBuffer, nombreArchivo);
        
        const response = await axios.post(
            `${GPT_SERVER_URL}/api/procesar-pdf`,
            form,
            {
                headers: form.getHeaders(),
                timeout: 30000 // 30 segundos para procesar PDF
            }
        );
        
        if (!response.data.exito) {
            throw new Error(response.data.error || 'Error desconocido');
        }
        
        console.log('✅ PDF procesado correctamente');
        console.log(`   Página seleccionada: ${response.data.pagina}`);
        console.log(`   Categoría: ${response.data.categoria}`);
        console.log(`   Archivo generado: ${response.data.archivo}`);
        
        return {
            exito: true,
            mensaje: response.data.mensaje,
            imagenBase64: response.data.imagen_base64,  // Imagen PNG en base64
            archivoNombre: response.data.archivo,
            archivoOriginal: response.data.archivo_original,
            pagina: response.data.pagina,
            categoria: response.data.categoria,
            razon: response.data.razon
        };
        
    } catch (error) {
        console.error('❌ Error al procesar PDF con Python:', error.message);
        return {
            exito: false,
            error: error.message
        };
    }
}

// ============================================
// EXPORTAR FUNCIONES
// ============================================

module.exports = {
    verificarConexion,
    generarRespuestaEmpresa,
    extraerInformacionPreciosConIA,
    obtenerRespuestaIA,
    limpiarHistorial,
    procesarPDF
};
