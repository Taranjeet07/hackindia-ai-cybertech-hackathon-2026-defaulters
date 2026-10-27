import React from 'react'
import type { TripStatus } from './types'

interface TripControlsProps {
  tripStatus: TripStatus
  elapsedSeconds: number
  onStartTrip: () => void
  onEndTrip: () => void
}

export const TripControls: React.FC<TripControlsProps> = ({
  tripStatus,
  elapsedSeconds,
  onStartTrip,
  onEndTrip,
}) => {
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0'),
    ].join(':')
  }

  const isTripActive = tripStatus === 'Active'

  return (
    <div className="tourist-card trip-controls-card">
      <div className="card-header-bar">
        <h3 className="card-section-title">Trip Controls</h3>
        <span className="card-subnote">Simulated Session Management</span>
      </div>

      <div className="trip-timer-display">
        <div className="timer-label-row">
          <span className="timer-title">ELAPSED TRIP TIME</span>
          {isTripActive && (
            <span className="timer-live-indicator">
              <span className="timer-pulsing-dot"></span>
              TRACKING ACTIVE
            </span>
          )}
        </div>
        <div className={`timer-digits ${isTripActive ? 'timer-active' : 'timer-idle'}`}>
          {formatTime(elapsedSeconds)}
        </div>
        <p className="timer-subtext">
          {tripStatus === 'Not Started' && 'Trip is idle. Click "Start Trip" to begin tracking.'}
          {tripStatus === 'Active' && 'Trip active. Telemetry simulation updates in real time.'}
          {tripStatus === 'Completed' && 'Trip ended. You can start a new simulated journey.'}
        </p>
      </div>

      <div className="trip-buttons-row">
        <button
          className="btn-trip btn-start-trip"
          onClick={onStartTrip}
          disabled={isTripActive}
          title={isTripActive ? 'A trip is already currently active' : 'Begin a simulated journey'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="btn-icon-svg">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span>{tripStatus === 'Completed' ? 'Start New Trip' : 'Start Trip'}</span>
        </button>

        <button
          className="btn-trip btn-end-trip"
          onClick={onEndTrip}
          disabled={!isTripActive}
          title={!isTripActive ? 'No active trip to conclude' : 'End the active simulated journey'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="btn-icon-svg">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
          <span>End Trip</span>
        </button>
      </div>
    </div>
  )
}
