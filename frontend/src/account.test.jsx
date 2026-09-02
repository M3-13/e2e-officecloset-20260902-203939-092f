import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import Account from './pages/Account.jsx'

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

const authUser = { id: 1, email: 'a@example.com' }

function AccountApp({ initialEntries = ['/account'] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route path="/account" element={<Account />} />
          <Route path="/register" element={<div>Registrierungs-Inhalt</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorage())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('account page', () => {
  it('shows the signed-in user email address', async () => {
    localStorage.setItem('token', 'tok-1')
    installFetch({
      'GET /auth/me': () => jsonResponse(200, authUser),
    })

    render(<AccountApp />)

    await waitFor(() => {
      expect(screen.getByText('a@example.com')).toBeInTheDocument()
    })
  })

  it('deletes the account, signs out and redirects to registration', async () => {
    localStorage.setItem('token', 'tok-1')
    const fetchMock = installFetch({
      'GET /auth/me': () => jsonResponse(200, authUser),
      'DELETE /account': () => emptyResponse(204),
      'POST /auth/logout': () => emptyResponse(204),
    })

    render(<AccountApp />)

    await waitFor(() => {
      expect(screen.getByText('a@example.com')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Konto löschen' }))

    fireEvent.change(screen.getByLabelText(/LÖSCHEN/), {
      target: { value: 'LÖSCHEN' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Endgültig löschen' }))

    await waitFor(() => {
      expect(screen.getByText('Registrierungs-Inhalt')).toBeInTheDocument()
    })

    expect(localStorage.getItem('token')).toBeNull()

    const deleteCall = fetchMock.mock.calls.find(
      ([, options]) => (options.method || 'GET').toUpperCase() === 'DELETE',
    )
    expect(deleteCall).toBeTruthy()
    expect(String(deleteCall[0])).toContain('/api/account')
  })

  it('keeps the session and shows an error when deletion fails', async () => {
    localStorage.setItem('token', 'tok-1')
    installFetch({
      'GET /auth/me': () => jsonResponse(200, authUser),
      'DELETE /account': () =>
        jsonResponse(500, { detail: 'Interner Serverfehler.' }),
    })

    render(<AccountApp />)

    await waitFor(() => {
      expect(screen.getByText('a@example.com')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Konto löschen' }))

    fireEvent.change(screen.getByLabelText(/LÖSCHEN/), {
      target: { value: 'LÖSCHEN' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Endgültig löschen' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Interner Serverfehler.')
    })

    expect(localStorage.getItem('token')).toBe('tok-1')
  })
})
