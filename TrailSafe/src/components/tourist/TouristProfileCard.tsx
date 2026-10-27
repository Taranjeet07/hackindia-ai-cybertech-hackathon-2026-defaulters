import React from 'react'
import type { TripStatus } from './types'

interface TouristProfileCardProps {
  tripStatus: TripStatus
}

export const TouristProfileCard: React.FC<TouristProfileCardProps> = ({ tripStatus }) => {
  const getStatusBadgeClass = () => {
    switch (tripStatus) {
      case 'Active':
        return 'status-badge-active'
      case 'Completed':
        return 'status-badge-completed'
      case 'Not Started':
      default:
        return 'status-badge-idle'
    }
  }

  return (
    <div className="tourist-card profile-card">
      <div className="card-header-bar">
        <div className="card-badge-demo">
          <span className="dot-cyan"></span>
          <span>SYNTHETIC DEMO IDENTITY</span>
        </div>
        <span className="card-id-pill">ID: TS-DEMO-001</span>
      </div>

      <div className="profile-identity-block">
        <div className="profile-avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="avatar-icon">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div className="profile-info">
          <h2 className="profile-name">Demo Tourist</h2>
          <span className="profile-subtitle">Registered Traveler (Simulated Profile)</span>
        </div>
      </div>

      <div className="profile-details-grid">
        <div className="detail-item">
          <span className="detail-label">Destination</span>
          <span className="detail-value value-destination">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="detail-icon">
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Lucknow, Uttar Pradesh
          </span>
        </div>

        <div className="detail-item">
          <span className="detail-label">Current Trip Status</span>
          <div className={`status-pill ${getStatusBadgeClass()}`}>
            <span className="status-indicator-dot"></span>
            <span>{tripStatus}</span>
          </div>
        </div>

        <div className="detail-item">
          <span className="detail-label">Simulated Device</span>
          <span className="detail-value">TrailSafe Edge Telemetry v1.0</span>
        </div>

        <div className="detail-item">
          <span className="detail-label">Data Privacy</span>
          <span className="detail-value">Local Browser State Only</span>
        </div>
      </div>
    </div>
  )
}
