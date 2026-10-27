export type IncidentStatus = 'OPEN' | 'ASSIGNED' | 'CLOSED'

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type IncidentType = 'SOS' | 'RISKY_ZONE' | 'ROUTE_DEVIATION' | 'INACTIVITY'

export interface IncidentRecord {
  id: string
  tourist_id: string
  incident_type: IncidentType | string
  severity: IncidentSeverity | string
  risk_score: number
  description: string
  status: IncidentStatus | string
  assigned_responder: string | null
  created_at: string
  updated_at: string
  latitude?: number | null
  longitude?: number | null
  location_name?: string | null
  risk_factors?: string[] | null
  closure_reason?: string | null
  closure_notes?: string | null
  notes?: string | null
  location_confidence?: number | null
  device_battery?: number | null
  is_offline_submission?: number | boolean | null
}

export interface ResponderUnit {
  id: string
  name: string
  role: string
  status: 'AVAILABLE' | 'ASSIGNED' | 'OFF_DUTY' | string
  current_incident_id?: string | null
  latitude: number
  longitude: number
  contact_number: string
  is_simulated: number
  updated_at: string
}

export interface GeofenceZone {
  id: string
  name: string
  zone_type: 'SAFE' | 'CAUTION' | 'RESTRICTED' | string
  latitude: number
  longitude: number
  radius_meters: number
  risk_weight: number
  description: string
  advisory_message: string
  is_active?: number
}

export interface AnalyticsData {
  total_incidents: number
  status_counts: Record<string, number>
  severity_counts: Record<string, number>
  type_counts: Record<string, number>
  avg_risk_score: number
  responders: {
    total: number
    available: number
    assigned: number
    off_duty: number
  }
  active_geofences_count: number
}

export type StatusFilterOption = 'ALL' | 'OPEN' | 'ASSIGNED' | 'CLOSED'
export type SeverityFilterOption = 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type TypeFilterOption = 'ALL' | 'SOS' | 'RISKY_ZONE' | 'ROUTE_DEVIATION' | 'INACTIVITY'

