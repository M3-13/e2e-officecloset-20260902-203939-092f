import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const formStyle = {
  maxWidth: 440,
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
}

function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register(email, password)
      navigate('/wardrobe', { replace: true })
    } catch (err) {
      setError(err?.detail || err?.message || 'Registrierung fehlgeschlagen.')
      setSubmitting(false)
    }
  }

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">Registrierung</h1>
        <p className="page__subtitle">
          Lege ein Konto an und starte deine Garderobe.
        </p>
      </header>

      <form className="card" style={formStyle} onSubmit={handleSubmit}>
        <div className="field">
          <label className="field__label" htmlFor="register-email">
            E-Mail
          </label>
          <input
            id="register-email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="register-password">
            Passwort
          </label>
          <input
            id="register-password"
            className="input"
            type="password"
            autoComplete="new-password"
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
          {submitting ? 'Wird registriert …' : 'Registrieren'}
        </button>
      </form>

      <p className="page__muted" style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
        Bereits ein Konto? <Link to="/login">Jetzt anmelden</Link>
      </p>
    </section>
  )
}

export default Register
