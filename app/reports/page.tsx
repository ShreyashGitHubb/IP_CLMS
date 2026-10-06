'use client'

import { useEffect, useMemo, useState } from 'react'
import { WorkspaceShell } from '@/components/workspace-shell'
import { apiRequest, isActiveLoan, type EquipmentItem, type LabUser, type LoanTransaction } from '@/lib/clms-api'

export default function ReportsPage() {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [transactions, setTransactions] = useState<LoanTransaction[]>([])
  const [users, setUsers] = useState<LabUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([apiRequest<EquipmentItem[]>('/api/equipment'), apiRequest<LoanTransaction[]>('/api/transactions'), apiRequest<LabUser[]>('/api/users')])
      .then(([items, rows, labUsers]) => { setEquipment(items); setTransactions(rows); setUsers(labUsers) })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load report data.'))
      .finally(() => setLoading(false))
  }, [])

  const active = transactions.filter(isActiveLoan)
  const available = equipment.filter((item) => item.status === 'AVAILABLE').length
  const utilization = equipment.length ? Math.round((active.length / equipment.length) * 100) : 0
  const avgReturnDays = useMemo(() => {
    const returned = transactions.filter((row) => row.returnedAt)
    if (!returned.length) return null
    return returned.reduce((sum, row) => sum + (new Date(row.returnedAt!).getTime() - new Date(row.createdAt).getTime()), 0) / returned.length / 86400000
  }, [transactions])
  const daily = Array.from({ length: 14 }, (_, offset) => {
    const date = new Date()
    date.setDate(date.getDate() - (13 - offset))
    const count = transactions.filter((row) => new Date(row.createdAt).toDateString() === date.toDateString()).length
    return { key: date.toISOString(), count }
  })
  const peak = Math.max(1, ...daily.map((item) => item.count))

  return <WorkspaceShell title="Reports" eyebrow="Insights / Database" description="Operational indicators calculated from persisted equipment, account, and transaction records." adminOnly>
    {error ? <div role="alert" className="mb-4 border border-red-400/30 bg-red-950/30 px-3 py-2 text-[11px] text-red-100">{error}</div> : null}
    <section className="mb-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">{[
      ['Inventory', equipment.length, 'equipment records'],
      ['Availability', `${equipment.length ? Math.round((available / equipment.length) * 100) : 0}%`, `${available} available`],
      ['Active loans', active.length, 'not returned'],
      ['Members', users.filter((user) => user.role === 'MEMBER').length, 'registered accounts'],
    ].map(([label, value, detail]) => <div key={String(label)} className="border border-white/10 bg-[#1b1b1d] p-3.5"><div className="font-mono text-[7px] uppercase tracking-[0.16em] text-[#777780]">{label}</div><div className="mt-3 text-[22px] leading-none">{loading ? '—' : value}</div><div className="mt-2 text-[8px] text-[#8e8e97]">{detail}</div></div>)}</section>
    <div className="grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
      <section className="border border-white/10 bg-[#1b1b1d] p-4"><div className="mb-5"><div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#777780]">Transactions / last 14 days</div><div className="mt-1 text-[10px]">Recorded issue and return activity</div></div><div className="flex h-40 items-end gap-1 border-b border-white/10">{daily.map((item) => <div key={item.key} title={`${new Date(item.key).toLocaleDateString()}: ${item.count} records`} className="flex-1 bg-[#785ce0] hover:bg-[#a18cff]" style={{ height: `${Math.max(4, item.count / peak * 100)}%` }} />)}</div><div className="mt-2 flex justify-between font-mono text-[7px] text-[#777780]"><span>14 days ago</span><span>Today</span></div></section>
      <section className="border border-white/10 bg-[#1b1b1d] p-4"><div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#777780]">Return cycle</div><div className="mt-4 text-[30px] leading-none">{loading ? '—' : avgReturnDays === null ? '—' : avgReturnDays.toFixed(1)}</div><div className="mt-2 text-[9px] text-[#9a9aa3]">{avgReturnDays === null ? 'No returned transactions yet' : 'average days between issue and return'}</div><div className="mt-6 border-t border-white/10 pt-4"><div className="flex justify-between text-[9px] text-[#9a9aa3]"><span>Equipment in maintenance</span><span>{loading ? '—' : equipment.filter((item) => item.status === 'MAINTENANCE').length}</span></div><div className="mt-2 flex justify-between text-[9px] text-[#9a9aa3]"><span>Current utilization</span><span>{loading ? '—' : `${utilization}%`}</span></div></div></section>
    </div>
  </WorkspaceShell>
}