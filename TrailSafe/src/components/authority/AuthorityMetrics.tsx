import React from 'react'
import type { IncidentRecord } from './types'
import { useLanguage } from '../../i18n/LanguageContext'

interface AuthorityMetricsProps {
  incidents: IncidentRecord[]
}

export const AuthorityMetrics: React.FC<AuthorityMetricsProps> = ({ incidents }) => {
  const { t } = useLanguage()
  const totalCount = incidents.length
  const openCount = incidents.filter((i) => i.status === 'OPEN').length
  const assignedCount = incidents.filter((i) => i.status === 'ASSIGNED').length
  const closedCount = incidents.filter((i) => i.status === 'CLOSED').length
  const criticalCount = incidents.filter((i) => i.severity === 'CRITICAL' && i.status !== 'CLOSED').length

  return (
    <div className="authority-metrics-grid">
      {/* Metric 1: Total Incidents */}
      <div className="auth-metric-card">
        <div className="metric-header">
          <span className="metric-label">{t.totalIncidents}</span>
          <div className="metric-icon-box icon-teal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="m-svg">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
        </div>
        <div className="metric-value-row">
          <span className="metric-number text-teal">{totalCount}</span>
          <span className="metric-subtext">Persisted in SQLite</span>
        </div>
      </div>

      {/* Metric 2: Open Distress Alerts */}
      <div className={`auth-metric-card ${openCount > 0 ? 'card-glow-amber' : ''}`}>
        <div className="metric-header">
          <span className="metric-label">{t.openIncidents}</span>
          <div className="metric-icon-box icon-amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="m-svg">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </div>
        <div className="metric-value-row">
          <span className="metric-number text-amber">{openCount}</span>
          <span className="metric-subtext">Awaiting Response</span>
        </div>
      </div>

      {/* Metric 3: Critical Severity */}
      <div className={`auth-metric-card ${criticalCount > 0 ? 'card-glow-red' : ''}`}>
        <div className="metric-header">
          <span className="metric-label">{t.criticalIncidents}</span>
          <div className="metric-icon-box icon-red">
            {criticalCount > 0 && <span className="critical-pulse-beacon" />}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="m-svg">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
        </div>
        <div className="metric-value-row">
          <span className="metric-number text-red">{criticalCount}</span>
          <span className="metric-subtext">Immediate Priority</span>
        </div>
      </div>

      {/* Metric 4: Assigned Responders */}
      <div className="auth-metric-card">
        <div className="metric-header">
          <span className="metric-label">{t.assignedIncidents}</span>
          <div className="metric-icon-box icon-cyan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="m-svg">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <polyline points="17 11 19 13 23 9" />
            </svg>
          </div>
        </div>
        <div className="metric-value-row">
          <span className="metric-number text-cyan">{assignedCount}</span>
          <span className="metric-subtext">Units Dispatched (Sim.)</span>
        </div>
      </div>

      {/* Metric 5: Closed / Resolved */}
      <div className="auth-metric-card">
        <div className="metric-header">
          <span className="metric-label">{t.resolvedIncidents}</span>
          <div className="metric-icon-box icon-green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="m-svg">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        </div>
        <div className="metric-value-row">
          <span className="metric-number text-emerald">{closedCount}</span>
          <span className="metric-subtext">Safely Closed</span>
        </div>
      </div>
    </div>
  )
}
