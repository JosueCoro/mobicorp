import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { Package, ShoppingCart, TrendingUp, DollarSign, AlertCircle } from 'lucide-react'

interface Stats {
  totalProducts: number
  totalOrders: number
  pendingOrders: number
  totalRevenue: number
  priceAlerts: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 1,
    totalOrders: 15,
    pendingOrders: 5,
    totalRevenue: 5400,
    priceAlerts: 0,
  })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [productsRes, , alertsRes] = await Promise.all([
        api.get('/api/products?limit=1'),
        api.get('/api/orders?limit=1'),
        api.get('/api/prices/alerts'),
      ])

      const orders = await api.get('/api/orders')
      const ordersData = orders.data

      setStats({
        totalProducts: productsRes.data.length > 0 ? 100 : 0, // Aproximado
        totalOrders: ordersData.length,
        pendingOrders: ordersData.filter((o: any) => o.status === 'pending').length,
        totalRevenue: ordersData
          .filter((o: any) => o.final_price)
          .reduce((sum: number, o: any) => sum + (o.final_price || 0), 0),
        priceAlerts: alertsRes.data.length,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Productos',
      value: stats.totalProducts,
      icon: Package,
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      bgColor: 'rgba(139, 92, 246, 0.1)',
      action: () => navigate('/products'),
    },
    {
      title: 'Pedidos Totales',
      value: stats.totalOrders,
      icon: ShoppingCart,
      gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      bgColor: 'rgba(99, 102, 241, 0.1)',
      action: () => navigate('/orders'),
    },
    {
      title: 'Pedidos Pendientes',
      value: stats.pendingOrders,
      icon: AlertCircle,
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      action: () => navigate('/orders'),
    },
    {
      title: 'Ingresos Totales',
      value: `Bs. ${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      action: () => navigate('/reports'),
    },
  ]

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</div>
  }

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', color: 'var(--text-primary)' }}>Dashboard</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {statCards.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div
              key={idx}
              onClick={stat.action}
              style={{
                backgroundColor: 'var(--bg-card)',
                padding: '1.75rem',
                borderRadius: '16px',
                boxShadow: 'var(--shadow-md)',
                cursor: 'pointer',
                transition: 'var(--transition)',
                border: '1px solid var(--border-dark)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)'
                e.currentTarget.style.boxShadow = 'var(--shadow-xl)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'var(--shadow-md)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginBottom: '0.75rem', fontWeight: '500' }}>
                    {stat.title}
                  </p>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {stat.value}
                  </p>
                </div>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '14px',
                    background: stat.gradient,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 4px 12px -2px ${stat.bgColor}`,
                  }}
                >
                  <Icon size={26} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div
        style={{
          background: 'var(--bg-card)',
          padding: '2.5rem',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-dark)',
        }}
      >
        <h2 style={{ 
          fontSize: '1.75rem', 
          fontWeight: '700', 
          marginBottom: '1rem',
          color: 'var(--text-primary)',
        }}>
          Bienvenido a MobiCorp
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
          Sistema especializado en la gestión de ventas de mobiliario corporativo y soluciones de oficina. 
          Gestiona pedidos de sillas ejecutivas, escritorios gerenciales, mesas de reunión, estaciones de trabajo 
          y más. Compara precios del mercado y toma decisiones informadas basadas en datos en tiempo real.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/orders')}
            style={{
              padding: '0.875rem 1.75rem',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9375rem',
              boxShadow: '0 4px 12px -2px rgba(37, 99, 235, 0.4)',
              transition: 'var(--transition)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.background = 'var(--primary-light)'
              e.currentTarget.style.boxShadow = '0 6px 16px -2px rgba(37, 99, 235, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.background = 'var(--primary)'
              e.currentTarget.style.boxShadow = '0 4px 12px -2px rgba(37, 99, 235, 0.4)'
            }}
          >
            Crear Nuevo Pedido
          </button>
          <button
            onClick={() => navigate('/price-comparison')}
            style={{
              padding: '0.875rem 1.75rem',
              background: 'var(--secondary)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9375rem',
              boxShadow: '0 4px 12px -2px rgba(99, 102, 241, 0.4)',
              transition: 'var(--transition)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.background = 'var(--primary-light)'
              e.currentTarget.style.boxShadow = '0 6px 16px -2px rgba(99, 102, 241, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.background = 'var(--secondary)'
              e.currentTarget.style.boxShadow = '0 4px 12px -2px rgba(99, 102, 241, 0.4)'
            }}
          >
            Comparar Precios
          </button>
        </div>
      </div>
    </div>
  )
}

