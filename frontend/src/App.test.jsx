import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import App from './App.jsx'

describe('App shell', () => {
  it('renders the navigation and footer links', () => {
    render(<App />)

    expect(
      screen.getByRole('navigation', { name: 'Hauptnavigation' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'Impressum' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Datenschutz' })).toBeInTheDocument()
  })

  it('redirects the root path to the login page', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Anmeldung' })).toBeInTheDocument()
  })
})
