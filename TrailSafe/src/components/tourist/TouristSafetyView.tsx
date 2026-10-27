import React, { useState, useEffect, useCallback, useRef } from 'react'
import { TouristNav } from './TouristNav'
import { TouristProfileCard } from './TouristProfileCard'
import { TripControls } from './TripControls'
import { LocationPanel } from './LocationPanel'
import { EmergencySosPanel } from './EmergencySosPanel'
import { SosModal } from './SosModal'
import { SafetySimulators } from './SafetySimulators'
import { SafetyStatusPanel } from './SafetyStatusPanel'
import { AlertsList } from './AlertsList'
import type { TripStatus, SafetyLevel, DemoAlert, SimulatedLocation, SavedIncident } from './types'
import { useNetworkStatus } from '../../utils/offlineQueue'
import { requestBrowserLocation, evaluateGeofence, type GeofenceEvaluation } from '../../utils/geolocation'
import { useLanguage } from '../../i18n/LanguageContext'
import { API_ENDPOINTS } from '../../config/api'
import './TouristSafety.css'

interface TouristSafetyViewProps {
  onBackToOverview: () => void
}

const BACKEND_INCIDENTS_URL = API_ENDPOINTS.incidents

const LUCKNOW_SIMULATED_WAYPOINTS: Omit<SimulatedLocation, 'accuracy' | 'lastUpdated'>[] = [
  {
    name: 'Hazratganj Heritage Walk',
    description: 'Downtown Heritage Corridor • Trail Marker 1',
    lat: 26.8524,
    lng: 80.9462,
  },
  {
    name: 'Rumi Darwaza & Bara Imambara',
    description: 'Historic Monument Perimeter • Trail Marker 2',
    lat: 26.8693,
    lng: 80.9127,
  },
  {
    name: 'Gomti Riverfront Promenade',
    description: 'Riverfront Walkway Area • Trail Marker 3',
    lat: 26.8502,
    lng: 80.9634,
  },
  {
    name: 'Janeshwar Mishra Park Trail',
    description: 'Eco-Park Nature Walkway • Trail Marker 4',
    lat: 26.8378,
    lng: 80.9815,
  },
  {
    name: 'The Residency Archaeological Grounds',
    description: 'Historical Trail Perimeter • Trail Marker 5',
    lat: 26.8617,
    lng: 80.9255,
  },
]

export const TouristSafetyView: React.FC<TouristSafetyViewProps> = ({ onBackToOverview }) => {
  const { t } = useLanguage()
  const { isOnline, enqueue } = useNetworkStatus()

  // Trip State
  const [tripStatus, setTripStatus] = useState<TripStatus>('Not Started')
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0)

  // Location & Geofence State
  const [waypointIndex, setWaypointIndex] = useState<number>(0)
  const [isRealGps, setIsRealGps] = useState<boolean>(false)
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false)
  const [geofenceEval, setGeofenceEval] = useState<GeofenceEvaluation | null>(null)

  const [location, setLocation] = useState<SimulatedLocation>({
    name: LUCKNOW_SIMULATED_WAYPOINTS[0].name,
    description: LUCKNOW_SIMULATED_WAYPOINTS[0].description,
    lat: LUCKNOW_SIMULATED_WAYPOINTS[0].lat,
    lng: LUCKNOW_SIMULATED_WAYPOINTS[0].lng,
    accuracy: '±4.5m (Simulated)',
    lastUpdated: 'Just now',
  })

  // Alerts & SOS State
  const [alerts, setAlerts] = useState<DemoAlert[]>([])
  const lastAlertedZoneRef = useRef<string | null>(null)
  const [isSosModalOpen, setIsSosModalOpen] = useState<boolean>(false)
  const [isSosActive, setIsSosActive] = useState<boolean>(false)
  const [isSosSubmitting, setIsSosSubmitting] = useState<boolean>(false)
  const [isDuplicateSos, setIsDuplicateSos] = useState<boolean>(false)
  const [isClosingIncident, setIsClosingIncident] = useState<boolean>(false)
  const [sosBackendError, setSosBackendError] = useState<string | null>(null)
  const [savedBackendIncident, setSavedBackendIncident] = useState<SavedIncident | null>(null)
  const [incidentCount, setIncidentCount] = useState<number>(0)
  const [lastSimulatedEvent, setLastSimulatedEvent] = useState<string>(
    'Tourist Safety session initialized (Demo Environment)'
  )

  // Fetch verified incident count from backend GET /api/incidents
  const refreshIncidentCount = useCallback(async () => {
    try {
      const res = await fetch(BACKEND_INCIDENTS_URL)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setIncidentCount(data.length)
        }
      }
    } catch {
      // Backend may be offline; preserve current count
    }
  }, [])

  // Initial load: fetch incident count and active open SOS
  useEffect(() => {
    let isCancelled = false
    fetch(BACKEND_INCIDENTS_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isCancelled && Array.isArray(data)) {
          setIncidentCount(data.length)
          const openSos = data.find(
            (inc: SavedIncident) =>
              inc.tourist_id === 'TS-DEMO-001' &&
              inc.incident_type === 'SOS' &&
              (inc.status === 'OPEN' || inc.status === 'ASSIGNED')
          )
          if (openSos) {
            setSavedBackendIncident(openSos)
            setIsSosActive(true)
          }
        }
      })
      .catch(() => {
        // Backend may be starting
      })
    return () => {
      isCancelled = true
    }
  }, [])

  // Timer Effect
  useEffect(() => {
    let interval: number | undefined
    if (tripStatus === 'Active') {
      interval = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [tripStatus])

  // Compute Safety Status
  const safetyLevel: SafetyLevel = isSosActive
    ? 'CRITICAL'
    : alerts.length > 0
    ? 'CAUTION'
    : 'SAFE'

  // Handlers for Trip Controls
  const handleStartTrip = () => {
    if (tripStatus === 'Active') return
    setTripStatus('Active')
    setElapsedSeconds(0)
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLastSimulatedEvent(`Trip started at ${nowTime} from ${location.name}`)
  }

  const handleEndTrip = () => {
    if (tripStatus !== 'Active') return
    setTripStatus('Completed')
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLastSimulatedEvent(`Trip concluded at ${nowTime}`)
  }

  // Check geofence transitions avoiding duplicate alerts
  const checkGeofenceTransition = useCallback(
    (evaluation: GeofenceEvaluation | null, locName: string, timeStr: string) => {
      if (!evaluation) return
      setGeofenceEval(evaluation)

      const zoneKey = evaluation.geofence_id || (evaluation.inside_geofence ? evaluation.zone_type : 'SAFE')
      const prevZoneKey = lastAlertedZoneRef.current

      if (evaluation.is_hazard) {
        // Only trigger alert on initial entry or transition to a different hazard zone
        if (zoneKey !== prevZoneKey) {
          lastAlertedZoneRef.current = zoneKey
          const hazardAlert: DemoAlert = {
            id: `geo-alert-${Date.now()}`,
            type: 'risky-zone',
            severity: evaluation.zone_type === 'RESTRICTED' ? 'CRITICAL' : 'HIGH',
            title: `Geofence Perimeter Alert: ${evaluation.geofence_name || evaluation.zone_type}`,
            message: evaluation.advisory_message,
            timestamp: timeStr,
            locationName: locName,
          }
          setAlerts((prev) => [hazardAlert, ...prev.filter((a) => a.type !== 'risky-zone')])
          setLastSimulatedEvent(`Zone transition: Entered ${evaluation.geofence_name || evaluation.zone_type} (${timeStr})`)
        }
      } else {
        // Exited hazard zone back to safe
        if (prevZoneKey && prevZoneKey !== 'SAFE') {
          lastAlertedZoneRef.current = 'SAFE'
          setLastSimulatedEvent(`Zone transition: Returned to safe tourist perimeter (${timeStr})`)
        }
      }
    },
    []
  )

  // Handler for Location Update Simulation
  const handleSimulateLocationUpdate = async () => {
    const nextIndex = (waypointIndex + 1) % LUCKNOW_SIMULATED_WAYPOINTS.length
    const nextWaypoint = LUCKNOW_SIMULATED_WAYPOINTS[nextIndex]
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const newLat = nextWaypoint.lat + (Math.random() * 0.0006 - 0.0003)
    const newLng = nextWaypoint.lng + (Math.random() * 0.0006 - 0.0003)

    setWaypointIndex(nextIndex)
    setIsRealGps(false)
    setLocation({
      name: nextWaypoint.name,
      description: nextWaypoint.description,
      lat: newLat,
      lng: newLng,
      accuracy: `±${(3 + Math.random() * 3).toFixed(1)}m (Simulated)`,
      lastUpdated: nowTime,
    })

    setLastSimulatedEvent(`Location updated to ${nextWaypoint.name} at ${nowTime}`)

    // Check geofence transition
    const evaluation = await evaluateGeofence(newLat, newLng)
    checkGeofenceTransition(evaluation, nextWaypoint.name, nowTime)
  }

  // Explicit browser GPS request
  const handleRequestBrowserGps = async () => {
    setIsGpsLoading(true)
    try {
      const geo = await requestBrowserLocation()
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      setIsRealGps(geo.isRealGps)
      const locName = geo.isRealGps ? 'Live Browser Telemetry' : location.name
      setLocation({
        name: locName,
        description: geo.isRealGps ? 'Device GPS sensor enabled' : location.description,
        lat: geo.latitude,
        lng: geo.longitude,
        accuracy: `±${geo.accuracyMeters}m (${geo.isRealGps ? 'Real GPS' : 'Simulated'})`,
        lastUpdated: nowTime,
      })

      const evaluation = await evaluateGeofence(geo.latitude, geo.longitude)
      checkGeofenceTransition(evaluation, locName, nowTime)
      setLastSimulatedEvent(`GPS updated: ${geo.isRealGps ? 'Real device GPS' : 'Fallback'} (${nowTime})`)
    } finally {
      setIsGpsLoading(false)
    }
  }

  // Handlers for Emergency SOS
  const handleOpenSosModal = () => {
    setSosBackendError(null)
    setIsSosModalOpen(true)
  }

  const handleCloseSosModal = () => {
    if (!isSosSubmitting) {
      setIsSosModalOpen(false)
      setSosBackendError(null)
    }
  }

  const handleConfirmSos = async () => {
    if (isSosSubmitting) return

    setIsSosSubmitting(true)
    setSosBackendError(null)

    const payload = {
      tourist_id: 'TS-DEMO-001',
      incident_type: 'SOS' as const,
      description: 'Simulated emergency SOS triggered by the demo tourist.',
      latitude: location.lat,
      longitude: location.lng,
      location_name: location.name,
      device_battery: 85,
    }

    const nowTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

    // If offline, queue immediately
    if (!isOnline) {
      const queued = enqueue(payload)
      const offlineAlert: DemoAlert = {
        id: queued.queueId,
        type: 'sos',
        severity: 'CRITICAL',
        title: `Emergency SOS Queued Offline [${queued.queueId}]`,
        message: 'Network offline. SOS distress beacon safely queued in local device storage. Automatic transmission will engage the moment connectivity returns.',
        timestamp: nowTime,
        locationName: location.name,
        backendIncidentId: queued.queueId,
        backendStatus: 'QUEUED_OFFLINE',
      }
      setSavedBackendIncident({
        id: queued.queueId,
        tourist_id: 'TS-DEMO-001',
        incident_type: 'SOS',
        severity: 'CRITICAL',
        risk_score: 100,
        description: 'Emergency SOS queued in offline device storage.',
        status: 'QUEUED_OFFLINE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      setIsSosActive(true)
      setIsSosModalOpen(false)
      setAlerts((prev) => [offlineAlert, ...prev.filter((a) => a.type !== 'sos')])
      setLastSimulatedEvent(`Emergency SOS queued offline (${queued.queueId}) at ${nowTime}`)
      setIsSosSubmitting(false)
      return
    }

    // Online submission
    try {
      const response = await fetch(BACKEND_INCIDENTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        let errMessage = `HTTP ${response.status} ${response.statusText}`
        try {
          const errBody = await response.json()
          if (errBody && errBody.detail) {
            errMessage = typeof errBody.detail === 'string' ? errBody.detail : JSON.stringify(errBody.detail)
          }
        } catch {
          // Fall back
        }
        throw new Error(errMessage)
      }

      // Read returned incident with server-generated ID and status
      const savedIncident: SavedIncident = await response.json()
      const isDuplicate = response.status === 200

      setIsDuplicateSos(isDuplicate)
      setSavedBackendIncident(savedIncident)
      setIsSosActive(true)
      setIsSosModalOpen(false)
      setSosBackendError(null)

      await refreshIncidentCount()

      if (isDuplicate) {
        const dupAlert: DemoAlert = {
          id: savedIncident.id,
          type: 'sos',
          severity: 'CRITICAL',
          title: `An SOS incident is already open [${savedIncident.id}]`,
          message: `Tourist ${savedIncident.tourist_id} already has an active SOS incident in SQLite (Status: ${savedIncident.status}, Risk score: ${savedIncident.risk_score}). Backend returned existing record without creating a duplicate.`,
          timestamp: nowTime,
          locationName: location.name,
          backendIncidentId: savedIncident.id,
          backendStatus: savedIncident.status,
        }

        setAlerts((prev) => [dupAlert, ...prev.filter((a) => a.id !== savedIncident.id)])
        setLastSimulatedEvent(`SOS already open: returned ${savedIncident.id} (${nowTime})`)
      } else {
        const newSosAlert: DemoAlert = {
          id: savedIncident.id,
          type: 'sos',
          severity: 'CRITICAL',
          title: `SOS incident recorded successfully [${savedIncident.id}]`,
          message: `High-priority distress incident registered in SQLite database. Incident ID: ${savedIncident.id}, Status: ${savedIncident.status}, Risk score: ${savedIncident.risk_score}.`,
          timestamp: nowTime,
          locationName: location.name,
          backendIncidentId: savedIncident.id,
          backendStatus: savedIncident.status,
        }

        setAlerts((prev) => [newSosAlert, ...prev.filter((a) => a.type !== 'sos')])
        setLastSimulatedEvent(`SOS incident recorded successfully: ${savedIncident.id} (${nowTime})`)
      }
    } catch {
      // If network transmission failed, fallback to offline queue
      const queued = enqueue(payload)
      const offlineAlert: DemoAlert = {
        id: queued.queueId,
        type: 'sos',
        severity: 'CRITICAL',
        title: `SOS Queued in Offline Storage [${queued.queueId}]`,
        message: 'Network connection interrupted. Incident stored in offline queue and will automatically sync when connection returns.',
        timestamp: nowTime,
        locationName: location.name,
        backendIncidentId: queued.queueId,
        backendStatus: 'QUEUED_OFFLINE',
      }
      setSavedBackendIncident({
        id: queued.queueId,
        tourist_id: 'TS-DEMO-001',
        incident_type: 'SOS',
        severity: 'CRITICAL',
        risk_score: 100,
        description: 'Emergency SOS queued in offline device storage.',
        status: 'QUEUED_OFFLINE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      setIsSosActive(true)
      setIsSosModalOpen(false)
      setAlerts((prev) => [offlineAlert, ...prev.filter((a) => a.type !== 'sos')])
      setLastSimulatedEvent(`SOS queued offline (${queued.queueId})`)
    } finally {
      setIsSosSubmitting(false)
    }
  }

  const handleDismissSos = () => {
    setIsSosActive(false)
    setAlerts((prev) => prev.filter((a) => a.type !== 'sos'))
    setLastSimulatedEvent('Simulated SOS distress beacon dismissed')
  }

  // Handler for Closing / Resolving an Incident safely in database
  const handleCloseIncident = async () => {
    if (!savedBackendIncident || isClosingIncident) return

    setIsClosingIncident(true)
    setSosBackendError(null)

    try {
      const response = await fetch(`${BACKEND_INCIDENTS_URL}/${savedBackendIncident.id}/close`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        let errMessage = `HTTP ${response.status} ${response.statusText}`
        try {
          const errBody = await response.json()
          if (errBody && errBody.detail) {
            errMessage = typeof errBody.detail === 'string' ? errBody.detail : JSON.stringify(errBody.detail)
          }
        } catch {
          // Fall back
        }
        throw new Error(errMessage)
      }

      const updated: SavedIncident = await response.json()
      setSavedBackendIncident(updated)
      setIsSosActive(false)
      setIsDuplicateSos(false)

      const nowTime = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })

      setAlerts((prev) =>
        prev.map((a) =>
          a.backendIncidentId === updated.id || a.id === updated.id
            ? {
                ...a,
                severity: 'WARNING',
                title: `SOS Incident Closed [${updated.id}]`,
                message: `Distress incident marked CLOSED in SQLite at ${nowTime}. System status restored to safe.`,
                backendStatus: 'CLOSED',
              }
            : a
        )
      )

      setLastSimulatedEvent(`SOS incident ${updated.id} closed and marked resolved (${nowTime})`)
      await refreshIncidentCount()
    } catch (err: unknown) {
      const displayMsg =
        err instanceof Error
          ? err.message
          : 'Failed to close incident on backend.'
      setSosBackendError(displayMsg)
    } finally {
      setIsClosingIncident(false)
    }
  }

  // Handlers for Safety Simulators
  const handleSimulateRiskyZone = async () => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const alertId = `hazard-${Date.now()}`

    setLastSimulatedEvent(`Risky-Zone breach simulated at ${location.name} (${nowTime})`)

    // Record in backend with coordinates & genuine risk evaluation context
    try {
      const res = await fetch(BACKEND_INCIDENTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourist_id: 'TS-DEMO-001',
          incident_type: 'RISKY_ZONE',
          description: `Simulated breach into unmonitored canal hazard perimeter near ${location.name}.`,
          location_name: location.name,
          latitude: location.lat,
          longitude: location.lng,
          zone_risk_level: 'EXTREME_CANAL',
          night_time: false,
          is_solo: true,
        }),
      })
      if (res.ok) {
        const saved: SavedIncident = await res.json()
        const newHazardAlert: DemoAlert = {
          id: alertId,
          type: 'risky-zone',
          severity: (saved.severity as 'HIGH' | 'CRITICAL') || 'HIGH',
          title: `Simulated Risky-Zone Entry [Risk: ${saved.risk_score}/100]`,
          message: `Traveler coordinates breached canal perimeter near ${location.name}. Server-side risk engine evaluated score ${saved.risk_score}/100 (${saved.severity}).`,
          timestamp: nowTime,
          locationName: location.name,
          backendIncidentId: saved.id,
          backendStatus: saved.status,
        }
        setAlerts((prev) => [newHazardAlert, ...prev])
        await refreshIncidentCount()
      }
    } catch {
      // Backend may be offline; local alert preserved
    }
  }

  const handleSimulateRouteDeviation = async () => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const alertId = `deviation-${Date.now()}`

    setLastSimulatedEvent(`Route deviation simulated at ${location.name} (${nowTime})`)

    // Record in backend with coordinates & genuine risk evaluation context
    try {
      const res = await fetch(BACKEND_INCIDENTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourist_id: 'TS-DEMO-001',
          incident_type: 'ROUTE_DEVIATION',
          description: `Traveler drifted 140m away from designated corridor near ${location.name}.`,
          location_name: location.name,
          latitude: location.lat,
          longitude: location.lng,
          distance_from_corridor_m: 140,
          night_time: false,
          battery_low: false,
        }),
      })
      if (res.ok) {
        const saved: SavedIncident = await res.json()
        const newDeviationAlert: DemoAlert = {
          id: alertId,
          type: 'deviation',
          severity: (saved.severity as 'MEDIUM' | 'HIGH' | 'WARNING') || 'MEDIUM',
          title: `Simulated Route Deviation [Risk: ${saved.risk_score}/100]`,
          message: `Traveler trajectory drifted 140m from corridor near ${location.name}. Server-side risk engine evaluated score ${saved.risk_score}/100 (${saved.severity}).`,
          timestamp: nowTime,
          locationName: location.name,
          backendIncidentId: saved.id,
          backendStatus: saved.status,
        }
        setAlerts((prev) => [newDeviationAlert, ...prev])
        await refreshIncidentCount()
      }
    } catch {
      // Backend may be offline; local alert preserved
    }
  }

  const handleSimulateInactivity = async () => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const alertId = `inactivity-${Date.now()}`

    setLastSimulatedEvent(`Inactivity dwell simulated at ${location.name} (${nowTime})`)

    // Record in backend with coordinates & genuine risk evaluation context
    try {
      const res = await fetch(BACKEND_INCIDENTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourist_id: 'TS-DEMO-001',
          incident_type: 'INACTIVITY',
          description: `Extended stationary dwell (45 min) detected near ${location.name}.`,
          location_name: location.name,
          latitude: location.lat,
          longitude: location.lng,
          inactivity_minutes: 45,
          in_hazard_zone: false,
        }),
      })
      if (res.ok) {
        const saved: SavedIncident = await res.json()
        const newInactivityAlert: DemoAlert = {
          id: alertId,
          type: 'inactivity',
          severity: (saved.severity as 'LOW' | 'MEDIUM' | 'HIGH') || 'LOW',
          title: `Simulated Inactivity Warning [Risk: ${saved.risk_score}/100]`,
          message: `Stationary dwell detected (45 min) near ${location.name}. Server-side risk engine evaluated score ${saved.risk_score}/100 (${saved.severity}).`,
          timestamp: nowTime,
          locationName: location.name,
          backendIncidentId: saved.id,
          backendStatus: saved.status,
        }
        setAlerts((prev) => [newInactivityAlert, ...prev])
        await refreshIncidentCount()
      }
    } catch {
      // Backend may be offline; local alert preserved
    }
  }

  const handleResetDemo = async () => {
    const confirmed = window.confirm(
      'Reset demo data?\n\nThis will clear active demo alerts and remove demo incidents for TS-DEMO-001 from the SQLite database.'
    )
    if (!confirmed) return

    try {
      await fetch(API_ENDPOINTS.resetDemo('TS-DEMO-001'), {
        method: 'POST',
      })
    } catch {
      // Backend may be offline; proceed with frontend state reset
    }

    setTripStatus('Not Started')
    setElapsedSeconds(0)
    setWaypointIndex(0)
    setLocation({
      name: LUCKNOW_SIMULATED_WAYPOINTS[0].name,
      description: LUCKNOW_SIMULATED_WAYPOINTS[0].description,
      lat: LUCKNOW_SIMULATED_WAYPOINTS[0].lat,
      lng: LUCKNOW_SIMULATED_WAYPOINTS[0].lng,
      accuracy: '±4.5m (Simulated)',
      lastUpdated: 'Just now',
    })
    setAlerts([])
    setIsSosActive(false)
    setIsSosModalOpen(false)
    setIsSosSubmitting(false)
    setIsDuplicateSos(false)
    setIsClosingIncident(false)
    setSosBackendError(null)
    setSavedBackendIncident(null)
    setLastSimulatedEvent('Demo state reset and TS-DEMO-001 demo records cleared')
    await refreshIncidentCount()
  }

  const handleDismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    // If dismissing the SOS alert, also toggle off SOS active banner
    const target = alerts.find((a) => a.id === id)
    if (target?.type === 'sos') {
      setIsSosActive(false)
    }
  }

  const handleClearAllAlerts = () => {
    setAlerts([])
    setIsSosActive(false)
  }

  return (
    <div className="tourist-app-wrapper">
      {/* 1. Navigation */}
      <TouristNav onBackToOverview={onBackToOverview} />

      {/* Top Demo Disclaimer Ribbon */}
      <div className="tourist-disclaimer-banner">
        <div className="disclaimer-inner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="disclaimer-icon-svg">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p>
            <strong>{t.demoDisclaimerTourist}</strong>
          </p>
        </div>
      </div>

      <main className="tourist-main-container">
        {/* Page Header */}
        <div className="tourist-page-header">
          <div>
            <div className="tourist-preheading">CONNECTED TOURIST SAFETY</div>
            <h1 className="tourist-page-title">{t.touristTitle}</h1>
            <p className="tourist-page-subtitle">{t.touristSubtitle}</p>
          </div>
        </div>

        {/* Status Telemetry Overview */}
        <SafetyStatusPanel
          tripStatus={tripStatus}
          safetyLevel={safetyLevel}
          incidentCount={incidentCount}
          lastSimulatedEvent={lastSimulatedEvent}
        />

        {/* 2-Column Responsive Dashboard Grid */}
        <div className="tourist-dashboard-grid">
          {/* Left Column: Traveler Profile & Trip Controls */}
          <div className="dashboard-col col-left">
            {/* 2. Tourist Profile Card */}
            <TouristProfileCard tripStatus={tripStatus} />

            {/* 3. Trip Controls */}
            <TripControls
              tripStatus={tripStatus}
              elapsedSeconds={elapsedSeconds}
              onStartTrip={handleStartTrip}
              onEndTrip={handleEndTrip}
            />

            {/* 6. Safety Simulators */}
            <SafetySimulators
              onSimulateRiskyZone={handleSimulateRiskyZone}
              onSimulateRouteDeviation={handleSimulateRouteDeviation}
              onSimulateInactivity={handleSimulateInactivity}
              onResetDemo={handleResetDemo}
            />
          </div>

          {/* Right Column: Emergency SOS & Simulated Location */}
          <div className="dashboard-col col-right">
            {/* 5. Emergency SOS */}
            <EmergencySosPanel
              isSosActive={isSosActive}
              isLoading={isSosSubmitting}
              backendIncident={savedBackendIncident}
              backendError={sosBackendError}
              isDuplicateSos={isDuplicateSos}
              isClosingIncident={isClosingIncident}
              onTriggerSosClick={handleOpenSosModal}
              onDismissSos={handleDismissSos}
              onCloseIncident={handleCloseIncident}
              onClearError={() => setSosBackendError(null)}
            />

            {/* 4. Location Panel */}
            <LocationPanel
              location={location}
              isRealGps={isRealGps}
              geofenceZone={geofenceEval?.geofence_name || 'Designated Trail'}
              geofenceType={geofenceEval?.zone_type || 'SAFE'}
              onSimulateLocationUpdate={handleSimulateLocationUpdate}
              onRequestRealGps={handleRequestBrowserGps}
              isGpsLoading={isGpsLoading}
            />
          </div>
        </div>

        {/* Active Simulated Alerts Section */}
        <div className="tourist-alerts-section">
          <AlertsList
            alerts={alerts}
            onDismissAlert={handleDismissAlert}
            onClearAllAlerts={handleClearAllAlerts}
          />
        </div>
      </main>

      {/* SOS Confirmation Dialog */}
      <SosModal
        isOpen={isSosModalOpen}
        isLoading={isSosSubmitting}
        error={sosBackendError}
        onClose={handleCloseSosModal}
        onConfirmSos={handleConfirmSos}
      />
    </div>
  )
}
