'use client'

import { useEffect, useState } from 'react'
import { Check, X, Ban } from 'lucide-react'
import { WorkspaceShell } from '@/components/workspace-shell'
import { apiRequest, formatDate, type EquipmentItem, type EquipmentRequest, type LabUser } from '@/lib/clms-api'
import { getSession } from '@/lib/auth'
import { useApiLiveRevision } from '@/lib/use-api-live-revision'

export default function RequestsPage() {
  const liveRevision = useApiLiveRevision()
  const [requests, setRequests] = useState<EquipmentRequest[]>([])
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [users, setUsers] = useState<LabUser[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const admin = getSession()?.user.role === 'ADMIN'
    setIsAdmin(admin)
    const fetches: Promise<unknown>[] = [
      apiRequest<EquipmentRequest[]>('/api/requests'),
      apiRequest<EquipmentItem[]>('/api/equipment'),
    ]
    if (admin) fetches.push(apiRequest<LabUser[]>('/api/users'))
    Promise.all(fetches)
      .then(([requestRows, equipmentRows, userRows]) => {
        setRequests(requestRows as EquipmentRequest[])
        setEquipment(equipmentRows as EquipmentItem[])
        setUsers((userRows as LabUser[] | undefined) ?? [])
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load requests.'))
      .finally(() => setLoading(false))
  }, [liveRevision, revision])

  const decide = async (request: EquipmentRequest, status: 'APPROVED' | 'REJECTED') => {
    setError('')
    try {
      await apiRequest(`/api/requests/${request.id}/decision`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setRevision((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update request.')
    }
  }

  const cancel = async (request: EquipmentRequest) => {
    setError('')
    try {
      await apiRequest<void>(`/api/requests/${request.id}`, { method: 'DELETE' })
      setRevision((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not cancel request.')
    }
  }

  const itemById = new Map(equipment.map((item) => [item.id, item]))
  const userById = new Map(users.map((user) => [user.id, user]))
  const pending = requests.filter((request) => request.status === 'PENDING').length

  return <WorkspaceShell title="Requests" eyebrow="Workflow / Inbox" description={isAdmin ? 'Review and decide equipment requests from lab members.' : 'Track the status of your equipment requests.'} adminOnly={false}>
    {error ? <div role="alert" className="mb-4 border border-red-400/30 bg-red-950/30 px-3 py-2 text-[11px] text-red-100">{error}</div> : null}
    <div className="mb-3 grid grid-cols-3 gap-2.5">
      {[['Pending', pending, 'text-[#b49eff]'], ['Approved', requests.filter((request) => request.status === 'APPROVED').length, 'text-emerald-300'], ['Rejected', requests.filter((request) => request.status === 'REJECTED').length, 'text-red-300']].map(([label, count, color]) => <div key={String(label)} className="border border-white/10 bg-[#1b1b1d] px-3 py-3"><div className="font-mono text-[7px] uppercase tracking-[0.16em] text-[#777780]">{label}</div><div className={`mt-2 text-[22px] leading-none ${color}`}>{loading ? '—' : count}</div></div>)}
    </div>
    <div className="border border-white/10 bg-[#1b1b1d]">
      {loading ? <p className="py-12 text-center text-[10px] text-[#85858e]">Loading request records…</p> : requests.length === 0 ? <p className="py-12 text-center text-[10px] text-[#85858e]">No equipment requests have been submitted.</p> : requests.map((request) => {
        const item = itemById.get(request.equipmentId)
        const requester = userById.get(request.userId)
        return <article key={request.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] px-3.5 py-3 last:border-0 sm:px-4">
          <div className="flex min-w-0 items-start gap-3"><div className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#29243a] font-mono text-[8px] text-[#cbbcff]">{requester?.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() ?? 'RQ'}</div><div className="min-w-0"><div className="truncate text-[10px] font-medium">{isAdmin ? requester?.name ?? `Member #${request.userId}` : item?.name ?? `Equipment #${request.equipmentId}`}</div><div className="mt-1 truncate text-[9px] text-[#a0a0a8]">{isAdmin ? `Requested ${item?.name ?? `equipment #${request.equipmentId}`}` : request.purpose}</div><div className="mt-1 truncate text-[8px] text-[#777780]">{isAdmin ? request.purpose : `Requested ${formatDate(request.createdAt)}`}</div></div></div>
          <div className="flex items-center gap-3"><div className="text-right"><div className="font-mono text-[7px] uppercase text-[#777780]">Due</div><div className="mt-1 text-[9px] text-[#c6c6cc]">{formatDate(request.dueAt)}</div></div><span className={`font-mono text-[7px] uppercase tracking-[0.1em] ${request.status === 'APPROVED' ? 'text-emerald-300' : request.status === 'REJECTED' ? 'text-red-300' : request.status === 'CANCELLED' ? 'text-[#888]' : 'text-[#b49eff]'}`}>● {request.status}</span>{isAdmin && request.status === 'PENDING' ? <div className="flex gap-1"><button onClick={() => decide(request, 'APPROVED')} title="Approve request" aria-label="Approve request" className="flex h-7 w-7 items-center justify-center bg-[#8e73ff] text-white hover:bg-[#a18cff]"><Check className="h-3.5 w-3.5" /></button><button onClick={() => decide(request, 'REJECTED')} title="Reject request" aria-label="Reject request" className="flex h-7 w-7 items-center justify-center border border-white/10 text-[#aaa] hover:text-red-300"><X className="h-3.5 w-3.5" /></button></div> : !isAdmin && request.status === 'PENDING' ? <button onClick={() => cancel(request)} title="Cancel request" aria-label="Cancel request" className="flex h-7 w-7 items-center justify-center border border-white/10 text-[#aaa] hover:text-red-300"><Ban className="h-3.5 w-3.5" /></button> : null}</div>
        </article>
      })}
    </div>
  </WorkspaceShell>
}