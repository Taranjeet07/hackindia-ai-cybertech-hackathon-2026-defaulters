import React, { useState, useEffect, useCallback } from 'react'
import type { AnalyticsData } from './types'
import { useLanguage } from '../../i18n/LanguageContext'
import { API_ENDPOINTS } from '../../config/api'

interface AuthorityAnalyticsModalProps {
  isOpen: boolean
  onClose: () => void
}

const ANALYTICS_API_URL = API_ENDPOINTS.analytics

export const AuthorityAnalyticsModal: React.FC<AuthorityAnalyticsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useLanguage()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(ANALYTICS_API_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
      const data = await res.json()
      setAnalytics(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics from backend.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      void loadAnalytics()
    }
  }, [isOpen, loadAnalytics])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card authority-modal-card analytics-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', width: '92%' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <span className="modal-title-icon">📊</span>
            <div>
              <h3 className="modal-title" style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc' }}>
                Operational Safety Analytics & Telemetry
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Real-time aggregates calculated directly from SQLite database
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label={t.closeModal}>
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body authority-modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
          {isLoading ? (
            <div className="auth-loading-card" style={{ padding: '2.5rem' }}>
              <span className="spinner-auth" />
              <span className="loading-text">Calculating database metrics...</span>
            </div>
          ) : error ? (
            <div className="auth-alert-banner alert-danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="alert-svg">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          ) : analytics ? (
            <>
              {/* Summary Stats Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div className="telemetry-card" style={{ padding: '0.9rem' }}>
                  <div className="metric-label" style={{ fontSize: '0.72rem', color: '#94a3b8' }}>TOTAL INCIDENTS</div>
                  <div className="metric-value-huge" style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc' }}>
                    {analytics.total_incidents}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#38bdf8' }}>SQLite persisted records</div>
                </div>

                <div className="telemetry-card" style={{ padding: '0.9rem' }}>
                  <div className="metric-label" style={{ fontSize: '0.72rem', color: '#94a3b8' }}>AVG RISK SCORE</div>
                  <div className="metric-value-huge" style={{ fontSize: '1.8rem', fontWeight: 700, color: analytics.avg_risk_score >= 70 ? '#f43f5e' : '#38bdf8' }}>
                    {analytics.avg_risk_score}
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 400 }}> /100</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Deterministic engine</div>
                </div>

                <div className="telemetry-card" style={{ padding: '0.9rem' }}>
                  <div className="metric-label" style={{ fontSize: '0.72rem', color: '#94a3b8' }}>RESPONDER UNITS</div>
                  <div className="metric-value-huge" style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>
                    {analytics.responders.available}
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 400 }}>
                      /{analytics.responders.total} avail
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    {analytics.responders.assigned} active dispatch
                  </div>
                </div>

                <div className="telemetry-card" style={{ padding: '0.9rem' }}>
                  <div className="metric-label" style={{ fontSize: '0.72rem', color: '#94a3b8' }}>ACTIVE GEOFENCES</div>
                  <div className="metric-value-huge" style={{ fontSize: '1.8rem', fontWeight: 700, color: '#a78bfa' }}>
                    {analytics.active_geofences_count}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Perimeters monitored</div>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="detail-section-block" style={{ marginBottom: '1rem' }}>
                <h4 className="detail-section-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Incident Lifecycle Status</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' }}>
                    Active vs Resolved
                  </span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {(['OPEN', 'ASSIGNED', 'CLOSED'] as const).map((status) => {
                    const count = analytics.status_counts[status] || 0
                    const pct = analytics.total_incidents > 0
                      ? Math.round((count / analytics.total_incidents) * 100)
                      : 0
                    const color =
                      status === 'OPEN' ? '#f59e0b' : status === 'ASSIGNED' ? '#38bdf8' : '#10b981'
                    return (
                      <div key={status} style={{ fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: 600, color }}>{status}</span>
                          <span style={{ color: '#cbd5e1' }}>
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div style={{ background: 'rgba(51, 65, 85, 0.4)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                          <div style={{ background: color, width: `${pct}%`, height: '100%', transition: 'width 0.3s' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Severity Breakdown */}
              <div className="detail-section-block" style={{ marginBottom: '1rem' }}>
                <h4 className="detail-section-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Severity Distribution</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' }}>
                    Risk Triage
                  </span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => {
                    const count = analytics.severity_counts[sev] || 0
                    const pct = analytics.total_incidents > 0
                      ? Math.round((count / analytics.total_incidents) * 100)
                      : 0
                    const color =
                      sev === 'CRITICAL'
                        ? '#ef4444'
                        : sev === 'HIGH'
                        ? '#f97316'
                        : sev === 'MEDIUM'
                        ? '#eab308'
                        : '#3b82f6'
                    return (
                      <div key={sev} style={{ fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: 600, color }}>{sev}</span>
                          <span style={{ color: '#cbd5e1' }}>
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div style={{ background: 'rgba(51, 65, 85, 0.4)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                          <div style={{ background: color, width: `${pct}%`, height: '100%', transition: 'width 0.3s' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Incident Type Breakdown */}
              <div className="detail-section-block" style={{ marginBottom: '1rem' }}>
                <h4 className="detail-section-title">Incident Type Categorization</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', marginTop: '0.5rem' }}>
                  {Object.entries(analytics.type_counts).map(([type, count]) => (
                    <div
                      key={type}
                      style={{
                        padding: '0.65rem',
                        background: 'rgba(15, 23, 42, 0.5)',
                        border: '1px solid rgba(51, 65, 85, 0.6)',
                        borderRadius: '6px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                        {type.replace('_', ' ')}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#38bdf8', marginTop: '0.2rem' }}>
                        {count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Simulation Notice */}
              <div className="simulated-disclaimer-box" style={{ marginTop: '1rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="info-svg">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>
                  Telemetry metrics are computed dynamically from the local SQLite database (`backend/data/trailsafe.db`).
                  All responder units, incidents, and geofence events represent simulated testing scenarios.
                </span>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn-auth-action" onClick={loadAnalytics} disabled={isLoading}>
            🔄 Refresh Analytics
          </button>
          <button className="modal-action-btn" onClick={onClose}>
            {t.closeModal}
          </button>
        </div>
      </div>
    </div>
  )
}
