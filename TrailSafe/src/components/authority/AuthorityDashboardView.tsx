import React, { useState, useEffect, useCallback } from 'react'
import { AuthorityNav } from './AuthorityNav'
import { AuthorityMetrics } from './AuthorityMetrics'
import { IncidentFilterBar } from './IncidentFilterBar'
import { IncidentListTable } from './IncidentListTable'
import { IncidentDetailModal } from './IncidentDetailModal'
import { IncidentMap } from './IncidentMap'
import { AuthorityAnalyticsModal } from './AuthorityAnalyticsModal'
import { ResponderManagementModal } from './ResponderManagementModal'
import { useLanguage } from '../../i18n/LanguageContext'
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api'
import type {
  IncidentRecord,
  ResponderUnit,
  GeofenceZone,
  StatusFilterOption,
  SeverityFilterOption,
  TypeFilterOption,
} from './types'
import './AuthorityDashboard.css'

interface AuthorityDashboardViewProps {
  onBackToOverview: () => void
  onOpenTouristApp: () => void
}

const BACKEND_INCIDENTS_URL = API_ENDPOINTS.incidents
const BACKEND_RESPONDERS_URL = API_ENDPOINTS.responders
const BACKEND_GEOFENCES_URL = API_ENDPOINTS.geofences

export const AuthorityDashboardView: React.FC<AuthorityDashboardViewProps> = ({
  onBackToOverview,
  onOpenTouristApp,
}) => {
  const { t } = useLanguage()
  const [incidents, setIncidents] = useState<IncidentRecord[]>([])
  const [responders, setResponders] = useState<ResponderUnit[]>([])
  const [geofences, setGeofences] = useState<GeofenceZone[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'COMBINED' | 'MAP_FOCUS' | 'TABLE_FOCUS'>('COMBINED')

  // Selected Incident & Inspection Modal State
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false)
  const [isRespondersOpen, setIsRespondersOpen] = useState<boolean>(false)

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('ALL')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilterOption>('ALL')
  const [typeFilter, setTypeFilter] = useState<TypeFilterOption>('ALL')

  // Real API Fetch for incidents, responders, and geofences
  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setFetchError(null)

    try {
      const [incRes, respRes, geoRes] = await Promise.all([
        fetch(BACKEND_INCIDENTS_URL),
        fetch(BACKEND_RESPONDERS_URL),
        fetch(BACKEND_GEOFENCES_URL),
      ])

      if (!incRes.ok) throw new Error(`HTTP ${incRes.status} ${incRes.statusText}`)
      const incData = await incRes.json()
      if (Array.isArray(incData)) {
        setIncidents(incData)
        setSelectedIncident((prev) => {
          if (!prev) return null
          const updated = incData.find((i: IncidentRecord) => i.id === prev.id)
          return updated || prev
        })
      }

      if (respRes.ok) {
        const respData = await respRes.json()
        if (Array.isArray(respData)) setResponders(respData)
      }

      if (geoRes.ok) {
        const geoData = await geoRes.json()
        if (Array.isArray(geoData)) setGeofences(geoData)
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : `Failed to connect to FastAPI backend at ${API_BASE_URL}. Ensure the backend server is running.`
      setFetchError(msg)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    void loadData(false)
  }, [loadData])

  // Periodic polling every 8 seconds to automatically mirror new transmissions & responder states
  useEffect(() => {
    const timer = setInterval(() => {
      void loadData(true)
    }, 8000)
    return () => clearInterval(timer)
  }, [loadData])

  // Handle Assign Responder via backend PATCH /api/incidents/{id}/assign
  const handleAssignResponder = async (incidentId: string, responderName: string) => {
    const response = await fetch(`${BACKEND_INCIDENTS_URL}/${incidentId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assigned_responder: responderName }),
    })

    if (!response.ok) {
      let errMessage = `HTTP ${response.status} ${response.statusText}`
      try {
        const body = await response.json()
        if (body?.detail) {
          errMessage = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
        }
      } catch {
        // Fall back
      }
      throw new Error(errMessage)
    }

    const updatedIncident: IncidentRecord = await response.json()
    // Refresh incident list and reload live responder status immediately
    setIncidents((prev) => prev.map((inc) => (inc.id === incidentId ? updatedIncident : inc)))
    setSelectedIncident(updatedIncident)
    void loadData(true)
  }

  // Handle Close Incident via backend PATCH /api/incidents/{id}/close
  const handleCloseIncident = async (
    incidentId: string,
    closureReason?: string,
    closureNotes?: string
  ) => {
    const response = await fetch(`${BACKEND_INCIDENTS_URL}/${incidentId}/close`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        closure_reason: closureReason || 'Resolved / Verified Safe',
        closure_notes: closureNotes || undefined,
        author: 'Authority Operator',
        closed_by: 'Authority Operator',
      }),
    })

    if (!response.ok) {
      let errMessage = `HTTP ${response.status} ${response.statusText}`
      try {
        const body = await response.json()
        if (body?.detail) {
          errMessage = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
        }
      } catch {
        // Fall back
      }
      throw new Error(errMessage)
    }

    const updatedIncident: IncidentRecord = await response.json()
    // Refresh incident list and release responder in state
    setIncidents((prev) => prev.map((inc) => (inc.id === incidentId ? updatedIncident : inc)))
    setSelectedIncident(updatedIncident)
    void loadData(true)
  }


  // Filter Logic
  const filteredIncidents = incidents.filter((incident) => {
    // Search query matches ID, tourist ID, description, or responder
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchId = incident.id.toLowerCase().includes(q)
      const matchTourist = incident.tourist_id.toLowerCase().includes(q)
      const matchDesc = incident.description.toLowerCase().includes(q)
      const matchResp = (incident.assigned_responder || '').toLowerCase().includes(q)
      const matchLoc = (incident.location_name || '').toLowerCase().includes(q)
      if (!matchId && !matchTourist && !matchDesc && !matchResp && !matchLoc) return false
    }

    // Status filter
    if (statusFilter !== 'ALL' && incident.status !== statusFilter) {
      return false
    }

    // Severity filter
    if (severityFilter !== 'ALL' && incident.severity !== severityFilter) {
      return false
    }

    // Type filter
    if (typeFilter !== 'ALL' && incident.incident_type !== typeFilter) {
      return false
    }

    return true
  })

  const handleOpenInspector = (incident: IncidentRecord) => {
    setSelectedIncident(incident)
    setIsModalOpen(true)
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setStatusFilter('ALL')
    setSeverityFilter('ALL')
    setTypeFilter('ALL')
  }

  return (
    <div className="authority-dashboard-wrapper">
      {/* 1. Header Navigation */}
      <AuthorityNav
        onBackToOverview={onBackToOverview}
        onOpenTouristApp={onOpenTouristApp}
        onRefresh={() => loadData(true)}
        isRefreshing={isRefreshing}
      />

      {/* Simulated Command-Room Disclaimer Banner */}
      <div className="authority-disclaimer-banner">
        <div className="disclaimer-inner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="disclaimer-icon-svg">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <p>
            <strong>COMMAND ROOM ENVIRONMENT (SIMULATION):</strong> {t.demoDisclaimerAuthority}
          </p>
        </div>
      </div>

      <main className="authority-main-container">
        {/* Page Header */}
        <div className="authority-page-header">
          <div className="page-header-text">
            <div className="auth-preheading">CONNECTED PUBLIC SAFETY OPERATIONS</div>
            <h1 className="auth-page-title">{t.authorityTitle}</h1>
            <p className="auth-page-subtitle">{t.authoritySubtitle}</p>
          </div>

          {/* View Mode Switcher and Quick Tools */}
          <div className="view-mode-toggle-bar">
            <button
              className="view-toggle-btn btn-tool-pill"
              onClick={() => setIsAnalyticsOpen(true)}
              title="View operational analytics computed from database"
            >
              📊 {t.analyticsBtn}
            </button>
            <button
              className="view-toggle-btn btn-tool-pill"
              onClick={() => setIsRespondersOpen(true)}
              title="View and update simulated patrol units"
            >
              🚔 {t.respondersBtn}
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'COMBINED' ? 'active' : ''}`}
              onClick={() => setViewMode('COMBINED')}
            >
              🌐 {t.viewCombined}
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'MAP_FOCUS' ? 'active' : ''}`}
              onClick={() => setViewMode('MAP_FOCUS')}
            >
              🗺️ {t.viewMapFocus}
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'TABLE_FOCUS' ? 'active' : ''}`}
              onClick={() => setViewMode('TABLE_FOCUS')}
            >
              📋 {t.viewTableFocus}
            </button>
          </div>

        </div>

        {/* 2. Telemetry Overview Metrics */}
        <AuthorityMetrics incidents={incidents} />

        {/* 3. Live Incident Map (Rendered when in COMBINED or MAP_FOCUS mode) */}
        {viewMode !== 'TABLE_FOCUS' && (
          <IncidentMap
            incidents={viewMode === 'MAP_FOCUS' ? incidents : filteredIncidents}
            responders={responders}
            geofences={geofences}
            selectedIncidentId={selectedIncident?.id || null}
            onSelectIncident={handleOpenInspector}
            isLoading={isLoading}
            fetchError={fetchError}
          />
        )}

        {/* 4. Search & Filter Bar (Rendered when in COMBINED or TABLE_FOCUS mode) */}
        {viewMode !== 'MAP_FOCUS' && (
          <IncidentFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            severityFilter={severityFilter}
            onSeverityFilterChange={setSeverityFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            onResetFilters={handleResetFilters}
            totalCount={incidents.length}
            filteredCount={filteredIncidents.length}
          />
        )}

        {/* 5. Main Incident List Table / States (Rendered when in COMBINED or TABLE_FOCUS mode) */}
        {viewMode !== 'MAP_FOCUS' && (
          <>
            {isLoading ? (
              <div className="auth-loading-card">
                <span className="spinner-auth" />
                <span className="loading-text">Connecting to FastAPI backend at {API_BASE_URL}...</span>
              </div>
            ) : fetchError ? (
              <div className="auth-error-card">
                <div className="error-icon-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="error-svg">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="error-body">
                  <h3 className="error-title">Backend Connection Error</h3>
                  <p className="error-desc">{fetchError}</p>
                  <button className="btn-retry" onClick={() => loadData()}>
                    Retry Connection
                  </button>
                </div>
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="auth-empty-card">
                <div className="empty-icon-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-svg">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <h3 className="empty-title">
                  {incidents.length === 0 ? 'No Incidents in Database' : 'No Incidents Match Selected Filters'}
                </h3>
                <p className="empty-desc">
                  {incidents.length === 0
                    ? 'No incidents are currently recorded in the SQLite database. Use the Tourist App to trigger a simulated SOS distress signal.'
                    : 'Try adjusting your search query, status, or severity filters to view recorded incidents.'}
                </p>
                {incidents.length > 0 && (
                  <button className="btn-auth-action" onClick={handleResetFilters}>
                    {t.clearFilters}
                  </button>
                )}
              </div>
            ) : (
              <IncidentListTable
                incidents={filteredIncidents}
                selectedIncidentId={selectedIncident?.id || null}
                onSelectIncident={handleOpenInspector}
                onQuickClose={handleCloseIncident}
              />
            )}
          </>
        )}
      </main>

      {/* 6. Incident Inspector Modal with Explainable Risk Breakdown */}
      <IncidentDetailModal
        incident={selectedIncident}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAssignResponder={handleAssignResponder}
        onCloseIncident={handleCloseIncident}
        onNoteAdded={() => loadData(true)}
      />

      {/* 7. Operational Analytics Modal */}
      <AuthorityAnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
      />

      {/* 8. Responder Management Modal */}
      <ResponderManagementModal
        isOpen={isRespondersOpen}
        onClose={() => setIsRespondersOpen(false)}
        onResponderUpdated={() => loadData(true)}
      />
    </div>
  )
}

