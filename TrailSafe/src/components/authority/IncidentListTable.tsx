import React, { useState, useMemo } from 'react'
import type { IncidentRecord } from './types'
import { useLanguage } from '../../i18n/LanguageContext'

interface IncidentListTableProps {
  incidents: IncidentRecord[]
  selectedIncidentId: string | null
  onSelectIncident: (incident: IncidentRecord) => void
  onQuickClose?: (incidentId: string) => void
}

type SortField = 'created_at' | 'risk_score' | 'severity' | 'status'

export const IncidentListTable: React.FC<IncidentListTableProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  onQuickClose,
}) => {
  const { t } = useLanguage()
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const handleHeaderSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const sortedIncidents = useMemo(() => {
    const list = [...incidents]
    const severityRank: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    }

    list.sort((a, b) => {
      let comparison = 0
      if (sortField === 'risk_score') {
        comparison = a.risk_score - b.risk_score
      } else if (sortField === 'severity') {
        comparison = (severityRank[a.severity] || 0) - (severityRank[b.severity] || 0)
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status)
      } else {
        // created_at
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
    return list
  }, [incidents, sortField, sortOrder])

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso)
      return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    } catch {
      return iso
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'SOS':
        return { label: 'SOS Distress', className: 'type-sos' }
      case 'RISKY_ZONE':
        return { label: 'Risky Zone', className: 'type-hazard' }
      case 'ROUTE_DEVIATION':
        return { label: 'Route Deviation', className: 'type-deviation' }
      case 'INACTIVITY':
        return { label: 'Inactivity', className: 'type-inactivity' }
      default:
        return { label: type, className: 'type-default' }
    }
  }

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return <span className="sort-indicator-inactive"> ↕</span>
    return <span className="sort-indicator-active"> {sortOrder === 'asc' ? '▲' : '▼'}</span>
  }

  return (
    <div className="incident-table-card">
      <div className="table-responsive-wrapper">
        <table className="authority-incidents-table">
          <thead>
            <tr>
              <th scope="col" className="sortable-th" onClick={() => handleHeaderSort('status')}>
                {t.tableStatus} {renderSortIndicator('status')}
              </th>
              <th scope="col">{t.tableId}</th>
              <th scope="col">{t.tableTourist}</th>
              <th scope="col">{t.tableType}</th>
              <th scope="col" className="sortable-th" onClick={() => handleHeaderSort('severity')}>
                {t.tableSeverity} {renderSortIndicator('severity')}
              </th>
              <th scope="col" className="sortable-th" onClick={() => handleHeaderSort('risk_score')}>
                {t.tableRisk} {renderSortIndicator('risk_score')}
              </th>
              <th scope="col">{t.tableResponder}</th>
              <th scope="col" className="sortable-th" onClick={() => handleHeaderSort('created_at')}>
                {t.tableTime} {renderSortIndicator('created_at')}
              </th>
              <th scope="col" className="text-right">{t.tableActions}</th>
            </tr>
          </thead>
          <tbody>
            {sortedIncidents.map((incident) => {
              const isSelected = incident.id === selectedIncidentId
              const isCritical = incident.severity === 'CRITICAL'
              const isOpen = incident.status === 'OPEN'
              const isAssigned = incident.status === 'ASSIGNED'
              const isClosed = incident.status === 'CLOSED'
              const typeInfo = getTypeBadge(incident.incident_type)

              return (
                <tr
                  key={incident.id}
                  className={`incident-table-row ${isSelected ? 'row-selected' : ''} ${
                    isCritical && !isClosed ? 'row-critical-active' : ''
                  } ${isClosed ? 'row-closed' : ''}`}
                  onClick={() => onSelectIncident(incident)}
                >
                  {/* Status */}
                  <td>
                    <span className={`status-pill pill-${incident.status.toLowerCase()}`}>
                      {isOpen && <span className="pill-dot dot-red-pulse" />}
                      {isAssigned && <span className="pill-dot dot-cyan" />}
                      {isClosed && <span className="pill-dot dot-gray" />}
                      {incident.status}
                    </span>
                  </td>

                  {/* Incident ID */}
                  <td>
                    <div className="incident-id-cell">
                      {isCritical && !isClosed && (
                        <span className="beacon-mini-beacon" title="Critical Distress Incident">
                          <span className="mini-core" />
                          <span className="mini-ring" />
                        </span>
                      )}
                      <span className="mono-id">{incident.id}</span>
                    </div>
                  </td>

                  {/* Tourist ID */}
                  <td>
                    <span className="tourist-id-cell">{incident.tourist_id}</span>
                  </td>

                  {/* Incident Type */}
                  <td>
                    <span className={`type-tag ${typeInfo.className}`}>{typeInfo.label}</span>
                  </td>

                  {/* Severity */}
                  <td>
                    <span className={`severity-tag sev-${incident.severity.toLowerCase()}`}>
                      {incident.severity}
                    </span>
                  </td>

                  {/* Risk Score */}
                  <td>
                    <div className="risk-score-cell">
                      <span
                        className={`risk-cell-num ${
                          incident.risk_score >= 80
                            ? 'text-red'
                            : incident.risk_score >= 50
                            ? 'text-amber'
                            : 'text-teal'
                        }`}
                      >
                        {incident.risk_score}
                      </span>
                      <div className="risk-track-sm">
                        <div
                          className={`risk-fill-sm ${
                            incident.risk_score >= 80
                              ? 'bg-red'
                              : incident.risk_score >= 50
                              ? 'bg-amber'
                              : 'bg-teal'
                          }`}
                          style={{ width: `${incident.risk_score}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Assigned Responder */}
                  <td>
                    {incident.assigned_responder ? (
                      <span className="responder-cell-tag" title={incident.assigned_responder}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="unit-svg">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="8.5" cy="7" r="4" />
                        </svg>
                        <span className="responder-name-text">{incident.assigned_responder}</span>
                      </span>
                    ) : (
                      <span className="unassigned-text">Unassigned</span>
                    )}
                  </td>

                  {/* Recorded Time */}
                  <td>
                    <span className="time-text">{formatTime(incident.created_at)}</span>
                  </td>

                  {/* Actions */}
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="action-buttons-cell">
                      <button
                        className="btn-table-inspect"
                        onClick={() => onSelectIncident(incident)}
                        title="Inspect full incident details"
                      >
                        Inspect
                      </button>

                      {!isClosed && onQuickClose && (
                        <button
                          className="btn-table-close"
                          onClick={() => onQuickClose(incident.id)}
                          title="Quick Close Incident in Database"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
