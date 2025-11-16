import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'

export default function QRWhatsAppView() {
  const [qrData, setQrData] = useState<{qr: string | null, authenticated: boolean}>({
    qr: null,
    authenticated: false
  })

  const fetchQRData = async () => {
    try {
      const response = await fetch('http://localhost:3001/qr-data')
      const data = await response.json()
      setQrData(data)
    } catch (error) {
      console.error('Error al obtener QR:', error)
    }
  }

  useEffect(() => {
    fetchQRData()
    const interval = setInterval(fetchQRData, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center'
      }}>
        <h1 style={{
          color: '#333',
          marginBottom: '10px',
          fontSize: '28px',
          fontWeight: '600'
        }}>
          <span style={{ fontSize: '24px', marginRight: '10px' }}>🤖</span>
          WhatsApp Bot
        </h1>
        
        <p style={{
          color: '#666',
          marginBottom: '30px',
          fontSize: '14px'
        }}>
          Escanea el código QR para conectar
        </p>
        
        <div style={{
          padding: '15px',
          borderRadius: '10px',
          margin: '20px 0',
          fontWeight: '500',
          background: qrData.authenticated ? '#d4edda' : '#fff3cd',
          color: qrData.authenticated ? '#155724' : '#856404',
          border: qrData.authenticated ? '2px solid #28a745' : '2px solid #ffc107'
        }}>
          {qrData.authenticated ? '✅ ¡Autenticado correctamente!' : '⏳ Esperando código QR...'}
        </div>
        
        <div style={{
          background: '#f5f5f5',
          borderRadius: '15px',
          padding: '30px',
          margin: '20px 0',
          minHeight: '300px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {qrData.authenticated ? (
            <div style={{ fontSize: '60px' }}>✅</div>
          ) : qrData.qr ? (
            <img 
              src={qrData.qr}
              alt="QR Code"
              style={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '10px'
              }}
            />
          ) : (
            <div style={{
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }} />
          )}
        </div>
        
        <div style={{
          background: '#e3f2fd',
          padding: '20px',
          borderRadius: '10px',
          marginTop: '20px',
          textAlign: 'left'
        }}>
          <h3 style={{
            color: '#1976d2',
            marginBottom: '15px',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            📱 Instrucciones:
          </h3>
          <ol style={{
            paddingLeft: '20px',
            color: '#333',
            fontSize: '14px'
          }}>
            <li style={{ margin: '10px 0', lineHeight: '1.6' }}>
              Abre WhatsApp en tu teléfono
            </li>
            <li style={{ margin: '10px 0', lineHeight: '1.6' }}>
              Ve a <strong>Menú</strong> o <strong>Ajustes</strong>
            </li>
            <li style={{ margin: '10px 0', lineHeight: '1.6' }}>
              Toca <strong>Dispositivos vinculados</strong>
            </li>
            <li style={{ margin: '10px 0', lineHeight: '1.6' }}>
              Toca <strong>Vincular un dispositivo</strong>
            </li>
            <li style={{ margin: '10px 0', lineHeight: '1.6' }}>
              Escanea el código QR que aparece arriba
            </li>
          </ol>
        </div>
        
        <button
          onClick={fetchQRData}
          style={{
            background: '#667eea',
            color: 'white',
            border: 'none',
            padding: '12px 30px',
            borderRadius: '25px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            marginTop: '20px',
            transition: 'all 0.3s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#5568d3'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 5px 15px rgba(102, 126, 234, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#667eea'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <RefreshCw size={16} />
          🔄 Actualizar
        </button>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
