/**
 * Shared API Configuration for TrailSafe
 *
 * Configurable via Vite environment variable VITE_API_BASE_URL.
 * Defaults to http://localhost:8000 for standard local development.
 */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ||
  'http://localhost:8000'

export const API_ENDPOINTS = {
  health: `${API_BASE_URL}/api/health`,
  incidents: `${API_BASE_URL}/api/incidents`,
  responders: `${API_BASE_URL}/api/responders`,
  geofences: `${API_BASE_URL}/api/geofences`,
  geofenceCheck: `${API_BASE_URL}/api/geofences/check`,
  analytics: `${API_BASE_URL}/api/analytics`,
  riskEvaluate: `${API_BASE_URL}/api/risk/evaluate`,
  resetDemo: (touristId: string = 'TS-DEMO-001') =>
    `${API_BASE_URL}/api/incidents/reset-demo?tourist_id=${encodeURIComponent(touristId)}`,
  seedDemo: `${API_BASE_URL}/api/incidents/seed-demo`,
}
