/**
 * Offline storage and automated synchronization queue for TrailSafe
 */

import { useState, useEffect, useCallback } from 'react'
import { API_ENDPOINTS } from '../config/api'

export interface QueuedIncident {
  queueId: string
  payload: {
    tourist_id: string
    incident_type: 'SOS' | 'RISKY_ZONE' | 'ROUTE_DEVIATION' | 'INACTIVITY'
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    risk_score?: number
    description: string
    latitude?: number | null
    longitude?: number | null
    location_name?: string | null
    location_confidence?: number | null
    device_battery?: number | null
    distance_from_corridor_m?: number | null
    inactivity_minutes?: number | null
    zone_risk_level?: string | null
    night_time?: boolean
    battery_low?: boolean
    is_solo?: boolean
    in_hazard_zone?: boolean
  }
  queuedAt: string
  retryCount: number
}

const STORAGE_KEY = 'trailsafe_offline_queue'

export function getQueuedIncidents(): QueuedIncident[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveQueuedIncidents(items: QueuedIncident[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (err) {
    console.error('Failed to save offline queue to localStorage', err)
  }
}

export function enqueueIncident(
  payload: QueuedIncident['payload']
): QueuedIncident {
  const queueItem: QueuedIncident = {
    queueId: `QUEUE-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    payload,
    queuedAt: new Date().toISOString(),
    retryCount: 0,
  }

  const current = getQueuedIncidents()
  current.push(queueItem)
  saveQueuedIncidents(current)
  return queueItem
}

export async function flushOfflineQueue(
  backendUrl: string = API_ENDPOINTS.incidents
): Promise<{ synced: number; failed: number }> {
  const current = getQueuedIncidents()
  if (current.length === 0) return { synced: 0, failed: 0 }

  const remaining: QueuedIncident[] = []
  let synced = 0
  let failed = 0

  for (const item of current) {
    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item.payload,
          is_offline_submission: 1,
        }),
      })

      if (response.ok) {
        synced++
      } else {
        item.retryCount += 1
        remaining.push(item)
        failed++
      }
    } catch {
      item.retryCount += 1
      remaining.push(item)
      failed++
    }
  }

  saveQueuedIncidents(remaining)
  return { synced, failed }
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  })
  const [pendingCount, setPendingCount] = useState<number>(() => getQueuedIncidents().length)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)

  const syncQueue = useCallback(async () => {
    if (!navigator.onLine) return
    setIsSyncing(true)
    try {
      await flushOfflineQueue()
      setPendingCount(getQueuedIncidents().length)
    } finally {
      setIsSyncing(false)
    }
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Auto sync when connection returns
      void syncQueue()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial sync check on mount if online
    if (navigator.onLine && pendingCount > 0) {
      void syncQueue()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncQueue, pendingCount])

  const enqueue = useCallback((payload: QueuedIncident['payload']) => {
    const item = enqueueIncident(payload)
    setPendingCount(getQueuedIncidents().length)
    return item
  }, [])

  return {
    isOnline,
    pendingCount,
    isSyncing,
    enqueue,
    syncQueue,
  }
}
