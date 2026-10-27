import React from 'react'

interface FeatureCardsProps {
  onOpenCardAction: (featureKey: 'tourist' | 'authority', title: string, description: string) => void
  onOpenTouristApp?: () => void
  onOpenAuthorityDashboard?: () => void
}

export const FeatureCards: React.FC<FeatureCardsProps> = ({
  onOpenCardAction,
  onOpenTouristApp,
  onOpenAuthorityDashboard,
}) => {
  return (
    <section className="feature-cards-section" id="overview">
      <div className="section-header-block">
        <div className="section-pill">SYSTEM ARCHITECTURE</div>
        <h2 className="section-title">Designed for Travelers and Responders</h2>
        <p className="section-subtitle">
          TrailSafe unifies traveler peace of mind with operational visibility for park rangers and emergency coordination teams.
        </p>
      </div>

      <div className="cards-grid">
        {/* Card A: Tourist Safety */}
        <div className="feature-card card-tourist">
          <div className="card-top-bar">
            <div className="card-icon-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="card-icon">
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span className="card-meta-tag">TRAVELER COMPANION</span>
          </div>

          <h3 className="card-title">Tourist Safety</h3>
          <p className="card-description">
            A dedicated interface for trip monitoring, simulated location updates, safety alerts, and emergency SOS.
          </p>

          <div className="card-highlights-list">
            <div className="card-pill-item">Live Location Check-ins</div>
            <div className="card-pill-item">Automated Danger Alerts</div>
            <div className="card-pill-item">1-Tap Emergency Signal</div>
          </div>

          <div className="card-footer">
            <button
              className="card-action-btn"
              onClick={() => {
                if (onOpenTouristApp) {
                  onOpenTouristApp()
                } else {
                  onOpenCardAction(
                    'tourist',
                    'Tourist Safety Interface',
                    'A dedicated interface for trip monitoring, simulated location updates, safety alerts, and emergency SOS.'
                  )
                }
              }}
            >
              <span>Tourist App</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-arrow-icon">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <span className="card-subnote active-subnote">Interactive Prototype</span>
          </div>
        </div>

        {/* Card B: Authority Dashboard */}
        <div className="feature-card card-authority">
          <div className="card-top-bar">
            <div className="card-icon-badge authority-accent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="card-icon">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <span className="card-meta-tag authority-tag">COMMAND CENTER</span>
          </div>

          <h3 className="card-title">Authority Dashboard</h3>
          <p className="card-description">
            A centralized interface for incident prioritization, risk explanations, and simulated responder coordination.
          </p>

          <div className="card-highlights-list">
            <div className="card-pill-item">Triage & Prioritization</div>
            <div className="card-pill-item">AI Incident Summaries</div>
            <div className="card-pill-item">Responder Deployment Simulation</div>
          </div>

          <div className="card-footer">
            <button
              className="card-action-btn authority-btn"
              onClick={() => {
                if (onOpenAuthorityDashboard) {
                  onOpenAuthorityDashboard()
                } else {
                  onOpenCardAction(
                    'authority',
                    'Authority Dashboard',
                    'A centralized interface for incident prioritization, risk explanations, and simulated responder coordination.'
                  )
                }
              }}
            >
              <span>Authority Dashboard</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-arrow-icon">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <span className="card-subnote active-subnote">Live Control Room</span>
          </div>
        </div>
      </div>
    </section>
  )
}
