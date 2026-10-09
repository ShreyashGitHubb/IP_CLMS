'use client'

import { useEffect, useState } from 'react'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { WorkspaceShell } from '@/components/workspace-shell'
import { apiRequest, formatDate, type NotificationItem } from '@/lib/clms-api'
import { useApiLiveRevision } from '@/lib/use-api-live-revision'

export default function NotificationsPage() {
  const liveRevision = useApiLiveRevision()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const refresh = () => apiRequest<NotificationItem[]>('/api/notifications').then(setItems).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load notifications.')).finally(() => setLoading(false))
  useEffect(() => { void refresh() }, [liveRevision])

  const markRead = async (id?: number) => {
    setError('')
    try {
      await apiRequest<void>(id ? `/api/notifications/${id}/read` : '/api/notifications/read-all', { method: 'PUT' })
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update notifications.')
    }
  }
  const unread = items.filter((item) => !item.readAt).length

  return <WorkspaceShell title="Notifications" eyebrow={`Inbox / ${unread} unread`} description="Private account notifications for request decisions and lab activity." action={unread ? <button onClick={() => markRead()} className="inline-flex h-8 items-center gap-2 border border-white/15 px-3 text-[8px] uppercase"><CheckCheck className="h-3 w-3" /> Mark all read</button> : null}>
    {error ? <div role="alert" className="mb-3 border border-red-400/30 bg-red-950/30 px-3 py-2 text-[10px] text-red-100">{error}</div> : null}
    <div className="border border-white/10 bg-[#1b1b1d]">{loading ? <p className="py-12 text-center text-[10px] text-[#85858e]">Loading inbox…</p> : items.length === 0 ? <p className="py-12 text-center text-[10px] text-[#85858e]">No notifications yet.</p> : items.map((item) => <article key={item.id} className={`flex items-start justify-between gap-4 border-b border-white/[0.08] px-4 py-3 last:border-0 ${item.readAt ? 'opacity-65' : ''}`}><div className="flex gap-3"><div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center ${item.readAt ? 'bg-[#252529] text-[#888]' : 'bg-[#29243a] text-[#cbbcff]'}`}><Bell className="h-3.5 w-3.5" /></div><div><h2 className="text-[10px] font-medium">{item.title}</h2><p className="mt-1 text-[9px] leading-4 text-[#aaaab2]">{item.message}</p><time className="mt-1 block font-mono text-[7px] uppercase text-[#777780]">{formatDate(item.createdAt)}</time></div></div>{!item.readAt ? <button onClick={() => markRead(item.id)} aria-label="Mark notification read" title="Mark read" className="flex h-7 w-7 shrink-0 items-center justify-center border border-white/10 text-[#aaa] hover:text-emerald-200"><Check className="h-3 w-3" /></button> : null}</article>)}</div>
  </WorkspaceShell>
}