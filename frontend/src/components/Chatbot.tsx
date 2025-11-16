import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import api from '../api/client'

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Array<{ type: 'user' | 'bot', text: string }>>([
    { type: 'bot', text: '¡Hola! 👋 Soy tu asistente virtual de MobiCorp. ¿En qué puedo ayudarte?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { type: 'user', text: userMessage }])
    setLoading(true)

    try {
      const response = await api.post('/api/chat', { message: userMessage })
      setMessages(prev => [...prev, { type: 'bot', text: response.data.response }])
    } catch (error) {
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: 'Lo siento, ocurrió un error. Por favor intenta de nuevo.' 
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Chatbot Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Abrir asistente virtual"
          title="Abrir asistente virtual"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4), 0 10px 10px -5px rgba(37, 99, 235, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            transition: 'var(--transition)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1) translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 15px 35px -5px rgba(37, 99, 235, 0.5), 0 15px 15px -5px rgba(37, 99, 235, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)'
            e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(37, 99, 235, 0.4), 0 10px 10px -5px rgba(37, 99, 235, 0.2)'
          }}
        >
          <MessageCircle size={28} />
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            width: '420px',
            height: '650px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1001,
            overflow: 'hidden',
            border: '1px solid var(--border-dark)',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'var(--primary)',
              color: 'white',
              padding: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.25rem' }}>Asistente Virtual</h3>
              <p style={{ fontSize: '0.875rem', opacity: 0.9, fontWeight: '500' }}>MobiCorp - Siempre aquí para ayudarte</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar asistente virtual"
              title="Cerrar asistente virtual"
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
                e.currentTarget.style.transform = 'rotate(90deg)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                e.currentTarget.style.transform = 'rotate(0deg)'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  padding: '0.875rem 1.125rem',
                  borderRadius: msg.type === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.type === 'user' 
                    ? 'var(--primary)'
                    : 'var(--bg-tertiary)',
                  color: msg.type === 'user' ? 'white' : 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '0.9375rem',
                  lineHeight: '1.5',
                  boxShadow: msg.type === 'user' 
                    ? '0 4px 6px -1px rgba(99, 102, 241, 0.3)'
                    : 'var(--shadow-sm)',
                  animation: 'fadeIn 0.3s ease-out',
                }}
              >
                {msg.text}
              </div>
            ))}
            {loading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  padding: '0.875rem 1.125rem',
                  borderRadius: '18px 18px 18px 4px',
                  backgroundColor: 'var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9375rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid var(--gray-300)',
                  borderTopColor: 'var(--primary)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Pensando...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: '1rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: '0.5rem',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.875rem 1.125rem',
                border: '1px solid var(--border-dark)',
                borderRadius: '12px',
                fontSize: '0.9375rem',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                transition: 'var(--transition)',
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              aria-label="Enviar mensaje"
              title="Enviar mensaje"
              style={{
                padding: '0.875rem 1.125rem',
                background: loading || !input.trim() 
                  ? 'var(--bg-tertiary)'
                  : 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: loading || !input.trim() 
                  ? 'none'
                  : '0 4px 6px -1px rgba(37, 99, 235, 0.3)',
                transition: 'var(--transition)',
              }}
              onMouseEnter={(e) => {
                if (!loading && input.trim()) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 12px -1px rgba(37, 99, 235, 0.4)'
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && input.trim()) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(37, 99, 235, 0.3)'
                }
              }}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

