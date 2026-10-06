'use client'

import { useEffect, useState } from 'react'
import { Check, Wrench } from 'lucide-react'
import { WorkspaceShell } from '@/components/workspace-shell'
import { apiRequest, type EquipmentItem } from '@/lib/clms-api'

export default function MaintenancePage() {
  const [items, setItems] = useState<EquipmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [savingId, setSavingId] = useState<number | null>(null)

  useEffect(() => {
    apiRequest<EquipmentItem[]>('/api/equipment')
      .then(setItems)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load inventory.'))
      .finally(() => setLoading(false))
  }, [revision])

  const setStatus = async (item: EquipmentItem, status: EquipmentItem['status']) => {
    setSavingId(item.id)
    setError('')
    try {
      await apiRequest(`/api/equipment/${item.id}`, { method: 'PUT', body: JSON.stringify({ ...item, status }) })
      setRevision((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update equipment status.')
    } finally {
      setSavingId(null)
    }
  }

  const inService = items.filter((item) => item.status === 'MAINTENANCE')
  const flagged = items.filter((item) => item.status === 'IN_USE')

  return <WorkspaceShell title="Maintenance" eyebrow={`Service desk / ${inService.length} in maintenance`} description="Track service status using the live equipment catalogue. Mark repaired equipment available when work is complete." adminOnly>
    {error ? <div role="alert" className="mb-4 border border-red-400/30 bg-red-950/30 px-3 py-2 text-[11px] text-red-100">{error}</div> : null}
    <div className="mb-3 grid grid-cols-3 gap-2.5">{[['Needs attention', inService.length], ['In use', flagged.length], ['Available', items.filter((item) => item.status === 'AVAILABLE').length]].map(([label, count]) => <div key={String(label)} className="border border-white/10 bg-[#1b1b1d] px-3 py-3"><div className="font-mono text-[7px] uppercase tracking-[0.16em] text-[#777780]">{label}</div><div className="mt-2 text-[22px] leading-none">{loading ? '—' : count}</div></div>)}</div>
    {loading ? <p className="py-12 text-center text-[10px] text-[#85858e]">Loading equipment service status…</p> : items.length === 0 ? <p className="border border-dashed border-white/10 py-12 text-center text-[10px] text-[#85858e]">No equipment records exist.</p> : <div className="grid gap-2.5 md:grid-cols-2">
      {items.map((item) => <article key={item.id} className="border border-white/10 bg-[#1b1b1d] p-3.5"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><div className={`flex h-8 w-8 items-center justify-center ${item.status === 'MAINTENANCE' ? 'bg-amber-300/10 text-amber-200' : 'bg-[#29243a] text-[#b7a3ff]'}`}><Wrench className="h-4 w-4" /></div><div><div className="font-mono text-[7px] uppercase tracking-[0.13em] text-[#777780]">{item.assetTag}</div><h2 className="mt-1 text-[11px] font-medium">{item.name}</h2><p className="mt-1 text-[9px] text-[#8d8d96]">{item.location} · {item.category}</p></div></div><span className={`font-mono text-[7px] uppercase ${item.status === 'MAINTENANCE' ? 'text-amber-200' : 'text-[#aaaab2]'}`}>{item.status.replaceAll('_', ' ')}</span></div>
        <div className="mt-4 flex justify-end border-t border-white/10 pt-3">{item.status === 'MAINTENANCE' ? <button disabled={savingId === item.id} onClick={() => setStatus(item, 'AVAILABLE')} className="inline-flex h-7 items-center gap-1.5 border border-emerald-300/30 px-2.5 text-[8px] uppercase tracking-[0.08em] text-emerald-200 disabled:opacity-40"><Check className="h-3 w-3" />{savingId === item.id ? 'Saving…' : 'Mark in service'}</button> : item.status === 'AVAILABLE' ? <button disabled={savingId === item.id} onClick={() => setStatus(item, 'MAINTENANCE')} className="inline-flex h-7 items-center gap-1.5 border border-white/10 px-2.5 text-[8px] uppercase tracking-[0.08em] text-[#c1c1c8] disabled:opacity-40"><Wrench className="h-3 w-3" />Flag maintenance</button> : null}</div>
      </article>)}
    </div>}
  </WorkspaceShell>
}