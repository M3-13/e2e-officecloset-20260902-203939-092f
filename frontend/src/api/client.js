const API_BASE = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail || `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

function buildHeaders(headers = {}) {
  const result = { ...headers }
  const token = getToken()
  if (token) {
    result.Authorization = `Bearer ${token}`
  }
  return result
}

async function parseBody(response) {
  const contentType = response.headers.get('content-type') || ''
  if (response.status === 204) {
    return null
  }
  if (contentType.includes('application/json')) {
    return response.json()
  }
  return response.text()
}

export async function request(path, { method = 'GET', body, headers = {}, ...rest } = {}) {
  const options = {
    method,
    headers: buildHeaders(headers),
    ...rest,
  }

  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      options.body = body
    } else {
      options.headers['Content-Type'] = 'application/json'
      options.body = JSON.stringify(body)
    }
  }

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, options)
  } catch (error) {
    throw new ApiError(0, error.message || 'Netzwerkfehler')
  }

  const data = await parseBody(response)

  if (!response.ok) {
    const detail = typeof data === 'object' && data !== null ? data.detail : undefined
    throw new ApiError(response.status, detail || `Request failed with status ${response.status}`)
  }

  return data
}

export const api = {
  get(path) {
    return request(path)
  },
  post(path, body) {
    return request(path, { method: 'POST', body })
  },
  patch(path, body) {
    return request(path, { method: 'PATCH', body })
  },
  delete(path) {
    return request(path, { method: 'DELETE' })
  },
}

export default request
