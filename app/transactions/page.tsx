'use client'

import { useEffect, useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { WorkspaceShell } from '@/components/workspace-shell'
import { apiRequest, formatDate, isActiveLoan, type EquipmentItem, type LabUser, type LoanTransaction } from '@/lib/clms-api'
import { getSession } from '@/lib/auth'
import { useApiLiveRevision } from '@/lib/use-api-live-revision'

export default function TransactionsPage() {
  const liveRevision = useApiLiveRevision()
  const [transactions, setTransactions] = useState<LoanTransaction[]>([])
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [users, setUsers] = useState<LabUser[]>([])
  const [userId, setUserId] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const session = getSession()
    if (!session) return
    const admin = session.user.role === 'ADMIN'
    setIsAdmin(admin)
    setUserId(session.user.id)
    const fetches: Promise<unknown>[] = [apiRequest<LoanTransaction[]>('/api/transactions'), apiRequest<EquipmentItem[]>('/api/equipment')]
    if (admin) fetches.push(apiRequest<LabUser[]>('/api/users'))
    Promise.all(fetches)
      .then(([rows, items, labUsers]) => {
        setTransactions(rows as LoanTransaction[])
        setEquipment(items as EquipmentItem[])
        setUsers((labUsers as LabUser[] | undefined) ?? [])
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load transactions.'))
      .finally(() => setLoading(false))
  }, [liveRevision, revision])

  const returnLoan = async (transaction: LoanTransaction) => {
    setError('')
    try {
      await apiRequest(`/api/transactions/${transaction.id}/return`, { method: 'PUT' })
      setRevision((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not return equipment.')
    }
  }

  const equipmentById = new Map(equipment.map((item) => [item.id, item]))
  const usersById = new Map(users.map((user) => [user.id, user]))
  const active = transactions.filter(isActiveLoan)
  const overdue = active.filter((transaction) => transaction.dueAt && new Date(transaction.dueAt).getTime() < Date.now())

  return <WorkspaceShell title="Transactions" eyebrow={`Loan ledger / ${transactions.length} records`} description={isAdmin ? 'A live ledger of equipment issue and return activity.' : 'Equipment transactions recorded against your account.'}>
    {error ? <div role="alert" className="mb-4 border border-red-400/30 bg-red-950/30 px-3 py-2 text-[11px] text-red-100">{error}</div> : null}
    <div className="mb-3 grid grid-cols-3 gap-2.5">{[['Active loans', active.length], ['Overdue', overdue.length], ['Closed records', transactions.length - active.length]].map(([label, count]) => <div key={String(label)} className="border border-white/10 bg-[#1b1b1d] px-3 py-3"><div className="font-mono text-[7px] uppercase tracking-[0.16em] text-[#777780]">{label}</div><div className={`mt-2 text-[22px] leading-none ${label === 'Overdue' && Number(count) ? 'text-amber-300' : 'text-white'}`}>{loading ? '—' : count}</div></div>)}</div>
    <div className="overflow-x-auto border border-white/10 bg-[#1b1b1d]">
      <div className="min-w-[620px]">
        <div className="grid grid-cols-[.7fr_1.3fr_1.5fr_1fr_1fr] gap-3 border-b border-white/10 px-4 py-3 font-mono text-[7px] uppercase tracking-[0.14em] text-[#777780]"><span>ID</span><span>Member</span><span>Equipment</span><span>Due date</span><span>Status</span></div>
        {loading ? <p className="py-12 text-center text-[10px] text-[#85858e]">Loading transaction records…</p> : transactions.length === 0 ? <p className="py-12 text-center text-[10px] text-[#85858e]">No equipment transactions recorded.</p> : transactions.map((transaction) => {
          const item = equipmentById.get(transaction.equipmentId)
          const isActive = isActiveLoan(transaction)
          const isOverdue = isActive && Boolean(transaction.dueAt && new Date(transaction.dueAt).getTime() < Date.now())
          const canReturn = isActive && (isAdmin || transaction.userId === userId)
          return <div key={transaction.id} className="grid grid-cols-[.7fr_1.3fr_1.5fr_1fr_1fr] items-center gap-3 border-b border-white/[0.07] px-4 py-3 last:border-0">
            <span className="font-mono text-[8px] text-[#777780]">TRX-{String(transaction.id).padStart(5, '0')}</span>
            <span className="truncate text-[9px]">{isAdmin ? usersById.get(transaction.userId)?.name ?? `Member #${transaction.userId}` : 'My account'}</span>
            <span className="truncate text-[9px] text-[#b7b7c0]">{item?.name ?? `Equipment #${transaction.equipmentId}`}</span>
            <span className="text-[8px] text-[#b7b7c0]">{formatDate(transaction.dueAt)}</span>
            <span className="flex items-center justify-between gap-2"><span className={`font-mono text-[7px] uppercase ${isOverdue ? 'text-red-300' : isActive ? 'text-emerald-300' : 'text-[#9c9ca5]'}`}>● {isOverdue ? 'Overdue' : isActive ? 'Active' : 'Returned'}</span>{canReturn ? <button onClick={() => returnLoan(transaction)} aria-label="Return equipment" title="Return equipment" className="flex h-6 w-6 items-center justify-center border border-white/10 text-[#aaa] hover:border-emerald-300/40 hover:text-emerald-200"><RotateCcw className="h-3 w-3" /></button> : !isActive ? <Check className="h-3 w-3 text-emerald-300" /> : null}</span>
          </div>
        })}
      </div>
    </div>
  </WorkspaceShell>
}