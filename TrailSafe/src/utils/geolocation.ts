/**
 * Browser geolocation with permission handling and fallback simulation
 */

export interface GeolocationResult {
  latitude: number
  longitude: number
  accuracyMeters: number
  isRealGps: boolean
  error?: string
}

export interface GeofenceEvaluation {
  inside_geofence: boolean
  geofence_id: string | null
  geofence_name: string | null
  zone_type: 'SAFE' | 'CAUTION' | 'RESTRICTED' | 'OUTSIDE_CORRIDOR' | 'TRANSIT'
  risk_weight: number
  distance_to_center_m: number
  advisory_message: string
  is_hazard: boolean
}

// Lucknow heritage corridor fallback center
const FALLBACK_COORDS = {
  latitude: 26.8524,
  longitude: 80.9462,
  accuracyMeters: 10.0,
}

export async function requestBrowserLocation(): Promise<GeolocationResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        ...FALLBACK_COORDS,
        isRealGps: false,
        error: 'Geolocation API not supported by browser. Falling back to simulated coordinates.',
      })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: Math.round(position.coords.accuracy),
          isRealGps: true,
        })
      },
      (err) => {
        let msg = 'Location request was denied.'
        if (err.code === err.TIMEOUT) msg = 'Location request timed out.'
        else if (err.code === err.POSITION_UNAVAILABLE) msg = 'Location position unavailable.'
        resolve({
          ...FALLBACK_COORDS,
          isRealGps: false,
          error: `${msg} Using simulated heritage trail coordinates.`,
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 15000,
      }
    )
  })
}

import { API_ENDPOINTS } from '../config/api'

export async function evaluateGeofence(
  latitude: number,
  longitude: number
): Promise<GeofenceEvaluation | null> {
  try {
    const res = await fetch(API_ENDPOINTS.geofenceCheck, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude }),
    })
    if (!res.ok) return null
    return (await res.json()) as GeofenceEvaluation
  } catch {
    return null
  }
}
