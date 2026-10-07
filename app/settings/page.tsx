'use client'

import { FormEvent, useEffect, useState } from 'react'
import { KeyRound, ShieldCheck, ShieldOff } from 'lucide-react'
import { WorkspaceShell } from '@/components/workspace-shell'
import { apiRequest } from '@/lib/clms-api'
import { clearSession, getApiBaseUrl, getSession } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [apiStatus, setApiStatus] = useState('Checking')
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [forcePasswordChange, setForcePasswordChange] = useState(false)

  useEffect(() => {
    setUser(getSession()?.user ?? null)
    setForcePasswordChange(new URLSearchParams(window.location.search).get('forcePasswordChange') === '1')
    apiRequest<{ status: string }>('/api/health')
      .then((response) => setApiStatus(response.status === 'ok' ? 'Connected' : response.status))
      .catch(() => setApiStatus('Unavailable'))
  }, [])

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')
    try {
      await apiRequest<void>('/api/users/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) })
      clearSession()
      router.replace('/sign-in')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not change password.')
    }
  }

  const revokeSessions = async () => {
    setError('')
    try {
      await apiRequest<void>('/api/auth/logout-all', { method: 'POST' })
      clearSession()
      router.replace('/sign-in')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not revoke sessions.')
    }
  }

  return <WorkspaceShell title="Settings" eyebrow="System / Account" description="Review your account identity, access role, and service connection.">
    {error ? <div role="alert" className="mb-3 border border-red-400/30 bg-red-950/30 px-3 py-2 text-[10px] text-red-100">{error}</div> : null}
    {notice ? <div role="status" className="mb-3 border border-emerald-400/20 bg-emerald-950/20 px-3 py-2 text-[10px] text-emerald-100">{notice}</div> : null}
    <div className="grid gap-3 md:grid-cols-[0.7fr_1.3fr]">
      <nav className="space-y-1 text-[10px]"><div className="border border-white/10 bg-[#1b1b1d] px-3 py-2.5 text-white">Account profile</div><div className="px-3 py-2.5 text-[#8f8f98]">Access and session</div><div className="px-3 py-2.5 text-[#8f8f98]">Service connection</div></nav>
      <div className="space-y-3">
        <section className="border border-white/10 bg-[#1b1b1d] p-4"><div className="mb-4 font-mono text-[8px] uppercase tracking-[0.18em] text-[#777780]">Signed-in account</div><div className="space-y-4">{[['Name', user?.name ?? 'Loading…'], ['Email', user?.email ?? 'Loading…'], ['Role', user?.role ?? 'Loading…'], ['Backend API', apiStatus], ['API endpoint', getApiBaseUrl()]].map(([label, value]) => <div key={label} className="border-b border-white/[0.08] pb-3 last:border-0"><div className="text-[8px] text-[#777780]">{label}</div><div className="mt-1 break-all text-[10px] text-[#e2e2e6]">{value}</div></div>)}</div><div className="mt-2 flex items-start gap-2 border border-white/10 bg-[#151517] p-3 text-[9px] leading-4 text-[#a5a5ad]"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b49eff]" />Role restrictions are enforced by the API. Email-based password recovery requires a configured mail provider and is not enabled.</div></section>
        <section className={`border bg-[#1b1b1d] p-4 ${forcePasswordChange ? 'border-amber-300/40' : 'border-white/10'}`}><h2 className="flex items-center gap-2 text-[11px] font-medium"><KeyRound className="h-3.5 w-3.5 text-[#b49eff]" />{forcePasswordChange ? 'Change your temporary password' : 'Change password'}</h2>{forcePasswordChange ? <p className="mt-2 text-[9px] text-amber-100">An administrator issued a temporary password. Choose a new password before continuing.</p> : null}<form onSubmit={changePassword} className="mt-3 grid gap-2 sm:grid-cols-2"><input required type="password" autoComplete="current-password" placeholder="Current password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="h-8 border border-white/10 bg-[#111113] px-2 text-[9px] text-white" /><input required type="password" minLength={8} autoComplete="new-password" placeholder="New password (8+ characters)" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="h-8 border border-white/10 bg-[#111113] px-2 text-[9px] text-white" /><button className="h-8 bg-[#8e73ff] px-3 text-[8px] uppercase sm:col-span-2">Update password and sign out</button></form></section>
        <section className="flex items-center justify-between gap-3 border border-white/10 bg-[#1b1b1d] p-4"><div><h2 className="flex items-center gap-2 text-[10px] font-medium"><ShieldOff className="h-3.5 w-3.5 text-amber-200" />Revoke all sessions</h2><p className="mt-1 text-[8px] text-[#85858e]">Signs out this and all other devices.</p></div><button onClick={revokeSessions} className="h-8 border border-white/15 px-3 text-[8px] uppercase">Revoke</button></section>
      </div>
    </div>
  </WorkspaceShell>
}