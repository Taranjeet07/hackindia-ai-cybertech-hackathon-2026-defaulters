import React from 'react'

export const RadarVisual: React.FC = () => {
  return (
    <div className="radar-wrapper" aria-hidden="true">
      <div className="radar-glow-underlay"></div>
      <div className="radar-container">
        {/* Radar Rings */}
        <div className="radar-ring ring-1"></div>
        <div className="radar-ring ring-2"></div>
        <div className="radar-ring ring-3"></div>
        
        {/* Radar Crosshairs */}
        <div className="radar-axis axis-h"></div>
        <div className="radar-axis axis-v"></div>

        {/* Rotating Radar Sweep */}
        <div className="radar-sweep"></div>

        {/* Simulated Telemetry Nodes */}
        <div className="radar-node node-safe" title="Safe Tourist Marker">
          <span className="node-ping"></span>
          <span className="node-label">Safe Zone • 98%</span>
        </div>

        <div className="radar-node node-alert" title="Risk Alert Marker">
          <span className="node-ping"></span>
          <span className="node-label">Steep Hazard</span>
        </div>

        <div className="radar-node node-geo" title="Active Geofence Marker">
          <span className="node-ping"></span>
          <span className="node-label">Geofence Boundary</span>
        </div>

        {/* Central Hub */}
        <div className="radar-center">
          <svg
            className="radar-center-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>

        {/* Live Status Tag */}
        <div className="radar-status-pill">
          <span className="status-live-dot"></span>
          <span>LIVE RADAR TELEMETRY</span>
        </div>
      </div>
    </div>
  )
}
