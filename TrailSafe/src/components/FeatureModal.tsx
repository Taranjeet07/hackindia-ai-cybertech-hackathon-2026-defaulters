import React, { useEffect } from 'react'

interface FeatureModalProps {
  isOpen: boolean
  title: string
  description: string
  featureKey: string
  onClose: () => void
}

export const FeatureModal: React.FC<FeatureModalProps> = ({
  isOpen,
  title,
  description,
  featureKey,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-badge">
            <span className="badge-pulse-dot"></span>
            NEXT DEVELOPMENT STEP
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="close-icon">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-icon-wrapper">
            {featureKey === 'tourist' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="modal-feature-icon">
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="modal-feature-icon">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            )}
          </div>

          <h3 id="modal-title" className="modal-title">{title}</h3>
          <p className="modal-subtitle">Coming in the next development step</p>
          <p className="modal-text">{description}</p>
          
          <div className="modal-notice-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="info-icon">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>This prototype currently displays the public safety overview. Interactive simulation controls will be connected in future milestones.</span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-action-btn" onClick={onClose}>
            Back to Overview
          </button>
        </div>
      </div>
    </div>
  )
}
