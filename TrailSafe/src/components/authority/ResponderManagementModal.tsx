import React, { useState, useEffect, useCallback } from 'react'
import type { ResponderUnit } from './types'
import { useLanguage } from '../../i18n/LanguageContext'
import { API_ENDPOINTS } from '../../config/api'

interface ResponderManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onResponderUpdated?: () => void
}

const RESPONDERS_API_URL = API_ENDPOINTS.responders

export const ResponderManagementModal: React.FC<ResponderManagementModalProps> = ({
  isOpen,
  onClose,
  onResponderUpdated,
}) => {
  const { t } = useLanguage()
  const [responders, setResponders] = useState<ResponderUnit[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadResponders = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(RESPONDERS_API_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setResponders(data)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch responders from backend.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      void loadResponders()
    }
  }, [isOpen, loadResponders])

  const handleStatusChange = async (unitId: string, newStatus: 'AVAILABLE' | 'OFF_DUTY') => {
    setUpdatingId(unitId)
    setError(null)
    try {
      const res = await fetch(`${RESPONDERS_API_URL}/${unitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
      const updated = await res.json()
      setResponders((prev) => prev.map((r) => (r.id === unitId ? updated : r)))
      if (onResponderUpdated) onResponderUpdated()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update responder status.')
    } finally {
      setUpdatingId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card authority-modal-card responders-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '820px', width: '92%' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <span className="modal-title-icon">🚔</span>
            <div>
              <h3 className="modal-title" style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc' }}>
                Simulated Patrol & Responder Fleet
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Persistent fleet records managed via SQLite `responders` table
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label={t.closeModal}>
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body authority-modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          {error && (
            <div className="auth-alert-banner alert-danger" style={{ marginBottom: '1rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="alert-svg">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="auth-loading-card" style={{ padding: '2.5rem' }}>
              <span className="spinner-auth" />
              <span className="loading-text">Loading responder units...</span>
            </div>
          ) : responders.length === 0 ? (
            <div className="auth-empty-card">
              <p>No responders registered in database.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {responders.map((resp) => {
                const isAssigned = resp.status === 'ASSIGNED'
                const isAvail = resp.status === 'AVAILABLE'
                const isOff = resp.status === 'OFF_DUTY'
                const isUpdating = updatingId === resp.id

                return (
                  <div
                    key={resp.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(51, 65, 85, 0.6)',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
                            {resp.name}
                          </span>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              padding: '2px 6px',
                              background: 'rgba(56, 189, 248, 0.1)',
                              color: '#38bdf8',
                              borderRadius: '4px',
                            }}
                          >
                            {resp.id}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                          Role: {resp.role} • Radio/Channel: {resp.contact_number}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`status-badge-chip ${resp.status.toLowerCase()}`}
                        style={{
                          background: isAvail
                            ? 'rgba(16, 185, 129, 0.15)'
                            : isAssigned
                            ? 'rgba(56, 189, 248, 0.15)'
                            : 'rgba(100, 116, 139, 0.2)',
                          color: isAvail ? '#34d399' : isAssigned ? '#38bdf8' : '#94a3b8',
                          borderColor: isAvail ? '#10b981' : isAssigned ? '#0284c7' : '#475569',
                        }}
                      >
                        <span
                          className={`chip-dot ${
                            isAvail ? 'dot-green' : isAssigned ? 'dot-cyan' : 'dot-amber'
                          }`}
                        />
                        {resp.status}
                      </span>
                    </div>

                    {/* Coordinates & Assignment Info */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.78rem',
                        color: '#cbd5e1',
                        borderTop: '1px solid rgba(51, 65, 85, 0.4)',
                        paddingTop: '0.5rem',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        📍 Location: {resp.latitude.toFixed(4)}° N, {resp.longitude.toFixed(4)}° E
                        {resp.current_incident_id && (
                          <span style={{ marginLeft: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
                            Assigned to Incident: {resp.current_incident_id}
                          </span>
                        )}
                      </div>

                      {/* Controls */}
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {!isAvail && (
                          <button
                            type="button"
                            className="btn-auth-action"
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(resp.id, 'AVAILABLE')}
                          >
                            Set Available
                          </button>
                        )}
                        {!isOff && (
                          <button
                            type="button"
                            className="btn-auth-action"
                            style={{
                              padding: '0.3rem 0.65rem',
                              fontSize: '0.75rem',
                              background: 'rgba(239, 68, 68, 0.15)',
                              borderColor: '#ef4444',
                              color: '#fca5a5',
                            }}
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(resp.id, 'OFF_DUTY')}
                          >
                            Set Off Duty
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Simulation Disclaimer */}
          <div className="simulated-disclaimer-box" style={{ marginTop: '1.25rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="info-svg">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>
              All responder designations, GPS coordinates, radio channels, and dispatches are synthetically simulated for hackathon evaluation.
              No actual emergency services or real law enforcement are dispatched.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn-auth-action" onClick={loadResponders} disabled={isLoading}>
            🔄 Refresh Units
          </button>
          <button className="modal-action-btn" onClick={onClose}>
            {t.closeModal}
          </button>
        </div>
      </div>
    </div>
  )
}
