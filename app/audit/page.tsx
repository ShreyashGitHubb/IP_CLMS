'use client'

import { useEffect, useState } from 'react'
import { WorkspaceShell } from '@/components/workspace-shell'
import { apiRequest, formatDate } from '@/lib/clms-api'
import { getSession } from '@/lib/auth'
import { useApiLiveRevision } from '@/lib/use-api-live-revision'

type AuditEntry = { id: number; userId: number | null; action: string; entityType: string; entityId: number | null; details: string | null; createdAt: string }

export default function AuditPage() {
  const liveRevision = useApiLiveRevision()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiRequest<AuditEntry[]>('/api/audit-logs')
      .then(setEntries)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load audit entries.'))
      .finally(() => setLoading(false))
  }, [liveRevision])

  return <WorkspaceShell title="Audit log" eyebrow={`System / ${entries.length} recent changes`} description="Administrator-only record of successful authenticated data mutations." adminOnly>
    {error ? <div role="alert" className="mb-3 border border-red-400/30 bg-red-950/30 px-3 py-2 text-[10px] text-red-100">{error}</div> : null}
    <div className="overflow-x-auto border border-white/10 bg-[#1b1b1d]"><div className="min-w-[620px]"><div className="grid grid-cols-[1.1fr_1fr_1.5fr_1.2fr] gap-3 border-b border-white/10 px-4 py-3 font-mono text-[7px] uppercase tracking-[0.14em] text-[#777780]"><span>Time</span><span>Account</span><span>Action</span><span>Result</span></div>{loading ? <p className="py-12 text-center text-[10px] text-[#85858e]">Loading audit records…</p> : entries.length === 0 ? <p className="py-12 text-center text-[10px] text-[#85858e]">No audited changes yet.</p> : entries.map((entry) => <div key={entry.id} className="grid grid-cols-[1.1fr_1fr_1.5fr_1.2fr] gap-3 border-b border-white/[0.07] px-4 py-3 last:border-0"><span className="text-[8px] text-[#9999a1]">{formatDate(entry.createdAt)}</span><span className="text-[9px]">{entry.userId ? `User #${entry.userId}` : 'System'}</span><span className="break-all text-[8px] text-[#c3c3ca]">{entry.action}</span><span className="text-[8px] text-[#8f8f98]">{entry.details ?? `${entry.entityType}${entry.entityId ? ` #${entry.entityId}` : ''}`}</span></div>)}</div></div>
  </WorkspaceShell>
}