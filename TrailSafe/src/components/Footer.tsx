import React from 'react'

export const Footer: React.FC = () => {
  return (
    <footer className="footer-container">
      <div className="footer-content">
        <div className="footer-brand-col">
          <div className="footer-brand">
            <div className="footer-logo-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="footer-shield"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <circle cx="12" cy="11" r="3" />
              </svg>
            </div>
            <span className="footer-brand-title">
              Trail<span className="brand-accent">Safe</span>
            </span>
          </div>
          <p className="footer-tagline">Explore Freely. Travel Safely.</p>
        </div>

        <div className="footer-nav-col">
          <span className="footer-col-title">Navigation</span>
          <a href="#hero" className="footer-link">Back to Top</a>
          <a href="#overview" className="footer-link">Overview</a>
          <a href="#features" className="footer-link">Features</a>
          <a href="#about" className="footer-link">About</a>
        </div>

        <div className="footer-status-col">
          <span className="footer-col-title">Prototype Status</span>
          <div className="footer-status-badge">
            <span className="badge-pulse-dot"></span>
            Active Milestone 2 • UI Preview
          </div>
        </div>
      </div>

      <div className="footer-disclaimer-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="disclaimer-icon">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="footer-disclaimer-text">
          Hackathon prototype. Locations, incidents, and responder actions are simulated. Not connected to real emergency services.
        </p>
      </div>

      <div className="footer-bottom">
        <p>© 2026 TrailSafe — AI-Powered Smart Tourist Safety System</p>
      </div>
    </footer>
  )
}
