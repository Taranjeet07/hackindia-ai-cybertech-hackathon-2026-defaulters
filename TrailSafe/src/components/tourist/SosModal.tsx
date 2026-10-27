import React, { useEffect } from 'react'

interface SosModalProps {
  isOpen: boolean
  isLoading?: boolean
  error?: string | null
  onClose: () => void
  onConfirmSos: () => void
}

export const SosModal: React.FC<SosModalProps> = ({
  isOpen,
  isLoading = false,
  error = null,
  onClose,
  onConfirmSos,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, isLoading, onClose])

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      onClick={() => {
        if (!isLoading) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sos-modal-title"
    >
      <div className="modal-card modal-card-danger" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-badge-danger">
            <span className="badge-pulse-dot dot-red"></span>
            PROTOTYPE SAFETY DIALOG
          </div>
          <button
            className="modal-close-btn"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Cancel"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="close-icon">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-icon-danger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="danger-svg">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h3 id="sos-modal-title" className="modal-title">Trigger Simulated SOS?</h3>
          <p className="modal-subtitle danger-text">Demonstration Incident Protocol</p>

          <div className="modal-warning-box">
            <strong>CRITICAL NOTICE:</strong> This is a hackathon prototype simulation.
            <ul className="modal-notice-bullets">
              <li>This test <strong>DOES NOT</strong> contact real emergency services (112, 911, or police).</li>
              <li>No external signals or real emergency calls will be made.</li>
              <li>A high-priority incident will be transmitted to the local FastAPI backend database (<code>http://localhost:8000/api/incidents</code>).</li>
            </ul>
          </div>

          {error && (
            <div className="modal-error-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="error-icon-svg">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <strong>Backend Error:</strong> {error}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer-dual">
          <button className="btn-cancel" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button
            className="btn-confirm-danger"
            onClick={onConfirmSos}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="btn-loading-flex">
                <span className="spinner-dot"></span>
                Saving to Backend...
              </span>
            ) : (
              'Confirm Simulated SOS'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
