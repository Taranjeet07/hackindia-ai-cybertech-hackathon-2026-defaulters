import React from 'react'

export const AboutSection: React.FC = () => {
  return (
    <section className="about-section" id="about">
      <div className="about-container">
        <div className="about-card">
          <div className="about-header">
            <span className="section-pill">MISSION & VISION</span>
            <h2 className="section-title">Why TrailSafe?</h2>
          </div>

          <p className="about-paragraph">
            Outdoor tourism presents unique safety vulnerabilities. Sudden weather shifts, confusing trail networks,
            and steep topography can rapidly escalate risk. Traditional response workflows are often reactive and delayed.
          </p>

          <p className="about-paragraph">
            <strong className="text-highlight">TrailSafe</strong> bridges this gap by marrying modern edge intelligence,
            simulated geofencing, and centralized authority triage. Our mission is simple: empower every traveler to explore
            the outdoors with confidence, backed by automated guardian technology.
          </p>

          <div className="about-feature-chips">
            <div className="chip">Simulated Edge Telemetry</div>
            <div className="chip">Zero-Configuration Onboarding</div>
            <div className="chip">Responder Command Integration</div>
            <div className="chip">Privacy-Focused Location Privacy</div>
          </div>
        </div>
      </div>
    </section>
  )
}
