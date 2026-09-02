import { useEffect, useMemo, useRef, useState } from 'react'
import { api, getToken } from '../api/client.js'
import './Wardrobe.css'

const MAX_UPLOAD_MB = 5
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const CATEGORIES = [
  { value: 'oberteil', label: 'Oberteil' },
  { value: 'hose', label: 'Hose' },
  { value: 'kleid', label: 'Kleid' },
  { value: 'schuhe', label: 'Schuhe' },
  { value: 'accessoire', label: 'Accessoire' },
]

const CATEGORY_LABELS = CATEGORIES.reduce((acc, category) => {
  acc[category.value] = category.label
  return acc
}, {})

function errorMessage(error, fallback) {
  if (typeof error?.detail === 'string' && error.detail) {
    return error.detail
  }
  if (Array.isArray(error?.detail)) {
    const messages = error.detail.map((entry) => entry?.msg).filter(Boolean)
    if (messages.length) {
      return messages.join(', ')
    }
  }
  if (typeof error?.message === 'string' && error.message) {
    return error.message
  }
  return fallback
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  )
}

function ImagePlaceholder() {
  return (
    <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM8.5 13.5l2 2.5 3-4 4 6H7l1.5-4.5z" />
    </svg>
  )
}

function ItemCard({ item, onEdit, onDelete }) {
  const [objectUrl, setObjectUrl] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    let url = null

    async function loadImage() {
      try {
        const headers = {}
        const token = getToken()
        if (token) {
          headers.Authorization = `Bearer ${token}`
        }
        const response = await fetch(item.image_url, { headers })
        if (!response.ok) {
          throw new Error('Bild konnte nicht geladen werden.')
        }
        const blob = await response.blob()
        if (cancelled) {
          return
        }
        url = URL.createObjectURL(blob)
        setObjectUrl(url)
      } catch {
        if (!cancelled) {
          setFailed(true)
        }
      }
    }

    loadImage()

    return () => {
      cancelled = true
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [item.image_url])

  return (
    <article className="tile card card--interactive">
      <div className="tile__media">
        {objectUrl ? (
          <img className="tile__img" src={objectUrl} alt={item.name} />
        ) : (
          <div className="tile__placeholder" role="img" aria-label={item.name}>
            {failed ? <ImagePlaceholder /> : null}
          </div>
        )}
        <div className="tile__actions">
          <button
            type="button"
            className="tile__action"
            onClick={onEdit}
            aria-label={`${item.name} bearbeiten`}
            title="Bearbeiten"
          >
            <EditIcon />
          </button>
          <button
            type="button"
            className="tile__action tile__action--danger"
            onClick={onDelete}
            aria-label={`${item.name} löschen`}
            title="Löschen"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
      <div className="tile__body">
        <h3 className="tile__name">{item.name}</h3>
        <p className="tile__meta">
          {CATEGORY_LABELS[item.category] || item.category} · {item.color}
        </p>
      </div>
    </article>
  )
}

function FilterBar({ category, color, colors, onCategoryChange, onColorChange, onAdd }) {
  return (
    <div className="filterbar">
      <div className="filterbar__group">
        <span className="filterbar__label" id="filter-category-label">
          Kategorie
        </span>
        <div className="chips" role="group" aria-labelledby="filter-category-label">
          <button
            type="button"
            className={`chip${category === '' ? ' chip--active' : ''}`}
            onClick={() => onCategoryChange('')}
          >
            Alle
          </button>
          {CATEGORIES.map((entry) => (
            <button
              key={entry.value}
              type="button"
              className={`chip${category === entry.value ? ' chip--active' : ''}`}
              onClick={() => onCategoryChange(entry.value)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filterbar__group">
        <span className="filterbar__label" id="filter-color-label">
          Farbe
        </span>
        <div className="chips" role="group" aria-labelledby="filter-color-label">
          <button
            type="button"
            className={`chip${color === '' ? ' chip--active' : ''}`}
            onClick={() => onColorChange('')}
          >
            Alle
          </button>
          {colors.map((entry) => (
            <button
              key={entry}
              type="button"
              className={`chip${color === entry ? ' chip--active' : ''}`}
              onClick={() => onColorChange(entry)}
            >
              {entry}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="button button--primary filterbar__add" onClick={onAdd}>
        Neu hinzufügen
      </button>
    </div>
  )
}

function ItemForm({ item, onSubmit, onCancel }) {
  const isEdit = Boolean(item)
  const [name, setName] = useState(item?.name || '')
  const [category, setCategory] = useState(item?.category || '')
  const [color, setColor] = useState(item?.color || '')
  const [image, setImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const previewUrlRef = useRef(null)

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  function replacePreview(file) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }
    const url = URL.createObjectURL(file)
    previewUrlRef.current = url
    setPreviewUrl(url)
  }

  function handleFileChange(event) {
    const file = event.target.files && event.target.files[0]
    setError('')
    if (!file) {
      return
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Ungültiges Bildformat. Erlaubt sind JPEG, PNG oder WebP.')
      event.target.value = ''
      return
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`Das Bild ist zu groß. Maximale Größe: ${MAX_UPLOAD_MB} MB.`)
      event.target.value = ''
      return
    }
    setImage(file)
    replacePreview(file)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Bitte gib einen Namen an.')
      return
    }
    if (!category) {
      setError('Bitte wähle eine Kategorie.')
      return
    }
    if (!color.trim()) {
      setError('Bitte gib eine Farbe an.')
      return
    }
    if (!isEdit && !image) {
      setError('Bitte wähle ein Bild aus.')
      return
    }

    const formData = new FormData()
    formData.append('name', name.trim())
    formData.append('category', category)
    formData.append('color', color.trim())
    if (image) {
      formData.append('image', image)
    }

    setSubmitting(true)
    try {
      if (isEdit) {
        await api.patch(`/items/${item.id}`, formData)
      } else {
        await api.post('/items', formData)
      }
      onSubmit()
    } catch (err) {
      setError(errorMessage(err, 'Speichern fehlgeschlagen.'))
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="item-form-title" onClick={onCancel}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal__header">
          <h2 className="modal__title" id="item-form-title">
            {isEdit ? 'Kleidungsstück bearbeiten' : 'Neues Kleidungsstück'}
          </h2>
          <button type="button" className="modal__close" onClick={onCancel} aria-label="Schließen">
            ×
          </button>
        </header>

        <form className="item-form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="item-name">
              Name
            </label>
            <input
              id="item-name"
              className="input"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="item-category">
              Kategorie
            </label>
            <select
              id="item-category"
              className="input"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              required
            >
              <option value="" disabled>
                Bitte wählen
              </option>
              {CATEGORIES.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="item-color">
              Farbe
            </label>
            <input
              id="item-color"
              className="input"
              type="text"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="item-image">
              Bild
            </label>
            <input
              id="item-image"
              className="input item-form__file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
            />
            {isEdit && !image && (
              <p className="field__hint">Kein neues Bild ausgewählt – das aktuelle Bild bleibt erhalten.</p>
            )}
          </div>

          {previewUrl && (
            <div className="item-form__preview">
              <img src={previewUrl} alt="Bildvorschau" />
            </div>
          )}

          {error && (
            <p className="form__error" role="alert">
              {error}
            </p>
          )}

          <div className="item-form__actions">
            <button type="button" className="button button--secondary" onClick={onCancel}>
              Abbrechen
            </button>
            <button type="submit" className="button button--primary" disabled={submitting}>
              {submitting ? 'Wird gespeichert …' : isEdit ? 'Speichern' : 'Anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmDialog({ item, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={onCancel}>
      <div className="modal modal--confirm" onClick={(event) => event.stopPropagation()}>
        <h2 className="modal__title" id="confirm-title">
          Löschen bestätigen
        </h2>
        <p className="modal__text">
          Möchtest du „{item.name}“ wirklich löschen? Das Bild wird ebenfalls entfernt.
        </p>
        <div className="item-form__actions">
          <button type="button" className="button button--secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="button" className="button button--danger" onClick={onConfirm}>
            Ja, löschen
          </button>
        </div>
      </div>
    </div>
  )
}

function Toast({ message, kind }) {
  return (
    <div className={`toast toast--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {message}
    </div>
  )
}

function Wardrobe() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [category, setCategory] = useState('')
  const [color, setColor] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [toast, setToast] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

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
          setLoadError(errorMessage(err, 'Die Garderobe konnte nicht geladen werden.'))
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
  }, [refreshKey])

  useEffect(() => {
    if (!toast) {
      return undefined
    }
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const colors = useMemo(() => {
    const distinct = new Set(items.map((item) => item.color).filter(Boolean))
    return Array.from(distinct).sort((a, b) => a.localeCompare(b))
  }, [items])

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (category && item.category !== category) {
        return false
      }
      if (color && item.color !== color) {
        return false
      }
      return true
    })
  }, [items, category, color])

  function showToast(message, kind = 'success') {
    setToast({ message, kind })
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setFormOpen(true)
  }

  function handleSaved() {
    setFormOpen(false)
    setEditing(null)
    setRefreshKey((key) => key + 1)
    showToast('Kleidungsstück gespeichert.', 'success')
  }

  function requestDelete(item) {
    setDeleting(item)
  }

  async function confirmDelete() {
    const item = deleting
    if (!item) {
      return
    }
    try {
      await api.delete(`/items/${item.id}`)
      setDeleting(null)
      setRefreshKey((key) => key + 1)
      showToast('Kleidungsstück gelöscht.', 'success')
    } catch (err) {
      setDeleting(null)
      showToast(errorMessage(err, 'Löschen fehlgeschlagen.'), 'error')
    }
  }

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">Garderobe</h1>
        <p className="page__subtitle">Deine Kleidungsstücke auf einen Blick.</p>
      </header>

      {loading ? (
        <div className="wardrobe-grid" data-testid="wardrobe-loading">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="tile tile--skeleton" />
          ))}
        </div>
      ) : loadError ? (
        <div className="empty-state">
          <p className="empty-state__title">Fehler beim Laden</p>
          <p className="empty-state__text">{loadError}</p>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => setRefreshKey((key) => key + 1)}
          >
            Erneut versuchen
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <ImagePlaceholder />
          <p className="empty-state__title">Noch keine Kleidungsstücke</p>
          <p className="empty-state__text">Lege dein erstes Kleidungsstück an.</p>
          <button type="button" className="button button--secondary" onClick={openCreate}>
            Neu hinzufügen
          </button>
        </div>
      ) : (
        <>
          <FilterBar
            category={category}
            color={color}
            colors={colors}
            onCategoryChange={setCategory}
            onColorChange={setColor}
            onAdd={openCreate}
          />
          {filtered.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state__title">Keine Treffer</p>
              <p className="empty-state__text">Kein Kleidungsstück passt zu den gewählten Filtern.</p>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  setCategory('')
                  setColor('')
                }}
              >
                Filter zurücksetzen
              </button>
            </div>
          ) : (
            <div className="wardrobe-grid">
              {filtered.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onEdit={() => openEdit(item)}
                  onDelete={() => requestDelete(item)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {formOpen && <ItemForm item={editing} onSubmit={handleSaved} onCancel={() => setFormOpen(false)} />}
      {deleting && <ConfirmDialog item={deleting} onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />}
      {toast && <Toast message={toast.message} kind={toast.kind} />}
    </section>
  )
}

export default Wardrobe
