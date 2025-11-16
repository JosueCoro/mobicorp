import { useState, useEffect } from 'react'
import api from '../api/client'
import { Zap, Database, Trash2, RefreshCw, TrendingUp, Package } from 'lucide-react'

interface ProductoScraped {
  id: number
  nombre: string
  precio: number
  categoria: string
  link: string
  imagen: string | null
  fuente: string
  fecha_scraping: string
}

interface Estadisticas {
  total_productos: number
  categorias: string[]
  precio_min: number
  precio_max: number
  precio_promedio: number
}

interface ScrapingResultado {
  total_productos: number
  productos_nuevos: number
  productos_duplicados: number
  productos: ProductoScraped[]
  estadisticas: {
    precios_diferentes: number
    precios: number[]
    precio_min: number
    precio_max: number
  }
}

export default function WebScraping() {
  const [productos, setProductos] = useState<ProductoScraped[]>([])
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [loading, setLoading] = useState(false)
  const [scrapingActivo, setScrapingActivo] = useState(false)
  const [ultimoResultado, setUltimoResultado] = useState<ScrapingResultado | null>(null)

  // Filtros
  const [categoria, setCategoria] = useState('')
  const [precioMin, setPrecioMin] = useState('')
  const [precioMax, setPrecioMax] = useState('')

  // Configuración de scraping
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(1) // 1=Bar, 2=Oficina, 3=Educativo, 4=Sillas
  const [minPrecioScraping, setMinPrecioScraping] = useState('0')
  const [maxPrecioScraping, setMaxPrecioScraping] = useState('100')

  const categoriasDisponibles = {
    1: 'Bar',
    2: 'Muebles de Oficina',
    3: 'Mobiliario Educativo',
    4: 'Sillas de Oficina'
  }

  useEffect(() => {
    cargarProductos()
    cargarEstadisticas()
  }, [categoria, precioMin, precioMax])

  const cargarProductos = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limite: '100' })
      if (categoria) params.append('categoria', categoria)
      if (precioMin) params.append('precio_min', precioMin)
      if (precioMax) params.append('precio_max', precioMax)

      const response = await api.get(`/api/scraping/productos?${params}`)
      setProductos(response.data)
    } catch (error) {
      console.error('Error cargando productos:', error)
    } finally {
      setLoading(false)
    }
  }

  const cargarEstadisticas = async () => {
    try {
      const response = await api.get('/api/scraping/estadisticas')
      setEstadisticas(response.data)
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    }
  }

  const ejecutarScrapingRango = async () => {
    setScrapingActivo(true)
    setUltimoResultado(null)
    try {
      const minP = parseInt(minPrecioScraping) || 0
      const maxP = parseInt(maxPrecioScraping) || 100
      
      const response = await api.post('/api/scraping/rango', {
        categoria: categoriaSeleccionada,
        min_precio: minP,
        max_precio: maxP,
        delay: 0.3,
      })
      setUltimoResultado(response.data)
      cargarProductos()
      cargarEstadisticas()
      alert(`✅ Scraping completado!\n🆕 ${response.data.productos_nuevos} productos nuevos\n📊 ${response.data.productos_duplicados} duplicados`)
    } catch (error: any) {
      console.error('Error completo:', error.response?.data)
      alert('Error en scraping: ' + (error.response?.data?.detail || JSON.stringify(error.response?.data) || 'Error desconocido'))
    } finally {
      setScrapingActivo(false)
    }
  }

  const ejecutarScrapingCompleto = async () => {
    if (!confirm('⚠️ Esto puede tomar 4-5 minutos. ¿Continuar?')) return

    setScrapingActivo(true)
    setUltimoResultado(null)
    try {
      const response = await api.post('/api/scraping/completo', {
        categoria: categoriaSeleccionada,
        delay: 0.3,
      })
      setUltimoResultado(response.data)
      cargarProductos()
      cargarEstadisticas()
      alert(`✅ Scraping completo!\n🆕 ${response.data.productos_nuevos} productos nuevos\n📊 ${response.data.productos_duplicados} duplicados`)
    } catch (error: any) {
      alert('Error en scraping: ' + (error.response?.data?.detail || 'Error desconocido'))
    } finally {
      setScrapingActivo(false)
    }
  }

  const eliminarProducto = async (id: number) => {
    if (!confirm('¿Eliminar este producto?')) return

    try {
      await api.delete(`/api/scraping/productos/${id}`)
      cargarProductos()
      cargarEstadisticas()
    } catch (error) {
      alert('Error eliminando producto')
    }
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
          🕷️ Web Scraping
        </h1>
        <p style={{ color: '#6B7280', fontSize: '16px' }}>
          Extrae productos y precios de Livingroom Bolivia
        </p>
      </div>

      {/* Estadísticas */}
      {estadisticas && (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Package size={24} color="#3B82F6" />
              <p style={{ color: '#6B7280', fontSize: '14px' }}>Total Productos</p>
            </div>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#3B82F6' }}>
              {estadisticas.total_productos}
            </p>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <TrendingUp size={24} color="#10B981" />
              <p style={{ color: '#6B7280', fontSize: '14px' }}>Precio Promedio</p>
            </div>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#10B981' }}>
              Bs {estadisticas.precio_promedio.toFixed(0)}
            </p>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Database size={24} color="#8B5CF6" />
              <p style={{ color: '#6B7280', fontSize: '14px' }}>Rango de Precios</p>
            </div>
            <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#8B5CF6' }}>
              Bs {estadisticas.precio_min} - {estadisticas.precio_max}
            </p>
          </div>
        </div>
      )}

      {/* Configuración de Scraping */}
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#374151' }}>
          ⚙️ Configuración de Scraping
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Categoría
            </label>
            <select
              value={categoriaSeleccionada}
              onChange={(e) => setCategoriaSeleccionada(parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value={1}>1 - Bar</option>
              <option value={2}>2 - Muebles de Oficina</option>
              <option value={3}>3 - Mobiliario Educativo</option>
              <option value={4}>4 - Sillas de Oficina</option>
            </select>
            <p style={{
              fontSize: '12px',
              color: '#6B7280',
              marginTop: '4px'
            }}>
              Categoría seleccionada: {categoriasDisponibles[categoriaSeleccionada as keyof typeof categoriasDisponibles]}
            </p>
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Precio Mínimo
            </label>
            <input
              type="number"
              value={minPrecioScraping}
              onChange={(e) => setMinPrecioScraping(e.target.value)}
              placeholder="0"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Precio Máximo
            </label>
            <input
              type="number"
              value={maxPrecioScraping}
              onChange={(e) => setMaxPrecioScraping(e.target.value)}
              placeholder="100"
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

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={ejecutarScrapingRango}
            disabled={scrapingActivo}
            style={{
              padding: '12px 24px',
              backgroundColor: scrapingActivo ? '#9CA3AF' : '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: scrapingActivo ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {scrapingActivo ? <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={18} />}
            Scraping Rápido (Rango)
          </button>

          <button
            onClick={ejecutarScrapingCompleto}
            disabled={scrapingActivo}
            style={{
              padding: '12px 24px',
              backgroundColor: scrapingActivo ? '#9CA3AF' : '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: scrapingActivo ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {scrapingActivo ? <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Database size={18} />}
            Scraping Completo (0-810)
          </button>

          <button
            onClick={() => {
              setMinPrecioScraping('0')
              setMaxPrecioScraping('100')
              setCategoriaSeleccionada(1)
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Resetear
          </button>
        </div>

        {scrapingActivo && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#FEF3C7',
            borderRadius: '8px',
            border: '1px solid #FDE68A',
            fontSize: '14px',
            color: '#92400E'
          }}>
            ⏳ Scraping en proceso... Esto puede tomar varios minutos dependiendo del rango.
          </div>
        )}

        {ultimoResultado && (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#F0FDF4',
            borderRadius: '8px',
            border: '1px solid #BBF7D0'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#15803D' }}>
              ✅ Último Resultado
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', fontSize: '14px' }}>
              <div>
                <p style={{ color: '#6B7280' }}>Total Productos:</p>
                <p style={{ fontWeight: 'bold', color: '#15803D' }}>{ultimoResultado.total_productos}</p>
              </div>
              <div>
                <p style={{ color: '#6B7280' }}>Nuevos:</p>
                <p style={{ fontWeight: 'bold', color: '#15803D' }}>{ultimoResultado.productos_nuevos}</p>
              </div>
              <div>
                <p style={{ color: '#6B7280' }}>Duplicados:</p>
                <p style={{ fontWeight: 'bold', color: '#F59E0B' }}>{ultimoResultado.productos_duplicados}</p>
              </div>
              <div>
                <p style={{ color: '#6B7280' }}>Precios Diferentes:</p>
                <p style={{ fontWeight: 'bold', color: '#15803D' }}>{ultimoResultado.estadisticas.precios_diferentes}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
          🔍 Filtrar Productos
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
              Categoría
            </label>
            <input
              type="text"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Buscar categoría..."
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Precio Mínimo
            </label>
            <input
              type="number"
              value={precioMin}
              onChange={(e) => setPrecioMin(e.target.value)}
              placeholder="0"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Precio Máximo
            </label>
            <input
              type="number"
              value={precioMax}
              onChange={(e) => setPrecioMax(e.target.value)}
              placeholder="1000"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button
              onClick={() => {
                setCategoria('')
                setPrecioMin('')
                setPrecioMax('')
              }}
              style={{
                width: '100%',
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

      {/* Lista de Productos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
          Cargando productos...
        </div>
      ) : productos.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '60px 20px',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            No hay productos
          </h3>
          <p style={{ color: '#6B7280' }}>
            Ejecuta un scraping para comenzar a extraer productos
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {productos.map((producto) => (
            <div
              key={producto.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                transition: 'transform 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              {producto.imagen && (
                <img
                  src={producto.imagen}
                  alt={producto.nombre}
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover'
                  }}
                />
              )}
              <div style={{ padding: '16px' }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#1F2937',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {producto.nombre}
                </h3>
                <p style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#3B82F6',
                  marginBottom: '8px'
                }}>
                  Bs {producto.precio.toFixed(2)}
                </p>
                <p style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  marginBottom: '8px'
                }}>
                  {producto.categoria}
                </p>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '12px'
                }}>
                  <a
                    href={producto.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: '#EEF2FF',
                      color: '#4F46E5',
                      textAlign: 'center',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      textDecoration: 'none'
                    }}
                  >
                    Ver Producto
                  </a>
                  <button
                    onClick={() => eliminarProducto(producto.id)}
                    style={{
                      padding: '8px',
                      backgroundColor: '#FEE2E2',
                      color: '#DC2626',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
