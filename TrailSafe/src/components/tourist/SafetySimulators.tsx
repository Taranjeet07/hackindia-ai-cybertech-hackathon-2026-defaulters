import React from 'react'

interface SafetySimulatorsProps {
  onSimulateRiskyZone: () => void
  onSimulateRouteDeviation: () => void
  onSimulateInactivity?: () => void
  onResetDemo: () => void
}

export const SafetySimulators: React.FC<SafetySimulatorsProps> = ({
  onSimulateRiskyZone,
  onSimulateRouteDeviation,
  onSimulateInactivity,
  onResetDemo,
}) => {
  return (
    <div className="tourist-card simulators-card">
      <div className="card-header-bar">
        <h3 className="card-section-title">Safety Incident Simulators</h3>
        <span className="card-subnote">Test Autonomous Alerts</span>
      </div>

      <p className="simulators-intro">
        Trigger simulated geofencing events to verify system alert creation and severity categorization:
      </p>

      <div className="simulator-buttons-grid">
        <button
          className="btn-sim btn-sim-hazard"
          onClick={onSimulateRiskyZone}
        >
          <div className="sim-btn-content">
            <div className="sim-icon-box hazard-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sim-svg">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="sim-text-block">
              <span className="sim-title">Simulate Risky-Zone Entry</span>
              <span className="sim-desc">Breach simulated hazardous canal zone</span>
            </div>
          </div>
        </button>

        <button
          className="btn-sim btn-sim-deviation"
          onClick={onSimulateRouteDeviation}
        >
          <div className="sim-btn-content">
            <div className="sim-icon-box deviation-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sim-svg">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <div className="sim-text-block">
              <span className="sim-title">Simulate Route Deviation</span>
              <span className="sim-desc">Drift off planned tourist trail path</span>
            </div>
          </div>
        </button>

        {onSimulateInactivity && (
          <button
            className="btn-sim btn-sim-inactivity"
            onClick={onSimulateInactivity}
          >
            <div className="sim-btn-content">
              <div className="sim-icon-box inactivity-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sim-svg">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="sim-text-block">
                <span className="sim-title">Simulate Inactivity Warning</span>
                <span className="sim-desc">Extended stationary dwell (45 min)</span>
              </div>
            </div>
          </button>
        )}

        <button
          className="btn-sim btn-sim-reset"
          onClick={onResetDemo}
        >
          <div className="sim-btn-content">
            <div className="sim-icon-box reset-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sim-svg">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
            </div>
            <div className="sim-text-block">
              <span className="sim-title">Reset Demo</span>
              <span className="sim-desc">Restore initial state and clear alerts</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
