import React, { useEffect, useRef, useState, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { IncidentRecord, ResponderUnit, GeofenceZone } from './types'
import { useLanguage } from '../../i18n/LanguageContext'
import { API_ENDPOINTS } from '../../config/api'

// Fix default Leaflet icon paths in Vite / modern bundlers
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
})

interface IncidentMapProps {
  incidents: IncidentRecord[]
  responders?: ResponderUnit[]
  geofences?: GeofenceZone[]
  selectedIncidentId: string | null
  onSelectIncident: (incident: IncidentRecord) => void
  isLoading?: boolean
  fetchError?: string | null
}

interface ResolvedLocation {
  lat: number
  lng: number
  name: string
  isSyntheticFallback: boolean
}

// Deterministic synthetic demo anchors for records with missing GPS coordinates
const DEMO_WAYPOINTS = [
  { name: 'Bada Imambara Corridor (Synthetic Demo Anchor)', lat: 26.8688, lng: 80.9130 },
  { name: 'Rumi Darwaza Gateway (Synthetic Demo Anchor)', lat: 26.8715, lng: 80.9118 },
  { name: 'The Residency Heritage Grounds (Synthetic Demo Anchor)', lat: 26.8610, lng: 80.9270 },
  { name: 'Hazratganj Cultural Promenade (Synthetic Demo Anchor)', lat: 26.8500, lng: 80.9490 },
  { name: 'Gomti Riverfront Safety Buffer (Synthetic Demo Anchor)', lat: 26.8530, lng: 80.9620 },
  { name: 'La Martiniere Historical Zone (Synthetic Demo Anchor)', lat: 26.8370, lng: 80.9680 },
]

// Designated tourist safety corridor waypoints (Lucknow Heritage Trail)
const TOURIST_CORRIDOR_PATH: [number, number][] = [
  [26.8688, 80.9130],
  [26.8715, 80.9118],
  [26.8610, 80.9270],
  [26.8500, 80.9490],
  [26.8530, 80.9620],
]

// Simulated active tourist location (TS-DEMO-001)
const DEMO_TOURIST_COORDINATES: [number, number] = [26.8500, 80.9490]

export const IncidentMap: React.FC<IncidentMapProps> = ({
  incidents,
  responders: propsResponders,
  geofences: propsGeofences,
  selectedIncidentId,
  onSelectIncident,
  isLoading = false,
  fetchError = null,
}) => {
  const { t } = useLanguage()
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const respondersLayerRef = useRef<L.LayerGroup | null>(null)
  const featuresLayerRef = useRef<L.LayerGroup | null>(null)

  const [mapReady, setMapReady] = useState<boolean>(false)
  const [tileLoadError, setTileLoadError] = useState<boolean>(false)
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'CRITICAL'>('ALL')
  const [showCorridorLayers, setShowCorridorLayers] = useState<boolean>(true)

  // Internal fallback states in case props are not passed
  const [internalGeofences, setInternalGeofences] = useState<GeofenceZone[]>([])
  const [internalResponders, setInternalResponders] = useState<ResponderUnit[]>([])

  // Fetch geofences and responders as fallback if not supplied by parent
  useEffect(() => {
    let isCancelled = false
    if (!propsGeofences || propsGeofences.length === 0) {
      fetch(API_ENDPOINTS.geofences)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (!isCancelled && Array.isArray(data)) setInternalGeofences(data)
        })
        .catch(() => {})
    }

    if (!propsResponders || propsResponders.length === 0) {
      fetch(API_ENDPOINTS.responders)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (!isCancelled && Array.isArray(data)) setInternalResponders(data)
        })
        .catch(() => {})
    }

    return () => {
      isCancelled = true
    }
  }, [propsGeofences, propsResponders])

  // Active geofences and responders with fallback
  const geofences = useMemo(() => {
    return (propsGeofences && propsGeofences.length > 0) ? propsGeofences : internalGeofences
  }, [propsGeofences, internalGeofences])

  const responders = useMemo(() => {
    return (propsResponders && propsResponders.length > 0) ? propsResponders : internalResponders
  }, [propsResponders, internalResponders])

  // Resolve location for an incident: actual stored coordinates if present, or deterministic synthetic fallback
  const resolveLocation = (incident: IncidentRecord): ResolvedLocation => {
    if (
      incident.latitude !== undefined &&
      incident.latitude !== null &&
      incident.longitude !== undefined &&
      incident.longitude !== null &&
      !isNaN(Number(incident.latitude)) &&
      !isNaN(Number(incident.longitude))
    ) {
      return {
        lat: Number(incident.latitude),
        lng: Number(incident.longitude),
        name: incident.location_name || 'Recorded GPS Telemetry',
        isSyntheticFallback: false,
      }
    }

    const hash = incident.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const wp = DEMO_WAYPOINTS[hash % DEMO_WAYPOINTS.length]
    return {
      lat: wp.lat,
      lng: wp.lng,
      name: `${wp.name}`,
      isSyntheticFallback: true,
    }
  }

  // Filtered incidents for map display based on map quick filter
  const mapIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (activeFilter === 'ACTIVE') return inc.status !== 'CLOSED'
      if (activeFilter === 'CRITICAL') return inc.severity === 'CRITICAL' && inc.status !== 'CLOSED'
      return true
    })
  }, [incidents, activeFilter])

  // Responder status counts for legend and toolbar
  const responderStats = useMemo(() => {
    const assigned = responders.filter((r) => r.status === 'ASSIGNED').length
    const available = responders.filter((r) => r.status === 'AVAILABLE').length
    const offDuty = responders.filter((r) => r.status === 'OFF_DUTY').length
    return { total: responders.length, assigned, available, offDuty }
  }, [responders])

  // Initialize Leaflet map with standard OpenStreetMap tiles (ZERO API key required)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [26.856, 80.938],
      zoom: 13,
      minZoom: 11,
      maxZoom: 19,
      zoomControl: false,
    })

    const osmTileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    })

    osmTileLayer.on('tileerror', (err) => {
      console.warn('OpenStreetMap tile loading notification:', err)
      setTileLoadError(true)
    })

    osmTileLayer.on('load', () => {
      setTileLoadError(false)
    })

    osmTileLayer.addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const featuresGroup = L.layerGroup().addTo(map)
    const respondersGroup = L.layerGroup().addTo(map)
    const markersGroup = L.layerGroup().addTo(map)

    featuresLayerRef.current = featuresGroup
    respondersLayerRef.current = respondersGroup
    markersLayerRef.current = markersGroup
    mapInstanceRef.current = map
    setMapReady(true)

    // Schedule an initial size invalidation once DOM layout settles
    const initTimer = setTimeout(() => {
      map.invalidateSize({ animate: false })
    }, 150)

    return () => {
      clearTimeout(initTimer)
      map.remove()
      mapInstanceRef.current = null
      markersLayerRef.current = null
      respondersLayerRef.current = null
      featuresLayerRef.current = null
    }
  }, [])

  // Recalculate map dimensions whenever container element resizes or dashboard layout shifts
  useEffect(() => {
    const container = mapContainerRef.current
    if (!container || !mapReady) return

    let resizeTimer: ReturnType<typeof setTimeout> | null = null

    const observer = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize({ animate: false })
        }
      }, 100)
    })

    observer.observe(container)

    return () => {
      observer.disconnect()
      if (resizeTimer) clearTimeout(resizeTimer)
    }
  }, [mapReady])

  // Render Geofence boundaries, Tourist Corridor Route, and Demo Tourist
  useEffect(() => {
    const layer = featuresLayerRef.current
    if (!layer) return

    layer.clearLayers()

    if (showCorridorLayers) {
      // 1. Designated Tourist Trail Polyline
      const routePolyline = L.polyline(TOURIST_CORRIDOR_PATH, {
        color: '#14b8a6',
        weight: 3.5,
        opacity: 0.8,
        dashArray: '6, 8',
      })
      routePolyline.bindPopup(`
        <div class="leaflet-incident-popup">
          <div class="popup-top-row">
            <span class="popup-status-pill status-open">APPROVED CORRIDOR</span>
          </div>
          <h4 class="popup-title">Designated Tourist Safety Corridor</h4>
          <p class="loc-synthetic-note">Monitored heritage route connecting Bada Imambara, Rumi Darwaza, Residency, and Hazratganj.</p>
        </div>
      `)
      routePolyline.addTo(layer)

      // 2. Render all geofence zones from database
      geofences.forEach((zone) => {
        const isRestricted = zone.zone_type === 'RESTRICTED'
        const isCaution = zone.zone_type === 'CAUTION'
        const color = isRestricted ? '#ef4444' : isCaution ? '#f59e0b' : '#10b981'
        const fillOpacity = isRestricted ? 0.22 : isCaution ? 0.14 : 0.08

        const circle = L.circle([zone.latitude, zone.longitude], {
          radius: zone.radius_meters,
          color,
          fillColor: color,
          fillOpacity,
          weight: 2,
          dashArray: isRestricted ? '4, 4' : isCaution ? '5, 5' : undefined,
        })

        circle.bindPopup(`
          <div class="leaflet-incident-popup">
            <div class="popup-top-row">
              <span class="popup-status-pill" style="background: rgba(255,255,255,0.15); color: ${color};">
                ${zone.zone_type} GEOFENCE
              </span>
              <span class="popup-id">${zone.id}</span>
            </div>
            <h4 class="popup-title">${zone.name}</h4>
            <p class="loc-synthetic-note" style="margin-bottom: 0.35rem;">${zone.description}</p>
            <div class="popup-location-box">
              <div class="loc-head">Radius: ${zone.radius_meters}m • Weight: +${zone.zone_type === 'RESTRICTED' ? '80' : zone.zone_type === 'CAUTION' ? '40' : '0'} risk</div>
              <div class="loc-coords">Lat: ${zone.latitude}° N, Lng: ${zone.longitude}° E</div>
            </div>
          </div>
        `)
        circle.addTo(layer)
      })

      // 3. Simulated Demo Tourist Location Marker
      const touristHtml = `
        <div class="custom-tourist-marker" title="Demo Tourist TS-DEMO-001 (Simulated)">
          <div class="tourist-core">👤</div>
          <div class="tourist-tag">TS-DEMO-001 (Sim.)</div>
        </div>
      `
      const touristIcon = L.divIcon({
        className: 'custom-leaflet-div-icon',
        html: touristHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
      })

      const touristMarker = L.marker(DEMO_TOURIST_COORDINATES, { icon: touristIcon })
      touristMarker.bindPopup(`
        <div class="leaflet-incident-popup">
          <div class="popup-top-row">
            <span class="popup-status-pill status-assigned">TOURIST (DEMO)</span>
            <span class="popup-id">TS-DEMO-001</span>
          </div>
          <h4 class="popup-title">Demo Tourist Position</h4>
          <div class="popup-location-box">
            <div class="loc-head">📍 Hazratganj Promenade (Simulated Telemetry)</div>
            <div class="loc-coords">Lat: 26.8500° N, Lng: 80.9490° E</div>
          </div>
          <div class="loc-synthetic-note" style="margin-top: 0.35rem;">
            Simulation Notice: Coordinates are synthetic excursion telemetry. No actual device GPS is accessed.
          </div>
        </div>
      `)
      touristMarker.addTo(layer)
    }
  }, [showCorridorLayers, geofences])

  // Render Simulated Responders on the map (synchronized with backend responder records)
  useEffect(() => {
    const layer = respondersLayerRef.current
    if (!layer) return

    layer.clearLayers()

    responders.forEach((resp) => {
      const isAssigned = resp.status === 'ASSIGNED'
      const isAvail = resp.status === 'AVAILABLE'

      // If assigned to an active incident, check if incident has stored coordinates
      let respLat = resp.latitude
      let respLng = resp.longitude

      if (isAssigned && resp.current_incident_id) {
        const assignedInc = incidents.find((i) => i.id === resp.current_incident_id)
        if (assignedInc) {
          const incLoc = resolveLocation(assignedInc)
          respLat = incLoc.lat + 0.0025
          respLng = incLoc.lng + 0.003
        }
      }

      const shortName = resp.name.split(' - ')[0] || resp.id
      const statusClass = isAssigned ? 'resp-assigned' : isAvail ? 'resp-avail' : 'resp-off'

      const responderHtml = `
        <div class="custom-responder-marker ${statusClass}" title="${resp.name}">
          ${isAssigned ? '<span class="resp-pulse-beacon"></span>' : ''}
          <div class="resp-core">🚔</div>
          <div class="resp-tag">${shortName} (${isAssigned ? 'Active' : isAvail ? 'Standby' : 'Off'})</div>
        </div>
      `

      const responderIcon = L.divIcon({
        className: 'custom-leaflet-responder-icon',
        html: responderHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
      })

      const respMarker = L.marker([respLat, respLng], { icon: responderIcon })

      const respPopupHtml = `
        <div class="leaflet-incident-popup responder-popup">
          <div class="popup-top-row">
            <span class="popup-status-pill ${isAssigned ? 'status-assigned' : isAvail ? 'status-open' : 'status-closed'}">
              ${resp.status} (SIMULATED)
            </span>
            <span class="popup-id">${resp.id}</span>
          </div>
          <h4 class="popup-title">🚔 ${resp.name}</h4>
          <div class="popup-meta-grid">
            <div><span class="p-label">Role:</span> <span class="p-val">${resp.role}</span></div>
            <div><span class="p-label">Radio:</span> <span class="p-val">${resp.contact_number}</span></div>
            <div><span class="p-label">Status:</span> <span class="p-val">${resp.status}</span></div>
            ${
              resp.current_incident_id
                ? `<div><span class="p-label">Assigned:</span> <span class="p-val" style="color: #38bdf8;">${resp.current_incident_id}</span></div>`
                : '<div><span class="p-label">Deployment:</span> <span class="p-val text-teal">Standby Sector</span></div>'
            }
          </div>
          <div class="popup-location-box">
            <div class="loc-head">📍 Telemetry Coordinates</div>
            <div class="loc-coords">Lat: ${respLat.toFixed(4)}° N, Lng: ${respLng.toFixed(4)}° E</div>
          </div>
          <div class="loc-synthetic-note" style="margin-top: 0.35rem;">
            Simulation Notice: All responder designations, coordinates, and dispatches are synthetic demo constructs. No physical emergency vehicles are contacted.
          </div>
        </div>
      `

      respMarker.bindPopup(respPopupHtml, { maxWidth: 300, className: 'trailsafe-leaflet-popup' })
      respMarker.addTo(layer)
    })
  }, [responders, incidents])

  // Update incident markers
  useEffect(() => {
    const map = mapInstanceRef.current
    const layerGroup = markersLayerRef.current
    if (!map || !layerGroup) return

    layerGroup.clearLayers()

    mapIncidents.forEach((incident) => {
      const loc = resolveLocation(incident)
      const isSelected = incident.id === selectedIncidentId
      const isClosed = incident.status === 'CLOSED'
      const isCritical = incident.severity === 'CRITICAL'
      const isHigh = incident.severity === 'HIGH'
      const isMedium = incident.severity === 'MEDIUM'

      // Color scheme
      const colorClass = isClosed
        ? 'pin-closed'
        : isCritical
        ? 'pin-critical'
        : isHigh
        ? 'pin-high'
        : isMedium
        ? 'pin-medium'
        : 'pin-low'

      // Distinct visual indicator tag for GPS verified vs synthetic fallback
      const geoTag = loc.isSyntheticFallback ? 'Demo' : 'GPS'

      // Marker Icon HTML with pulsing beacon for active critical incidents
      const markerHtml = `
        <div class="custom-map-marker ${colorClass} ${isSelected ? 'marker-selected' : ''}">
          ${isCritical && !isClosed ? '<span class="map-pulse-beacon"></span>' : ''}
          <div class="marker-core">
            <span class="marker-glyph">${incident.incident_type === 'SOS' ? 'SOS' : '⚠️'}</span>
          </div>
          <div class="marker-tooltip-tag">
            <span class="marker-id-txt">${incident.id}</span>
            <span class="marker-geo-tag ${loc.isSyntheticFallback ? 'geo-tag-demo' : 'geo-tag-gps'}">${geoTag}</span>
          </div>
        </div>
      `

      const customIcon = L.divIcon({
        className: 'custom-leaflet-div-icon',
        html: markerHtml,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -22],
      })

      const marker = L.marker([loc.lat, loc.lng], { icon: customIcon })

      // Primary readable risk explanation
      const primaryRiskFactor =
        incident.risk_factors && incident.risk_factors.length > 0
          ? incident.risk_factors[0]
          : incident.incident_type === 'SOS'
          ? 'Emergency priority override: manual SOS distress signal confirmed (100/100).'
          : `Deterministic rule-based risk calculated from ${incident.incident_type} criteria.`

      // Build rich popup content
      const popupHtml = `
        <div class="leaflet-incident-popup">
          <div class="popup-top-row">
            <span class="popup-status-pill status-${incident.status.toLowerCase()}">${incident.status}</span>
            <span class="popup-id">${incident.id}</span>
          </div>
          <h4 class="popup-title">${incident.incident_type.replace('_', ' ')} Incident</h4>
          <div class="popup-meta-grid">
            <div><span class="p-label">${t.tableTourist}:</span> <span class="p-val">${incident.tourist_id}</span></div>
            <div><span class="p-label">${t.tableSeverity}:</span> <span class="p-val sev-${incident.severity.toLowerCase()}">${incident.severity}</span></div>
            <div><span class="p-label">${t.tableRisk}:</span> <span class="p-val ${incident.risk_score >= 80 ? 'text-red' : 'text-teal'}">${incident.risk_score}/100</span></div>
            <div><span class="p-label">${t.tableResponder}:</span> <span class="p-val">${incident.assigned_responder || 'Unassigned'}</span></div>
          </div>

          <div class="popup-risk-explanation">
            <div class="risk-expl-title">📋 ${t.riskBreakdown || 'Risk Score Explanation'}:</div>
            <div class="risk-expl-text">${primaryRiskFactor}</div>
          </div>

          <div class="popup-location-box">
            <div class="loc-head">📍 ${loc.name}</div>
            ${
              loc.isSyntheticFallback
                ? '<div class="loc-synthetic-note">⚠️ Synthetic demo anchor along heritage trail. No hardware GPS stored on this record.</div>'
                : `<div class="loc-coords">Lat: ${loc.lat.toFixed(5)}° N, Lng: ${loc.lng.toFixed(5)}° E (${t.gpsVerified})</div>`
            }
          </div>
          <div class="popup-actions">
            <button class="popup-btn-inspect" id="popup-btn-${incident.id}">${t.inspectIncidentDetails} ↗</button>
          </div>
        </div>
      `

      marker.bindPopup(popupHtml, { maxWidth: 320, className: 'trailsafe-leaflet-popup' })

      marker.on('popupopen', () => {
        const btn = document.getElementById(`popup-btn-${incident.id}`)
        if (btn) {
          btn.onclick = () => onSelectIncident(incident)
        }
      })

      marker.on('click', () => {
        // Highlight incident without blocking popup
      })

      marker.addTo(layerGroup)
    })
  }, [mapIncidents, selectedIncidentId, onSelectIncident, t])

  // Recenter map on selected incident
  useEffect(() => {
    if (!selectedIncidentId || !mapInstanceRef.current) return
    const target = incidents.find((i) => i.id === selectedIncidentId)
    if (target) {
      const loc = resolveLocation(target)
      mapInstanceRef.current.setView([loc.lat, loc.lng], 14, { animate: true })
    }
  }, [selectedIncidentId, incidents])

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([26.856, 80.938], 13, { animate: true })
    }
  }

  return (
    <div className="incident-map-container-card">
      {/* Map Header Toolbar */}
      <div className="incident-map-header">
        <div className="map-title-group">
          <div className="map-badge-live">
            <span className="live-dot-pulse"></span>
            <span>{t.liveIncidentMap}</span>
          </div>
          <span className="map-attribution-tag">OpenStreetMap (Zero API Key Required)</span>
        </div>

        <div className="map-header-controls">
          {/* Layer toggles */}
          <button
            className={`map-pill-btn ${showCorridorLayers ? 'active' : ''}`}
            onClick={() => setShowCorridorLayers((prev) => !prev)}
            title="Toggle corridor route and geofence boundaries"
          >
            🛡️ {t.geofenceAndRoute}
          </button>

          {/* Quick Filter Buttons */}
          <div className="map-filter-pills">
            <button
              className={`map-pill-btn ${activeFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setActiveFilter('ALL')}
            >
              {t.filterAll} ({incidents.length})
            </button>
            <button
              className={`map-pill-btn ${activeFilter === 'ACTIVE' ? 'active' : ''}`}
              onClick={() => setActiveFilter('ACTIVE')}
            >
              {t.filterOpen} ({incidents.filter((i) => i.status !== 'CLOSED').length})
            </button>
            <button
              className={`map-pill-btn pill-crit ${activeFilter === 'CRITICAL' ? 'active' : ''}`}
              onClick={() => setActiveFilter('CRITICAL')}
            >
              {t.filterCritical} ({incidents.filter((i) => i.severity === 'CRITICAL' && i.status !== 'CLOSED').length})
            </button>
          </div>

          <button className="btn-map-recenter" onClick={handleRecenter} title="Recenter on Lucknow corridor">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon-svg">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
            <span>{t.recenterMap}</span>
          </button>
        </div>
      </div>

      {/* Main Map Canvas */}
      <div className="map-wrapper-relative">
        <div ref={mapContainerRef} className="leaflet-map-canvas" />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="map-overlay-status">
            <span className="spinner-auth" />
            <span>Updating incident coordinates...</span>
          </div>
        )}

        {/* Error Overlay */}
        {(fetchError || tileLoadError) && !isLoading && (
          <div className="map-overlay-status map-error">
            <span>
              {fetchError
                ? `⚠️ Backend connection notice: ${fetchError}`
                : '⚠️ Notice: OpenStreetMap tile server rate-limiting or offline. Markers remain fully operational.'}
            </span>
          </div>
        )}

        {/* Empty State Overlay */}
        {mapReady && mapIncidents.length === 0 && !isLoading && !fetchError && (
          <div className="map-empty-overlay">
            <span>No incidents match current map filter ({activeFilter}).</span>
          </div>
        )}

        {/* Map Legend Overlay */}
        <div className="map-legend-overlay">
          <div className="legend-title">{t.mapLegendTitle}</div>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-dot dot-crit-beacon"></span>
              <span>{t.legendCrit}</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-high"></span>
              <span>{t.legendHigh}</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-med"></span>
              <span>{t.legendMed}</span>
            </div>
            <div className="legend-item" title={`${responderStats.assigned} dispatched, ${responderStats.available} available on standby`}>
              <span className="legend-dot dot-resp"></span>
              <span>
                {t.legendResp} ({responderStats.total})
                {responderStats.assigned > 0 && <span className="legend-sub-pill"> {responderStats.assigned} Dispatched</span>}
              </span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-tourist"></span>
              <span>{t.legendTourist}</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-closed"></span>
              <span>{t.legendClosed}</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-geofence-safe"></span>
              <span>{t.legendSafeZone}</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-geofence-caution"></span>
              <span>{t.legendCautionZone}</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-geofence-restricted"></span>
              <span>{t.legendRestrictedZone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Disclaimer Footer */}
      <div className="map-disclaimer-footer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="disclaimer-svg">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          <strong>OPENSTREETMAP TILES (NO API KEY REQUIRED):</strong> Powered by Leaflet and standard OpenStreetMap
          tiles. Incident pins display stored backend coordinates when available ({t.gpsVerified}), or clearly designated synthetic demo
          anchors along Lucknow heritage trails ({t.syntheticDemo}) when GPS is missing. All responder ({responderStats.total} units) and tourist positions are synthetically simulated.
        </span>
      </div>
    </div>
  )
}
