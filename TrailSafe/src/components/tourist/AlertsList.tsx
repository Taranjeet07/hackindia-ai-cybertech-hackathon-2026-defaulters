import React from 'react'
import type { DemoAlert } from './types'

interface AlertsListProps {
  alerts: DemoAlert[]
  onDismissAlert: (id: string) => void
  onClearAllAlerts: () => void
}

export const AlertsList: React.FC<AlertsListProps> = ({
  alerts,
  onDismissAlert,
  onClearAllAlerts,
}) => {
  if (alerts.length === 0) {
    return (
      <div className="tourist-card alerts-empty-card">
        <div className="empty-alerts-inner">
          <div className="empty-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="empty-svg">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>
          <h4 className="empty-title">All Clear • No Active Alerts</h4>
          <p className="empty-subtitle">
            Simulated geofence borders and safety thresholds are normal. Use the incident simulator buttons above to generate demo alerts.
          </p>
        </div>
      </div>
    )
  }

  const getSeverityBadgeClass = (severity: DemoAlert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'severity-critical'
      case 'HIGH':
        return 'severity-high'
      case 'WARNING':
      default:
        return 'severity-warning'
    }
  }

  return (
    <div className="tourist-card alerts-container-card">
      <div className="alerts-card-header">
        <div className="alerts-title-group">
          <h3 className="card-section-title">Active Simulated Alerts</h3>
          <span className="alerts-count-badge">{alerts.length}</span>
        </div>
        {alerts.length > 1 && (
          <button className="btn-clear-all" onClick={onClearAllAlerts}>
            Dismiss All ({alerts.length})
          </button>
        )}
      </div>

      <div className="alerts-list">
        {alerts.map((alert) => (
          <div key={alert.id} className={`alert-item-card ${getSeverityBadgeClass(alert.severity)}`}>
            <div className="alert-item-header">
              <div className="alert-badge-group">
                <span className="alert-severity-tag">{alert.severity}</span>
                <span className="alert-time-tag">{alert.timestamp}</span>
              </div>
              <button
                className="btn-dismiss-alert"
                onClick={() => onDismissAlert(alert.id)}
                aria-label="Dismiss this alert"
                title="Dismiss simulated alert"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dismiss-svg">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span>Dismiss</span>
              </button>
            </div>

            <h4 className="alert-item-title">{alert.title}</h4>
            <p className="alert-item-message">{alert.message}</p>

            <div className="alert-item-footer">
              <span className="alert-location-tag">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mini-loc-svg">
                  <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {alert.locationName}
              </span>
              <span className="alert-demo-note">
                {alert.backendIncidentId ? `SAVED: ${alert.backendIncidentId}` : 'SIMULATED ALERT'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
