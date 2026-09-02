import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Wardrobe from './pages/Wardrobe.jsx'
import Outfits from './pages/Outfits.jsx'
import OutfitCreator from './pages/OutfitCreator.jsx'
import Impressum from './pages/Impressum.jsx'
import Privacy from './pages/Privacy.jsx'
import Account from './pages/Account.jsx'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/wardrobe"
              element={
                <ProtectedRoute>
                  <Wardrobe />
                </ProtectedRoute>
              }
            />
            <Route
              path="/outfits"
              element={
                <ProtectedRoute>
                  <Outfits />
                </ProtectedRoute>
              }
            />
            <Route
              path="/outfit-creator"
              element={
                <ProtectedRoute>
                  <OutfitCreator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              }
            />
            <Route path="/impressum" element={<Impressum />} />
            <Route path="/datenschutz" element={<Privacy />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
