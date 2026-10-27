import React, { useState } from 'react'

interface NavbarProps {
  onOpenTouristApp?: () => void
  onOpenAuthorityDashboard?: () => void
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenTouristApp,
  onOpenAuthorityDashboard,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        {/* Brand */}
        <a href="#" className="nav-brand" onClick={closeMobileMenu}>
          <div className="brand-logo-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shield-icon"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <circle cx="12" cy="11" r="3" />
            </svg>
          </div>
          <span className="brand-name">
            Trail<span className="brand-accent">Safe</span>
          </span>
        </a>

        {/* Prototype Badge */}
        <div className="nav-badge-container">
          <span className="nav-status-badge">
            <span className="badge-pulse-dot"></span>
            PROTOTYPE
          </span>
        </div>

        {/* Desktop Links */}
        <nav className="nav-links-desktop" aria-label="Main Navigation">
          <a href="#overview" className="nav-link">Overview</a>
          <a href="#features" className="nav-link">Features</a>
          <a href="#about" className="nav-link">About</a>
          {onOpenTouristApp && (
            <button
              className="nav-btn-tourist"
              onClick={() => {
                closeMobileMenu()
                onOpenTouristApp()
              }}
            >
              Tourist App Demo
            </button>
          )}
          {onOpenAuthorityDashboard && (
            <button
              className="nav-btn-authority"
              onClick={() => {
                closeMobileMenu()
                onOpenAuthorityDashboard()
              }}
            >
              Authority Dashboard
            </button>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="mobile-toggle-btn"
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="toggle-icon">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="toggle-icon">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-menu-drawer">
          <nav className="mobile-nav-links" aria-label="Mobile Navigation">
            <a href="#overview" className="mobile-nav-link" onClick={closeMobileMenu}>
              Overview
            </a>
            <a href="#features" className="mobile-nav-link" onClick={closeMobileMenu}>
              Features
            </a>
            <a href="#about" className="mobile-nav-link" onClick={closeMobileMenu}>
              About
            </a>
            {onOpenTouristApp && (
              <button
                className="mobile-nav-link mobile-nav-btn"
                onClick={() => {
                  closeMobileMenu()
                  onOpenTouristApp()
                }}
              >
                Tourist App Demo →
              </button>
            )}
            {onOpenAuthorityDashboard && (
              <button
                className="mobile-nav-link mobile-nav-btn mobile-authority-btn"
                onClick={() => {
                  closeMobileMenu()
                  onOpenAuthorityDashboard()
                }}
              >
                Authority Dashboard →
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
