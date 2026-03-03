import { NavLink } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'
import Logo from '../ui/logo/Logo'

const Header = () => {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark')

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev
      localStorage.setItem('theme', next ? 'dark' : 'light')
      return next
    })
  }

  useEffect(() => {
    document.body.classList.toggle('dark', isDark)
  }, [isDark])

  return (
    <nav className="main-nav">
      <div className="main-nav__container">
        <NavLink to="/" className="main-nav__title">
          <Logo className="main-nav__image" />
          <span className="main-nav__text">PoGO Search Plus</span>
        </NavLink>

        <button
          type="button"
          className="main-nav__theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </nav>
  )
}

export default Header
