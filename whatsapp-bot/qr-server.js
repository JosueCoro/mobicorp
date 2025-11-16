/**
 * Servidor web para mostrar QR y gestionar contactos
 */

const express = require('express');
const qrcode = require('qrcode');
const cors = require('cors');

class QRServer {
    constructor(port = 3000, options = {}) {
        this.app = express();
        this.port = port;
        this.currentQR = null;
        this.isAuthenticated = false;
        this.getClient = options.getClient || (() => null);
        this.contactos = options.contactos || {};

        // Habilitar CORS para todas las peticiones
        this.app.use(cors({
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type']
        }));

        // Middleware para parsear JSON
        this.app.use(express.json());

        this.setupRoutes();
    }

    setupRoutes() {
        // Página principal con interfaz de tabs
        this.app.get('/', (req, res) => {
            res.send(this.getHTML());
        });

        // API para obtener el QR actual
        this.app.get('/qr-data', (req, res) => {
            res.json({
                qr: this.currentQR,
                authenticated: this.isAuthenticated
            });
        });

        // API para obtener el QR (compatible con CORS para frontend)
        this.app.get('/api/qr', (req, res) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET');
            res.json({
                qr: this.currentQR,
                authenticated: this.isAuthenticated,
                estado: this.isAuthenticated ? 'conectado' : (this.currentQR ? 'escaneando' : 'desconectado')
            });
        });

        // ============================================
        // ENDPOINTS DE GESTIÓN DE CONTACTOS
        // ============================================

        // Obtener todos los contactos
        this.app.get('/api/contactos', (req, res) => {
            if (this.contactos.obtener) {
                res.json({ success: true, contactos: this.contactos.obtener() });
            } else {
                res.status(500).json({ success: false, error: 'Función no disponible' });
            }
        });

        // Agregar un nuevo contacto
        this.app.post('/api/contactos', (req, res) => {
            const { nombre, numero } = req.body;
            if (!nombre || !numero) {
                return res.status(400).json({ success: false, error: 'Nombre y número requeridos' });
            }
            if (this.contactos.agregar) {
                const nuevoContacto = this.contactos.agregar(nombre, numero);
                res.json({ success: true, contacto: nuevoContacto });
            } else {
                res.status(500).json({ success: false, error: 'Función no disponible' });
            }
        });

        // Editar un contacto existente
        this.app.put('/api/contactos/:id', (req, res) => {
            const id = parseInt(req.params.id);
            const { nombre, numero } = req.body;
            if (!nombre || !numero) {
                return res.status(400).json({ success: false, error: 'Nombre y número requeridos' });
            }
            if (this.contactos.editar) {
                const contacto = this.contactos.editar(id, nombre, numero);
                if (contacto) {
                    res.json({ success: true, contacto });
                } else {
                    res.status(404).json({ success: false, error: 'Contacto no encontrado' });
                }
            } else {
                res.status(500).json({ success: false, error: 'Función no disponible' });
            }
        });

        // Eliminar un contacto
        this.app.delete('/api/contactos/:id', (req, res) => {
            const id = parseInt(req.params.id);
            if (this.contactos.eliminar) {
                const eliminado = this.contactos.eliminar(id);
                if (eliminado) {
                    res.json({ success: true, message: 'Contacto eliminado' });
                } else {
                    res.status(404).json({ success: false, error: 'Contacto no encontrado' });
                }
            } else {
                res.status(500).json({ success: false, error: 'Función no disponible' });
            }
        });

        // Activar/desactivar un contacto
        this.app.post('/api/contactos/:id/toggle', (req, res) => {
            const id = parseInt(req.params.id);
            if (this.contactos.toggle) {
                const contacto = this.contactos.toggle(id);
                if (contacto) {
                    res.json({ success: true, contacto });
                } else {
                    res.status(404).json({ success: false, error: 'Contacto no encontrado' });
                }
            } else {
                res.status(500).json({ success: false, error: 'Función no disponible' });
            }
        });

        // Enviar mensaje a un número específico
        this.app.post('/api/enviar-mensaje', async (req, res) => {
            const { numero, mensaje } = req.body;
            if (!numero || !mensaje) {
                return res.status(400).json({ success: false, error: 'Número y mensaje requeridos' });
            }

            const client = this.getClient();
            if (!client) {
                return res.status(500).json({ success: false, error: 'Cliente no disponible' });
            }

            try {
                // Formatear número
                const numeroFormateado = numero.replace(/[^0-9]/g, '') + '@c.us';
                await client.sendMessage(numeroFormateado, mensaje);
                res.json({ success: true, message: 'Mensaje enviado exitosamente' });
            } catch (error) {
                console.error('Error al enviar mensaje:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Solicitar cotización masiva
        this.app.post('/api/solicitar-cotizacion', async (req, res) => {
            const client = this.getClient();
            if (!client) {
                return res.status(500).json({ success: false, error: 'Cliente no disponible' });
            }

            try {
                const contactosActivos = this.contactos.obtenerActivos();
                if (contactosActivos.length === 0) {
                    return res.status(400).json({ success: false, error: 'No hay contactos activos' });
                }

                const mensaje = 'Hola, estamos buscando muebles para oficina: escritorios, sillas ergonómicas y estanterías. Podrías ayudarnos con una cotización? Necesitamos información sobre modelos, precios, materiales y tiempos de entrega. Gracias.';
                
                let enviados = 0;
                let fallidos = 0;

                for (const numero of contactosActivos) {
                    try {
                        await client.sendMessage(numero, mensaje);
                        enviados++;
                        // Esperar entre mensajes
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } catch (error) {
                        console.error(`Error enviando a ${numero}:`, error.message);
                        fallidos++;
                    }
                }

                res.json({ 
                    success: true, 
                    message: `Solicitud enviada a ${enviados} contactos`,
                    enviados,
                    fallidos
                });
            } catch (error) {
                console.error('Error al solicitar cotización:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });
    }

    getHTML() {
        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Bot - Panel de Control</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; min-height: 100vh; padding: 20px; }
        .nav-tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e0e0e0; max-width: 800px; margin-left: auto; margin-right: auto; }
        .tab-btn { background: none; border: none; padding: 12px 24px; cursor: pointer; font-size: 14px; font-weight: 500; color: #666; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
        .tab-btn:hover { color: #333; }
        .tab-btn.active { color: #25D366; border-bottom-color: #25D366; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .container { background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); padding: 30px; max-width: 800px; margin: 0 auto; }
        .header { margin-bottom: 25px; text-align: center; }
        h1 { color: #333; font-size: 24px; font-weight: 600; margin-bottom: 8px; }
        h2 { color: #333; font-size: 18px; font-weight: 600; margin-bottom: 20px; }
        .subtitle { color: #666; font-size: 13px; }
        #status { padding: 10px 16px; border-radius: 6px; margin-bottom: 20px; font-size: 12px; font-weight: 500; text-align: center; }
        #status.waiting { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        #status.authenticated { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        #qr-container { background: #fafafa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 25px; margin-bottom: 20px; min-height: 240px; display: flex; justify-content: center; align-items: center; }
        #qr-image { max-width: 200px; height: auto; border-radius: 6px; }
        .spinner { border: 3px solid #f0f0f0; border-top: 3px solid #666; border-radius: 50%; width: 36px; height: 36px; animation: spin 0.8s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; color: #333; font-size: 13px; font-weight: 500; }
        .form-group input, .form-group textarea { width: 100%; padding: 10px; border: 1px solid #d0d0d0; border-radius: 6px; font-size: 13px; font-family: inherit; }
        .form-group textarea { min-height: 80px; resize: vertical; }
        .btn { background: #25D366; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s ease; }
        .btn:hover { background: #20BA5A; }
        .btn-secondary { background: #ffffff; color: #333; border: 1px solid #d0d0d0; }
        .btn-secondary:hover { background: #f5f5f5; }
        .btn-danger { background: #dc3545; }
        .btn-danger:hover { background: #c82333; }
        .btn-small { padding: 6px 12px; font-size: 12px; }
        .contactos-list { margin-top: 20px; }
        .contacto-item { display: flex; align-items: center; justify-content: space-between; padding: 15px; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 10px; background: #fafafa; }
        .contacto-item.inactivo { opacity: 0.5; }
        .contacto-info { flex: 1; }
        .contacto-nombre { font-weight: 600; color: #333; margin-bottom: 4px; }
        .contacto-numero { font-size: 12px; color: #666; }
        .contacto-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .success-message, .error-message { padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 13px; }
        .success-message { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error-message { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div class="nav-tabs">
        <button class="tab-btn active" onclick="cambiarTab('qr')">Conexión QR</button>
        <button class="tab-btn" onclick="cambiarTab('contactos')">Gestión de Contactos</button>
        <button class="tab-btn" onclick="cambiarTab('enviar')">Enviar Mensaje</button>
    </div>

    <div class="container">
        <div id="tab-qr" class="tab-content active">
            <div class="header">
                <h1>WhatsApp Bot</h1>
                <p class="subtitle">Vincula tu dispositivo</p>
            </div>
            <div id="status" class="waiting">Esperando código QR...</div>
            <div id="qr-container"><div class="spinner"></div></div>
            <div id="solicitar-section" class="hidden" style="margin-top: 20px; text-align: center;">
                <button class="btn" onclick="solicitarCotizacion()" style="font-size: 16px; padding: 12px 32px;">
                    📤 Solicitar Cotización a Proveedores
                </button>
                <div id="solicitar-message" class="hidden" style="margin-top: 15px;"></div>
            </div>
        </div>

        <div id="tab-contactos" class="tab-content">
            <h2>Gestión de Contactos</h2>
            <div id="contacto-message" class="hidden"></div>
            <div class="form-group">
                <label>Nombre del Contacto</label>
                <input type="text" id="contacto-nombre" placeholder="Ej: Proveedor ABC">
            </div>
            <div class="form-group">
                <label>Número de WhatsApp (incluir código de país)</label>
                <input type="text" id="contacto-numero" placeholder="Ej: 59179001752">
            </div>
            <button class="btn" onclick="agregarContacto()">Agregar Contacto</button>
            <div class="contactos-list">
                <h3 style="margin-bottom: 15px; font-size: 16px;">Lista de Contactos</h3>
                <div id="lista-contactos"><div class="spinner"></div></div>
            </div>
        </div>

        <div id="tab-enviar" class="tab-content">
            <h2>Enviar Mensaje</h2>
            <div id="enviar-message" class="hidden"></div>
            <div class="form-group">
                <label>Número de WhatsApp</label>
                <input type="text" id="enviar-numero" placeholder="59179001752">
            </div>
            <div class="form-group">
                <label>Mensaje</label>
                <textarea id="enviar-mensaje" placeholder="Escribe tu mensaje aquí..."></textarea>
            </div>
            <button class="btn" onclick="enviarMensaje()">Enviar Mensaje</button>
        </div>
    </div>

    <script>
        let contactoEditando = null;

        function cambiarTab(tab) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById('tab-' + tab).classList.add('active');
            if (tab === 'contactos') cargarContactos();
        }

        setInterval(async () => {
            const tabQR = document.getElementById('tab-qr');
            if (!tabQR.classList.contains('active')) return;
            try {
                const response = await fetch('/qr-data');
                const data = await response.json();
                if (data.authenticated) {
                    document.getElementById('status').className = 'authenticated';
                    document.getElementById('status').textContent = 'Autenticado correctamente';
                    document.getElementById('qr-container').innerHTML = '<div style="font-size: 48px; color: #28a745;">✓</div>';
                    document.getElementById('solicitar-section').classList.remove('hidden');
                } else if (data.qr) {
                    document.getElementById('status').className = 'waiting';
                    document.getElementById('status').textContent = 'Escanea el código QR';
                    document.getElementById('qr-container').innerHTML = '<img id="qr-image" src="' + data.qr + '" alt="QR Code">';
                    document.getElementById('solicitar-section').classList.add('hidden');
                }
            } catch (error) { console.error('Error al obtener QR:', error); }
        }, 2000);

        async function solicitarCotizacion() {
            const btn = event.target;
            btn.disabled = true;
            btn.textContent = '⏳ Enviando...';
            
            try {
                const response = await fetch('/api/solicitar-cotizacion', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await response.json();
                
                const msgDiv = document.getElementById('solicitar-message');
                msgDiv.classList.remove('hidden');
                
                if (data.success) {
                    msgDiv.className = 'success-message';
                    msgDiv.textContent = \`✅ \${data.message}. Enviados: \${data.enviados}, Fallidos: \${data.fallidos}\`;
                } else {
                    msgDiv.className = 'error-message';
                    msgDiv.textContent = '❌ ' + data.error;
                }
                
                setTimeout(() => msgDiv.classList.add('hidden'), 5000);
            } catch (error) {
                const msgDiv = document.getElementById('solicitar-message');
                msgDiv.classList.remove('hidden');
                msgDiv.className = 'error-message';
                msgDiv.textContent = '❌ Error al enviar solicitud';
                setTimeout(() => msgDiv.classList.add('hidden'), 5000);
            } finally {
                btn.disabled = false;
                btn.textContent = '📤 Solicitar Cotización a Proveedores';
            }
        }

        async function cargarContactos() {
            try {
                const response = await fetch('/api/contactos');
                const data = await response.json();
                if (data.success) mostrarContactos(data.contactos);
            } catch (error) { console.error('Error al cargar contactos:', error); }
        }

        function mostrarContactos(contactos) {
            const lista = document.getElementById('lista-contactos');
            if (contactos.length === 0) {
                lista.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No hay contactos registrados</p>';
                return;
            }
            lista.innerHTML = contactos.map(c => \`
                <div class="contacto-item \${c.activo ? '' : 'inactivo'}">
                    <div class="contacto-info">
                        <div class="contacto-nombre">\${c.nombre}</div>
                        <div class="contacto-numero">+\${c.numero}</div>
                    </div>
                    <div class="contacto-actions">
                        <button class="btn btn-secondary btn-small" onclick="editarContacto(\${c.id}, '\${c.nombre}', '\${c.numero}')">Editar</button>
                        <button class="btn btn-secondary btn-small" onclick="toggleContacto(\${c.id})">\${c.activo ? 'Desactivar' : 'Activar'}</button>
                        <button class="btn btn-danger btn-small" onclick="eliminarContacto(\${c.id})">Eliminar</button>
                    </div>
                </div>
            \`).join('');
        }

        async function agregarContacto() {
            const nombre = document.getElementById('contacto-nombre').value.trim();
            const numero = document.getElementById('contacto-numero').value.trim();
            if (!nombre || !numero) {
                mostrarMensaje('contacto-message', 'Por favor completa todos los campos', 'error');
                return;
            }
            try {
                let response;
                if (contactoEditando) {
                    response = await fetch(\`/api/contactos/\${contactoEditando}\`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nombre, numero })
                    });
                } else {
                    response = await fetch('/api/contactos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nombre, numero })
                    });
                }
                const data = await response.json();
                if (data.success) {
                    mostrarMensaje('contacto-message', contactoEditando ? 'Contacto actualizado' : 'Contacto agregado exitosamente', 'success');
                    document.getElementById('contacto-nombre').value = '';
                    document.getElementById('contacto-numero').value = '';
                    contactoEditando = null;
                    cargarContactos();
                } else {
                    mostrarMensaje('contacto-message', data.error, 'error');
                }
            } catch (error) {
                mostrarMensaje('contacto-message', 'Error al guardar contacto', 'error');
            }
        }

        function editarContacto(id, nombre, numero) {
            contactoEditando = id;
            document.getElementById('contacto-nombre').value = nombre;
            document.getElementById('contacto-numero').value = numero;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        async function eliminarContacto(id) {
            if (!confirm('¿Estás seguro de eliminar este contacto?')) return;
            try {
                const response = await fetch(\`/api/contactos/\${id}\`, { method: 'DELETE' });
                const data = await response.json();
                if (data.success) {
                    mostrarMensaje('contacto-message', 'Contacto eliminado', 'success');
                    cargarContactos();
                } else {
                    mostrarMensaje('contacto-message', data.error, 'error');
                }
            } catch (error) {
                mostrarMensaje('contacto-message', 'Error al eliminar contacto', 'error');
            }
        }

        async function toggleContacto(id) {
            try {
                const response = await fetch(\`/api/contactos/\${id}/toggle\`, { method: 'POST' });
                const data = await response.json();
                if (data.success) cargarContactos();
            } catch (error) { console.error('Error al cambiar estado:', error); }
        }

        async function enviarMensaje() {
            const numero = document.getElementById('enviar-numero').value.trim();
            const mensaje = document.getElementById('enviar-mensaje').value.trim();
            if (!numero || !mensaje) {
                mostrarMensaje('enviar-message', 'Por favor completa todos los campos', 'error');
                return;
            }
            try {
                const response = await fetch('/api/enviar-mensaje', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ numero, mensaje })
                });
                const data = await response.json();
                if (data.success) {
                    mostrarMensaje('enviar-message', 'Mensaje enviado exitosamente', 'success');
                    document.getElementById('enviar-numero').value = '';
                    document.getElementById('enviar-mensaje').value = '';
                } else {
                    mostrarMensaje('enviar-message', data.error, 'error');
                }
            } catch (error) {
                mostrarMensaje('enviar-message', 'Error al enviar mensaje', 'error');
            }
        }

        function mostrarMensaje(elementId, mensaje, tipo) {
            const element = document.getElementById(elementId);
            element.className = tipo === 'success' ? 'success-message' : 'error-message';
            element.textContent = mensaje;
            element.classList.remove('hidden');
            setTimeout(() => { element.classList.add('hidden'); }, 5000);
        }

        cargarContactos();
    </script>
</body>
</html>`;
    }

    // Actualizar el QR cuando se genere uno nuevo
    updateQR(qrData) {
        qrcode.toDataURL(qrData, { width: 300, margin: 2 }, (err, url) => {
            if (err) {
                console.error('Error generando QR:', err);
                return;
            }
            this.currentQR = url;
            this.isAuthenticated = false;
            console.log('✅ QR actualizado en servidor web');
        });
    }

    // Marcar como autenticado
    setAuthenticated() {
        this.isAuthenticated = true;
        this.currentQR = null;
        console.log('✅ Bot autenticado - QR ya no necesario');
    }

    // Iniciar servidor
    start() {
        this.app.listen(this.port, () => {
            console.log('╔═══════════════════════════════════════════════╗');
            console.log('║   🌐 SERVIDOR QR INICIADO                     ║');
            console.log('╚═══════════════════════════════════════════════╝');
            console.log(`\n🔗 Servidor Web: http://localhost:${this.port}`);
            console.log(`📱 Frontend React: http://localhost:3000`);
            console.log(`\n✨ Panel de control disponible con:\n   - Conexión QR\n   - Gestión de contactos\n   - Envío de mensajes\n`);
        });
    }
}

module.exports = QRServer;
