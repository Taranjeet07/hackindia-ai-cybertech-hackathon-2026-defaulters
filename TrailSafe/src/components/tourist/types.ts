export type TripStatus = 'Not Started' | 'Active' | 'Completed'

export type SafetyLevel = 'SAFE' | 'CAUTION' | 'CRITICAL'

export interface DemoAlert {
  id: string
  type: 'sos' | 'risky-zone' | 'deviation' | 'inactivity'
  severity: 'CRITICAL' | 'HIGH' | 'WARNING' | 'MEDIUM' | 'LOW'
  title: string
  message: string
  timestamp: string
  locationName: string
  backendIncidentId?: string
  backendStatus?: string
}

export interface SimulatedLocation {
  name: string
  description: string
  lat: number
  lng: number
  accuracy: string
  lastUpdated: string
}

export interface SavedIncident {
  id: string
  tourist_id: string
  incident_type: string
  severity: string
  risk_score: number
  description: string
  status: string
  assigned_responder?: string | null
  created_at: string
  updated_at: string
}
