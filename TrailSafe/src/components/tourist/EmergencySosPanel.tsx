import React from 'react'
import type { SavedIncident } from './types'

interface EmergencySosPanelProps {
  isSosActive: boolean
  isLoading?: boolean
  backendIncident?: SavedIncident | null
  backendError?: string | null
  isDuplicateSos?: boolean
  isClosingIncident?: boolean
  onTriggerSosClick: () => void
  onDismissSos: () => void
  onCloseIncident?: () => void
  onClearError?: () => void
}

export const EmergencySosPanel: React.FC<EmergencySosPanelProps> = ({
  isSosActive,
  isLoading = false,
  backendIncident = null,
  backendError = null,
  isDuplicateSos = false,
  isClosingIncident = false,
  onTriggerSosClick,
  onDismissSos,
  onCloseIncident,
  onClearError,
}) => {
  return (
    <div className={`tourist-card sos-panel-card ${isSosActive ? 'sos-card-active' : ''}`}>
      <div className="card-header-bar">
        <h3 className="card-section-title">Emergency Response</h3>
        <span className="card-subnote">Simulated Distress Signal</span>
      </div>

      {backendError && (
        <div className="sos-error-alert-banner">
          <div className="sos-error-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="error-svg">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="sos-error-body">
            <h5 className="sos-error-title">Backend Connection Error</h5>
            <p className="sos-error-desc">{backendError}</p>
          </div>
          {onClearError && (
            <button className="sos-error-dismiss" onClick={onClearError} title="Dismiss error">
              ✕
            </button>
          )}
        </div>
      )}

      {/* Display saved backend incident record prominently */}
      {backendIncident && (
        <div className="sos-backend-success-card" data-testid="sos-success-card">
          <div className={`backend-success-header ${isDuplicateSos ? 'header-duplicate-notice' : ''}`}>
            {isDuplicateSos ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="check-svg text-amber">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div className="header-text-group">
                  <span className="success-text text-amber">An SOS incident is already open</span>
                  <span className="header-subtext">Existing open record returned; no duplicate row created</span>
                </div>
                <span className="header-status-pill header-status-open">ACTIVE SOS</span>
              </>
            ) : backendIncident.status === 'CLOSED' ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="check-svg text-teal">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <div className="header-text-group">
                  <span className="success-text text-teal">Incident safely resolved and closed</span>
                  <span className="header-subtext">Record preserved in SQLite with status CLOSED</span>
                </div>
                <span className="header-status-pill header-status-closed">CLOSED</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="check-svg">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <div className="header-text-group">
                  <span className="success-text">SOS incident recorded successfully</span>
                  <span className="header-subtext">New incident row inserted into SQLite database</span>
                </div>
                <span className="header-status-pill header-status-open">OPEN</span>
              </>
            )}
          </div>

          <div className="backend-incident-meta-grid">
            <div className="meta-box">
              <span className="meta-label">Incident ID</span>
              <span className="meta-value-id">{backendIncident.id}</span>
            </div>

            <div className="meta-box">
              <span className="meta-label">Status</span>
              <span
                className={`meta-value-status ${
                  backendIncident.status === 'CLOSED'
                    ? 'text-dim'
                    : backendIncident.status === 'OPEN'
                    ? 'text-red'
                    : 'text-emerald'
                }`}
              >
                {backendIncident.status}
              </span>
            </div>

            <div className="meta-box">
              <span className="meta-label">Risk score</span>
              <span className="meta-value-danger">{backendIncident.risk_score}</span>
            </div>

            <div className="meta-box">
              <span className="meta-label">Tourist ID</span>
              <span className="meta-value-tourist">{backendIncident.tourist_id}</span>
            </div>
          </div>

          {backendIncident.status !== 'CLOSED' && onCloseIncident && (
            <div className="incident-lifecycle-bar">
              <button
                className="btn-close-incident"
                onClick={onCloseIncident}
                disabled={isClosingIncident}
                title="Mark this incident as CLOSED in SQLite database"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon-svg">
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <span>{isClosingIncident ? 'Closing Incident...' : 'Close / Resolve SOS Incident'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {isSosActive && (
        <div className="sos-active-banner" style={{ marginBottom: '1.25rem' }}>
          <div className="sos-active-header">
            <span className="sos-live-beacon">
              <span className="beacon-ring"></span>
              <span className="beacon-core"></span>
            </span>
            <div className="sos-active-text">
              <h4 className="sos-active-title">SIMULATED SOS BEACON ACTIVE</h4>
              <p className="sos-active-subtitle">Distress beacon active. Dispatched to local incident database.</p>
            </div>
          </div>

          <div className="sos-alert-metadata">
            <div className="meta-pair">
              <span>Beacon Status:</span>
              <strong className="text-red">BROADCASTING (SIMULATED)</strong>
            </div>
            <div className="meta-pair">
              <span>Telemetry:</span>
              <span>Priority High • GPS Locked</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {backendIncident?.status !== 'CLOSED' && onCloseIncident && (
              <button
                className="btn-close-incident"
                onClick={onCloseIncident}
                disabled={isClosingIncident}
                style={{ flex: 1 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon-svg">
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <span>{isClosingIncident ? 'Closing Incident...' : 'Resolve & Close Incident'}</span>
              </button>
            )}
            <button className="btn-dismiss-sos" onClick={onDismissSos} style={{ flex: 1 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon-svg">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>Dismiss Visual Beacon</span>
            </button>
          </div>
        </div>
      )}

      <div className="sos-idle-container">
        <p className="sos-description">
          Press in case of simulated distress. Upon confirmation, a verified incident will be transmitted directly to the FastAPI backend API at <code>/api/incidents</code>.
        </p>

        <button
          className="btn-sos-trigger"
          onClick={onTriggerSosClick}
          disabled={isLoading}
          aria-label="Trigger simulated emergency SOS"
        >
          <div className="sos-btn-inner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="sos-icon-svg">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="sos-btn-text">
              {isLoading ? 'TRANSMITTING...' : 'EMERGENCY SOS'}
            </span>
            <span className="sos-btn-sub">
              {backendIncident?.status === 'OPEN' ? 'RE-TRIGGER SOS (OPEN INCIDENT)' : 'SIMULATED DISTRESS BEACON'}
            </span>
          </div>
        </button>

        <span className="sos-disclaimer-note">
          Prototype safety test. Does not dial emergency services.
        </span>
      </div>
    </div>
  )
}

