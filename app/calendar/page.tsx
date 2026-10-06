'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { WorkspaceShell } from '@/components/workspace-shell'
import { apiRequest, formatDate, type EquipmentItem, type LoanTransaction } from '@/lib/clms-api'

export default function CalendarPage() {
  const [transactions, setTransactions] = useState<LoanTransaction[]>([])
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([apiRequest<LoanTransaction[]>('/api/transactions'), apiRequest<EquipmentItem[]>('/api/equipment')])
      .then(([rows, items]) => { setTransactions(rows); setEquipment(items) })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load due dates.'))
      .finally(() => setLoading(false))
  }, [])

  const events = useMemo(() => transactions.filter((row) => !row.returnedAt && row.dueAt && new Date(row.dueAt).getFullYear() === month.getFullYear() && new Date(row.dueAt).getMonth() === month.getMonth()).sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime()), [month, transactions])
  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const dueByDay = new Map<number, LoanTransaction[]>()
  events.forEach((event) => {
    const day = new Date(event.dueAt!).getDate()
    dueByDay.set(day, [...(dueByDay.get(day) ?? []), event])
  })
  const equipmentById = new Map(equipment.map((item) => [item.id, item]))

  return <WorkspaceShell title="Calendar" eyebrow={`Schedule / ${month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`} description="Due dates are taken from active loan transactions in the database.">
    {error ? <div role="alert" className="mb-4 border border-red-400/30 bg-red-950/30 px-3 py-2 text-[11px] text-red-100">{error}</div> : null}
    <div className="grid gap-3 lg:grid-cols-[1.35fr_0.9fr]">
      <section className="border border-white/10 bg-[#1b1b1d] p-4">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-[11px] font-medium">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2><div className="flex gap-1"><button aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="flex h-7 w-7 items-center justify-center border border-white/10"><ChevronLeft className="h-3.5 w-3.5" /></button><button aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="flex h-7 w-7 items-center justify-center border border-white/10"><ChevronRight className="h-3.5 w-3.5" /></button></div></div>
        <div className="grid grid-cols-7 text-center font-mono text-[7px] uppercase text-[#777780]">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="py-2">{day}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">{Array.from({ length: firstWeekday }, (_, index) => <div key={`blank-${index}`} className="aspect-square" />)}{Array.from({ length: dayCount }, (_, index) => { const day = index + 1; const marked = dueByDay.has(day); const today = new Date().toDateString() === new Date(month.getFullYear(), month.getMonth(), day).toDateString(); return <div key={day} className={`relative flex aspect-square items-center justify-center border text-[9px] ${today ? 'border-[#9a80ff] bg-[#9a80ff]/15 text-white' : 'border-white/[0.04] text-[#c3c3ca]'}`}>{day}{marked ? <span className="absolute bottom-1 h-1 w-1 bg-[#9a80ff]" /> : null}</div>})}</div>
      </section>
      <section className="border border-white/10 bg-[#1b1b1d] p-4"><div className="mb-3 border-b border-white/10 pb-3"><div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#777780]">Active loan due dates</div><div className="mt-1 text-[10px]">{loading ? 'Loading…' : `${events.length} due this month`}</div></div>{events.length === 0 && !loading ? <p className="py-8 text-center text-[9px] text-[#777780]">No active loans are due this month.</p> : <div className="space-y-2">{events.map((event) => <div key={event.id} className="flex items-center justify-between gap-3 border-b border-white/[0.07] py-2 last:border-0"><div className="min-w-0"><div className="truncate text-[10px]">{equipmentById.get(event.equipmentId)?.name ?? `Equipment #${event.equipmentId}`}</div><div className="mt-1 text-[8px] text-[#777780]">Loan #{event.id}</div></div><div className="shrink-0 text-right"><div className="font-mono text-[8px] text-[#b7a3ff]">{new Date(event.dueAt!).getDate().toString().padStart(2, '0')}</div><div className="mt-1 text-[8px] text-[#9999a1]">{formatDate(event.dueAt)}</div></div></div>)}</div>}</section>
    </div>
  </WorkspaceShell>
}