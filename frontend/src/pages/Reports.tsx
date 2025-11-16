import { useEffect, useState } from 'react'
import api from '../api/client'
import { Download, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface OrderReport {
  total_orders: number
  total_revenue: number
  pending_orders: number
  approved_orders: number
  orders: Array<{
    id: number
    product_name: string
    quantity: number
    final_price: number
    status: string
    created_at: string
  }>
}

interface MarginReport {
  total_margin: number
  avg_margin_percent: number
  margins: Array<{
    order_id: number
    product_name: string
    cost: number
    revenue: number
    margin_percent: number
  }>
}

export default function Reports() {
  const [orderReport, setOrderReport] = useState<OrderReport | null>(null)
  const [marginReport, setMarginReport] = useState<MarginReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const [ordersRes, marginsRes] = await Promise.all([
        api.get('/api/reports/orders'),
        api.get('/api/reports/margins'),
      ])
      setOrderReport(ordersRes.data)
      setMarginReport(marginsRes.data)
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    // En producción, esto generaría un archivo Excel/PDF
    alert('Funcionalidad de exportación en desarrollo')
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando reportes...</div>
  }

  const statusData = orderReport
    ? [
        { name: 'Aprobados', value: orderReport.approved_orders, color: 'var(--success)' },
        { name: 'Pendientes', value: orderReport.pending_orders, color: 'var(--warning)' },
      ]
    : []

  const marginData = marginReport?.margins.slice(0, 10).map((m) => ({
    name: m.product_name.substring(0, 20) + '...',
    margin: m.margin_percent,
  })) || []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Reportes y Análisis</h1>
        <button
          onClick={handleExport}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'var(--secondary)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: '500',
          }}
        >
          <Download size={20} />
          Exportar Reporte
        </button>
      </div>

      {/* Resumen General */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-dark)',
          color: 'var(--text-primary)',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingCart size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Total Pedidos</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{orderReport?.total_orders || 0}</p>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-dark)',
          color: 'var(--text-primary)',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                backgroundColor: 'var(--success)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Ingresos Totales</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                Bs. {orderReport?.total_revenue.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-dark)',
          color: 'var(--text-primary)',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                backgroundColor: 'var(--secondary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Margen Promedio</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {marginReport?.avg_margin_percent.toFixed(2) || '0.00'}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Gráfico de Estado de Pedidos */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-dark)',
          color: 'var(--text-primary)',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            Estado de Pedidos
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Márgenes */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-dark)',
          color: 'var(--text-primary)',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            Márgenes por Producto (Top 10)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={marginData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="margin" fill="var(--primary)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla de Pedidos */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-dark)',
          color: 'var(--text-primary)',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: 'var(--shadow)',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Historial de Pedidos</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>ID</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Producto</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Cantidad</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Precio Final</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Estado</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {orderReport?.orders.slice(0, 20).map((order) => (
                <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}>{order.id}</td>
                  <td style={{ padding: '1rem' }}>{order.product_name}</td>
                  <td style={{ padding: '1rem' }}>{order.quantity}</td>
                  <td style={{ padding: '1rem' }}>Bs. {order.final_price?.toFixed(2) || 'N/A'}</td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        backgroundColor:
                          order.status === 'approved'
                            ? 'var(--success)20'
                            : order.status === 'pending'
                            ? 'var(--warning)20'
                            : 'var(--danger)20',
                        color:
                          order.status === 'approved'
                            ? 'var(--success)'
                            : order.status === 'pending'
                            ? 'var(--warning)'
                            : 'var(--danger)',
                      }}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
                    {new Date(order.created_at).toLocaleDateString('es-ES')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

