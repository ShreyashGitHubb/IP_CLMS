export const AUTH_TOKEN_KEY = 'clms_auth_token'
export const AUTH_USER_KEY = 'clms_auth_user'

export type AuthUser = {
  id: number
  name: string
  email: string
  role: string
  mustChangePassword?: boolean
}

export function saveSession(user: AuthUser, token: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function getSession() {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  const savedUser = localStorage.getItem(AUTH_USER_KEY)

  if (!token || !savedUser) return null

  try {
    return { token, user: JSON.parse(savedUser) as AuthUser }
  } catch {
    return null
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
}

export async function logoutSession() {
  const session = getSession()
  if (!session) {
    clearSession()
    return
  }
  try {
    await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.token}` },
    })
  } catch {
    // Local logout must still complete if the API is temporarily unreachable.
  } finally {
    clearSession()
  }
}
