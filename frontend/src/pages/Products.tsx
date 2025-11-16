import { useEffect, useState } from 'react'
import api from '../api/client'
import { Plus, Search, Edit2 } from 'lucide-react'

interface Product {
  id: number
  name: string
  category: string
  price: number | null
  stock: number
  description?: string
  image_url?: string | null
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    description: '',
    sku: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/products')
      setProducts(response.data)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      // Crear preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Verificar que el usuario tenga un token válido
      const token = localStorage.getItem('token')
      if (!token) {
        alert('No estás autenticado. Por favor, inicia sesión.')
        window.location.href = '/login'
        return
      }

      // Validar campos requeridos
      if (!formData.name.trim()) {
        alert('El nombre del producto es requerido')
        return
      }
      if (!formData.category) {
        alert('La categoría del producto es requerida')
        return
      }

      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name.trim())
      formDataToSend.append('category', formData.category)
      
      if (formData.description && formData.description.trim()) {
        formDataToSend.append('description', formData.description.trim())
      }
      
      formDataToSend.append('stock', formData.stock || '0')
      
      if (formData.sku && formData.sku.trim()) {
        formDataToSend.append('sku', formData.sku.trim())
      }
      
      if (formData.price && formData.price.trim()) {
        formDataToSend.append('price', formData.price.trim())
      }
      
      if (imageFile) {
        formDataToSend.append('image', imageFile)
      }

      console.log('Enviando producto:', {
        name: formData.name,
        category: formData.category,
        stock: formData.stock,
        hasImage: !!imageFile,
        isEditing: !!editingProduct
      })
      
      // Si estamos editando, usar POST con ID, si no, POST sin ID
      const response = editingProduct
        ? await api.post(`/api/products/${editingProduct.id}`, formDataToSend)
        : await api.post('/api/products', formDataToSend)
      
      if (response.data) {
        setShowForm(false)
        setEditingProduct(null)
        setFormData({ name: '', category: '', price: '', stock: '', description: '', sku: '' })
        setImageFile(null)
        setImagePreview(null)
        // Limpiar input de archivo
        const fileInput = document.getElementById('product-image') as HTMLInputElement
        if (fileInput) fileInput.value = ''
        fetchProducts()
        alert(editingProduct ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente')
      }
    } catch (error: any) {
      console.error('Error creating/updating product:', error)
      console.error('Error response:', error.response)
      console.error('Error data:', error.response?.data)
      
      let errorMessage = 'Error al crear el producto'
      
      if (error.response?.status === 401) {
        errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.'
        localStorage.removeItem('token')
        window.location.href = '/login'
      } else if (error.response?.status === 400) {
        // Error 400 - Bad Request
        const detail = error.response?.data?.detail
        if (typeof detail === 'string') {
          errorMessage = detail
        } else if (detail && typeof detail === 'object') {
          // Si es un objeto con errores de validación
          const errors = Object.entries(detail)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n')
          errorMessage = `Error de validación:\n${errors}`
        } else {
          errorMessage = 'Error al crear el producto. Verifica que todos los campos estén completos.'
        }
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error.message) {
        errorMessage = error.message
      }
      
      alert(`Error: ${errorMessage}`)
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price?.toString() || '',
      stock: product.stock.toString(),
      description: product.description || '',
      sku: '',
    })
    setImagePreview(product.image_url || null)
    setShowForm(true)
    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingProduct(null)
    setFormData({ name: '', category: '', price: '', stock: '', description: '', sku: '' })
    setImageFile(null)
    setImagePreview(null)
    setShowForm(false)
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Mobiliario Corporativo</h1>
        <button
          onClick={() => {
            if (showForm && editingProduct) {
              handleCancelEdit()
            } else {
              setShowForm(!showForm)
            }
          }}
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
          {showForm && editingProduct ? 'Cancelar Edición' : 'Nuevo Producto'}
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label htmlFor="product-name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Nombre</label>
                <input
                  id="product-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ej: Silla Ejecutiva Ergonómica"
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
                <label htmlFor="product-category" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Categoría</label>
                <select
                  id="product-category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-dark)',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                  }}
                >
                  <option value="">Seleccione una categoría</option>
                  <optgroup label="ASIENTOS">
                    <option value="Asientos - Ejecutiva">Ejecutiva</option>
                    <option value="Asientos - Gerencial">Gerencial</option>
                    <option value="Asientos - Operativa">Operativa</option>
                    <option value="Asientos - Lounge">Lounge</option>
                    <option value="Asientos - Longarinas">Longarinas</option>
                  </optgroup>
                  <optgroup label="MOBILIARIO CORPORATIVO">
                    <option value="Mobiliario Corporativo - Directoría">Directoría</option>
                    <option value="Mobiliario Corporativo - Gerencial">Gerencial</option>
                    <option value="Mobiliario Corporativo - Operativa">Operativa</option>
                    <option value="Mobiliario Corporativo - Recepción">Recepción</option>
                    <option value="Mobiliario Corporativo - Apoyo">Apoyo</option>
                    <option value="Mobiliario Corporativo - Reuniones">Reuniones</option>
                    <option value="Mobiliario Corporativo - Estaciones de trabajo">Estaciones de trabajo</option>
                    <option value="Mobiliario Corporativo - Acero">Acero</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label htmlFor="product-price" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Precio (Bs.) - Opcional</label>
                <input
                  id="product-price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="Dejar vacío para sin precio"
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
                <label htmlFor="product-stock" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Stock</label>
                <input
                  id="product-stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  required
                  placeholder="0"
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
                <label htmlFor="product-sku" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>SKU (Opcional)</label>
                <input
                  id="product-sku"
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Ej: MCP-SEJ-001"
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
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="product-description" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Descripción</label>
              <textarea
                id="product-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Ingrese una descripción del producto (opcional)"
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
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="product-image" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Imagen del Producto (Opcional)</label>
              <input
                id="product-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-dark)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
                }}
              />
              {imagePreview && (
                <div style={{ marginTop: '1rem' }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      maxWidth: '200px',
                      maxHeight: '200px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-dark)',
                    }}
                  />
                </div>
              )}
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
                Crear Producto
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

      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-dark)',
          color: 'var(--text-primary)',
          padding: '1rem',
          borderRadius: '12px',
          boxShadow: 'var(--shadow)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <Search size={20} color="var(--text-tertiary)" />
        <input
          type="text"
          placeholder="Buscar mobiliario por nombre o categoría..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: '0.75rem',
            border: 'none',
            fontSize: '1rem',
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            style={{
              backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-dark)',
          color: 'var(--text-primary)',
              padding: '1.5rem',
              borderRadius: '12px',
              boxShadow: 'var(--shadow)',
            }}
          >
            {product.image_url && (
              <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                <img
                  src={`${(window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) ? 'https://innovahack-mobicorp.onrender.com' : 'http://localhost:8001'}${product.image_url}`}
                  alt={product.name}
                  style={{
                    width: '100%',
                    maxHeight: '200px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid var(--border-dark)',
                  }}
                />
              </div>
            )}
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {product.name}
            </h3>
            <p style={{ color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>{product.category}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              {product.price !== null && product.price !== undefined ? (
                <div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>Precio</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                    Bs. {product.price.toFixed(2)}
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>Precio</p>
                  <p style={{ fontSize: '1rem', fontStyle: 'italic', color: 'var(--text-tertiary)' }}>
                    Consultar precio
                  </p>
                </div>
              )}
              <div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>Stock</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{product.stock} unidades</p>
              </div>
            </div>
            {product.description && (
              <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
                {product.description}
              </p>
            )}
            <button
              onClick={() => handleEditProduct(product)}
              style={{
                marginTop: '1rem',
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontWeight: '500',
                fontSize: '0.9rem',
              }}
            >
              <Edit2 size={16} />
              Editar Producto
            </button>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
          No se encontraron productos
        </div>
      )}
    </div>
  )
}

