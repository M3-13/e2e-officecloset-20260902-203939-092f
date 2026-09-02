import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../api/client.js'

const CONFIRMATION_TEXT = 'LÖSCHEN'

const cardStyle = {
  maxWidth: 560,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
}

function Account() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const canConfirm = confirmation.trim() === CONFIRMATION_TEXT

  function openConfirmation() {
    setError('')
    setConfirmation('')
    setConfirmOpen(true)
  }

  function closeConfirmation() {
    setConfirmOpen(false)
    setConfirmation('')
    setError('')
  }

  async function handleDelete(event) {
    event.preventDefault()
    if (!canConfirm) {
      setError('Bitte gib „LÖSCHEN“ ein, um die Löschung zu bestätigen.')
      return
    }
    setError('')
    setDeleting(true)
    try {
      await api.delete('/account')
      await logout()
      navigate('/register', { replace: true })
    } catch (err) {
      setError(
        err?.detail ||
          err?.message ||
          'Das Konto konnte nicht gelöscht werden. Bitte versuche es erneut.',
      )
      setDeleting(false)
    }
  }

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">Konto</h1>
        <p className="page__subtitle">Verwalte deine Kontoeinstellungen.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <section className="card" style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 'var(--size_lg)' }}>Kontodaten</h2>
          <div className="field">
            <span className="field__label">E-Mail-Adresse</span>
            <p style={{ margin: 0 }}>{user?.email || 'Keine E-Mail-Adresse hinterlegt.'}</p>
          </div>
        </section>

        <section className="card" style={{ ...cardStyle, borderColor: 'var(--color-danger)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--size_lg)' }}>Konto löschen</h2>
          <p className="page__muted" style={{ margin: 0 }}>
            Wenn du dein Konto löschst, werden deine Garderobe, deine Bilder und
            deine Outfits dauerhaft und unwiderruflich entfernt.
          </p>

          {!confirmOpen ? (
            <div>
              <button type="button" className="button button--danger" onClick={openConfirmation}>
                Konto löschen
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleDelete}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
            >
              <div className="field">
                <label className="field__label" htmlFor="delete-confirmation">
                  Gib „LÖSCHEN“ ein, um die Löschung zu bestätigen.
                </label>
                <input
                  id="delete-confirmation"
                  className="input"
                  type="text"
                  autoComplete="off"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder={CONFIRMATION_TEXT}
                />
              </div>

              {error && (
                <p className="form__error" role="alert" style={{ color: 'var(--color-danger)' }}>
                  {error}
                </p>
              )}

              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                <button
                  type="submit"
                  className="button button--danger"
                  disabled={!canConfirm || deleting}
                >
                  {deleting ? 'Wird gelöscht …' : 'Endgültig löschen'}
                </button>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={closeConfirmation}
                  disabled={deleting}
                >
                  Abbrechen
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </section>
  )
}

export default Account
