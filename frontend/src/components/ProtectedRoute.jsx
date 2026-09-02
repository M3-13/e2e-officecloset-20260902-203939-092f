import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function ProtectedRoute({ children }) {
  const { user, token, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="page">
        <p className="page__muted">Wird geladen …</p>
      </div>
    )
  }

  if (!token && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export default ProtectedRoute
