import React from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
import { useNetworkStatus } from '../../utils/offlineQueue'

interface TouristNavProps {
  onBackToOverview: () => void
}

export const TouristNav: React.FC<TouristNavProps> = ({ onBackToOverview }) => {
  const { language, toggleLanguage, t } = useLanguage()
  const { isOnline, pendingCount } = useNetworkStatus()

  return (
    <header className="tourist-nav-header">
      <div className="tourist-nav-container">
        {/* Left: Brand & Back link */}
        <div className="tourist-nav-left">
          <button className="tourist-back-btn" onClick={onBackToOverview} title={t.navOverview}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="back-arrow-icon">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>{t.navOverview}</span>
          </button>

          <div className="tourist-nav-divider"></div>

          <div className="tourist-brand-group">
            <div className="tourist-brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shield-icon">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <circle cx="12" cy="11" r="3" />
              </svg>
            </div>
            <span className="tourist-brand-title">
              Trail<span className="brand-accent">Safe</span>
            </span>
            <span className="tourist-section-tag">/ {t.touristProfile}</span>
          </div>
        </div>

        {/* Right: Controls & Badges */}
        <div className="tourist-nav-right">
          {/* Connectivity Status Pill */}
          <div className={`network-status-pill ${isOnline ? 'net-online' : 'net-offline'}`}>
            <span className={`net-dot ${isOnline ? 'dot-online' : 'dot-offline'}`}></span>
            <span>
              {isOnline ? t.liveStatusOnline : t.liveStatusOffline}
              {pendingCount > 0 ? ` (${pendingCount} ${t.queuedItems})` : ''}
            </span>
          </div>

          {/* Language Toggle Button */}
          <button
            className="lang-toggle-btn"
            onClick={toggleLanguage}
            title={language === 'en' ? 'Switch to Hindi (हिन्दी)' : 'Switch to English'}
          >
            🌐 {language === 'en' ? 'हिन्दी' : 'EN'}
          </button>

          {/* Demo mode badge */}
          <div className="demo-mode-badge">
            <span className="demo-pulse-dot"></span>
            <span>DEMO MODE</span>
          </div>
        </div>
      </div>
    </header>
  )
}

