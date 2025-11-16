import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Orders from './pages/Orders'
import PriceComparison from './pages/PriceComparison'
import Reports from './pages/Reports'
import WhatsAppBot from './pages/WhatsAppBot'
import Cotizaciones from './pages/Cotizaciones'
import WebScraping from './pages/WebScraping'
import Investigacion from './pages/Investigacion'
import Layout from './components/Layout'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>Cargando...</div>
  }
  
  return user ? <>{children}</> : <Navigate to="/login" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="orders" element={<Orders />} />
        <Route path="price-comparison" element={<PriceComparison />} />
        <Route path="reports" element={<Reports />} />
        <Route path="whatsapp-bot" element={<WhatsAppBot />} />
        <Route path="cotizaciones" element={<Cotizaciones />} />
        <Route path="web-scraping" element={<WebScraping />} />
        <Route path="investigacion" element={<Investigacion />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App

