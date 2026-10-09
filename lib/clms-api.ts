import { clearSession, getApiBaseUrl, getSession } from '@/lib/auth'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const GET_CACHE_TTL_MS = 5000
const GET_CACHE = new Map<string, { expiresAt: number; value: unknown }>()
const IN_FLIGHT_GETS = new Map<string, Promise<unknown>>()
let cacheSessionToken: string | null = null
let updateChannel: BroadcastChannel | null = null

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

function notifyDataChanged(broadcast: boolean) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('clms:data-change'))
  if (broadcast && typeof BroadcastChannel !== 'undefined') {
    updateChannel ??= new BroadcastChannel('clms:data-updates')
    updateChannel.postMessage('changed')
  }
}

export function subscribeToApiUpdates(onUpdate: () => void, intervalMs = 15000) {
  if (typeof window === 'undefined') return () => undefined

  const refreshWhenVisible = () => {
    if (document.visibilityState === 'visible') onUpdate()
  }
  const onStorageUpdate = (event: MessageEvent) => {
    if (event.data === 'changed') notifyDataChanged(false)
  }
  const timer = window.setInterval(refreshWhenVisible, intervalMs)
  window.addEventListener('focus', refreshWhenVisible)
  window.addEventListener('clms:data-change', onUpdate)
  document.addEventListener('visibilitychange', refreshWhenVisible)
  if (typeof BroadcastChannel !== 'undefined') {
    updateChannel ??= new BroadcastChannel('clms:data-updates')
    updateChannel.addEventListener('message', onStorageUpdate)
  }

  return () => {
    window.clearInterval(timer)
    window.removeEventListener('focus', refreshWhenVisible)
    window.removeEventListener('clms:data-change', onUpdate)
    document.removeEventListener('visibilitychange', refreshWhenVisible)
    updateChannel?.removeEventListener('message', onStorageUpdate)
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getSession()
  if (!session) throw new ApiError('Sign in to continue.', 401)

  if (cacheSessionToken !== session.token) {
    GET_CACHE.clear()
    IN_FLIGHT_GETS.clear()
    cacheSessionToken = session.token
  }

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${session.token}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const method = (init.method ?? 'GET').toUpperCase()
  const cacheKey = `${session.user.id}:${path}`
  if (method === 'GET' && init.cache !== 'no-store') {
    const cached = GET_CACHE.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cloneValue(cached.value) as T
    const pending = IN_FLIGHT_GETS.get(cacheKey)
    if (pending) return cloneValue(await pending) as T
  }

  const request = async (): Promise<T> => {
  const response = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers })
  if (response.status === 401) {
    clearSession()
    if (typeof window !== 'undefined') window.location.assign('/sign-in')
    throw new ApiError('Your session expired. Sign in again.', 401)
  }
  if (!response.ok) {
    let message = `Request failed (${response.status}).`
    try {
      const payload = await response.json() as { error?: string; message?: string }
      message = payload.error || payload.message || message
    } catch {
      // Keep the status-based message when the API returns no JSON body.
    }
    throw new ApiError(message, response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
  }

  if (method !== 'GET') {
    const result = await request()
    GET_CACHE.clear()
    notifyDataChanged(true)
    return result
  }

  const pending = request().then((value) => {
    GET_CACHE.set(cacheKey, { expiresAt: Date.now() + GET_CACHE_TTL_MS, value: cloneValue(value) })
    return value
  }).finally(() => IN_FLIGHT_GETS.delete(cacheKey))
  IN_FLIGHT_GETS.set(cacheKey, pending)
  return cloneValue(await pending)
}

export type EquipmentItem = {
  id: number
  name: string
  category: string
  assetTag: string
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED'
  location: string
  description: string | null
  createdAt: string
}

export type LoanTransaction = {
  id: number
  equipmentId: number
  userId: number
  action: string
  dueAt: string | null
  returnedAt: string | null
  notes: string | null
  createdAt: string
}

export type EquipmentRequest = {
  id: number
  equipmentId: number
  userId: number
  purpose: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  dueAt: string | null
  createdAt: string
  reviewedAt: string | null
}

export type LabUser = {
  id: number
  name: string
  email: string
  role: string
  createdAt: string
  active: boolean
}

export type MaintenanceTicket = {
  id: number
  equipmentId: number
  openedBy: number
  assignedTechnician: string | null
  title: string
  details: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
  repairCost: number | null
  openedAt: string
  resolvedAt: string | null
}

export type LabEvent = {
  id: number
  createdBy: number
  title: string
  details: string | null
  startsAt: string
  endsAt: string | null
  createdAt: string
}

export type NotificationItem = {
  id: number
  userId: number
  title: string
  message: string
  readAt: string | null
  createdAt: string
}

export const formatDate = (value: string | null) => {
  if (!value) return 'No due date'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

export const isActiveLoan = (transaction: LoanTransaction) =>
  !transaction.returnedAt && !transaction.action.toUpperCase().includes('RETURN')