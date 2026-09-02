import { useEffect, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { api } from '../api/client.js'
import '../styles/outfits.css'

function Outfits() {
  const navigate = useNavigate()
  const location = useLocation()

  const [outfits, setOutfits] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [flash, setFlash] = useState(location.state?.flash || '')
  const [confirmId, setConfirmId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadError('')
      try {
        const data = await api.get('/outfits')
        if (!cancelled) {
          setOutfits(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err?.detail || err?.message || 'Outfits konnten nicht geladen werden.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!flash) return
    const timer = setTimeout(() => setFlash(''), 4000)
    return () => clearTimeout(timer)
  }, [flash])

  async function handleDelete(id) {
    setDeleteError('')
    setDeleting(true)
    try {
      await api.delete(`/outfits/${id}`)
      setOutfits((prev) => prev.filter((outfit) => outfit.id !== id))
      setConfirmId(null)
      setFlash('Outfit gelöscht.')
    } catch (err) {
      setDeleteError(err?.detail || err?.message || 'Löschen fehlgeschlagen.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="page">
      <header className="page__header page__header--row">
        <div>
          <h1 className="page__title">Outfits</h1>
          <p className="page__subtitle">Deine gespeicherten Outfits.</p>
        </div>
        <Link to="/outfit-creator" className="button button--primary">
          Neues Outfit
        </Link>
      </header>

      {flash && (
        <div className="toast" role="status">
          {flash}
        </div>
      )}

      {deleteError && (
        <p className="form__error" role="alert">
          {deleteError}
        </p>
      )}

      {loading ? (
        <div className="outfits-grid" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="outfit-card--skeleton" key={i} />
          ))}
        </div>
      ) : loadError ? (
        <div className="empty-state">
          <p className="empty-state__title">Etwas ist schiefgelaufen</p>
          <p className="page__muted" role="alert">
            {loadError}
          </p>
        </div>
      ) : outfits.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state__title">Noch keine Outfits</p>
          <p className="page__muted">
            Stelle im Outfit-Creator dein erstes Outfit zusammen.
          </p>
          <Link to="/outfit-creator" className="button button--secondary">
            Zum Outfit-Creator
          </Link>
        </div>
      ) : (
        <div className="outfits-grid">
          {outfits.map((outfit) => (
            <article className="outfit-card card" key={outfit.id}>
              <div className="outfit-card__thumbs">
                {outfit.items.length === 0 ? (
                  <span className="outfit-card__empty">Keine Teile</span>
                ) : (
                  outfit.items.map((item) => (
                    <img
                      key={item.id}
                      className="outfit-card__thumb"
                      src={item.image_url}
                      alt={item.name}
                      title={item.name}
                    />
                  ))
                )}
              </div>
              <h2 className="outfit-card__name">{outfit.name}</h2>
              <p className="outfit-card__meta">
                {outfit.items.length} {outfit.items.length === 1 ? 'Teil' : 'Teile'}
              </p>

              {confirmId === outfit.id ? (
                <div className="outfit-card__confirm">
                  <span className="page__muted">Wirklich löschen?</span>
                  <button
                    type="button"
                    className="button button--danger"
                    onClick={() => handleDelete(outfit.id)}
                    disabled={deleting}
                  >
                    Ja, löschen
                  </button>
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={() => setConfirmId(null)}
                    disabled={deleting}
                  >
                    Abbrechen
                  </button>
                </div>
              ) : (
                <div className="outfit-card__actions">
                  <button
                    type="button"
                    className="outfit-card__action"
                    onClick={() => navigate(`/outfit-creator?id=${outfit.id}`)}
                  >
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    className="outfit-card__action outfit-card__action--danger"
                    onClick={() => setConfirmId(outfit.id)}
                  >
                    Löschen
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default Outfits
