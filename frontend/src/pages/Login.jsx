import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const formStyle = {
  maxWidth: 440,
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
}

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const from = location.state?.from?.pathname || '/wardrobe'

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err?.detail || err?.message || 'Anmeldung fehlgeschlagen.')
      setSubmitting(false)
    }
  }

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">Anmeldung</h1>
        <p className="page__subtitle">
          Melde dich an, um deine Garderobe zu verwalten.
        </p>
      </header>

      <form className="card" style={formStyle} onSubmit={handleSubmit}>
        <div className="field">
          <label className="field__label" htmlFor="login-email">
            E-Mail
          </label>
          <input
            id="login-email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="login-password">
            Passwort
          </label>
          <input
            id="login-password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="form__error" role="alert" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        )}

        <button className="button button--primary" type="submit" disabled={submitting}>
          {submitting ? 'Wird angemeldet …' : 'Anmelden'}
        </button>
      </form>

      <p className="page__muted" style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
        Noch kein Konto? <Link to="/register">Jetzt registrieren</Link>
      </p>
    </section>
  )
}

export default Login
