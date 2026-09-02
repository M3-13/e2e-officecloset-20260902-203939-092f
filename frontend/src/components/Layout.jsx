import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="nav" role="banner">
      <div className="nav__inner">
        <Link to="/wardrobe" className="nav__logo">
          Kleiderschrank
        </Link>
        <nav className="nav__links" aria-label="Hauptnavigation">
          <NavLink
            to="/wardrobe"
            className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`}
          >
            Garderobe
          </NavLink>
          <NavLink
            to="/outfits"
            className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`}
          >
            Outfits
          </NavLink>
          <NavLink
            to="/outfit-creator"
            className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`}
          >
            Outfit-Creator
          </NavLink>
        </nav>
        <div className="nav__actions">
          {user ? (
            <>
              <NavLink
                to="/account"
                className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`}
              >
                Konto
              </NavLink>
              <button type="button" className="nav__link nav__link--button" onClick={logout}>
                Abmelden
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`}
              >
                Anmelden
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`}
              >
                Registrieren
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer__inner">
        <span className="footer__brand">Kleiderschrank</span>
        <nav className="footer__links" aria-label="Rechtliches">
          <Link to="/impressum" className="footer__link">
            Impressum
          </Link>
          <Link to="/datenschutz" className="footer__link">
            Datenschutz
          </Link>
        </nav>
      </div>
    </footer>
  )
}

function Layout({ children }) {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-shell__main">{children}</main>
      <Footer />
    </div>
  )
}

export default Layout
