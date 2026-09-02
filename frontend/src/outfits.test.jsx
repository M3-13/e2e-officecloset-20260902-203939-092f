import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import OutfitCreator from './pages/OutfitCreator.jsx'
import Outfits from './pages/Outfits.jsx'

function createStorage() {
  const store = new Map()
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  }
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

function emptyResponse(status) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => '' },
    json: async () => null,
    text: async () => '',
  }
}

function blobResponse(status = 200) {
  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' })
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'image/jpeg' },
    json: async () => {
      throw new Error('no json body')
    },
    text: async () => '',
    blob: async () => blob,
  }
}

function installFetch(routes) {
  const fn = vi.fn(async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase()
    const path = String(url)
    for (const [key, handler] of Object.entries(routes)) {
      const [m, p] = key.split(' ')
      if (method === m && path.endsWith(p)) {
        return handler(options)
      }
    }
    throw new Error(`No fetch mock for ${method} ${path}`)
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

const items = [
  { id: 1, name: 'Rote Bluse', category: 'oberteil', color: 'rot', image_url: '/api/items/1/image' },
  { id: 2, name: 'Schwarze Hose', category: 'hose', color: 'schwarz', image_url: '/api/items/2/image' },
]

const outfit = { id: 10, name: 'Abend', items: [items[0], items[1]] }

function renderCreator(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/outfit-creator" element={<OutfitCreator />} />
        <Route path="/outfits" element={<div>Outfit-Liste</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function renderOutfits() {
  return render(
    <MemoryRouter initialEntries={['/outfits']}>
      <Routes>
        <Route path="/outfits" element={<Outfits />} />
        <Route path="/outfit-creator" element={<OutfitCreator />} />
      </Routes>
    </MemoryRouter>,
  )
}

// jsdom has no real createObjectURL/revokeObjectURL; keep stubs installed for the
// whole file so effect cleanups (which may run after afterEach restores globals)
// never throw.
URL.createObjectURL = vi.fn(() => 'blob:mock-url')
URL.revokeObjectURL = vi.fn()

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorage())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Outfit erstellen', () => {
  it('selects items, names the outfit and saves it', async () => {
    const posts = []
    installFetch({
      'GET /items': () => jsonResponse(200, items),
      'POST /outfits': (options) => {
        posts.push(JSON.parse(options.body))
        return jsonResponse(201, outfit)
      },
    })

    renderCreator('/outfit-creator')

    await waitFor(() => {
      expect(screen.getByText('Rote Bluse')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Rote Bluse/ }))
    fireEvent.click(screen.getByRole('button', { name: /Schwarze Hose/ }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Abend' } })
    fireEvent.click(screen.getByRole('button', { name: 'Outfit speichern' }))

    await waitFor(() => {
      expect(screen.getByText('Outfit-Liste')).toBeInTheDocument()
    })

    expect(posts).toEqual([{ name: 'Abend', item_ids: [1, 2] }])
  })

  it('refuses to save without a name or items', async () => {
    installFetch({
      'GET /items': () => jsonResponse(200, items),
    })

    renderCreator('/outfit-creator')

    await waitFor(() => {
      expect(screen.getByText('Rote Bluse')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Outfit speichern' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Bitte gib deinem Outfit einen Namen.',
      )
    })

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Abend' } })
    fireEvent.click(screen.getByRole('button', { name: 'Outfit speichern' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Wähle mindestens ein Kleidungsstück aus.',
      )
    })
  })
})

describe('Outfits anzeigen', () => {
  it('lists saved outfits with their item thumbnails', async () => {
    installFetch({
      'GET /outfits': () => jsonResponse(200, [outfit]),
      'GET /api/items/1/image': () => blobResponse(200),
      'GET /api/items/2/image': () => blobResponse(200),
    })

    renderOutfits()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Abend' })).toBeInTheDocument()
    })

    await waitFor(() => {
      const thumbnails = screen.getAllByRole('img')
      expect(thumbnails).toHaveLength(2)
      expect(thumbnails[0].tagName).toBe('IMG')
      expect(thumbnails[0]).toHaveAttribute('src', 'blob:mock-url')
      expect(thumbnails[1].tagName).toBe('IMG')
      expect(thumbnails[1]).toHaveAttribute('src', 'blob:mock-url')
    })
    expect(screen.getByText('2 Teile')).toBeInTheDocument()
  })

  it('shows an empty state when no outfits exist', async () => {
    installFetch({
      'GET /outfits': () => jsonResponse(200, []),
    })

    renderOutfits()

    await waitFor(() => {
      expect(screen.getByText('Noch keine Outfits')).toBeInTheDocument()
    })
  })
})

describe('Outfit bearbeiten', () => {
  it('loads an outfit and updates it', async () => {
    const patches = []
    installFetch({
      'GET /items': () => jsonResponse(200, items),
      'GET /outfits/10': () => jsonResponse(200, outfit),
      'PATCH /outfits/10': (options) => {
        patches.push(JSON.parse(options.body))
        return jsonResponse(200, { ...outfit, name: 'Neuer Name' })
      },
    })

    renderCreator('/outfit-creator?id=10')

    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toHaveValue('Abend')
    })

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Neuer Name' } })
    fireEvent.click(screen.getByRole('button', { name: 'Änderungen speichern' }))

    await waitFor(() => {
      expect(screen.getByText('Outfit-Liste')).toBeInTheDocument()
    })

    expect(patches).toEqual([{ name: 'Neuer Name', item_ids: [1, 2] }])
  })
})

describe('Outfit löschen', () => {
  it('deletes an outfit after confirmation', async () => {
    const deleted = []
    installFetch({
      'GET /outfits': () => jsonResponse(200, [outfit]),
      'DELETE /outfits/10': () => {
        deleted.push(10)
        return emptyResponse(204)
      },
    })

    renderOutfits()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Abend' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ja, löschen' }))

    await waitFor(() => {
      expect(deleted).toEqual([10])
    })

    expect(screen.queryByRole('heading', { name: 'Abend' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Outfit gelöscht.')
  })

  it('cancels deletion without removing the outfit', async () => {
    installFetch({
      'GET /outfits': () => jsonResponse(200, [outfit]),
    })

    renderOutfits()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Abend' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))

    expect(screen.getByRole('heading', { name: 'Abend' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ja, löschen' })).not.toBeInTheDocument()
  })
})
