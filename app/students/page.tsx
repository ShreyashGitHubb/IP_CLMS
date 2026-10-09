'use client'

import { useEffect, useState } from 'react'
import { FormEvent } from 'react'
import { Ban, Check, Copy, KeyRound, Plus, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react'
import { WorkspaceShell } from '@/components/workspace-shell'
import { apiRequest, formatDate, type LabUser } from '@/lib/clms-api'
import { getSession } from '@/lib/auth'
import { useApiLiveRevision } from '@/lib/use-api-live-revision'

export default function StudentsPage() {
  const liveRevision = useApiLiveRevision()
  const [users, setUsers] = useState<LabUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [working, setWorking] = useState(false)
  const [notice, setNotice] = useState('')
  const [temporaryCredential, setTemporaryCredential] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'MEMBER' })

  useEffect(() => {
    setCurrentUserId(getSession()?.user.id ?? null)
    if (window.location.hash === '#add') {
      setFormOpen(true)
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }
    apiRequest<LabUser[]>('/api/users')
      .then(setUsers)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load users.'))
      .finally(() => setLoading(false))
  }, [liveRevision])

  const createAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setWorking(true)
    setError('')
    setNotice('')
    try {
      await apiRequest('/api/users', { method: 'POST', body: JSON.stringify(form) })
      setForm({ name: '', email: '', password: '', role: 'MEMBER' })
      setFormOpen(false)
      setNotice('Account created.')
      const updated = await apiRequest<LabUser[]>('/api/users')
      setUsers(updated)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create account.')
    } finally {
      setWorking(false)
    }
  }

  const changeRole = async (user: LabUser, role: string) => {
    setError('')
    setNotice('')
    try {
      await apiRequest(`/api/users/${user.id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) })
      setUsers(await apiRequest<LabUser[]>('/api/users'))
      setNotice(`Updated ${user.name}'s role. Their existing sessions were revoked.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update role.')
    }
  }

  const resetPassword = async (user: LabUser) => {
    setError('')
    setNotice('')
    try {
      const result = await apiRequest<{ password: string }>(`/api/users/${user.id}/reset-password`, { method: 'POST' })
      setTemporaryCredential({ email: user.email, password: result.password })
      setNotice(`Password reset for ${user.name}; their sessions were revoked.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reset password.')
    }
  }

  const setAccountActive = async (user: LabUser) => {
    const nextActive = !user.active
    const action = nextActive ? 'reactivate' : 'deactivate'
    if (!window.confirm(`${action[0].toUpperCase()}${action.slice(1)} ${user.name}'s account? Their records will be retained.`)) return
    setError('')
    setNotice('')
    try {
      await apiRequest(`/api/users/${user.id}/active`, { method: 'PATCH', body: JSON.stringify({ active: nextActive }) })
      setUsers(await apiRequest<LabUser[]>('/api/users'))
      setNotice(`${user.name}'s account was ${nextActive ? 'reactivated' : 'deactivated'}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not ${action} this account.`)
    }
  }

  const deleteAccount = async (user: LabUser) => {
    if (!window.confirm(`Permanently delete ${user.name}? This only works when the account has no operational records; otherwise deactivate it instead.`)) return
    setError('')
    setNotice('')
    try {
      await apiRequest<void>(`/api/users/${user.id}`, { method: 'DELETE' })
      setUsers((current) => current.filter((account) => account.id !== user.id))
      setNotice(`${user.name}'s account was deleted.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete this account. Deactivate it to preserve its history.')
    }
  }

  const copyTemporaryPassword = async () => {
    if (!temporaryCredential) return
    await navigator.clipboard.writeText(temporaryCredential.password)
    setCopied(true)
  }

  return <WorkspaceShell title="Students" eyebrow={`People / ${users.length} accounts`} description="Create accounts, manage access, reset credentials, or deactivate accounts while retaining their records." adminOnly action={<button onClick={() => setFormOpen(true)} className="inline-flex h-8 items-center gap-2 bg-[#8e73ff] px-3 text-[9px] uppercase tracking-[0.1em] hover:bg-[#a18cff]"><UserPlus className="h-3 w-3" /> Create account</button>}>
    {error ? <div role="alert" className="mb-4 border border-red-400/30 bg-red-950/30 px-3 py-2 text-[11px] text-red-100">{error}</div> : null}
    {notice ? <div role="status" className="mb-4 border border-emerald-400/20 bg-emerald-950/20 px-3 py-2 text-[10px] text-emerald-100">{notice}</div> : null}
    {temporaryCredential ? <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border border-amber-300/25 bg-amber-200/[0.04] p-3"><div><div className="font-mono text-[8px] uppercase tracking-[0.12em] text-amber-200">Temporary password · {temporaryCredential.email}</div><div className="mt-2 select-all font-mono text-[11px] text-white">{temporaryCredential.password}</div><p className="mt-1 text-[8px] text-[#aaaab2]">This is shown once. Share securely and ask the user to change it.</p></div><div className="flex gap-2"><button onClick={copyTemporaryPassword} className="inline-flex h-7 items-center gap-1.5 border border-white/15 px-2 text-[8px] uppercase"><Copy className="h-3 w-3" />{copied ? 'Copied' : 'Copy'}</button><button onClick={() => { setTemporaryCredential(null); setCopied(false) }} aria-label="Dismiss temporary password" className="flex h-7 w-7 items-center justify-center border border-white/10"><X className="h-3 w-3" /></button></div></div> : null}
    {formOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !working) setFormOpen(false) }}>
      <form role="dialog" aria-modal="true" aria-labelledby="account-form-title" onSubmit={createAccount} className="my-auto grid w-full max-w-xl gap-3 border border-white/10 bg-[#1b1b1d] p-4 shadow-2xl sm:grid-cols-2 sm:p-5">
      <div className="sm:col-span-2 flex items-center justify-between"><h2 id="account-form-title" className="text-[13px] font-medium">Create account</h2><button type="button" aria-label="Close" disabled={working} onClick={() => setFormOpen(false)}><X className="h-4 w-4 text-[#aaa]" /></button></div>
      {error ? <div role="alert" className="sm:col-span-2 border border-red-400/30 bg-red-950/30 px-3 py-2 text-[10px] text-red-100">{error}</div> : null}
      <label className="font-mono text-[8px] uppercase text-[#898991]">Full name<input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 h-8 w-full border border-white/10 bg-[#111113] px-2 font-sans text-[10px] normal-case text-white" /></label>
      <label className="font-mono text-[8px] uppercase text-[#898991]">Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 h-8 w-full border border-white/10 bg-[#111113] px-2 font-sans text-[10px] normal-case text-white" /></label>
      <label className="font-mono text-[8px] uppercase text-[#898991]">Temporary password<input required minLength={8} maxLength={72} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1 h-8 w-full border border-white/10 bg-[#111113] px-2 font-sans text-[10px] normal-case text-white" /></label>
      <label className="font-mono text-[8px] uppercase text-[#898991]">Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="mt-1 h-8 w-full border border-white/10 bg-[#111113] px-2 font-sans text-[10px] normal-case text-white"><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></select></label>
      <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" disabled={working} onClick={() => setFormOpen(false)} className="h-8 border border-white/15 px-3 text-[9px] uppercase disabled:opacity-50">Cancel</button><button disabled={working} className="inline-flex h-8 items-center gap-1.5 bg-[#8e73ff] px-3 text-[9px] uppercase disabled:opacity-50"><Plus className="h-3 w-3" />{working ? 'Creating…' : 'Create account'}</button></div>
    </form>
    </div> : null}
    <div className="border border-white/10 bg-[#1b1b1d]">
      {loading ? <p className="py-12 text-center text-[10px] text-[#85858e]">Loading accounts…</p> : users.length === 0 ? <p className="py-12 text-center text-[10px] text-[#85858e]">No user accounts found.</p> : users.map((user) => <article key={user.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-3.5 py-3 last:border-0 sm:px-4"><div className="flex min-w-0 items-center gap-3"><div className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#29243a] font-mono text-[8px] text-[#cbbcff]">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div className="min-w-0"><div className="truncate text-[10px] font-medium">{user.name}</div><div className="truncate text-[8px] text-[#777780]">{user.email}</div><div className="mt-1 text-[8px] text-[#777780]">Since {formatDate(user.createdAt)} · {user.active ? 'Active' : 'Deactivated'}</div></div></div><div className="flex items-center gap-2"><label className="sr-only" htmlFor={`role-${user.id}`}>Role for {user.name}</label><select id={`role-${user.id}`} disabled={user.id === currentUserId} value={user.role} onChange={(event) => changeRole(user, event.target.value)} className="h-7 border border-white/10 bg-[#111113] px-2 font-mono text-[8px] uppercase text-[#d3d3d8] disabled:opacity-50"><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></select><button onClick={() => resetPassword(user)} aria-label={`Reset password for ${user.name}`} title="Reset password" className="flex h-7 w-7 items-center justify-center border border-white/10 text-[#aaa] hover:text-[#c6b4ff]"><KeyRound className="h-3 w-3" /></button>{user.id !== currentUserId ? <><button onClick={() => setAccountActive(user)} aria-label={`${user.active ? 'Deactivate' : 'Reactivate'} ${user.name}`} title={`${user.active ? 'Deactivate' : 'Reactivate'} account`} className={`flex h-7 w-7 items-center justify-center border border-white/10 ${user.active ? 'text-[#aaa] hover:text-red-300' : 'text-emerald-300 hover:text-emerald-200'}`}>{user.active ? <Ban className="h-3 w-3" /> : <Check className="h-3 w-3" />}</button><button onClick={() => deleteAccount(user)} aria-label={`Delete ${user.name}`} title="Delete account if unused" className="flex h-7 w-7 items-center justify-center border border-white/10 text-[#aaa] hover:text-red-300"><Trash2 className="h-3 w-3" /></button></> : null}</div></article>)}
    </div>
  </WorkspaceShell>
}