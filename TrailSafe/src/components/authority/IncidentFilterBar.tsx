import React from 'react'
import type { StatusFilterOption, SeverityFilterOption, TypeFilterOption } from './types'
import { useLanguage } from '../../i18n/LanguageContext'

interface IncidentFilterBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: StatusFilterOption
  onStatusFilterChange: (status: StatusFilterOption) => void
  severityFilter: SeverityFilterOption
  onSeverityFilterChange: (severity: SeverityFilterOption) => void
  typeFilter: TypeFilterOption
  onTypeFilterChange: (type: TypeFilterOption) => void
  onResetFilters: () => void
  totalCount: number
  filteredCount: number
}

export const IncidentFilterBar: React.FC<IncidentFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  severityFilter,
  onSeverityFilterChange,
  typeFilter,
  onTypeFilterChange,
  onResetFilters,
  totalCount,
  filteredCount,
}) => {
  const { t } = useLanguage()
  const isFiltered =
    searchQuery.trim() !== '' ||
    statusFilter !== 'ALL' ||
    severityFilter !== 'ALL' ||
    typeFilter !== 'ALL'

  return (
    <div className="incident-filter-bar">
      {/* Search Input */}
      <div className="filter-search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-svg">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder={t.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search incidents"
        />
        {searchQuery && (
          <button
            className="search-clear-btn"
            onClick={() => onSearchChange('')}
            title="Clear search query"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown Filters */}
      <div className="filter-dropdowns-group">
        {/* Status Filter */}
        <div className="filter-select-wrapper">
          <label className="select-label">{t.filterStatus}</label>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as StatusFilterOption)}
          >
            <option value="ALL">{t.filterAll} ({totalCount})</option>
            <option value="OPEN">{t.filterOpen}</option>
            <option value="ASSIGNED">{t.filterAssigned}</option>
            <option value="CLOSED">{t.filterClosed}</option>
          </select>
        </div>

        {/* Severity Filter */}
        <div className="filter-select-wrapper">
          <label className="select-label">{t.filterSeverity}</label>
          <select
            className="filter-select"
            value={severityFilter}
            onChange={(e) => onSeverityFilterChange(e.target.value as SeverityFilterOption)}
          >
            <option value="ALL">{t.filterAll}</option>
            <option value="CRITICAL">{t.filterCritical} (90–100)</option>
            <option value="HIGH">{t.filterHigh} (70-99)</option>
            <option value="MEDIUM">{t.filterMedium} (40-69)</option>
            <option value="LOW">{t.filterLow} (0-39)</option>
          </select>
        </div>

        {/* Type Filter */}
        <div className="filter-select-wrapper">
          <label className="select-label">{t.filterType}</label>
          <select
            className="filter-select"
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value as TypeFilterOption)}
          >
            <option value="ALL">{t.filterAll}</option>
            <option value="SOS">SOS Distress</option>
            <option value="RISKY_ZONE">Risky-Zone Breach</option>
            <option value="ROUTE_DEVIATION">Route Deviation</option>
            <option value="INACTIVITY">Inactivity Warning</option>
          </select>
        </div>

        {/* Reset button if filter is active */}
        {isFiltered && (
          <button className="btn-reset-filters" onClick={onResetFilters} title="Reset all filters">
            {t.clearFilters} ({filteredCount}/{totalCount})
          </button>
        )}
      </div>
    </div>
  )
}
