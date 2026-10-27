import React, { useState, useEffect, useCallback } from 'react'
import type { IncidentRecord } from './types'
import { useLanguage } from '../../i18n/LanguageContext'
import { API_ENDPOINTS } from '../../config/api'

interface IncidentEvent {
  id: string
  incident_id: string
  event_type: string
  actor: string
  notes?: string | null
  created_at: string
}

interface IncidentDetailModalProps {
  incident: IncidentRecord | null
  isOpen: boolean
  onClose: () => void
  onAssignResponder: (incidentId: string, responderName: string) => Promise<void>
  onCloseIncident: (incidentId: string, closureReason?: string, closureNotes?: string) => Promise<void>
  onNoteAdded?: () => void
}

const PREDEFINED_SIMULATED_RESPONDERS = [
  'Unit 1 - Hazratganj Rapid Patrol (Simulated)',
  'Unit 2 - Heritage Zone Ranger (Simulated)',
  'Unit 3 - Riverfront Safety Team (Simulated)',
  'Unit 4 - Medical First Responder (Simulated)',
  'Unit 5 - Drone Reconnaissance Team (Simulated)',
]

const CLOSURE_REASONS = [
  'Resolved / Verified Safe',
  'False Alarm - Verified',
  'Resolved by Patrol Unit',
  'Tourist Safe - Escorted',
  'Simulation Test Complete',
  'Other / Custom Reason',
]

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  isOpen,
  onClose,
  onAssignResponder,
  onCloseIncident,
  onNoteAdded,
}) => {
  const { t } = useLanguage()
  const [selectedResponder, setSelectedResponder] = useState<string>(
    PREDEFINED_SIMULATED_RESPONDERS[0]
  )
  const [customResponder, setCustomResponder] = useState<string>('')
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false)
  const [isAssigning, setIsAssigning] = useState<boolean>(false)
  const [isClosing, setIsClosing] = useState<boolean>(false)
  const [selectedClosureReason, setSelectedClosureReason] = useState<string>(CLOSURE_REASONS[0])
  const [closureNotes, setClosureNotes] = useState<string>('')

  // Audit Events state
  const [events, setEvents] = useState<IncidentEvent[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false)

  // Operator note state
  const [newNote, setNewNote] = useState<string>('')
  const [isAddingNote, setIsAddingNote] = useState<boolean>(false)

  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Fetch chronological audit timeline events for this incident
  const loadEvents = useCallback(async (incId: string) => {
    setIsLoadingEvents(true)
    try {
      const res = await fetch(`${API_ENDPOINTS.incidents}/${incId}/events`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setEvents(data)
        }
      }
    } catch {
      // Backend may be starting
    } finally {
      setIsLoadingEvents(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && incident) {
      void loadEvents(incident.id)
      setActionError(null)
      setActionSuccess(null)
      setNewNote('')
      setClosureNotes('')
    }
  }, [isOpen, incident, loadEvents])

  if (!isOpen || !incident) return null

  const isClosed = incident.status === 'CLOSED'
  const isCritical = incident.severity === 'CRITICAL'

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionError(null)
    setActionSuccess(null)

    const responderToAssign = isCustomMode ? customResponder.trim() : selectedResponder
    if (!responderToAssign) {
      setActionError('Please provide a simulated responder unit name.')
      return
    }

    setIsAssigning(true)
    try {
      await onAssignResponder(incident.id, responderToAssign)
      setActionSuccess(`Assigned to "${responderToAssign}" successfully in database.`)
      await loadEvents(incident.id)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to assign responder.')
    } finally {
      setIsAssigning(false)
    }
  }

  const handleCloseSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setActionError(null)
    setActionSuccess(null)

    setIsClosing(true)
    try {
      await onCloseIncident(incident.id, selectedClosureReason, closureNotes.trim() || undefined)
      setActionSuccess(`Incident ${incident.id} marked CLOSED in SQLite database.`)
      await loadEvents(incident.id)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to close incident.')
    } finally {
      setIsClosing(false)
    }
  }

  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    setIsAddingNote(true)
    setActionError(null)
    setActionSuccess(null)

    try {
      const res = await fetch(`${API_ENDPOINTS.incidents}/${incident.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote.trim(), author: 'Authority Operator' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setNewNote('')
      setActionSuccess('Note appended and audit event recorded.')
      await loadEvents(incident.id)
      if (onNoteAdded) onNoteAdded()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to append note.')
    } finally {
      setIsAddingNote(false)
    }
  }

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso)
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
    } catch {
      return iso
    }
  }

  // Fallback explainable factors if not present on record
  const riskFactors =
    incident.risk_factors && incident.risk_factors.length > 0
      ? incident.risk_factors
      : incident.incident_type === 'SOS'
      ? [
          'Manual emergency SOS distress beacon activated by tourist.',
          'Life-safety override: maximum priority risk weighting assigned (100/100).',
          'Autonomous rapid dispatch protocol engaged for immediate simulated response.',
        ]
      : [
          `Calculated rule-based score of ${incident.risk_score}/100 based on ${incident.incident_type} criteria.`,
          `Categorized as ${incident.severity} severity based on safety perimeter thresholds.`,
        ]

  const hasCoordinates =
    incident.latitude !== undefined &&
    incident.latitude !== null &&
    incident.longitude !== undefined &&
    incident.longitude !== null

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`modal-card authority-modal-card ${isCritical ? 'modal-border-critical' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <span className={`status-badge-chip ${incident.status.toLowerCase()}`}>
              {incident.status === 'OPEN' && <span className="chip-dot dot-amber" />}
              {incident.status === 'ASSIGNED' && <span className="chip-dot dot-cyan" />}
              {incident.status === 'CLOSED' && <span className="chip-dot dot-green" />}
              {incident.status}
            </span>
            <span className="modal-incident-id">{incident.id}</span>
          </div>

          <button className="modal-close-btn" onClick={onClose} aria-label={t.closeModal}>
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body authority-modal-body">
          {/* Action Alerts */}
          {actionError && (
            <div className="auth-alert-banner alert-danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="alert-svg">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{actionError}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="auth-alert-banner alert-success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="alert-svg">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Key Incident Metadata Grid */}
          <div className="auth-details-meta-grid">
            <div className="detail-meta-cell">
              <span className="cell-label">{t.tableTourist}</span>
              <span className="cell-value-mono">{incident.tourist_id}</span>
            </div>

            <div className="detail-meta-cell">
              <span className="cell-label">{t.tableType}</span>
              <span className="cell-value">{incident.incident_type.replace('_', ' ')}</span>
            </div>

            <div className="detail-meta-cell">
              <span className="cell-label">{t.tableSeverity}</span>
              <span className={`cell-value-severity sev-${incident.severity.toLowerCase()}`}>
                {incident.severity}
              </span>
            </div>

            <div className="detail-meta-cell">
              <span className="cell-label">{t.tableRisk}</span>
              <div className="risk-score-display">
                <span className={`risk-number ${incident.risk_score >= 80 ? 'text-red' : 'text-teal'}`}>
                  {incident.risk_score}/100
                </span>
                <div className="risk-bar-track">
                  <div
                    className={`risk-bar-fill ${incident.risk_score >= 80 ? 'fill-red' : 'fill-teal'}`}
                    style={{ width: `${incident.risk_score}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="detail-meta-cell">
              <span className="cell-label">{t.tableTime}</span>
              <span className="cell-value-time">{formatTimestamp(incident.created_at)}</span>
            </div>

            <div className="detail-meta-cell">
              <span className="cell-label">LAST UPDATED</span>
              <span className="cell-value-time">{formatTimestamp(incident.updated_at)}</span>
            </div>
          </div>

          {/* Explainable Risk Engine Breakdown */}
          <div className="detail-section-block risk-factors-block">
            <div className="section-head-with-badge">
              <h4 className="detail-section-title">{t.riskBreakdown}</h4>
              <span className="rule-engine-pill">Deterministic Rules</span>
            </div>
            <ul className="risk-factors-list">
              {riskFactors.map((factor, idx) => (
                <li key={idx} className="risk-factor-item">
                  <span className="factor-bullet">▶</span>
                  <span className="factor-text">{factor}</span>
                </li>
              ))}
            </ul>
            <div className="risk-engine-disclaimer">
              Deterministic rule-based risk evaluation for demonstration purposes. Not a scientifically validated prediction model.
            </div>
          </div>

          {/* Geospatial Telemetry / Location Details */}
          <div className="detail-section-block">
            <h4 className="detail-section-title">Geospatial Telemetry & Map Location</h4>
            {hasCoordinates ? (
              <div className="geo-location-card">
                <div className="geo-icon">📍</div>
                <div className="geo-content">
                  <div className="geo-name">{incident.location_name || 'Recorded Corridor Waypoint'}</div>
                  <div className="geo-coords">
                    {Number(incident.latitude).toFixed(5)}° N, {Number(incident.longitude).toFixed(5)}° E
                  </div>
                  <span className="geo-status-tag">Recorded Stored Coordinates</span>
                </div>
              </div>
            ) : (
              <div className="geo-location-card synthetic-fallback-card">
                <div className="geo-icon">📍</div>
                <div className="geo-content">
                  <div className="geo-name">
                    {incident.location_name || 'Lucknow Heritage Corridor (Synthetic Demo Anchor)'}
                  </div>
                  <div className="geo-coords">
                    Approx. 26.8580° N, 80.9380° E (Corridor Center)
                  </div>
                  <span className="geo-status-tag tag-synthetic">
                    ⚠️ Synthetic Demo Anchor — No GPS Stored on Record
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Incident Description */}
          <div className="detail-section-block">
            <h4 className="detail-section-title">Incident Description</h4>
            <p className="detail-description-text">{incident.description}</p>
          </div>

          {/* Current Responder Assignment */}
          <div className="detail-section-block">
            <h4 className="detail-section-title">Simulated Responder Status</h4>
            {incident.assigned_responder ? (
              <div className="responder-assigned-card">
                <div className="responder-icon-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="resp-svg">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <polyline points="17 11 19 13 23 9" />
                  </svg>
                </div>
                <div>
                  <div className="responder-callsign">{incident.assigned_responder}</div>
                  <div className="responder-subnote">Simulated active dispatch unit</div>
                </div>
              </div>
            ) : (
              <div className="responder-unassigned-card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="warn-svg">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>No responder currently assigned. Select a unit below to dispatch.</span>
              </div>
            )}
          </div>

          {/* Audit Events Timeline */}
          <div className="detail-section-block">
            <div className="section-head-with-badge">
              <h4 className="detail-section-title">{t.auditTimeline}</h4>
              <span className="rule-engine-pill">{events.length} Events</span>
            </div>
            {isLoadingEvents ? (
              <div style={{ padding: '0.75rem', color: '#94a3b8', fontSize: '0.85rem' }}>Loading audit events...</div>
            ) : events.length === 0 ? (
              <div style={{ padding: '0.75rem', color: '#94a3b8', fontSize: '0.85rem' }}>No audit events recorded yet.</div>
            ) : (
              <div className="events-timeline-list">
                {events.map((evt) => (
                  <div key={evt.id} className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className={`timeline-badge badge-${evt.event_type.toLowerCase()}`}>{evt.event_type}</span>
                        <span className="timeline-actor">{evt.actor}</span>
                        <span className="timeline-time">{formatTimestamp(evt.created_at)}</span>
                      </div>
                      {evt.notes && <p className="timeline-notes">{evt.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Operator Working Notes */}
          <div className="detail-section-block">
            <h4 className="detail-section-title">{t.operatorNotes}</h4>
            {incident.notes && (
              <div className="existing-notes-box">
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.82rem', color: '#cbd5e1' }}>
                  {incident.notes}
                </pre>
              </div>
            )}
            <form onSubmit={handleAddNoteSubmit} className="add-note-form" style={{ marginTop: '0.6rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="auth-input-text"
                  placeholder={t.notePlaceholder}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  disabled={isAddingNote}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  className="btn-auth-action"
                  disabled={isAddingNote || !newNote.trim()}
                >
                  {isAddingNote ? t.submittingNote : t.addNote}
                </button>
              </div>
            </form>
          </div>

          {/* Operator Action Controls */}
          {!isClosed ? (
            <div className="detail-actions-panel">
              <h4 className="detail-section-title">Control Room Actions</h4>

              {/* Assign Responder Form */}
              <form onSubmit={handleAssignSubmit} className="responder-assign-form">
                <label className="form-subheading">{t.assignUnit}:</label>
                <div className="form-row">
                  {!isCustomMode ? (
                    <select
                      className="auth-input-select"
                      value={selectedResponder}
                      onChange={(e) => {
                        if (e.target.value === 'CUSTOM') {
                          setIsCustomMode(true)
                        } else {
                          setSelectedResponder(e.target.value)
                        }
                      }}
                      disabled={isAssigning}
                    >
                      {PREDEFINED_SIMULATED_RESPONDERS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                      <option value="CUSTOM">+ Custom Simulated Unit Call</option>
                    </select>
                  ) : (
                    <div className="custom-input-group">
                      <input
                        type="text"
                        className="auth-input-text"
                        placeholder="Enter simulated unit name..."
                        value={customResponder}
                        onChange={(e) => setCustomResponder(e.target.value)}
                        disabled={isAssigning}
                      />
                      <button
                        type="button"
                        className="btn-text-cancel"
                        onClick={() => setIsCustomMode(false)}
                      >
                        Presets
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn-auth-action btn-assign"
                    disabled={isAssigning}
                  >
                    {isAssigning ? 'Updating Database...' : t.dispatchBtn}
                  </button>
                </div>
              </form>

              {/* Validated Close Incident Section */}
              <div className="validated-closure-box" style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
                <label className="form-subheading" style={{ display: 'block', marginBottom: '0.4rem' }}>{t.closureReason}:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <select
                    className="auth-input-select"
                    value={selectedClosureReason}
                    onChange={(e) => setSelectedClosureReason(e.target.value)}
                    disabled={isClosing}
                  >
                    {CLOSURE_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    className="auth-input-text"
                    placeholder={t.closureNotes}
                    value={closureNotes}
                    onChange={(e) => setClosureNotes(e.target.value)}
                    disabled={isClosing}
                  />

                  <button
                    type="button"
                    className="btn-auth-action btn-close"
                    onClick={handleCloseSubmit}
                    disabled={isClosing}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{isClosing ? 'Closing in SQLite...' : t.closeIncidentBtn}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="closed-incident-banner">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="closed-svg">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <div>
                <strong>Incident is CLOSED</strong>
                <p>
                  Reason: <em>{incident.closure_reason || 'Resolved / Verified Safe'}</em>
                  {incident.closure_notes ? ` • Debrief: ${incident.closure_notes}` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Simulated Disclaimer */}
          <div className="simulated-disclaimer-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="info-svg">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>
              All responder designations and dispatch actions are synthetically simulated for hackathon evaluation.
              No actual emergency services or real law enforcement were contacted.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="modal-action-btn" onClick={onClose}>
            {t.closeModal}
          </button>
        </div>
      </div>
    </div>
  )
}
