import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'sales'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await register(formData.email, formData.password, formData.full_name, formData.role)
      navigate('/')
    } catch (err: any) {
      console.error('Error en handleSubmit:', err)
      const errorMessage = err.message || err.response?.data?.detail || 'Error al registrar usuario'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Elementos decorativos de fondo */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-50%',
        width: '800px',
        height: '800px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30%',
        left: '-30%',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />
      
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          padding: '3rem',
          borderRadius: '24px',
          boxShadow: 'var(--shadow-2xl)',
          width: '100%',
          maxWidth: '480px',
          border: '1px solid var(--border-dark)',
          position: 'relative',
          zIndex: 1,
          animation: 'fadeIn 0.5s ease-out',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 1.5rem',
            background: 'var(--primary)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)',
          }}>
            <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>M</span>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <h1 style={{ 
              fontSize: '2.25rem', 
              fontWeight: '700', 
              color: '#ef4444',
              marginBottom: '0.25rem' 
            }}>
              MobiCorp
            </h1>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', fontWeight: '500' }}>
              Soluciones Corporativas
            </p>
          </div>
          <h2 style={{ 
            fontSize: '1.75rem', 
            fontWeight: '600', 
            color: 'var(--text-primary)',
            marginBottom: '0.5rem' 
          }}>
            Crear Cuenta
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="full_name"
              style={{
                display: 'block',
                marginBottom: '0.625rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                fontSize: '0.9375rem',
              }}
            >
              Nombre Completo
            </label>
            <input
              id="full_name"
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
              placeholder="Juan Pérez"
              style={{
                width: '100%',
                padding: '0.875rem 1.125rem',
                border: '1px solid var(--border-dark)',
                borderRadius: '12px',
                fontSize: '0.9375rem',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                transition: 'var(--transition)',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                marginBottom: '0.625rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                fontSize: '0.9375rem',
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="juan@ejemplo.com"
              style={{
                width: '100%',
                padding: '0.875rem 1.125rem',
                border: '1px solid var(--border-dark)',
                borderRadius: '12px',
                fontSize: '0.9375rem',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                transition: 'var(--transition)',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                marginBottom: '0.625rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                fontSize: '0.9375rem',
              }}
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              style={{
                width: '100%',
                padding: '0.875rem 1.125rem',
                border: '1px solid var(--border-dark)',
                borderRadius: '12px',
                fontSize: '0.9375rem',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                transition: 'var(--transition)',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="role"
              style={{
                display: 'block',
                marginBottom: '0.625rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                fontSize: '0.9375rem',
              }}
            >
              Rol
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              style={{
                width: '100%',
                padding: '0.875rem 1.125rem',
                border: '1px solid var(--border-dark)',
                borderRadius: '12px',
                fontSize: '0.9375rem',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                transition: 'var(--transition)',
              }}
            >
              <option value="sales">Vendedor</option>
              <option value="admin">Administrador</option>
              <option value="logistics">Logística</option>
            </select>
          </div>

          {error && (
            <div
              style={{
                padding: '0.875rem 1.125rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--danger)',
                borderRadius: '12px',
                marginBottom: '1rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>⚠️</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.875rem 1.5rem',
              background: loading 
                ? 'var(--bg-tertiary)'
                : 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading 
                ? 'none'
                : '0 10px 25px -5px rgba(37, 99, 235, 0.4)',
              transition: 'var(--transition)',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.background = 'var(--primary-light)'
                e.currentTarget.style.boxShadow = '0 15px 35px -5px rgba(37, 99, 235, 0.5)'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.background = 'var(--primary)'
                e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(37, 99, 235, 0.4)'
              }
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Registrando...
              </span>
            ) : (
              'Crear Cuenta'
            )}
          </button>
        </form>

        <div style={{ 
          marginTop: '2rem', 
          textAlign: 'center', 
          fontSize: '0.9375rem',
          color: 'var(--text-secondary)',
        }}>
          ¿Ya tienes una cuenta?{' '}
          <Link 
            to="/login"
            style={{
              color: 'var(--primary)',
              textDecoration: 'none',
              fontWeight: '600',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none'
            }}
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  )
}

