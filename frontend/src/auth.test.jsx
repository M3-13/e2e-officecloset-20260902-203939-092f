import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'

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

function AuthProbe({ onReady }) {
  const auth = useAuth()
  if (onReady) {
    onReady(auth)
  }
  return (
    <div>
      <span data-testid="user">{auth.user ? auth.user.email : 'none'}</span>
      <span data-testid="token">{auth.token || 'none'}</span>
      <span data-testid="loading">{auth.isLoading ? 'loading' : 'ready'}</span>
    </div>
  )
}

function AuthApp({ children, initialEntries = ['/'] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>{children}</AuthProvider>
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

describe('login', () => {
  it('signs in and navigates to the wardrobe', async () => {
    installFetch({
      'POST /auth/login': () =>
        jsonResponse(200, {
          access_token: 'tok-1',
          token_type: 'bearer',
          user: authUser,
        }),
    })

    render(
      <AuthApp initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/wardrobe" element={<div>Garderoben-Inhalt</div>} />
        </Routes>
      </AuthApp>,
    )

    fireEvent.change(screen.getByLabelText('E-Mail'), {
      target: { value: 'a@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Passwort'), {
      target: { value: 'secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }))

    await waitFor(() => {
      expect(screen.getByText('Garderoben-Inhalt')).toBeInTheDocument()
    })
    expect(localStorage.getItem('token')).toBe('tok-1')
  })

  it('shows an error on invalid credentials', async () => {
    installFetch({
      'POST /auth/login': () =>
        jsonResponse(401, { detail: 'Ungültige E-Mail oder Passwort.' }),
    })

    render(
      <AuthApp initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/wardrobe" element={<div>Garderoben-Inhalt</div>} />
        </Routes>
      </AuthApp>,
    )

    fireEvent.change(screen.getByLabelText('E-Mail'), {
      target: { value: 'a@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Passwort'), {
      target: { value: 'wrong' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Ungültige E-Mail oder Passwort.',
      )
    })
  })
})

describe('register', () => {
  it('registers and signs the user in automatically', async () => {
    installFetch({
      'POST /auth/register': () =>
        jsonResponse(201, {
          access_token: 'tok-2',
          token_type: 'bearer',
          user: { id: 2, email: 'b@example.com' },
        }),
    })

    render(
      <AuthApp initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/wardrobe" element={<div>Garderoben-Inhalt</div>} />
        </Routes>
      </AuthApp>,
    )

    fireEvent.change(screen.getByLabelText('E-Mail'), {
      target: { value: 'b@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Passwort'), {
      target: { value: 'secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Registrieren' }))

    await waitFor(() => {
      expect(screen.getByText('Garderoben-Inhalt')).toBeInTheDocument()
    })
    expect(localStorage.getItem('token')).toBe('tok-2')
  })

  it('shows an error when the email is already taken', async () => {
    installFetch({
      'POST /auth/register': () =>
        jsonResponse(409, { detail: 'E-Mail ist bereits registriert.' }),
    })

    render(
      <AuthApp initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/wardrobe" element={<div>Garderoben-Inhalt</div>} />
        </Routes>
      </AuthApp>,
    )

    fireEvent.change(screen.getByLabelText('E-Mail'), {
      target: { value: 'b@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Passwort'), {
      target: { value: 'secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Registrieren' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'E-Mail ist bereits registriert.',
      )
    })
  })
})

describe('route protection', () => {
  it('redirects to login when not authenticated', async () => {
    render(
      <AuthApp initialEntries={['/wardrobe']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/wardrobe"
            element={
              <ProtectedRoute>
                <div>Geschützter Inhalt</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthApp>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Anmeldung' })).toBeInTheDocument()
    })
    expect(screen.queryByText('Geschützter Inhalt')).not.toBeInTheDocument()
  })

  it('shows protected content when a valid token is present', async () => {
    localStorage.setItem('token', 'tok-3')
    installFetch({
      'GET /auth/me': () => jsonResponse(200, authUser),
    })

    render(
      <AuthApp initialEntries={['/wardrobe']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/wardrobe"
            element={
              <ProtectedRoute>
                <div>Geschützter Inhalt</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthApp>,
    )

    await waitFor(() => {
      expect(screen.getByText('Geschützter Inhalt')).toBeInTheDocument()
    })
  })
})

describe('AuthContext', () => {
  it('restores the user from /auth/me on load', async () => {
    localStorage.setItem('token', 'tok-4')
    installFetch({
      'GET /auth/me': () => jsonResponse(200, authUser),
    })

    render(
      <AuthApp>
        <AuthProbe />
      </AuthApp>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('a@example.com')
    })
    expect(screen.getByTestId('token')).toHaveTextContent('tok-4')
    expect(screen.getByTestId('loading')).toHaveTextContent('ready')
  })

  it('clears an invalid token and signs out', async () => {
    localStorage.setItem('token', 'expired')
    installFetch({
      'GET /auth/me': () => jsonResponse(401, { detail: 'Ungültiger Token.' }),
    })

    render(
      <AuthApp>
        <AuthProbe />
      </AuthApp>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('none')
    })
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('logout clears the local session', async () => {
    localStorage.setItem('token', 'tok-5')
    installFetch({
      'GET /auth/me': () => jsonResponse(200, authUser),
      'POST /auth/logout': () => emptyResponse(204),
    })

    let auth
    render(
      <AuthApp>
        <AuthProbe onReady={(value) => (auth = value)} />
      </AuthApp>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('a@example.com')
    })

    await act(async () => {
      await auth.logout()
    })

    expect(localStorage.getItem('token')).toBeNull()
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })
})
