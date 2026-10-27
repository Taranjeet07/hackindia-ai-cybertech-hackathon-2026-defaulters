import React from 'react'
import { RadarVisual } from './RadarVisual'

interface HeroProps {
  onExploreFeatures: () => void
  onViewOverview: () => void
}

export const Hero: React.FC<HeroProps> = ({ onExploreFeatures, onViewOverview }) => {
  return (
    <section className="hero-section" id="hero">
      <div className="hero-grid-container">
        {/* Left Column: Text & Actions */}
        <div className="hero-content">
          <div className="hero-label-badge">
            <span className="hero-label-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mini-icon">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </span>
            <span>SMART TOURIST SAFETY</span>
          </div>

          <h1 className="hero-heading">
            Explore Freely. <br />
            <span className="hero-heading-accent">Travel Safely.</span>
          </h1>

          <p className="hero-description">
            An intelligent tourist safety platform combining risk analysis, geofencing, and incident response in one unified system.
          </p>

          <div className="hero-actions">
            <button className="btn-primary" onClick={onExploreFeatures}>
              <span>Explore Safety Features</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>

            <button className="btn-secondary" onClick={onViewOverview}>
              <span>View System Overview</span>
            </button>
          </div>

          <div className="hero-metrics-strip">
            <div className="metric-item">
              <span className="metric-dot dot-teal"></span>
              <span className="metric-text">Proactive Hazard Detection</span>
            </div>
            <div className="metric-item">
              <span className="metric-dot dot-cyan"></span>
              <span className="metric-text">Rapid Response Readiness</span>
            </div>
          </div>
        </div>

        {/* Right Column: Radar Graphic */}
        <div className="hero-visual-col">
          <RadarVisual />
        </div>
      </div>
    </section>
  )
}
