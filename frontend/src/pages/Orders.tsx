import { useEffect, useState } from 'react'
import api from '../api/client'
import { Plus, Check, X, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface Order {
  id: number
  product: {
    id: number
    name: string
    category: string
    price: number | null
  }
  quantity: number
  requested_price: number
  final_price?: number
  status: string
  created_at: string
  approved_at?: string
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: '',
    requested_price: '',
  })

  useEffect(() => {
    fetchOrders()
    fetchProducts()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await api.get('/api/orders')
      setOrders(response.data)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/products')
      setProducts(response.data)
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/orders', {
        ...formData,
        product_id: parseInt(formData.product_id),
        quantity: parseInt(formData.quantity),
        requested_price: parseFloat(formData.requested_price),
      })
      setShowForm(false)
      setFormData({ product_id: '', quantity: '', requested_price: '' })
      fetchOrders()
    } catch (error) {
      console.error('Error creating order:', error)
      alert('Error al crear el pedido')
    }
  }

  const handleApprove = async (orderId: number, finalPrice: number) => {
    try {
      await api.post(`/api/orders/${orderId}/approve`, null, {
        params: { final_price: finalPrice },
      })
      fetchOrders()
    } catch (error) {
      console.error('Error approving order:', error)
      alert('Error al aprobar el pedido')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <Check size={20} color="var(--success)" />
      case 'pending':
        return <Clock size={20} color="var(--warning)" />
      default:
        return <X size={20} color="var(--danger)" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'var(--success)'
      case 'pending':
        return 'var(--warning)'
      default:
        return 'var(--danger)'
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Pedidos</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'var(--primary)',
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
          <Plus size={20} />
          Nuevo Pedido
        </button>
      </div>

      {showForm && (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-dark)',
          color: 'var(--text-primary)',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: 'var(--shadow)',
            marginBottom: '2rem',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Crear Nuevo Pedido</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label htmlFor="order-product" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Producto</label>
                <select
                  id="order-product"
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  required
                  aria-label="Seleccionar producto para el pedido"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-dark)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                    borderRadius: '8px',
                  }}
                >
                  <option value="">Seleccionar producto</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.price !== null && p.price !== undefined ? `- Bs. ${p.price.toFixed(2)}` : '(Consultar precio)'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="order-quantity" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Cantidad</label>
                <input
                  id="order-quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                  min="1"
                  placeholder="Ingrese la cantidad"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-dark)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                    borderRadius: '8px',
                  }}
                />
              </div>
              <div>
                <label htmlFor="order-price" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Precio Solicitado (Bs.)
                </label>
                <input
                  id="order-price"
                  type="number"
                  step="0.01"
                  value={formData.requested_price}
                  onChange={(e) => setFormData({ ...formData, requested_price: e.target.value })}
                  required
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-dark)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                    borderRadius: '8px',
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="submit"
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                Crear Pedido
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {orders.map((order) => (
          <div
            key={order.id}
            style={{
              backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-dark)',
          color: 'var(--text-primary)',
              padding: '1.5rem',
              borderRadius: '12px',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                  Pedido #{order.id}
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  <strong>Producto:</strong> {order.product.name}
                </p>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  <strong>Cantidad:</strong> {order.quantity} unidades
                </p>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  <strong>Precio solicitado:</strong> Bs. {order.requested_price.toFixed(2)}
                </p>
                {order.final_price && (
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    <strong>Precio final:</strong> Bs. {order.final_price.toFixed(2)}
                  </p>
                )}
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  {format(new Date(order.created_at), "dd/MM/yyyy 'a las' HH:mm")}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '0.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: getStatusColor(order.status) + '20',
                    color: getStatusColor(order.status),
                  }}
                >
                  {getStatusIcon(order.status)}
                  <span style={{ textTransform: 'capitalize', fontWeight: '500' }}>{order.status}</span>
                </div>
                {order.status === 'pending' && (
                  <button
                    onClick={() => {
                      const finalPrice = prompt('Ingrese el precio final aprobado:', order.requested_price.toString())
                      if (finalPrice) {
                        handleApprove(order.id, parseFloat(finalPrice))
                      }
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: 'var(--success)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '0.9rem',
                    }}
                  >
                    Aprobar Pedido
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {orders.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
          No hay pedidos registrados
        </div>
      )}
    </div>
  )
}

