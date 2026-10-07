'use client'

import { useEffect, useState } from 'react'
import { WorkspaceShell } from '@/components/workspace-shell'
import { apiRequest, formatDate, type LabUser } from '@/lib/clms-api'

export default function StudentsPage() {
  const [users, setUsers] = useState<LabUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest<LabUser[]>('/api/users')
      .then(setUsers)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load users.'))
      .finally(() => setLoading(false))
  }, [])

  return <WorkspaceShell title="Students" eyebrow={`People / ${users.length} accounts`} description="View registered lab accounts and their assigned access roles. Admin-managed account creation is not available yet." adminOnly>
    {error ? <div role="alert" className="mb-4 border border-red-400/30 bg-red-950/30 px-3 py-2 text-[11px] text-red-100">{error}</div> : null}
    <div className="border border-white/10 bg-[#1b1b1d]">
      {loading ? <p className="py-12 text-center text-[10px] text-[#85858e]">Loading accounts…</p> : users.length === 0 ? <p className="py-12 text-center text-[10px] text-[#85858e]">No user accounts found.</p> : users.map((user) => <article key={user.id} className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-3.5 py-3 last:border-0 sm:px-4"><div className="flex min-w-0 items-center gap-3"><div className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#29243a] font-mono text-[8px] text-[#cbbcff]">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div className="min-w-0"><div className="truncate text-[10px] font-medium">{user.name}</div><div className="truncate text-[8px] text-[#777780]">{user.email}</div></div></div><div className="shrink-0 text-right"><div className="font-mono text-[7px] uppercase tracking-[0.1em] text-[#aaaab2]">{user.role}</div><div className="mt-1 text-[8px] text-[#777780]">Since {formatDate(user.createdAt)}</div></div></article>)}
    </div>
  </WorkspaceShell>
}