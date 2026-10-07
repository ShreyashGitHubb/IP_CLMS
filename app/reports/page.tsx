'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { WorkspaceShell } from '@/components/workspace-shell'
import { apiRequest, isActiveLoan, type EquipmentItem, type LabUser, type LoanTransaction } from '@/lib/clms-api'

export default function ReportsPage() {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [transactions, setTransactions] = useState<LoanTransaction[]>([])
  const [users, setUsers] = useState<LabUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    Promise.all([apiRequest<EquipmentItem[]>('/api/equipment'), apiRequest<LoanTransaction[]>('/api/transactions'), apiRequest<LabUser[]>('/api/users')])
      .then(([items, rows, labUsers]) => { setEquipment(items); setTransactions(rows); setUsers(labUsers) })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load report data.'))
      .finally(() => setLoading(false))
  }, [])

  const filteredTransactions = transactions.filter((transaction) => {
    const created = new Date(transaction.createdAt).getTime()
    const afterFrom = !from || created >= new Date(`${from}T00:00:00`).getTime()
    const beforeTo = !to || created <= new Date(`${to}T23:59:59`).getTime()
    return afterFrom && beforeTo
  })
  const active = filteredTransactions.filter(isActiveLoan)
  const available = equipment.filter((item) => item.status === 'AVAILABLE').length
  const utilization = equipment.length ? Math.round((active.length / equipment.length) * 100) : 0
  const avgReturnDays = useMemo(() => {
    const returned = filteredTransactions.filter((row) => row.returnedAt)
    if (!returned.length) return null
    return returned.reduce((sum, row) => sum + (new Date(row.returnedAt!).getTime() - new Date(row.createdAt).getTime()), 0) / returned.length / 86400000
  }, [filteredTransactions])
  const filteredIds = new Set(filteredTransactions.map((row) => row.id))
  const eventFilteredActive = transactions.filter((row) => isActiveLoan(row) && filteredIds.has(row.id))
  const daily = Array.from({ length: 14 }, (_, offset) => {
    const date = new Date()
    date.setDate(date.getDate() - (13 - offset))
    const count = filteredTransactions.filter((row) => new Date(row.createdAt).toDateString() === date.toDateString()).length
    return { key: date.toISOString(), count }
  })
  const peak = Math.max(1, ...daily.map((item) => item.count))
  const exportCsv = () => {
    const rows = [['id', 'user_id', 'equipment_id', 'action', 'created_at', 'due_at', 'returned_at'], ...filteredTransactions.map((row) => [row.id, row.userId, row.equipmentId, row.action, row.createdAt, row.dueAt ?? '', row.returnedAt ?? ''])]
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'clms-transactions.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return <WorkspaceShell title="Reports" eyebrow="Insights / Database" description="Operational indicators calculated from persisted equipment, account, and transaction records." adminOnly action={<button onClick={exportCsv} className="inline-flex h-8 items-center gap-2 border border-white/15 px-3 text-[9px] uppercase"><Download className="h-3 w-3" /> Export CSV</button>}>
    {error ? <div role="alert" className="mb-4 border border-red-400/30 bg-red-950/30 px-3 py-2 text-[11px] text-red-100">{error}</div> : null}
    <div className="mb-3 flex flex-wrap items-end gap-2 border border-white/10 bg-[#1b1b1d] p-3"><label className="font-mono text-[7px] uppercase text-[#85858e]">From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 block h-7 border border-white/10 bg-[#111113] px-2 font-sans text-[9px] normal-case text-white" /></label><label className="font-mono text-[7px] uppercase text-[#85858e]">To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 block h-7 border border-white/10 bg-[#111113] px-2 font-sans text-[9px] normal-case text-white" /></label><button onClick={() => { setFrom(''); setTo('') }} className="h-7 border border-white/10 px-2.5 text-[8px] uppercase text-[#aaa]">Clear dates</button><span className="ml-auto pb-1 font-mono text-[8px] text-[#85858e]">{loading ? 'Loading records…' : `${filteredTransactions.length} transactions in range`}</span></div>
    <section className="mb-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">{[
      ['Inventory', equipment.length, 'equipment records'],
      ['Availability', `${equipment.length ? Math.round((available / equipment.length) * 100) : 0}%`, `${available} available`],
      ['Active loans', eventFilteredActive.length, 'not returned in range'],
      ['Members', users.filter((user) => user.role === 'MEMBER').length, 'registered accounts'],
    ].map(([label, value, detail]) => <div key={String(label)} className="border border-white/10 bg-[#1b1b1d] p-3.5"><div className="font-mono text-[7px] uppercase tracking-[0.16em] text-[#777780]">{label}</div><div className="mt-3 text-[22px] leading-none">{loading ? '—' : value}</div><div className="mt-2 text-[8px] text-[#8e8e97]">{detail}</div></div>)}</section>
    <div className="grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
      <section className="border border-white/10 bg-[#1b1b1d] p-4"><div className="mb-5"><div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#777780]">Transactions / last 14 days</div><div className="mt-1 text-[10px]">Recorded issue and return activity</div></div><div className="flex h-40 items-end gap-1 border-b border-white/10">{daily.map((item) => <div key={item.key} title={`${new Date(item.key).toLocaleDateString()}: ${item.count} records`} className="flex-1 bg-[#785ce0] hover:bg-[#a18cff]" style={{ height: `${Math.max(4, item.count / peak * 100)}%` }} />)}</div><div className="mt-2 flex justify-between font-mono text-[7px] text-[#777780]"><span>14 days ago</span><span>Today</span></div></section>
      <section className="border border-white/10 bg-[#1b1b1d] p-4"><div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#777780]">Return cycle</div><div className="mt-4 text-[30px] leading-none">{loading ? '—' : avgReturnDays === null ? '—' : avgReturnDays.toFixed(1)}</div><div className="mt-2 text-[9px] text-[#9a9aa3]">{avgReturnDays === null ? 'No returned transactions yet' : 'average days between issue and return'}</div><div className="mt-6 border-t border-white/10 pt-4"><div className="flex justify-between text-[9px] text-[#9a9aa3]"><span>Equipment in maintenance</span><span>{loading ? '—' : equipment.filter((item) => item.status === 'MAINTENANCE').length}</span></div><div className="mt-2 flex justify-between text-[9px] text-[#9a9aa3]"><span>Current utilization</span><span>{loading ? '—' : `${utilization}%`}</span></div></div></section>
    </div>
  </WorkspaceShell>
}