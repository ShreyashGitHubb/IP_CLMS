'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Check, Edit2, Plus, Search, Trash2, X } from 'lucide-react'
import { WorkspaceShell } from '@/components/workspace-shell'
import { apiRequest, type EquipmentItem } from '@/lib/clms-api'
import { getSession } from '@/lib/auth'

const emptyForm = { name: '', category: '', assetTag: '', status: 'AVAILABLE' as EquipmentItem['status'], location: '', description: '' }

export default function EquipmentPage() {
  const [items, setItems] = useState<EquipmentItem[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [editing, setEditing] = useState<EquipmentItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [requestItem, setRequestItem] = useState<EquipmentItem | null>(null)
  const [purpose, setPurpose] = useState('')
  const [requestDueAt, setRequestDueAt] = useState('')
  const [working, setWorking] = useState(false)
  const [notice, setNotice] = useState('')

  const refresh = () => {
    setLoading(true)
    apiRequest<EquipmentItem[]>('/api/equipment')
      .then(setItems)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load equipment.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setIsAdmin(getSession()?.user.role === 'ADMIN')
    refresh()
  }, [])

  const visibleItems = items.filter((item) => {
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter
    const searchText = `${item.name} ${item.category} ${item.assetTag} ${item.location}`.toLowerCase()
    return matchesStatus && searchText.includes(query.toLowerCase())
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormOpen(true) }
  const openEdit = (item: EquipmentItem) => {
    setEditing(item)
    setFormOpen(true)
    setForm({ name: item.name, category: item.category, assetTag: item.assetTag, status: item.status, location: item.location, description: item.description ?? '' })
  }

  const saveEquipment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setWorking(true)
    setError('')
    try {
      await apiRequest<EquipmentItem>(editing ? `/api/equipment/${editing.id}` : '/api/equipment', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      })
      setEditing(null)
      setFormOpen(false)
      setNotice(editing ? 'Equipment updated.' : 'Equipment added.')
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save equipment.')
    } finally {
      setWorking(false)
    }
  }

  const deleteEquipment = async (item: EquipmentItem) => {
    if (!window.confirm(`Delete ${item.name}?`)) return
    setError('')
    try {
      await apiRequest<void>(`/api/equipment/${item.id}`, { method: 'DELETE' })
      setNotice('Equipment deleted.')
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete equipment.')
    }
  }

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!requestItem) return
    setWorking(true)
    setError('')
    try {
      await apiRequest('/api/requests', { method: 'POST', body: JSON.stringify({ equipmentId: requestItem.id, purpose, dueAt: requestDueAt ? new Date(requestDueAt).toISOString() : null }) })
      setRequestItem(null)
      setPurpose('')
      setRequestDueAt('')
      setNotice('Request sent to the lab administrator.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit request.')
    } finally {
      setWorking(false)
    }
  }

  return <WorkspaceShell title="Equipment" eyebrow={`Inventory / ${items.length} records`} description="Search the equipment catalogue and manage live lab asset records." action={isAdmin ? <button onClick={openCreate} className="inline-flex h-8 items-center gap-2 bg-[#8e73ff] px-3 text-[10px] font-medium uppercase tracking-[0.1em] hover:bg-[#a18cff]"><Plus className="h-3.5 w-3.5" /> Add equipment</button> : null}>
    {error ? <div role="alert" className="mb-4 border border-red-400/30 bg-red-950/30 px-3 py-2 text-[11px] text-red-100">{error}</div> : null}
    {notice ? <div role="status" className="mb-4 border border-emerald-400/20 bg-emerald-950/20 px-3 py-2 text-[11px] text-emerald-100">{notice}</div> : null}
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
      <label className="flex h-8 min-w-52 items-center gap-2 border border-white/10 px-2.5 text-[#8e8e98]"><Search className="h-3.5 w-3.5" /><input aria-label="Search equipment" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, tag, location" className="w-full bg-transparent text-[10px] text-white outline-none placeholder:text-[#777780]" /></label>
      <label className="flex items-center gap-2 font-mono text-[8px] uppercase text-[#8e8e98]">Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-8 border border-white/10 bg-[#171719] px-2 text-[9px] text-white outline-none"><option value="ALL">All statuses</option><option value="AVAILABLE">Available</option><option value="IN_USE">In use</option><option value="MAINTENANCE">Maintenance</option><option value="RETIRED">Retired</option></select></label>
    </div>

    {isAdmin && formOpen ? <form onSubmit={saveEquipment} className="mb-4 grid gap-3 border border-white/10 bg-[#1b1b1d] p-4 sm:grid-cols-2">
      <div className="sm:col-span-2 flex items-center justify-between"><h2 className="text-[11px] font-medium">{editing ? 'Edit equipment' : 'New equipment record'}</h2><button type="button" aria-label="Close form" onClick={() => { setEditing(null); setFormOpen(false) }}><X className="h-4 w-4 text-[#999]" /></button></div>
      {([['name', 'Name'], ['category', 'Category'], ['assetTag', 'Asset tag'], ['location', 'Location']] as const).map(([key, label]) => <label key={key} className="space-y-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#8b8b94]">{label}<input required value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="h-8 w-full border border-white/10 bg-[#111113] px-2 font-sans text-[10px] normal-case text-white outline-none focus:border-[#9a80ff]" /></label>)}
      <label className="space-y-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#8b8b94]">Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as EquipmentItem['status'] })} className="h-8 w-full border border-white/10 bg-[#111113] px-2 font-sans text-[10px] text-white outline-none"><option value="AVAILABLE">Available</option><option value="IN_USE">In use</option><option value="MAINTENANCE">Maintenance</option><option value="RETIRED">Retired</option></select></label>
      <label className="space-y-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#8b8b94] sm:col-span-2">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} className="w-full border border-white/10 bg-[#111113] px-2 py-1.5 font-sans text-[10px] normal-case text-white outline-none focus:border-[#9a80ff]" /></label>
      <div className="sm:col-span-2 flex justify-end"><button disabled={working} className="inline-flex h-8 items-center gap-2 bg-[#8e73ff] px-3 text-[9px] uppercase tracking-[0.1em] disabled:opacity-50"><Check className="h-3 w-3" />{working ? 'Saving…' : 'Save record'}</button></div>
    </form> : null}
    {loading ? <p className="py-12 text-center text-[10px] text-[#85858e]">Loading equipment from the lab database…</p> : visibleItems.length === 0 ? <p className="border border-dashed border-white/10 py-12 text-center text-[10px] text-[#85858e]">No equipment matches this view.</p> : <div className="grid gap-2.5 md:grid-cols-2">
      {visibleItems.map((item) => <article key={item.id} className="border border-white/10 bg-[#1b1b1d] p-3.5">
        <div className="mb-4 flex items-start justify-between gap-3"><div className="min-w-0"><div className="font-mono text-[7px] uppercase tracking-[0.16em] text-[#777780]">{item.category}</div><h2 className="mt-1 truncate text-[13px] font-medium">{item.name}</h2><div className="mt-1 font-mono text-[7px] uppercase text-[#777780]">{item.assetTag} · {item.location}</div></div>
          {isAdmin ? <div className="flex gap-1"><button onClick={() => openEdit(item)} aria-label={`Edit ${item.name}`} className="flex h-7 w-7 items-center justify-center border border-white/10 text-[#999] hover:text-white"><Edit2 className="h-3 w-3" /></button><button onClick={() => deleteEquipment(item)} aria-label={`Delete ${item.name}`} className="flex h-7 w-7 items-center justify-center border border-white/10 text-[#999] hover:text-red-300"><Trash2 className="h-3 w-3" /></button></div> : null}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 pt-3"><span className={`font-mono text-[8px] uppercase tracking-[0.12em] ${item.status === 'AVAILABLE' ? 'text-emerald-300' : item.status === 'MAINTENANCE' ? 'text-amber-300' : 'text-[#b9a4ff]'}`}>● {item.status.replaceAll('_', ' ')}</span>{!isAdmin && item.status === 'AVAILABLE' ? <button onClick={() => setRequestItem(item)} className="border border-[#9a80ff]/60 px-2.5 py-1 text-[8px] uppercase tracking-[0.1em] text-[#c5b6ff] hover:bg-[#9a80ff]/10">Request item</button> : null}</div>
      </article>)}
    </div>}

    {requestItem ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={submitRequest} className="w-full max-w-md border border-white/10 bg-[#1b1b1d] p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-medium">Request {requestItem.name}</h2><button type="button" onClick={() => setRequestItem(null)} aria-label="Close request"><X className="h-4 w-4" /></button></div><label className="mt-5 block space-y-2 font-mono text-[8px] uppercase text-[#8d8d96]">Purpose<textarea required maxLength={500} value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={4} className="w-full border border-white/10 bg-[#111113] p-2 font-sans text-[11px] normal-case text-white outline-none focus:border-[#9a80ff]" placeholder="What will you use this equipment for?" /></label><label className="mt-3 block space-y-2 font-mono text-[8px] uppercase text-[#8d8d96]">Requested due date<input type="date" value={requestDueAt} onChange={(event) => setRequestDueAt(event.target.value)} className="h-8 w-full border border-white/10 bg-[#111113] px-2 font-sans text-[10px] normal-case text-white outline-none focus:border-[#9a80ff]" /></label><div className="mt-4 flex justify-end"><button disabled={working} className="h-8 bg-[#8e73ff] px-3 text-[9px] uppercase tracking-[0.1em] disabled:opacity-50">{working ? 'Sending…' : 'Submit request'}</button></div></form></div> : null}
  </WorkspaceShell>
}