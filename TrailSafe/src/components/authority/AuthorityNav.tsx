import React from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
import { useNetworkStatus } from '../../utils/offlineQueue'

interface AuthorityNavProps {
  onBackToOverview: () => void
  onOpenTouristApp: () => void
  onRefresh: () => void
  isRefreshing?: boolean
}

export const AuthorityNav: React.FC<AuthorityNavProps> = ({
  onBackToOverview,
  onOpenTouristApp,
  onRefresh,
  isRefreshing = false,
}) => {
  const { language, toggleLanguage, t } = useLanguage()
  const { isOnline, pendingCount } = useNetworkStatus()

  return (
    <header className="authority-nav-header">
      <div className="authority-nav-container">
        <div className="authority-nav-left">
          <button
            className="authority-back-btn"
            onClick={onBackToOverview}
            title={t.navOverview}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="back-arrow-icon">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>{t.navOverview}</span>
          </button>

          <div className="authority-nav-divider" />

          <div className="authority-brand-group">
            <div className="authority-brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="brand-svg">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div>
              <div className="authority-brand-title">
                Trail<span className="brand-accent">Safe</span> {t.navControlRoom}
              </div>
              <div className="authority-section-tag">Authority Incident Dispatch & Monitoring</div>
            </div>
          </div>
        </div>

        <div className="authority-nav-right">
          {/* Connectivity Status */}
          <div className={`network-status-pill ${isOnline ? 'net-online' : 'net-offline'}`}>
            <span className={`net-dot ${isOnline ? 'dot-online' : 'dot-offline'}`}></span>
            <span>
              {isOnline ? t.liveStatusOnline : t.liveStatusOffline}
              {pendingCount > 0 ? ` (${pendingCount} ${t.queuedItems})` : ''}
            </span>
          </div>

          {/* Language Toggle */}
          <button
            className="lang-toggle-btn"
            onClick={toggleLanguage}
            title={language === 'en' ? 'Switch to Hindi (हिन्दी)' : 'Switch to English'}
          >
            🌐 {language === 'en' ? 'हिन्दी' : 'EN'}
          </button>

          <span className="control-room-badge">
            <span className="control-pulse-dot" />
            CONTROL ROOM (SIMULATED)
          </span>

          <button
            className="btn-authority-refresh"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh Incident Telemetry from SQLite Backend"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`refresh-icon ${isRefreshing ? 'spin-anim' : ''}`}
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            <span>{isRefreshing ? t.refreshing : t.refresh}</span>
          </button>

          <button
            className="btn-switch-tourist"
            onClick={onOpenTouristApp}
            title={t.navTourist}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="switch-icon">
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{t.navTourist}</span>
          </button>
        </div>
      </div>
    </header>
  )
}

