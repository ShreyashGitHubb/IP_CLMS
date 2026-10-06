import { clearSession, getApiBaseUrl, getSession } from '@/lib/auth'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getSession()
  if (!session) throw new ApiError('Sign in to continue.', 401)

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${session.token}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

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
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
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
}

export const formatDate = (value: string | null) => {
  if (!value) return 'No due date'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

export const isActiveLoan = (transaction: LoanTransaction) =>
  !transaction.returnedAt && !transaction.action.toUpperCase().includes('RETURN')