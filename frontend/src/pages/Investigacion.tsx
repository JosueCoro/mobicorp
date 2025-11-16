import { useState } from 'react'
import api from '../api/client'

interface Resultado {
  posicion: number
  titulo: string
  url: string
  descripcion: string
  dominio?: string
  relevancia?: number
}

interface BusquedaResponse {
  query: string
  query_estricta?: string
  total_resultados: number
  resultados: Resultado[]
}

export default function Investigacion() {
  const [query, setQuery] = useState('')
  const [numResultados, setNumResultados] = useState(10)
  const [modoEstricto, setModoEstricto] = useState(false)
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalResultados, setTotalResultados] = useState(0)
  const [queryUsada, setQueryUsada] = useState('')

  const buscarGoogle = async () => {
    if (!query.trim()) {
      setError('Por favor ingresa un término de búsqueda')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const endpoint = modoEstricto ? '/api/google/buscar-estricta' : '/api/google/buscar'
      const response = await api.post<BusquedaResponse>(
        `${endpoint}?query=${encodeURIComponent(query)}&num_results=${numResultados}`
      )
      
      setResultados(response.data.resultados)
      setTotalResultados(response.data.total_resultados)
      setQueryUsada(response.data.query_estricta || response.data.query)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al realizar la búsqueda')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      buscarGoogle()
    }
  }

  const busquedasPredefinidas = [
    'muebles de oficina Santa Cruz Bolivia',
    'proveedores muebles La Paz Bolivia',
    'sillas ergonómicas oficina Bolivia',
    'escritorios ejecutivos Bolivia',
    'muebles corporativos Cochabamba'
  ]

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 'bold', 
          color: '#1F2937',
          marginBottom: '8px'
        }}>
          🔍 Investigación de Mercado
        </h1>
        <p style={{ color: '#6B7280', fontSize: '16px' }}>
          Busca información sobre proveedores, productos y precios en Google
        </p>
      </div>

      {/* Búsqueda */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '24px', 
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Término de búsqueda
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ej: muebles de oficina Santa Cruz"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ width: '150px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Resultados
            </label>
            <select
              value={numResultados}
              onChange={(e) => setNumResultados(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ 
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                <input
                  type="checkbox"
                  checked={modoEstricto}
                  onChange={(e) => setModoEstricto(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                Búsqueda estricta
              </label>
              <p style={{ 
                fontSize: '11px', 
                color: '#6B7280',
                margin: 0,
                paddingLeft: '24px'
              }}>
                Usa comillas y filtros avanzados
              </p>
            </div>
            
            <button
              onClick={buscarGoogle}
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: loading ? '#9CA3AF' : '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                whiteSpace: 'nowrap'
              }}
            >
              {loading ? '🔄 Buscando...' : '🔍 Buscar'}
            </button>
          </div>
        </div>

        {/* Búsquedas predefinidas */}
        <div>
          <p style={{ 
            fontSize: '13px', 
            color: '#6B7280', 
            marginBottom: '8px',
            fontWeight: '500'
          }}>
            Búsquedas sugeridas:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {busquedasPredefinidas.map((busqueda, index) => (
              <button
                key={index}
                onClick={() => setQuery(busqueda)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E5E7EB'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6'
                }}
              >
                {busqueda}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          backgroundColor: '#FEE2E2',
          border: '1px solid #FCA5A5',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <p style={{ color: '#DC2626', fontSize: '14px' }}>
            ❌ {error}
          </p>
        </div>
      )}

      {/* Resultados */}
      {totalResultados > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <p style={{ 
              fontSize: '16px', 
              color: '#374151',
              fontWeight: '500'
            }}>
              📊 Se encontraron {totalResultados} resultados
            </p>
            {queryUsada && queryUsada !== query && (
              <p style={{ 
                fontSize: '13px', 
                color: '#6B7280',
                backgroundColor: '#F3F4F6',
                padding: '8px 12px',
                borderRadius: '6px'
              }}>
                Query: <code style={{ 
                  backgroundColor: '#E5E7EB', 
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>{queryUsada}</code>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Lista de resultados */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {resultados.map((resultado) => (
          <div
            key={resultado.posicion}
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              transition: 'all 0.2s',
              cursor: 'pointer'
            }}
            onClick={() => window.open(resultado.url, '_blank')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            {/* Posición */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <div style={{ 
                display: 'inline-block',
                backgroundColor: '#EEF2FF',
                color: '#4F46E5',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                #{resultado.posicion}
              </div>
              
              {/* Badge de relevancia para búsqueda estricta */}
              {resultado.relevancia && (
                <div style={{ 
                  display: 'inline-block',
                  backgroundColor: '#DCFCE7',
                  color: '#166534',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  ⭐ Relevancia: {resultado.relevancia}
                </div>
              )}
            </div>

            {/* Título */}
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1F2937',
              marginBottom: '8px',
              lineHeight: '1.4'
            }}>
              {resultado.titulo}
            </h3>

            {/* Dominio (URL visible) */}
            {resultado.dominio && (
              <p style={{
                fontSize: '13px',
                color: '#059669',
                marginBottom: '4px',
                fontWeight: '500'
              }}>
                🌐 {resultado.dominio}
              </p>
            )}

            {/* URL completa */}
            <p style={{
              fontSize: '12px',
              color: '#6B7280',
              marginBottom: '12px',
              wordBreak: 'break-all'
            }}>
              🔗 {resultado.url}
            </p>

            {/* Descripción */}
            <p style={{
              fontSize: '14px',
              color: '#6B7280',
              lineHeight: '1.6'
            }}>
              {resultado.descripcion}
            </p>
          </div>
        ))}
      </div>

      {/* Estado vacío */}
      {!loading && resultados.length === 0 && !error && (
        <div style={{
          backgroundColor: 'white',
          padding: '48px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: '#374151',
            marginBottom: '8px'
          }}>
            Realiza una búsqueda
          </h3>
          <p style={{ color: '#6B7280', fontSize: '14px' }}>
            Ingresa un término de búsqueda para encontrar información sobre proveedores y productos
          </p>
        </div>
      )}
    </div>
  )
}
