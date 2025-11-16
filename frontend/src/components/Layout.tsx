import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Chatbot from './Chatbot'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  FileText,
  LogOut,
  Menu,
  X,
  MessageSquare,
  Clipboard,
  Globe,
  Search
} from 'lucide-react'
import { useState } from 'react'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/products', icon: Package, label: 'Productos' },
    { path: '/orders', icon: ShoppingCart, label: 'Pedidos' },
    { path: '/price-comparison', icon: TrendingUp, label: 'Comparación de Precios' },
    { path: '/whatsapp-bot', icon: MessageSquare, label: 'WhatsApp Bot' },
    { path: '/cotizaciones', icon: Clipboard, label: 'Cotizaciones' },
    { path: '/web-scraping', icon: Globe, label: 'Web Scraping' },
    { path: '/investigacion', icon: Search, label: 'Investigación' },
    { path: '/reports', icon: FileText, label: 'Reportes' },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarOpen ? '280px' : '0',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          position: 'fixed',
          height: '100vh',
          zIndex: 1000,
          boxShadow: sidebarOpen ? 'var(--shadow-xl)' : 'none',
          borderRight: '1px solid var(--border-dark)',
        }}
      >
        <div style={{ padding: '2rem 1.5rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '3rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div>
              <h2 style={{ 
                fontSize: '1.75rem', 
                fontWeight: '700',
                color: '#ef4444',
                marginBottom: '0.25rem'
              }}>
                MobiCorp
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: '500' }}>
                Soluciones Corporativas
              </p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú lateral"
              title="Cerrar menú lateral"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '8px',
                display: sidebarOpen ? 'flex' : 'none',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              <X size={20} />
            </button>
          </div>

          <nav style={{ display: sidebarOpen ? 'flex' : 'none', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path)
                    setSidebarOpen(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '0.875rem 1.25rem',
                    backgroundColor: isActive 
                      ? 'var(--primary)'
                      : 'transparent',
                    background: isActive 
                      ? 'var(--primary)'
                      : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: isActive ? '1px solid var(--primary)' : '1px solid transparent',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.875rem',
                    fontSize: '0.95rem',
                    fontWeight: isActive ? '600' : '500',
                    transition: 'var(--transition)',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                    }
                  }}
                >
                  <Icon size={20} style={{ opacity: isActive ? 1 : 0.8 }} />
                  {item.label}
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '4px',
                      height: '60%',
                      background: 'var(--primary)',
                      borderRadius: '0 4px 4px 0',
                    }} />
                  )}
                </button>
              )
            })}
          </nav>

          {sidebarOpen && (
            <div style={{ 
              marginTop: 'auto',
              paddingTop: '1.5rem', 
              borderTop: '1px solid rgba(255,255,255,0.1)' 
            }}>
              <div style={{ 
                marginBottom: '1rem', 
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: '500'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.25rem' }}>
                  Usuario
                </div>
                {user?.full_name}
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.25rem',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%)',
                  color: 'white',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  transition: 'var(--transition)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.3) 100%)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <LogOut size={18} />
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        marginLeft: sidebarOpen ? '280px' : '0',
        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        minHeight: '100vh',
      }}>
        {/* Top Bar */}
        <header
          style={{
            background: 'var(--bg-secondary)',
            padding: '1.25rem 2rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            borderBottom: '1px solid var(--border-dark)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Abrir menú lateral"
            title="Abrir menú lateral"
            style={{
              background: 'var(--bg-hover)',
              border: 'none',
              cursor: 'pointer',
              padding: '0.625rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition)',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary)'
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <Menu size={22} />
          </button>
          <h1 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '700', 
            color: 'var(--text-primary)',
          }}>
            MobiCorp - Soluciones Corporativas
          </h1>
          <div style={{ width: '40px' }}></div>
        </header>

        {/* Page Content */}
        <main style={{ 
          padding: '2rem',
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
        }}>
          <Outlet />
        </main>
      </div>

      {/* Chatbot */}
      <Chatbot />
    </div>
  )
}

