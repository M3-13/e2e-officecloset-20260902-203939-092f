import { useEffect, useState } from 'react'
import { getToken } from '../api/client.js'

function PlaceholderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="32"
      height="32"
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
    >
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM8.5 13.5l2 2.5 3-4 4 6H7l1.5-4.5z" />
    </svg>
  )
}

function AuthImage({ imageUrl, alt, className = '', title }) {
  const [objectUrl, setObjectUrl] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    let createdUrl = null

    setObjectUrl(null)
    setFailed(false)

    async function loadImage() {
      if (!imageUrl) {
        if (!cancelled) {
          setFailed(true)
        }
        return
      }

      try {
        const token = getToken()
        const headers = {}
        if (token) {
          headers.Authorization = `Bearer ${token}`
        }
        const response = await fetch(imageUrl, { headers })
        if (!response.ok) {
          throw new Error(`Bild konnte nicht geladen werden (${response.status}).`)
        }
        const blob = await response.blob()
        if (cancelled) {
          return
        }
        createdUrl = URL.createObjectURL(blob)
        setObjectUrl(createdUrl)
      } catch {
        if (!cancelled) {
          setFailed(true)
        }
      }
    }

    loadImage()

    return () => {
      cancelled = true
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl)
      }
    }
  }, [imageUrl])

  if (objectUrl) {
    return <img className={className} src={objectUrl} alt={alt} title={title ?? alt} />
  }

  return (
    <div
      className={className}
      role="img"
      aria-label={alt}
      title={title ?? alt}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-muted)',
        ...(className ? {} : { width: '100%', height: '100%' }),
      }}
    >
      {failed && <PlaceholderIcon />}
    </div>
  )
}

export default AuthImage
