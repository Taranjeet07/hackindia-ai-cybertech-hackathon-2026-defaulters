import React from 'react'
import type { TripStatus, SafetyLevel } from './types'

interface SafetyStatusPanelProps {
  tripStatus: TripStatus
  safetyLevel: SafetyLevel
  incidentCount: number
  lastSimulatedEvent: string
}

export const SafetyStatusPanel: React.FC<SafetyStatusPanelProps> = ({
  tripStatus,
  safetyLevel,
  incidentCount,
  lastSimulatedEvent,
}) => {
  const getSafetyBadge = () => {
    switch (safetyLevel) {
      case 'CRITICAL':
        return {
          label: 'CRITICAL — SOS ACTIVE',
          className: 'badge-danger',
          dotClass: 'dot-red',
        }
      case 'CAUTION':
        return {
          label: 'CAUTION — HAZARD BREACH',
          className: 'badge-warning',
          dotClass: 'dot-amber',
        }
      case 'SAFE':
      default:
        return {
          label: 'NORMAL — SAFE',
          className: 'badge-safe',
          dotClass: 'dot-teal',
        }
    }
  }

  const safetyInfo = getSafetyBadge()

  return (
    <div className="tourist-card status-panel-card">
      <div className="card-header-bar">
        <h3 className="card-section-title">Safety Telemetry Overview</h3>
        <span className="card-subnote">Simulated Health & Incident Status</span>
      </div>

      <div className="status-metrics-grid">
        <div className="status-stat-box">
          <span className="stat-label">TRIP STATUS</span>
          <span className="stat-value">{tripStatus}</span>
        </div>

        <div className="status-stat-box">
          <span className="stat-label">DEMO SAFETY STATUS</span>
          <div className={`status-pill ${safetyInfo.className}`}>
            <span className={`status-indicator-dot ${safetyInfo.dotClass}`}></span>
            <span>{safetyInfo.label}</span>
          </div>
        </div>

        <div className="status-stat-box">
          <span className="stat-label">INCIDENT COUNT</span>
          <span className={`stat-value-alert ${incidentCount > 0 ? 'text-amber' : 'text-teal'}`}>
            {incidentCount} {incidentCount === 1 ? 'Incident' : 'Incidents'}
          </span>
        </div>

        <div className="status-stat-box full-width-stat">
          <span className="stat-label">LAST SIMULATED EVENT</span>
          <div className="last-event-box">
            <span className="event-pulse-dot"></span>
            <span className="event-text">{lastSimulatedEvent}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
