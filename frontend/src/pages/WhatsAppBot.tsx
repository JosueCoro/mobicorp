import { useState, useEffect } from 'react'
import { 
  Bot,
  Smartphone,
  Users,
  Send
} from 'lucide-react'

interface Contacto {
  id: number
  nombre: string
  numero: string
  activo: boolean
}

export default function WhatsAppBot() {
  const [activeTab, setActiveTab] = useState<'qr' | 'contactos' | 'enviar'>('qr')
  const [qrData, setQrData] = useState<{qr: string | null, authenticated: boolean}>({ qr: null, authenticated: false })
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [nuevoContacto, setNuevoContacto] = useState({ nombre: '', numero: '' })
  const [editando, setEditando] = useState<number | null>(null)
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const [enviarForm, setEnviarForm] = useState({ numero: '', mensaje: '' })
  const [solicitando, setSolicitando] = useState(false)

  // Fetch QR data
  useEffect(() => {
    const fetchQR = async () => {
      if (activeTab !== 'qr') return
      try {
        const response = await fetch('http://localhost:3001/qr-data')
        const data = await response.json()
        setQrData(data)
      } catch (error) {
        console.error('Error al obtener QR:', error)
      }
    }
    fetchQR()
    const interval = setInterval(fetchQR, 2000)
    return () => clearInterval(interval)
  }, [activeTab])

  // Fetch contactos
  const cargarContactos = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/contactos')
      const data = await response.json()
      if (data.success) setContactos(data.contactos)
    } catch (error) {
      console.error('Error al cargar contactos:', error)
    }
  }

  useEffect(() => {
    if (activeTab === 'contactos') cargarContactos()
  }, [activeTab])

  // Agregar/Editar contacto
  const guardarContacto = async () => {
    if (!nuevoContacto.nombre || !nuevoContacto.numero) {
      mostrarMensaje('error', 'Por favor completa todos los campos')
      return
    }
    try {
      const url = editando 
        ? `http://localhost:3001/api/contactos/${editando}`
        : 'http://localhost:3001/api/contactos'
      const method = editando ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoContacto)
      })
      const data = await response.json()
      
      if (data.success) {
        mostrarMensaje('success', editando ? 'Contacto actualizado' : 'Contacto agregado')
        setNuevoContacto({ nombre: '', numero: '' })
        setEditando(null)
        cargarContactos()
      }
    } catch (error) {
      mostrarMensaje('error', 'Error al guardar contacto')
    }
  }

  // Eliminar contacto
  const eliminarContacto = async (id: number) => {
    if (!confirm('¿Eliminar este contacto?')) return
    try {
      const response = await fetch(`http://localhost:3001/api/contactos/${id}`, { method: 'DELETE' })
      const data = await response.json()
      if (data.success) {
        mostrarMensaje('success', 'Contacto eliminado')
        cargarContactos()
      }
    } catch (error) {
      mostrarMensaje('error', 'Error al eliminar')
    }
  }

  // Toggle contacto
  const toggleContacto = async (id: number) => {
    try {
      await fetch(`http://localhost:3001/api/contactos/${id}/toggle`, { method: 'POST' })
      cargarContactos()
    } catch (error) {
      console.error('Error al cambiar estado:', error)
    }
  }

  // Enviar mensaje
  const enviarMensaje = async () => {
    if (!enviarForm.numero || !enviarForm.mensaje) {
      mostrarMensaje('error', 'Completa todos los campos')
      return
    }
    try {
      const response = await fetch('http://localhost:3001/api/enviar-mensaje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enviarForm)
      })
      const data = await response.json()
      if (data.success) {
        mostrarMensaje('success', 'Mensaje enviado')
        setEnviarForm({ numero: '', mensaje: '' })
      } else {
        mostrarMensaje('error', data.error)
      }
    } catch (error) {
      mostrarMensaje('error', 'Error al enviar')
    }
  }

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000)
  }

  // Solicitar cotización
  const solicitarCotizacion = async () => {
    setSolicitando(true)
    try {
      const response = await fetch('http://localhost:3001/api/solicitar-cotizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (data.success) {
        mostrarMensaje('success', `${data.message}. Enviados: ${data.enviados}, Fallidos: ${data.fallidos}`)
      } else {
        mostrarMensaje('error', data.error)
      }
    } catch (error) {
      mostrarMensaje('error', 'Error al solicitar cotización')
    } finally {
      setSolicitando(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <Bot size={32} style={{ color: '#10b981' }} />
          <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>WhatsApp Bot</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>Panel de control completo</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem', borderBottom: '2px solid var(--border-dark)' }}>
        <TabButton active={activeTab === 'qr'} onClick={() => setActiveTab('qr')} icon={<Smartphone size={18} />} text="Conexión QR" />
        <TabButton active={activeTab === 'contactos'} onClick={() => setActiveTab('contactos')} icon={<Users size={18} />} text="Contactos" />
        <TabButton active={activeTab === 'enviar'} onClick={() => setActiveTab('enviar')} icon={<Send size={18} />} text="Enviar Mensaje" />
      </div>

      {/* Contenido */}
      <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-dark)' }}>
        {activeTab === 'qr' && <QRView qrData={qrData} solicitarCotizacion={solicitarCotizacion} solicitando={solicitando} mensaje={mensaje} />}
        {activeTab === 'contactos' && (
          <ContactosView 
            contactos={contactos}
            nuevoContacto={nuevoContacto}
            setNuevoContacto={setNuevoContacto}
            editando={editando}
            setEditando={setEditando}
            guardarContacto={guardarContacto}
            eliminarContacto={eliminarContacto}
            toggleContacto={toggleContacto}
            mensaje={mensaje}
          />
        )}
        {activeTab === 'enviar' && (
          <EnviarView 
            form={enviarForm}
            setForm={setEnviarForm}
            enviar={enviarMensaje}
            mensaje={mensaje}
          />
        )}
      </div>
    </div>
  )
}

// Componente TabButton
function TabButton({ active, onClick, icon, text }: { active: boolean, onClick: () => void, icon: React.ReactNode, text: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 24px',
        background: active ? '#10b981' : 'transparent',
        color: active ? 'white' : 'var(--text-secondary)',
        border: 'none',
        borderBottom: active ? '2px solid #10b981' : '2px solid transparent',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '0.875rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s',
        marginBottom: '-2px'
      }}
    >
      {icon}
      {text}
    </button>
  )
}

// Vista QR
function QRView({ qrData, solicitarCotizacion, solicitando, mensaje }: { 
  qrData: { qr: string | null, authenticated: boolean },
  solicitarCotizacion: () => void,
  solicitando: boolean,
  mensaje: { tipo: string, texto: string }
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>Conexión WhatsApp</h2>
      <div style={{
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '2rem',
        background: qrData.authenticated ? '#d4edda' : '#fff3cd',
        color: qrData.authenticated ? '#155724' : '#856404',
        fontWeight: '500'
      }}>
        {qrData.authenticated ? '✅ Autenticado correctamente' : '⏳ Esperando código QR...'}
      </div>
      <div style={{
        background: '#fafafa',
        borderRadius: '12px',
        padding: '2rem',
        minHeight: '300px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {qrData.authenticated ? (
          <div style={{ fontSize: '64px', color: '#10b981' }}>✓</div>
        ) : qrData.qr ? (
          <img src={qrData.qr} alt="QR Code" style={{ maxWidth: '300px', borderRadius: '8px' }} />
        ) : (
          <div style={{
            border: '3px solid #f0f0f0',
            borderTop: '3px solid #10b981',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            animation: 'spin 0.8s linear infinite'
          }} />
        )}
      </div>
      
      {qrData.authenticated && (
        <div style={{ marginTop: '2rem' }}>
          <button
            onClick={solicitarCotizacion}
            disabled={solicitando}
            style={{
              padding: '14px 32px',
              background: solicitando ? '#9CA3AF' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: solicitando ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              transition: 'all 0.2s'
            }}
          >
            {solicitando ? '⏳ Enviando...' : '📤 Solicitar Cotización a Proveedores'}
          </button>
          
          {mensaje.texto && (
            <div style={{
              marginTop: '1rem',
              padding: '12px',
              borderRadius: '8px',
              background: mensaje.tipo === 'success' ? '#d4edda' : '#f8d7da',
              color: mensaje.tipo === 'success' ? '#155724' : '#721c24',
              border: `1px solid ${mensaje.tipo === 'success' ? '#c3e6cb' : '#f5c6cb'}`
            }}>
              {mensaje.texto}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Vista Contactos
function ContactosView({ contactos, nuevoContacto, setNuevoContacto, editando, setEditando, guardarContacto, eliminarContacto, toggleContacto, mensaje }: any) {
  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>Gestión de Contactos</h2>
      
      {mensaje.texto && (
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '1rem',
          background: mensaje.tipo === 'success' ? '#d4edda' : '#f8d7da',
          color: mensaje.tipo === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${mensaje.tipo === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {mensaje.texto}
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nombre</label>
          <input
            type="text"
            value={nuevoContacto.nombre}
            onChange={(e) => setNuevoContacto({ ...nuevoContacto, nombre: e.target.value })}
            placeholder="Ej: Proveedor ABC"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid var(--border-dark)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Número (con código de país)</label>
          <input
            type="text"
            value={nuevoContacto.numero}
            onChange={(e) => setNuevoContacto({ ...nuevoContacto, numero: e.target.value })}
            placeholder="59179001752"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid var(--border-dark)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)'
            }}
          />
        </div>
        <button
          onClick={guardarContacto}
          style={{
            padding: '12px 24px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
        >
          {editando ? 'Actualizar Contacto' : 'Agregar Contacto'}
        </button>
      </div>

      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Lista de Contactos</h3>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {contactos.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No hay contactos registrados</p>
        ) : (
          contactos.map((c: Contacto) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                background: 'var(--bg-primary)',
                borderRadius: '8px',
                border: '1px solid var(--border-dark)',
                opacity: c.activo ? 1 : 0.5
              }}
            >
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{c.nombre}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>+{c.numero}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    setEditando(c.id)
                    setNuevoContacto({ nombre: c.nombre, numero: c.numero })
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  style={{
                    padding: '6px 12px',
                    background: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleContacto(c.id)}
                  style={{
                    padding: '6px 12px',
                    background: c.activo ? '#f59e0b' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}
                >
                  {c.activo ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => eliminarContacto(c.id)}
                  style={{
                    padding: '6px 12px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Vista Enviar Mensaje
function EnviarView({ form, setForm, enviar, mensaje }: any) {
  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>Enviar Mensaje</h2>
      
      {mensaje.texto && (
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '1rem',
          background: mensaje.tipo === 'success' ? '#d4edda' : '#f8d7da',
          color: mensaje.tipo === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${mensaje.tipo === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {mensaje.texto}
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Número de WhatsApp</label>
          <input
            type="text"
            value={form.numero}
            onChange={(e) => setForm({ ...form, numero: e.target.value })}
            placeholder="59179001752"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid var(--border-dark)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Mensaje</label>
          <textarea
            value={form.mensaje}
            onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
            placeholder="Escribe tu mensaje aquí..."
            rows={6}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid var(--border-dark)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>
        <button
          onClick={enviar}
          style={{
            padding: '12px 24px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Send size={18} />
          Enviar Mensaje
        </button>
      </div>
    </div>
  )
}
