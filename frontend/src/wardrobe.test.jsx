import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import Wardrobe from './pages/Wardrobe.jsx'

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

function itemIdFromPath(path) {
  const match = /\/api\/items\/(\d+)$/.exec(path)
  return match ? Number(match[1]) : null
}

function installFetch(handlers) {
  const fn = vi.fn(async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase()
    const path = String(url)

    if (/\/api\/items\/\d+\/image(\?.*)?$/.test(path)) {
      return handlers.image ? handlers.image({ path }) : blobResponse(200)
    }
    if (method === 'GET' && path === '/api/items') {
      return handlers.list ? handlers.list() : jsonResponse(200, [])
    }
    if (method === 'POST' && path === '/api/items') {
      return handlers.create ? handlers.create({ body: options.body }) : jsonResponse(201, {})
    }
    if (method === 'PATCH' && /\/api\/items\/\d+$/.test(path)) {
      return handlers.patch
        ? handlers.patch({ path, body: options.body })
        : jsonResponse(200, {})
    }
    if (method === 'DELETE' && /\/api\/items\/\d+$/.test(path)) {
      return handlers.delete ? handlers.delete({ path }) : emptyResponse(204)
    }
    throw new Error(`No fetch mock for ${method} ${path}`)
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

const baseItems = [
  { id: 1, name: 'Rotes Kleid', category: 'kleid', color: 'rot', image_url: '/api/items/1/image' },
  { id: 2, name: 'Blaue Hose', category: 'hose', color: 'blau', image_url: '/api/items/2/image' },
  { id: 3, name: 'Grünes Oberteil', category: 'oberteil', color: 'grün', image_url: '/api/items/3/image' },
  { id: 4, name: 'Schwarze Hose', category: 'hose', color: 'schwarz', image_url: '/api/items/4/image' },
]

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

describe('Wardrobe – Anzeige', () => {
  it('renders the stored items with their images', async () => {
    installFetch({ list: () => jsonResponse(200, baseItems) })

    render(<Wardrobe />)

    await waitFor(() => {
      expect(screen.getByText('Rotes Kleid')).toBeInTheDocument()
    })
    expect(screen.getByText('Blaue Hose')).toBeInTheDocument()
    expect(screen.getByText('Grünes Oberteil')).toBeInTheDocument()
    expect(screen.getByText('Schwarze Hose')).toBeInTheDocument()

    const image = await screen.findByAltText('Rotes Kleid')
    expect(image).toHaveAttribute('src', 'blob:mock-url')

    expect(screen.getByText('Kleid · rot')).toBeInTheDocument()
    expect(screen.getByText('Hose · blau')).toBeInTheDocument()
  })

  it('shows an empty state when the wardrobe is empty', async () => {
    installFetch({ list: () => jsonResponse(200, []) })

    render(<Wardrobe />)

    await waitFor(() => {
      expect(screen.getByText('Noch keine Kleidungsstücke')).toBeInTheDocument()
    })
  })

  it('shows a readable error when loading fails', async () => {
    installFetch({
      list: () => jsonResponse(401, { detail: 'Nicht angemeldet.' }),
    })

    render(<Wardrobe />)

    await waitFor(() => {
      expect(screen.getByText('Fehler beim Laden')).toBeInTheDocument()
    })
    expect(screen.getByText('Nicht angemeldet.')).toBeInTheDocument()
  })
})

describe('Wardrobe – Filter', () => {
  it('filters by category', async () => {
    installFetch({ list: () => jsonResponse(200, baseItems) })

    render(<Wardrobe />)
    await waitFor(() => {
      expect(screen.getByText('Rotes Kleid')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Hose' }))

    expect(screen.getByText('Blaue Hose')).toBeInTheDocument()
    expect(screen.getByText('Schwarze Hose')).toBeInTheDocument()
    expect(screen.queryByText('Rotes Kleid')).not.toBeInTheDocument()
    expect(screen.queryByText('Grünes Oberteil')).not.toBeInTheDocument()
  })

  it('filters by color', async () => {
    installFetch({ list: () => jsonResponse(200, baseItems) })

    render(<Wardrobe />)
    await waitFor(() => {
      expect(screen.getByText('Rotes Kleid')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'rot' }))

    expect(screen.getByText('Rotes Kleid')).toBeInTheDocument()
    expect(screen.queryByText('Blaue Hose')).not.toBeInTheDocument()
  })
})

describe('Wardrobe – Bearbeiten', () => {
  it('edits an existing item and refreshes the list', async () => {
    let items = [...baseItems]
    installFetch({
      list: () => jsonResponse(200, items),
      patch: ({ path, body }) => {
        const id = itemIdFromPath(path)
        const updated = { ...items.find((item) => item.id === id), name: body.get('name') }
        items = items.map((item) => (item.id === id ? updated : item))
        return jsonResponse(200, updated)
      },
    })

    render(<Wardrobe />)
    await waitFor(() => {
      expect(screen.getByText('Rotes Kleid')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Rotes Kleid bearbeiten' }))

    const nameInput = await screen.findByLabelText('Name')
    fireEvent.change(nameInput, { target: { value: 'Rotes Abendkleid' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      expect(screen.getByText('Rotes Abendkleid')).toBeInTheDocument()
    })
    expect(screen.getByText('Kleidungsstück gespeichert.')).toBeInTheDocument()
    expect(screen.queryByText('Rotes Kleid')).not.toBeInTheDocument()
  })

  it('re-fetches the image after editing with a new image', async () => {
    let items = [...baseItems]
    let imageCalls = 0
    installFetch({
      list: () => jsonResponse(200, items),
      patch: ({ path, body }) => {
        const id = itemIdFromPath(path)
        const updated = { ...items.find((item) => item.id === id), name: body.get('name') }
        items = items.map((item) => (item.id === id ? updated : item))
        return jsonResponse(200, updated)
      },
      image: () => {
        imageCalls += 1
        return blobResponse(200)
      },
    })

    render(<Wardrobe />)
    await waitFor(() => {
      expect(screen.getByText('Rotes Kleid')).toBeInTheDocument()
    })
    expect(imageCalls).toBe(baseItems.length)

    fireEvent.click(screen.getByRole('button', { name: 'Rotes Kleid bearbeiten' }))
    const nameInput = await screen.findByLabelText('Name')
    fireEvent.change(nameInput, { target: { value: 'Rotes Abendkleid' } })
    const file = new File(['new-image'], 'new.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('Bild', { selector: 'input' }), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      expect(screen.getByText('Rotes Abendkleid')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(imageCalls).toBe(baseItems.length + 1)
    })
  })
})

describe('Wardrobe – Löschen', () => {
  it('asks for confirmation and removes the item', async () => {
    let items = [...baseItems]
    installFetch({
      list: () => jsonResponse(200, items),
      delete: ({ path }) => {
        const id = itemIdFromPath(path)
        items = items.filter((item) => item.id !== id)
        return emptyResponse(204)
      },
    })

    render(<Wardrobe />)
    await waitFor(() => {
      expect(screen.getByText('Rotes Kleid')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Rotes Kleid löschen' }))

    expect(screen.getByText('Löschen bestätigen')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ja, löschen' }))

    await waitFor(() => {
      expect(screen.queryByText('Rotes Kleid')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Kleidungsstück gelöscht.')).toBeInTheDocument()
  })

  it('cancelling the confirmation keeps the item', async () => {
    installFetch({
      list: () => jsonResponse(200, baseItems),
      delete: () => emptyResponse(204),
    })

    render(<Wardrobe />)
    await waitFor(() => {
      expect(screen.getByText('Rotes Kleid')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Rotes Kleid löschen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))

    expect(screen.getByText('Rotes Kleid')).toBeInTheDocument()
  })
})

describe('Wardrobe – Anlegen', () => {
  it('creates a new item with a multipart upload', async () => {
    let items = [...baseItems]
    const createdItem = {
      id: 5,
      name: 'Goldene Schuhe',
      category: 'schuhe',
      color: 'gold',
      image_url: '/api/items/5/image',
    }
    installFetch({
      list: () => jsonResponse(200, items),
      create: ({ body }) => {
        const name = body.get('name')
        const category = body.get('category')
        const color = body.get('color')
        expect(body.get('image')).toBeInstanceOf(File)
        items = [...items, { ...createdItem, name, category, color }]
        return jsonResponse(201, createdItem)
      },
    })

    render(<Wardrobe />)
    await waitFor(() => {
      expect(screen.getByText('Rotes Kleid')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Neu hinzufügen' }))

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Goldene Schuhe' },
    })
    fireEvent.change(screen.getByLabelText('Kategorie', { selector: 'select' }), {
      target: { value: 'schuhe' },
    })
    fireEvent.change(screen.getByLabelText('Farbe', { selector: 'input' }), {
      target: { value: 'gold' },
    })
    const file = new File(['image-bytes'], 'shoes.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('Bild'), { target: { files: [file] } })

    fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }))

    await waitFor(() => {
      expect(screen.getByText('Goldene Schuhe')).toBeInTheDocument()
    })
  })

  it('rejects an unsupported image format client-side', async () => {
    installFetch({ list: () => jsonResponse(200, baseItems) })

    render(<Wardrobe />)
    await waitFor(() => {
      expect(screen.getByText('Rotes Kleid')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Neu hinzufügen' }))

    const file = new File(['gif-bytes'], 'picture.gif', { type: 'image/gif' })
    fireEvent.change(screen.getByLabelText('Bild'), { target: { files: [file] } })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ungültiges Bildformat. Erlaubt sind JPEG, PNG oder WebP.',
    )
  })
})
