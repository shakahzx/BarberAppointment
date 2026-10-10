import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ArrowUpRight, LogOut, Menu, Scissors, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import BookingAssistant from './BookingAssistant'

export default function SiteLayout() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  function signOut() {
    logout()
    setMenuOpen(false)
    navigate('/')
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <header className="site-header">
        <Link className="wordmark" to="/" onClick={closeMenu}><span className="brand-mark"><Scissors size={18} /></span><span>STILL<span className="wordmark-light"> / </span>FORM</span></Link>
        <button className="mobile-menu-button icon-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
        <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`}>
          <NavLink to="/services" onClick={closeMenu}>Services</NavLink>
          {user?.role === 'customer' && <><NavLink to="/appointments" onClick={closeMenu}>My appointments</NavLink><NavLink to="/profile" onClick={closeMenu}>Profile</NavLink></>}
          {user?.role === 'admin' && <NavLink to="/admin" onClick={closeMenu}>Dashboard</NavLink>}
          {user?.role === 'barber' && <NavLink to="/barber" onClick={closeMenu}>My schedule</NavLink>}
          <div className="nav-actions">
            {user ? <button className="text-action" onClick={signOut}><LogOut size={15} /> Sign out</button> : <><Link className="sign-in-link" to="/login" onClick={closeMenu}>Sign in</Link><Link className="button button-small" to="/book" onClick={closeMenu}>Book a visit <ArrowUpRight size={15} /></Link></>}
          </div>
        </nav>
      </header>
      <Outlet />
      {user?.role === 'customer' && <BookingAssistant />}
      <footer className="site-footer">
        <Link className="wordmark footer-mark" to="/"><span className="brand-mark"><Scissors size={17} /></span><span>STILL<span className="wordmark-light"> / </span>FORM</span></Link>
        <p>Considered cuts. Unhurried craft.</p>
        <a href="mailto:hello@stillform.barber">hello@stillform.barber <ArrowUpRight size={14} /></a>
      </footer>
    </>
  )
}