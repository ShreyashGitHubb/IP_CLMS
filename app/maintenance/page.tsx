'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Check, Plus, Wrench, X } from 'lucide-react'
import { WorkspaceShell } from '@/components/workspace-shell'
import { apiRequest, formatDate, type EquipmentItem, type MaintenanceTicket } from '@/lib/clms-api'
import { useApiLiveRevision } from '@/lib/use-api-live-revision'

export default function MaintenancePage() {
  const liveRevision = useApiLiveRevision()
  const [items, setItems] = useState<EquipmentItem[]>([])
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [working, setWorking] = useState(false)
  const [form, setForm] = useState({ equipmentId: '', title: '', details: '', assignedTechnician: '', repairCost: '' })

  useEffect(() => {
    if (window.location.hash === '#add') {
      setFormOpen(true)
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }
    Promise.all([apiRequest<EquipmentItem[]>('/api/equipment'), apiRequest<MaintenanceTicket[]>('/api/maintenance')])
      .then(([equipment, maintenance]) => { setItems(equipment); setTickets(maintenance) })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load inventory.'))
      .finally(() => setLoading(false))
  }, [liveRevision, revision])

  const createTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setWorking(true)
    setError('')
    try {
      await apiRequest('/api/maintenance', { method: 'POST', body: JSON.stringify({
        equipmentId: Number(form.equipmentId),
        title: form.title,
        details: form.details,
        assignedTechnician: form.assignedTechnician || null,
        repairCost: form.repairCost ? Number(form.repairCost) : null,
      }) })
      setForm({ equipmentId: '', title: '', details: '', assignedTechnician: '', repairCost: '' })
      setFormOpen(false)
      setRevision((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create maintenance ticket.')
    } finally {
      setWorking(false)
    }
  }

  const updateTicket = async (ticket: MaintenanceTicket, status: MaintenanceTicket['status']) => {
    setError('')
    try {
      await apiRequest(`/api/maintenance/${ticket.id}`, { method: 'PATCH', body: JSON.stringify({ status, assignedTechnician: ticket.assignedTechnician, repairCost: ticket.repairCost }) })
      setRevision((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update maintenance ticket.')
    }
  }

  const openTickets = tickets.filter((ticket) => ticket.status !== 'RESOLVED')

  return <WorkspaceShell title="Maintenance" eyebrow={`Service desk / ${openTickets.length} open tickets`} description="Track faults, assignment, repair cost, and resolution against laboratory equipment." adminOnly action={<button onClick={() => setFormOpen((open) => !open)} className="inline-flex h-8 items-center gap-2 bg-[#8e73ff] px-3 text-[9px] uppercase tracking-[0.1em]"><Plus className="h-3 w-3" /> Log incident</button>}>
    {error ? <div role="alert" className="mb-4 border border-red-400/30 bg-red-950/30 px-3 py-2 text-[11px] text-red-100">{error}</div> : null}
    <div className="mb-3 grid grid-cols-3 gap-2.5">{[['Open', openTickets.length], ['In progress', tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length], ['Resolved', tickets.filter((ticket) => ticket.status === 'RESOLVED').length]].map(([label, count]) => <div key={String(label)} className="border border-white/10 bg-[#1b1b1d] px-3 py-3"><div className="font-mono text-[7px] uppercase tracking-[0.16em] text-[#777780]">{label}</div><div className="mt-2 text-[22px] leading-none">{loading ? '—' : count}</div></div>)}</div>
    {formOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !working) setFormOpen(false) }}>
      <form role="dialog" aria-modal="true" aria-labelledby="maintenance-form-title" onSubmit={createTicket} className="my-auto grid w-full max-w-xl gap-3 border border-white/10 bg-[#1b1b1d] p-4 shadow-2xl sm:grid-cols-2 sm:p-5">
        <div className="sm:col-span-2 flex items-center justify-between"><h2 id="maintenance-form-title" className="text-[13px] font-medium">New repair ticket</h2><button type="button" aria-label="Close incident form" disabled={working} onClick={() => setFormOpen(false)}><X className="h-4 w-4" /></button></div>
        {error ? <div role="alert" className="sm:col-span-2 border border-red-400/30 bg-red-950/30 px-3 py-2 text-[10px] text-red-100">{error}</div> : null}
        <label className="font-mono text-[8px] uppercase text-[#898991]">Equipment<select required value={form.equipmentId} onChange={(event) => setForm({ ...form, equipmentId: event.target.value })} className="mt-1 h-9 w-full border border-white/10 bg-[#111113] px-2 font-sans text-[10px] normal-case text-white"><option value="">Select equipment</option>{items.map((item) => <option key={item.id} value={item.id}>{item.assetTag} · {item.name}</option>)}</select></label>
        <label className="font-mono text-[8px] uppercase text-[#898991]">Incident title<input required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1 h-9 w-full border border-white/10 bg-[#111113] px-2 font-sans text-[10px] normal-case text-white" /></label>
        <label className="font-mono text-[8px] uppercase text-[#898991]">Technician<input value={form.assignedTechnician} onChange={(event) => setForm({ ...form, assignedTechnician: event.target.value })} className="mt-1 h-9 w-full border border-white/10 bg-[#111113] px-2 font-sans text-[10px] normal-case text-white" /></label>
        <label className="font-mono text-[8px] uppercase text-[#898991]">Estimated cost<input type="number" min="0" step="0.01" value={form.repairCost} onChange={(event) => setForm({ ...form, repairCost: event.target.value })} className="mt-1 h-9 w-full border border-white/10 bg-[#111113] px-2 font-sans text-[10px] normal-case text-white" /></label>
        <label className="font-mono text-[8px] uppercase text-[#898991] sm:col-span-2">Issue details<textarea required value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} rows={3} className="mt-1 w-full border border-white/10 bg-[#111113] p-2 font-sans text-[10px] normal-case text-white" /></label>
        <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" disabled={working} onClick={() => setFormOpen(false)} className="h-8 border border-white/15 px-3 text-[9px] uppercase disabled:opacity-50">Cancel</button><button disabled={working} className="h-8 bg-[#8e73ff] px-3 text-[9px] uppercase disabled:opacity-50">{working ? 'Saving…' : 'Create ticket'}</button></div>
      </form>
    </div> : null}
    {loading ? <p className="py-12 text-center text-[10px] text-[#85858e]">Loading service records…</p> : tickets.length === 0 ? <p className="border border-dashed border-white/10 py-12 text-center text-[10px] text-[#85858e]">No maintenance tickets have been recorded.</p> : <div className="space-y-2">{tickets.map((ticket) => <article key={ticket.id} className="border border-white/10 bg-[#1b1b1d] p-3.5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex gap-3"><div className="flex h-8 w-8 items-center justify-center bg-amber-300/10 text-amber-200"><Wrench className="h-4 w-4" /></div><div><div className="font-mono text-[7px] uppercase tracking-[0.13em] text-[#777780]">{items.find((item) => item.id === ticket.equipmentId)?.assetTag ?? `Equipment #${ticket.equipmentId}`}</div><h2 className="mt-1 text-[11px] font-medium">{ticket.title}</h2><p className="mt-1 text-[9px] text-[#aaaab2]">{ticket.details}</p><p className="mt-1 text-[8px] text-[#777780]">{items.find((item) => item.id === ticket.equipmentId)?.name ?? 'Unknown item'} · opened {formatDate(ticket.openedAt)} · {ticket.assignedTechnician || 'Unassigned'}{ticket.repairCost != null ? ` · $${ticket.repairCost.toFixed(2)}` : ''}</p></div></div><div className="flex items-center gap-2"><span className="font-mono text-[7px] uppercase text-[#b7a3ff]">{ticket.status.replaceAll('_', ' ')}</span>{ticket.status !== 'RESOLVED' ? <select aria-label={`Update ${ticket.title} status`} value={ticket.status} onChange={(event) => updateTicket(ticket, event.target.value as MaintenanceTicket['status'])} className="h-7 border border-white/10 bg-[#111113] px-2 text-[8px] text-white"><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option></select> : <span className="inline-flex items-center gap-1 text-[8px] text-emerald-300"><Check className="h-3 w-3" />{ticket.resolvedAt ? formatDate(ticket.resolvedAt) : 'Resolved'}</span>}</div></div></article>)}</div>}
  </WorkspaceShell>
}