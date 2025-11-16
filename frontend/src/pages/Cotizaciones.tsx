import { useState, useEffect } from 'react'
import api from '../api/client'

interface ProductoCotizado {
  id: number
  proveedor_numero: string
  proveedor_nombre: string
  nombre_producto: string
  tipo_producto: string
  descripcion: string
  precio: number | null
  tiene_precio: boolean
  fecha: string
  material: string | null
  marca: string | null
  caracteristicas: string[]
  imagen_url: string | null
}

interface FiltrosState {
  tipo_producto: string
  tiene_precio: string
  proveedor_numero: string
  nombre_producto: string
}

export default function Cotizaciones() {
  const [productos, setProductos] = useState<ProductoCotizado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [filtros, setFiltros] = useState<FiltrosState>({
    tipo_producto: '',
    tiene_precio: '',
    proveedor_numero: '',
    nombre_producto: ''
  })
  const [proveedores, setProveedores] = useState<string[]>([])
  const [tiposProducto] = useState([
    'silla', 'escritorio', 'mezon', 'lampara', 'taburete', 
    'casillero', 'armario', 'estanteria', 'sillon', 'archivador',
    'pizarra', 'perchero'
  ])

  useEffect(() => {
    cargarProductos()
    cargarProveedores()
  }, [filtros])

  const cargarProductos = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (filtros.tipo_producto) params.append('tipo_producto', filtros.tipo_producto)
      if (filtros.tiene_precio) params.append('tiene_precio', filtros.tiene_precio)
      if (filtros.proveedor_numero) params.append('proveedor_numero', filtros.proveedor_numero)
      if (filtros.nombre_producto) params.append('nombre_producto', filtros.nombre_producto)
      params.append('limite', '100')
      
      const response = await api.get(`/api/whatsapp/productos?${params.toString()}`)
      setProductos(response.data.productos)
      setTotal(response.data.total)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar productos')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const cargarProveedores = async () => {
    try {
      const response = await api.get('/api/whatsapp/proveedores')
      const numerosProveedores = response.data.map((p: any) => p.numero)
      setProveedores(numerosProveedores)
    } catch (err) {
      console.error('Error cargando proveedores:', err)
    }
  }

  const handleFiltroChange = (campo: keyof FiltrosState, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }))
  }

  const limpiarFiltros = () => {
    setFiltros({
      tipo_producto: '',
      tiene_precio: '',
      proveedor_numero: '',
      nombre_producto: ''
    })
  }

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-BO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatearPrecio = (precio: number | null) => {
    if (!precio) return 'Sin precio'
    return `Bs ${precio.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`
  }

  const getTipoColor = (tipo: string) => {
    const colores: { [key: string]: string } = {
      silla: '#3B82F6',
      escritorio: '#10B981',
      mezon: '#F59E0B',
      lampara: '#FBBF24',
      taburete: '#8B5CF6',
      casillero: '#EC4899',
      armario: '#6366F1',
      estanteria: '#14B8A6',
      sillon: '#F97316',
      archivador: '#06B6D4',
      pizarra: '#84CC16',
      perchero: '#A855F7'
    }
    return colores[tipo] || '#6B7280'
  }

  if (loading && productos.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        fontSize: '18px',
        color: '#6B7280'
      }}>
        Cargando cotizaciones...
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 'bold', 
          marginBottom: '10px',
          color: '#1F2937'
        }}>
          📦 Productos Cotizados
        </h1>
        <p style={{ color: '#6B7280', fontSize: '16px' }}>
          Visualiza y filtra todas las cotizaciones recibidas por WhatsApp
        </p>
      </div>

      {/* Filtros */}
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '16px'
        }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Tipo de Producto
            </label>
            <select
              value={filtros.tipo_producto}
              onChange={(e) => handleFiltroChange('tipo_producto', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <option value="">Todos los tipos</option>
              {tiposProducto.map(tipo => (
                <option key={tipo} value={tipo}>
                  {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Tiene Precio
            </label>
            <select
              value={filtros.tiene_precio}
              onChange={(e) => handleFiltroChange('tiene_precio', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <option value="">Todos</option>
              <option value="true">Con precio</option>
              <option value="false">Sin precio</option>
            </select>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Proveedor
            </label>
            <select
              value={filtros.proveedor_numero}
              onChange={(e) => handleFiltroChange('proveedor_numero', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <option value="">Todos los proveedores</option>
              {proveedores.map(numero => (
                <option key={numero} value={numero}>
                  {numero}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Buscar Producto
            </label>
            <input
              type="text"
              placeholder="Ej: ejecutiva, madera..."
              value={filtros.nombre_producto}
              onChange={(e) => handleFiltroChange('nombre_producto', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={limpiarFiltros}
            style={{
              padding: '10px 20px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Limpiar Filtros
          </button>
          <span style={{ color: '#6B7280', fontSize: '14px' }}>
            {total} producto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          backgroundColor: '#FEE2E2',
          color: '#991B1B',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          {error}
        </div>
      )}

      {/* Lista de Productos */}
      {productos.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '60px 20px',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            No hay productos cotizados
          </h3>
          <p style={{ color: '#6B7280' }}>
            Intenta ajustar los filtros o espera a recibir nuevas cotizaciones
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '20px'
        }}>
          {productos.map((producto) => (
            <div
              key={producto.id}
              style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #E5E7EB',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              {/* Imagen del producto */}
              {producto.imagen_url && (
                <div style={{ 
                  marginBottom: '16px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#F9FAFB'
                }}>
                  <img
                    src={producto.imagen_url.startsWith('http') 
                      ? producto.imagen_url 
                      : producto.imagen_url.startsWith('data:') 
                        ? producto.imagen_url 
                        : `data:image/png;base64,${producto.imagen_url}`}
                    alt={producto.nombre_producto}
                    style={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: '300px',
                      objectFit: 'contain',
                      display: 'block'
                    }}
                    onError={(e) => {
                      console.error('Error cargando imagen:', producto.imagen_url)
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}
              
              {/* Header */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '16px' 
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: 'inline-block',
                    padding: '4px 12px',
                    backgroundColor: getTipoColor(producto.tipo_producto) + '20',
                    color: getTipoColor(producto.tipo_producto),
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>
                    {producto.tipo_producto.charAt(0).toUpperCase() + producto.tipo_producto.slice(1)}
                  </div>
                  <h3 style={{ 
                    fontSize: '18px', 
                    fontWeight: '600',
                    color: '#1F2937',
                    marginBottom: '4px'
                  }}>
                    {producto.nombre_producto}
                  </h3>
                  <p style={{ 
                    fontSize: '14px', 
                    color: '#6B7280',
                    marginBottom: '4px'
                  }}>
                    {producto.proveedor_nombre}
                  </p>
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: producto.tiene_precio ? '#10B981' : '#9CA3AF'
                }}>
                  {formatearPrecio(producto.precio)}
                </div>
              </div>

              {/* Descripción */}
              {producto.descripcion && (
                <p style={{
                  fontSize: '14px',
                  color: '#4B5563',
                  marginBottom: '16px',
                  lineHeight: '1.5',
                  maxHeight: '60px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {producto.descripcion}
                </p>
              )}

              {/* Detalles */}
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '8px',
                marginBottom: '16px'
              }}>
                {producto.material && (
                  <span style={{
                    padding: '4px 10px',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    🔨 {producto.material}
                  </span>
                )}
                {producto.marca && (
                  <span style={{
                    padding: '4px 10px',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    🏷️ {producto.marca}
                  </span>
                )}
                {producto.caracteristicas && producto.caracteristicas.length > 0 && (
                  producto.caracteristicas.slice(0, 2).map((car, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#EEF2FF',
                        color: '#4F46E5',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      ✨ {car}
                    </span>
                  ))
                )}
              </div>

              {/* Footer */}
              <div style={{
                paddingTop: '16px',
                borderTop: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                  📅 {formatearFecha(producto.fecha)}
                </span>
                <span style={{ 
                  fontSize: '12px', 
                  color: '#9CA3AF',
                  fontFamily: 'monospace'
                }}>
                  ID: {producto.id.toString().slice(-6)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
