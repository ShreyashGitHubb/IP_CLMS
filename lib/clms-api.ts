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

const updateSubscribers = new Set<() => void>()
let sharedAbortController: AbortController | null = null
let sharedRetryTimer = 0
let isStreamActive = false
let streamConnectionInProgress = false
let disconnectCleanupTimer = 0
let notifyDebounceTimer: ReturnType<typeof setTimeout> | null = null
let lastHiddenTime = 0
let isVisibilityListenerAttached = false

function triggerSubscribers() {
  if (notifyDebounceTimer) clearTimeout(notifyDebounceTimer)
  notifyDebounceTimer = setTimeout(() => {
    GET_CACHE.clear()
    IN_FLIGHT_GETS.clear()
    updateSubscribers.forEach((callback) => {
      try {
        callback()
      } catch (error) {
        console.error('Error invoking CLMS update subscriber:', error)
      }
    })
  }, 300)
}

function notifyDataChanged(broadcast: boolean) {
  if (typeof window === 'undefined') return
  triggerSubscribers()
  if (broadcast && typeof BroadcastChannel !== 'undefined') {
    try {
      updateChannel ??= new BroadcastChannel('clms:data-updates')
      updateChannel.postMessage('changed')
    } catch {
      // BroadcastChannel might not be supported in some environments
    }
  }
}

async function startSharedStream() {
  if (typeof window === 'undefined' || isStreamActive || streamConnectionInProgress) return
  const session = getSession()
  if (!session) return

  streamConnectionInProgress = true
  sharedAbortController = new AbortController()
  const signal = sharedAbortController.signal
  let retryDelay = 1000

  const run = async () => {
    while (updateSubscribers.size > 0 && !signal.aborted) {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/stream`, {
          headers: { Authorization: `Bearer ${session.token}`, Accept: 'text/event-stream' },
          cache: 'no-store',
          signal,
        })
        if (response.status === 401) {
          clearSession()
          window.location.assign('/sign-in')
          return
        }
        if (!response.ok || !response.body) throw new Error('Live update stream unavailable.')

        isStreamActive = true
        retryDelay = 1000
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (updateSubscribers.size > 0 && !signal.aborted) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const events = buffer.split('\n\n')
          buffer = events.pop() ?? ''
          if (events.some((event) => event.includes('event:update') || event.includes('event: update'))) {
            triggerSubscribers()
          }
        }
      } catch (error) {
        if (signal.aborted) return
      } finally {
        isStreamActive = false
      }

      if (updateSubscribers.size === 0 || signal.aborted) return
      await new Promise<void>((resolve) => {
        sharedRetryTimer = window.setTimeout(resolve, retryDelay)
      })
      retryDelay = Math.min(retryDelay * 2, 30000)
    }
  }

  void run()
  streamConnectionInProgress = false
}

function attachGlobalListenersOnce() {
  if (typeof window === 'undefined' || isVisibilityListenerAttached) return
  isVisibilityListenerAttached = true

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      lastHiddenTime = Date.now()
    } else if (document.visibilityState === 'visible') {
      const wasHiddenLong = Date.now() - lastHiddenTime > 45000
      if (wasHiddenLong || !isStreamActive) {
        triggerSubscribers()
        if (!isStreamActive && updateSubscribers.size > 0) {
          void startSharedStream()
        }
      }
    }
  })

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      updateChannel ??= new BroadcastChannel('clms:data-updates')
      updateChannel.onmessage = (event: MessageEvent) => {
        if (event.data === 'changed') {
          triggerSubscribers()
        }
      }
    } catch {
      // Ignore
    }
  }
}

export function subscribeToApiUpdates(onUpdate: () => void) {
  if (typeof window === 'undefined') return () => undefined
  const session = getSession()
  if (!session) return () => undefined

  updateSubscribers.add(onUpdate)
  attachGlobalListenersOnce()

  if (disconnectCleanupTimer) {
    window.clearTimeout(disconnectCleanupTimer)
    disconnectCleanupTimer = 0
  }

  void startSharedStream()

  return () => {
    updateSubscribers.delete(onUpdate)
    if (updateSubscribers.size === 0) {
      disconnectCleanupTimer = window.setTimeout(() => {
        if (updateSubscribers.size === 0) {
          sharedAbortController?.abort()
          sharedAbortController = null
          isStreamActive = false
          window.clearTimeout(sharedRetryTimer)
        }
      }, 5000)
    }
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

  let pending: Promise<T>
  pending = request().then((value) => {
    GET_CACHE.set(cacheKey, { expiresAt: Date.now() + GET_CACHE_TTL_MS, value: cloneValue(value) })
    return value
  }).finally(() => {
    if (IN_FLIGHT_GETS.get(cacheKey) === pending) IN_FLIGHT_GETS.delete(cacheKey)
  })
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