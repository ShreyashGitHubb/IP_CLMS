'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { CalendarPlus, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react'
import { WorkspaceShell } from '@/components/workspace-shell'
import { apiRequest, formatDate, type EquipmentItem, type LabEvent, type LoanTransaction } from '@/lib/clms-api'
import { getSession } from '@/lib/auth'

export default function CalendarPage() {
  const [transactions, setTransactions] = useState<LoanTransaction[]>([])
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [events, setEvents] = useState<LabEvent[]>([])
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [working, setWorking] = useState(false)
  const [revision, setRevision] = useState(0)
  const [form, setForm] = useState({ title: '', details: '', startsAt: '', endsAt: '' })

  useEffect(() => {
    setIsAdmin(getSession()?.user.role === 'ADMIN')
    if (window.location.hash === '#add') {
      setFormOpen(true)
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }
    Promise.all([apiRequest<LoanTransaction[]>('/api/transactions'), apiRequest<EquipmentItem[]>('/api/equipment'), apiRequest<LabEvent[]>('/api/events')])
      .then(([rows, items, labEvents]) => { setTransactions(rows); setEquipment(items); setEvents(labEvents) })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load due dates.'))
      .finally(() => setLoading(false))
  }, [revision])

  const dueLoans = useMemo(() => transactions.filter((row) => !row.returnedAt && row.dueAt && new Date(row.dueAt).getFullYear() === month.getFullYear() && new Date(row.dueAt).getMonth() === month.getMonth()).sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime()), [month, transactions])
  const monthEvents = events.filter((event) => new Date(event.startsAt).getFullYear() === month.getFullYear() && new Date(event.startsAt).getMonth() === month.getMonth())
  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const markedDays = new Set<number>()
  dueLoans.forEach((loan) => markedDays.add(new Date(loan.dueAt!).getDate()))
  monthEvents.forEach((event) => markedDays.add(new Date(event.startsAt).getDate()))
  const allEvents = [
    ...monthEvents.map((event) => ({ id: `event-${event.id}`, title: event.title, date: event.startsAt, eventId: event.id, type: 'Lab event' })),
    ...dueLoans.map((loan) => ({ id: `loan-${loan.id}`, title: equipment.find((item) => item.id === loan.equipmentId)?.name ?? `Equipment #${loan.equipmentId}`, date: loan.dueAt!, type: 'Loan due' })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const saveEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setWorking(true)
    setError('')
    try {
      await apiRequest('/api/events', { method: 'POST', body: JSON.stringify({ title: form.title, details: form.details || null, startsAt: new Date(form.startsAt).toISOString(), endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null }) })
      setForm({ title: '', details: '', startsAt: '', endsAt: '' })
      setFormOpen(false)
      setRevision((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save event.')
    } finally {
      setWorking(false)
    }
  }

  const deleteEvent = async (id: number) => {
    try {
      await apiRequest(`/api/events/${id}`, { method: 'DELETE' })
      setRevision((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete event.')
    }
  }

  return <WorkspaceShell title="Calendar" eyebrow={`Schedule / ${month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`} description="View scheduled lab events and due dates from active loan records." action={isAdmin ? <button onClick={() => setFormOpen(true)} className="inline-flex h-8 items-center gap-2 bg-[#8e73ff] px-3 text-[9px] uppercase"><CalendarPlus className="h-3 w-3" /> Add event</button> : null}>
    {error ? <div role="alert" className="mb-4 border border-red-400/30 bg-red-950/30 px-3 py-2 text-[11px] text-red-100">{error}</div> : null}
    {formOpen && isAdmin ? <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !working) setFormOpen(false) }}>
      <form role="dialog" aria-modal="true" aria-labelledby="event-form-title" onSubmit={saveEvent} className="my-auto grid w-full max-w-xl gap-3 border border-white/10 bg-[#1b1b1d] p-4 shadow-2xl sm:grid-cols-2 sm:p-5">
        <div className="sm:col-span-2 flex items-center justify-between"><h2 id="event-form-title" className="text-[13px]">Schedule lab event</h2><button type="button" aria-label="Close event form" disabled={working} onClick={() => setFormOpen(false)}><X className="h-4 w-4" /></button></div>
        {error ? <div role="alert" className="sm:col-span-2 border border-red-400/30 bg-red-950/30 px-3 py-2 text-[10px] text-red-100">{error}</div> : null}
        <label className="font-mono text-[8px] uppercase text-[#898991]">Title<input required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1 h-9 w-full border border-white/10 bg-[#111113] px-2 font-sans text-[10px] normal-case text-white" /></label>
        <label className="font-mono text-[8px] uppercase text-[#898991]">Starts<input required type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className="mt-1 h-9 w-full border border-white/10 bg-[#111113] px-2 font-sans text-[9px] normal-case text-white" /></label>
        <label className="font-mono text-[8px] uppercase text-[#898991]">Ends<input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} className="mt-1 h-9 w-full border border-white/10 bg-[#111113] px-2 font-sans text-[9px] normal-case text-white" /></label>
        <label className="font-mono text-[8px] uppercase text-[#898991] sm:col-span-2">Details<textarea value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} rows={3} className="mt-1 w-full border border-white/10 bg-[#111113] p-2 font-sans text-[10px] normal-case text-white" /></label>
        <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" disabled={working} onClick={() => setFormOpen(false)} className="h-8 border border-white/15 px-3 text-[9px] uppercase">Cancel</button><button disabled={working} className="h-8 bg-[#8e73ff] px-3 text-[9px] uppercase disabled:opacity-50">{working ? 'Saving…' : 'Save event'}</button></div>
      </form>
    </div> : null}
    <div className="grid gap-3 lg:grid-cols-[1.35fr_0.9fr]">
      <section className="border border-white/10 bg-[#1b1b1d] p-4">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-[11px] font-medium">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2><div className="flex gap-1"><button aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="flex h-7 w-7 items-center justify-center border border-white/10"><ChevronLeft className="h-3.5 w-3.5" /></button><button aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="flex h-7 w-7 items-center justify-center border border-white/10"><ChevronRight className="h-3.5 w-3.5" /></button></div></div>
        <div className="grid grid-cols-7 text-center font-mono text-[7px] uppercase text-[#777780]">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="py-2">{day}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">{Array.from({ length: firstWeekday }, (_, index) => <div key={`blank-${index}`} className="aspect-square" />)}{Array.from({ length: dayCount }, (_, index) => { const day = index + 1; const marked = markedDays.has(day); const today = new Date().toDateString() === new Date(month.getFullYear(), month.getMonth(), day).toDateString(); return <div key={day} className={`relative flex aspect-square items-center justify-center border text-[9px] ${today ? 'border-[#9a80ff] bg-[#9a80ff]/15 text-white' : 'border-white/[0.04] text-[#c3c3ca]'}`}>{day}{marked ? <span className="absolute bottom-1 h-1 w-1 bg-[#9a80ff]" /> : null}</div>})}</div>
      </section>
      <section className="border border-white/10 bg-[#1b1b1d] p-4"><div className="mb-3 border-b border-white/10 pb-3"><div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#777780]">Events and loan due dates</div><div className="mt-1 text-[10px]">{loading ? 'Loading…' : `${allEvents.length} items this month`}</div></div>{allEvents.length === 0 && !loading ? <p className="py-8 text-center text-[9px] text-[#777780]">No events or active loan due dates this month.</p> : <div className="space-y-2">{allEvents.map((event) => <div key={event.id} className="flex items-center justify-between gap-3 border-b border-white/[0.07] py-2 last:border-0"><div className="min-w-0"><div className="truncate text-[10px]">{event.title}</div><div className="mt-1 text-[8px] text-[#777780]">{event.type}</div></div><div className="flex shrink-0 items-center gap-2 text-right"><div><div className="font-mono text-[8px] text-[#b7a3ff]">{new Date(event.date).getDate().toString().padStart(2, '0')}</div><div className="mt-1 text-[8px] text-[#9999a1]">{formatDate(event.date)}</div></div>{isAdmin && event.eventId ? <button onClick={() => deleteEvent(event.eventId!)} title="Delete event" aria-label="Delete event" className="flex h-6 w-6 items-center justify-center border border-white/10 text-[#999] hover:text-red-300"><Trash2 className="h-3 w-3" /></button> : null}</div></div>)}</div>}</section>
    </div>
  </WorkspaceShell>
}