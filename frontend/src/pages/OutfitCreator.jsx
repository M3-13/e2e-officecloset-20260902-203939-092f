import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client.js'
import '../styles/outfits.css'

function OutfitCreator() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const outfitId = searchParams.get('id')

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [name, setName] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const isEditing = Boolean(outfitId)

  useEffect(() => {
    let cancelled = false

    async function loadItems() {
      setLoading(true)
      setLoadError('')
      try {
        const data = await api.get('/items')
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err?.detail || err?.message || 'Deine Garderobe konnte nicht geladen werden.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadItems()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!outfitId) return
    let cancelled = false

    async function loadOutfit() {
      try {
        const outfit = await api.get(`/outfits/${outfitId}`)
        if (!cancelled) {
          setName(outfit.name || '')
          setSelectedIds((outfit.items || []).map((item) => item.id))
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err?.detail || err?.message || 'Das Outfit konnte nicht geladen werden.',
          )
        }
      }
    }

    loadOutfit()

    return () => {
      cancelled = true
    }
  }, [outfitId])

  function toggleItem(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function handleSave(event) {
    event.preventDefault()
    setSaveError('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setSaveError('Bitte gib deinem Outfit einen Namen.')
      return
    }
    if (selectedIds.length === 0) {
      setSaveError('Wähle mindestens ein Kleidungsstück aus.')
      return
    }

    setSaving(true)
    try {
      if (isEditing) {
        await api.patch(`/outfits/${outfitId}`, {
          name: trimmedName,
          item_ids: selectedIds,
        })
        navigate('/outfits', { state: { flash: 'Outfit aktualisiert.' } })
      } else {
        await api.post('/outfits', { name: trimmedName, item_ids: selectedIds })
        navigate('/outfits', { state: { flash: 'Outfit gespeichert.' } })
      }
    } catch (err) {
      setSaveError(err?.detail || err?.message || 'Speichern fehlgeschlagen.')
      setSaving(false)
    }
  }

  const selectedItems = items.filter((item) => selectedIds.includes(item.id))

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">{isEditing ? 'Outfit bearbeiten' : 'Outfit-Creator'}</h1>
        <p className="page__subtitle">
          {isEditing
            ? 'Passe dein gespeichertes Outfit an.'
            : 'Stelle aus deiner Garderobe ein Outfit zusammen.'}
        </p>
      </header>

      {loading ? (
        <div className="garment-grid" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="garment-tile--skeleton" key={i} />
          ))}
        </div>
      ) : loadError ? (
        <div className="empty-state">
          <p className="empty-state__title">Etwas ist schiefgelaufen</p>
          <p className="page__muted" role="alert">
            {loadError}
          </p>
        </div>
      ) : (
        <div className="creator">
          <div className="creator__gallery">
            {items.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state__title">Deine Garderobe ist leer</p>
                <p className="page__muted">
                  Lege zuerst Kleidungsstücke an, um ein Outfit zusammenzustellen.
                </p>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => navigate('/wardrobe')}
                >
                  Zur Garderobe
                </button>
              </div>
            ) : (
              <div className="garment-grid">
                {items.map((item) => {
                  const selected = selectedIds.includes(item.id)
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={`garment-tile${selected ? ' garment-tile--selected' : ''}`}
                      aria-pressed={selected}
                      onClick={() => toggleItem(item.id)}
                    >
                      <span className="garment-tile__image">
                        <img src={item.image_url} alt={item.name} />
                      </span>
                      <span className="garment-tile__name">{item.name}</span>
                      <span className="garment-tile__meta">
                        {item.category} · {item.color}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <form className="creator__panel card" onSubmit={handleSave}>
            <h2 className="creator__panel-title">Dein Outfit</h2>

            <div className="field">
              <label className="field__label" htmlFor="outfit-name">
                Name
              </label>
              <input
                id="outfit-name"
                className="input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Abend im Theater"
                disabled={saving}
              />
            </div>

            <div className="selected-list">
              {selectedItems.length === 0 ? (
                <p className="page__muted">Noch keine Teile ausgewählt.</p>
              ) : (
                selectedItems.map((item) => (
                  <div className="selected-item" key={item.id}>
                    <img className="selected-item__thumb" src={item.image_url} alt="" />
                    <span className="selected-item__name">{item.name}</span>
                    <button
                      type="button"
                      className="selected-item__remove"
                      aria-label={`${item.name} entfernen`}
                      onClick={() => toggleItem(item.id)}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            {saveError && (
              <p className="form__error" role="alert">
                {saveError}
              </p>
            )}

            <div className="creator__actions">
              <button type="submit" className="button button--primary" disabled={saving}>
                {saving
                  ? 'Wird gespeichert …'
                  : isEditing
                    ? 'Änderungen speichern'
                    : 'Outfit speichern'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => navigate('/outfits')}
                  disabled={saving}
                >
                  Abbrechen
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

export default OutfitCreator
