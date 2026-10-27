import React from 'react'

export const FeatureHighlights: React.FC = () => {
  const highlights = [
    {
      id: 'risk-analysis',
      title: 'AI-Assisted Risk Analysis',
      tag: 'PREDICTIVE SAFETY',
      description:
        'Continuously processes environmental terrain data, weather telemetry, and historical incident patterns to generate dynamic risk ratings and smart advisories before accidents occur.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="highlight-svg">
          <path d="M12 2v4" />
          <path d="m4.93 4.93 2.83 2.83" />
          <path d="M2 12h4" />
          <path d="m4.93 19.07 2.83-2.83" />
          <path d="M12 18v4" />
          <path d="m16.24 16.24 2.83 2.83" />
          <path d="M18 12h4" />
          <path d="m16.24 7.76 2.83-2.83" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
    {
      id: 'smart-geofencing',
      title: 'Smart Geofencing',
      tag: 'BOUNDARY MONITORING',
      description:
        'Establishes intelligent virtual safety zones around marked trails. Travelers and park authorities receive immediate alerts if individuals wander into hazardous or restricted off-trail territory.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="highlight-svg">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      ),
    },
    {
      id: 'emergency-sos',
      title: 'Emergency SOS',
      tag: 'CRITICAL RESPONSE',
      description:
        'A single-click distress beacon that immediately packages precise GPS coordinates, battery level, and user health indicators for high-priority dispatch and rapid responder triage.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="highlight-svg sos-accent">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
  ]

  return (
    <section className="highlights-section" id="features">
      <div className="section-header-block">
        <div className="section-pill">INTELLIGENT SAFEGUARDS</div>
        <h2 className="section-title">Core Safety Technologies</h2>
        <p className="section-subtitle">
          Engineered to protect adventurers on remote trails through automated danger detection and instant responder coordination.
        </p>
      </div>

      <div className="highlights-grid">
        {highlights.map((item) => (
          <div key={item.id} className="highlight-card">
            <div className="highlight-icon-box">{item.icon}</div>
            <span className="highlight-tag">{item.tag}</span>
            <h3 className="highlight-title">{item.title}</h3>
            <p className="highlight-description">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
