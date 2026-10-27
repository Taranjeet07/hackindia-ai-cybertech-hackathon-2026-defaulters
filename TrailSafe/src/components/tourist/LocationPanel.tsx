import React from 'react'
import type { SimulatedLocation } from './types'
import { useLanguage } from '../../i18n/LanguageContext'

interface LocationPanelProps {
  location: SimulatedLocation
  isRealGps?: boolean
  geofenceZone?: string | null
  geofenceType?: string | null
  onSimulateLocationUpdate: () => void
  onRequestRealGps?: () => void
  isGpsLoading?: boolean
}

export const LocationPanel: React.FC<LocationPanelProps> = ({
  location,
  isRealGps = false,
  geofenceZone = 'Hazratganj Safe Corridor',
  geofenceType = 'SAFE',
  onSimulateLocationUpdate,
  onRequestRealGps,
  isGpsLoading = false,
}) => {
  const { t } = useLanguage()

  const zoneColorClass =
    geofenceType === 'RESTRICTED'
      ? 'zone-badge-crit'
      : geofenceType === 'CAUTION'
      ? 'zone-badge-caution'
      : 'zone-badge-safe'

  return (
    <div className="tourist-card location-card">
      <div className="card-header-bar">
        <div className="card-badge-demo">
          <span className={isRealGps ? 'dot-green' : 'dot-cyan'}></span>
          <span>{isRealGps ? t.gpsActive : t.currentLocation}</span>
        </div>
        <span className={`geofence-status-pill ${zoneColorClass}`}>
          🛡️ {geofenceZone || 'Designated Trail'}
        </span>
      </div>

      <div className="location-current-block">
        <div className="location-marker-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="loc-svg">
            <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div className="location-info">
          <h4 className="location-name">{location.name}</h4>
          <p className="location-desc">{location.description}</p>
        </div>
      </div>

      <div className="coordinates-grid">
        <div className="coord-box">
          <span className="coord-label">LATITUDE</span>
          <span className="coord-value">{location.lat.toFixed(5)}° N</span>
        </div>

        <div className="coord-box">
          <span className="coord-label">LONGITUDE</span>
          <span className="coord-value">{location.lng.toFixed(5)}° E</span>
        </div>
      </div>

      <div className="location-metadata-row">
        <div className="meta-item">
          <span className="meta-key">{t.accuracy}:</span>
          <span className="meta-val">{location.accuracy}</span>
        </div>
        <div className="meta-item">
          <span className="meta-key">Last Check:</span>
          <span className="meta-val">{location.lastUpdated}</span>
        </div>
      </div>

      <div className="location-disclaimer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="info-mini-svg">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          {isRealGps
            ? 'Real device GPS telemetry active with browser permission.'
            : 'Simulated trail waypoints along Lucknow heritage route. You can switch to live device GPS below.'}
        </span>
      </div>

      <div className="location-btn-row">
        <button
          className="btn-action-teal btn-simulate-location"
          onClick={onSimulateLocationUpdate}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon-svg">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          <span>{t.updateLocation}</span>
        </button>

        {onRequestRealGps && (
          <button
            className={`btn-action-gps ${isRealGps ? 'gps-engaged' : ''}`}
            onClick={onRequestRealGps}
            disabled={isGpsLoading}
            title="Request explicit browser GPS permission"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon-svg">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
            <span>{isGpsLoading ? 'Querying GPS...' : isRealGps ? t.gpsActive : t.requestGps}</span>
          </button>
        )}
      </div>
    </div>
  )
}

