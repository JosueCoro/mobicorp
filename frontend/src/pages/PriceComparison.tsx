import { useEffect, useState } from 'react'
import api from '../api/client'
import { TrendingUp, TrendingDown, Minus, Search, Filter } from 'lucide-react'

interface Product {
  id: number
  name: string
  category: string
  price: number | null
}

interface ProductoCotizado {
  id: number
  proveedor_numero: string
  proveedor_nombre: string
  nombre_producto: string
  tipo_producto: string
  precio: number | null
  fecha: string
}

interface Comparacion {
  producto_catalogo: Product
  cotizaciones: ProductoCotizado[]
  precio_catalogo: number | null
  precio_minimo: number | null
  precio_maximo: number | null
  precio_promedio: number | null
  diferencia_minimo: number | null
  diferencia_promedio: number | null
  proveedores: string[]
}

export default function PriceComparison() {
  const [products, setProducts] = useState<Product[]>([])
  const [cotizaciones, setCotizaciones] = useState<ProductoCotizado[]>([])
  const [comparaciones, setComparaciones] = useState<Comparacion[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroCategoria, setFiltroCategoria] = useState<string>('')
  const [filtroNombre, setFiltroNombre] = useState<string>('')
  const [categorias] = useState([
    'silla', 'escritorio', 'mezon', 'lampara', 'taburete',
    'casillero', 'armario', 'estanteria', 'sillon', 'archivador'
  ])

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    if (products.length > 0 && cotizaciones.length > 0) {
      generarComparaciones()
    }
  }, [products, cotizaciones, filtroCategoria, filtroNombre])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [productosRes, cotizacionesRes] = await Promise.all([
        api.get('/api/products'),
        api.get('/api/whatsapp/productos?tiene_precio=true&limite=500')
      ])
      
      setProducts(productosRes.data)
      setCotizaciones(cotizacionesRes.data.productos || [])
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const generarComparaciones = () => {
    const comparacionesMap = new Map<number, Comparacion>()

    // Filtrar productos
    let productosFiltrados = products.filter(p => p.price && p.price > 0)
    
    if (filtroCategoria) {
      productosFiltrados = productosFiltrados.filter(p => 
        p.category.toLowerCase() === filtroCategoria.toLowerCase()
      )
    }
    
    if (filtroNombre) {
      productosFiltrados = productosFiltrados.filter(p =>
        p.name.toLowerCase().includes(filtroNombre.toLowerCase())
      )
    }

    productosFiltrados.forEach(producto => {
      // Buscar cotizaciones similares por tipo/categoría
      const cotizacionesSimilares = cotizaciones.filter(cot => {
        const nombreCotLower = cot.nombre_producto.toLowerCase()
        const nombreProdLower = producto.name.toLowerCase()
        const categoriaProdLower = producto.category.toLowerCase()
        const tipoCotLower = cot.tipo_producto.toLowerCase()
        
        // Coincidencia por tipo o nombre similar
        return tipoCotLower.includes(categoriaProdLower) ||
               categoriaProdLower.includes(tipoCotLower) ||
               nombreCotLower.includes(nombreProdLower) ||
               nombreProdLower.includes(nombreCotLower)
      })

      if (cotizacionesSimilares.length > 0) {
        const preciosCotizaciones = cotizacionesSimilares
          .filter(c => c.precio && c.precio > 0)
          .map(c => c.precio!)

        const precio_minimo = preciosCotizaciones.length > 0 
          ? Math.min(...preciosCotizaciones) 
          : null

        const precio_maximo = preciosCotizaciones.length > 0
          ? Math.max(...preciosCotizaciones)
          : null

        const precio_promedio = preciosCotizaciones.length > 0
          ? preciosCotizaciones.reduce((a, b) => a + b, 0) / preciosCotizaciones.length
          : null

        const diferencia_minimo = precio_minimo && producto.price
          ? ((producto.price - precio_minimo) / precio_minimo) * 100
          : null

        const diferencia_promedio = precio_promedio && producto.price
          ? ((producto.price - precio_promedio) / precio_promedio) * 100
          : null

        const proveedores = [...new Set(cotizacionesSimilares.map(c => c.proveedor_nombre))]

        comparacionesMap.set(producto.id, {
          producto_catalogo: producto,
          cotizaciones: cotizacionesSimilares,
          precio_catalogo: producto.price,
          precio_minimo,
          precio_maximo,
          precio_promedio,
          diferencia_minimo,
          diferencia_promedio,
          proveedores
        })
      }
    })

    setComparaciones(Array.from(comparacionesMap.values()))
  }

  const getDiferenciaColor = (diferencia: number | null) => {
    if (!diferencia) return '#6B7280'
    if (diferencia > 10) return '#EF4444'
    if (diferencia < -10) return '#10B981'
    return '#F59E0B'
  }

  const getDiferenciaIcon = (diferencia: number | null) => {
    if (!diferencia) return <Minus size={16} />
    if (diferencia > 0) return <TrendingUp size={16} />
    return <TrendingDown size={16} />
  }

  const formatearPrecio = (precio: number | null) => {
    if (!precio) return 'N/A'
    return `Bs ${precio.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        fontSize: '18px',
        color: '#6B7280'
      }}>
        Cargando comparación de precios...
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
          📊 Comparación de Precios
        </h1>
        <p style={{ color: '#6B7280', fontSize: '16px' }}>
          Compara tus productos con las cotizaciones recibidas de proveedores
        </p>
      </div>

      {/* Estadísticas Generales */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '8px' }}>
            Productos Comparados
          </p>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#3B82F6' }}>
            {comparaciones.length}
          </p>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '8px' }}>
            Cotizaciones Disponibles
          </p>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#10B981' }}>
            {cotizaciones.length}
          </p>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '8px' }}>
            Proveedores Activos
          </p>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#8B5CF6' }}>
            {new Set(cotizaciones.map(c => c.proveedor_nombre)).size}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <Filter size={20} color="#6B7280" />
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>
            Filtros
          </h3>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Buscar por Nombre
            </label>
            <div style={{ position: 'relative' }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9CA3AF'
                }}
              />
              <input
                type="text"
                placeholder="Ej: Silla ejecutiva..."
                value={filtroNombre}
                onChange={(e) => setFiltroNombre(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 10px 10px 40px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Filtrar por Categoría
            </label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <option value="">Todas las categorías</option>
              {categorias.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button
              onClick={() => {
                setFiltroCategoria('')
                setFiltroNombre('')
              }}
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
          </div>
        </div>
      </div>

      {/* Lista de Comparaciones */}
      {comparaciones.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '60px 20px',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            No hay comparaciones disponibles
          </h3>
          <p style={{ color: '#6B7280' }}>
            Agrega productos con precios y espera cotizaciones de proveedores
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {comparaciones.map((comp) => (
            <div
              key={comp.producto_catalogo.id}
              style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #E5E7EB'
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #E5E7EB'
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#1F2937',
                    marginBottom: '8px'
                  }}>
                    {comp.producto_catalogo.name}
                  </h3>
                  <p style={{ color: '#6B7280', fontSize: '14px' }}>
                    Categoría: {comp.producto_catalogo.category} • {comp.cotizaciones.length} cotización(es) • {comp.proveedores.length} proveedor(es)
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {comp.proveedores.map((prov, idx) => (
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
                        {prov}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{
                  textAlign: 'right',
                  minWidth: '150px'
                }}>
                  <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                    Tu Precio
                  </p>
                  <p style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#1F2937'
                  }}>
                    {formatearPrecio(comp.precio_catalogo)}
                  </p>
                </div>
              </div>

              {/* Comparación de Precios */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '20px'
              }}>
                <div style={{
                  padding: '16px',
                  backgroundColor: '#F0FDF4',
                  borderRadius: '8px',
                  border: '1px solid #BBF7D0'
                }}>
                  <p style={{ fontSize: '12px', color: '#15803D', marginBottom: '8px' }}>
                    Precio Mínimo Mercado
                  </p>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#15803D' }}>
                    {formatearPrecio(comp.precio_minimo)}
                  </p>
                  {comp.diferencia_minimo !== null && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '8px',
                      color: getDiferenciaColor(comp.diferencia_minimo)
                    }}>
                      {getDiferenciaIcon(comp.diferencia_minimo)}
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>
                        {comp.diferencia_minimo > 0 ? '+' : ''}
                        {comp.diferencia_minimo.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                <div style={{
                  padding: '16px',
                  backgroundColor: '#FEF3C7',
                  borderRadius: '8px',
                  border: '1px solid #FDE68A'
                }}>
                  <p style={{ fontSize: '12px', color: '#92400E', marginBottom: '8px' }}>
                    Precio Promedio Mercado
                  </p>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#92400E' }}>
                    {formatearPrecio(comp.precio_promedio)}
                  </p>
                  {comp.diferencia_promedio !== null && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '8px',
                      color: getDiferenciaColor(comp.diferencia_promedio)
                    }}>
                      {getDiferenciaIcon(comp.diferencia_promedio)}
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>
                        {comp.diferencia_promedio > 0 ? '+' : ''}
                        {comp.diferencia_promedio.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                <div style={{
                  padding: '16px',
                  backgroundColor: '#FEE2E2',
                  borderRadius: '8px',
                  border: '1px solid #FECACA'
                }}>
                  <p style={{ fontSize: '12px', color: '#991B1B', marginBottom: '8px' }}>
                    Precio Máximo Mercado
                  </p>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#991B1B' }}>
                    {formatearPrecio(comp.precio_maximo)}
                  </p>
                </div>
              </div>

              {/* Recomendación */}
              <div style={{
                padding: '16px',
                backgroundColor: comp.diferencia_promedio && comp.diferencia_promedio > 10
                  ? '#FEF2F2'
                  : comp.diferencia_promedio && comp.diferencia_promedio < -10
                  ? '#F0FDF4'
                  : '#FEF3C7',
                borderRadius: '8px',
                border: `1px solid ${
                  comp.diferencia_promedio && comp.diferencia_promedio > 10
                    ? '#FCA5A5'
                    : comp.diferencia_promedio && comp.diferencia_promedio < -10
                    ? '#BBF7D0'
                    : '#FDE68A'
                }`
              }}>
                <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  💡 Recomendación:
                </p>
                <p style={{ fontSize: '14px', color: '#6B7280' }}>
                  {comp.diferencia_promedio && comp.diferencia_promedio > 10
                    ? `Tu precio está ${comp.diferencia_promedio.toFixed(1)}% por encima del promedio del mercado. Considera ajustarlo para ser más competitivo.`
                    : comp.diferencia_promedio && comp.diferencia_promedio < -10
                    ? `Tu precio está ${Math.abs(comp.diferencia_promedio).toFixed(1)}% por debajo del promedio. Podrías aumentarlo para mejorar tus márgenes.`
                    : 'Tu precio está alineado con el mercado. Está en un rango competitivo.'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

