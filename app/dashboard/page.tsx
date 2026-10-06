'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Activity,
  ArrowRight,
  Boxes,
  CalendarDays,
  ChevronRight,
  Database,
  LogOut,
  Package,
  ShieldCheck,
  Wrench,
} from 'lucide-react'
import { clearSession, getApiBaseUrl, getSession, type AuthUser } from '@/lib/auth'

type EquipmentItem = {
  id: number
  name: string
  category: string
  assetTag: string
  status: string
  location: string
}

type LoanTransaction = {
  id: number
  equipmentId: number
  userId: number
  action: string
  dueAt: string | null
  returnedAt: string | null
  createdAt: string
}

const navigation = [
  { label: 'Overview', href: '#overview', icon: Activity },
  { label: 'Equipment', href: '#equipment', icon: Boxes },
  { label: 'Activity', href: '#activity', icon: Database },
]

const formatDate = (value: string | null) => {
  if (!value) return 'No due date'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

const isActiveLoan = (transaction: LoanTransaction) =>
  !transaction.returnedAt && !transaction.action.toUpperCase().includes('RETURN')

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [transactions, setTransactions] = useState<LoanTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const session = getSession()
    if (!session) {
      router.replace('/sign-in')
      return
    }
    setUser(session.user)

    const controller = new AbortController()
    const apiBaseUrl = getApiBaseUrl()
    Promise.all([
      fetch(`${apiBaseUrl}/api/equipment`, { signal: controller.signal }),
      fetch(`${apiBaseUrl}/api/transactions`, { signal: controller.signal }),
    ])
      .then(async ([equipmentResponse, transactionResponse]) => {
        if (!equipmentResponse.ok || !transactionResponse.ok) {
          throw new Error('Could not load laboratory data. Please try again.')
        }
        const [equipmentData, transactionData] = await Promise.all([
          equipmentResponse.json() as Promise<EquipmentItem[]>,
          transactionResponse.json() as Promise<LoanTransaction[]>,
        ])
        setEquipment(equipmentData)
        setTransactions(transactionData)
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return
        setLoadError(error instanceof Error ? error.message : 'Could not load laboratory data.')
      })
      .finally(() => setIsLoading(false))

    return () => controller.abort()
  }, [router])

  const isAdmin = user?.role === 'ADMIN'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const myTransactions = transactions.filter((transaction) => transaction.userId === user?.id)
  const visibleTransactions = isAdmin ? transactions : myTransactions
  const activeLoans = visibleTransactions.filter(isActiveLoan)
  const overdueLoans = activeLoans.filter((transaction) => transaction.dueAt && new Date(transaction.dueAt).getTime() < Date.now())
  const availableEquipment = equipment.filter((item) => item.status === 'AVAILABLE')
  const maintenanceEquipment = equipment.filter((item) => item.status === 'MAINTENANCE')
  const recentTransactions = [...visibleTransactions]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 6)
  const equipmentById = new Map(equipment.map((item) => [item.id, item]))
  const stats = isAdmin
    ? [
        { label: 'Total equipment', value: equipment.length, detail: 'In the inventory', icon: Package },
        { label: 'Available', value: availableEquipment.length, detail: 'Ready to issue', icon: ShieldCheck },
        { label: 'Active loans', value: activeLoans.length, detail: 'Not yet returned', icon: Database },
        { label: 'Maintenance', value: maintenanceEquipment.length, detail: 'Currently unavailable', icon: Wrench },
      ]
    : [
        { label: 'Available equipment', value: availableEquipment.length, detail: 'In the lab catalogue', icon: Package },
        { label: 'My active loans', value: activeLoans.length, detail: 'Assigned to your account', icon: Database },
        { label: 'My transactions', value: myTransactions.length, detail: 'Recorded activity', icon: Activity },
        { label: 'Overdue', value: overdueLoans.length, detail: 'Please return or contact staff', icon: CalendarDays },
      ]

  const handleLogout = () => {
    clearSession()
    router.push('/sign-in')
  }

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen bg-[#0a0a0c] text-white">
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="hidden min-h-screen w-[260px] border-r border-white/10 bg-[#0d0e12] p-5 lg:flex lg:flex-col">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-lg border border-[#7c6cf6]/30 bg-[#161526] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.28em] text-[#b7aefc]">
              CLMS
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#8a8b94]">/ {isAdmin ? 'Admin' : 'Member'}</div>
          </div>

          <div className="mb-6 font-mono text-[10px] uppercase tracking-[0.24em] text-[#8a8b94]">Workspace</div>
          <nav aria-label="Dashboard sections" className="space-y-2">
            {navigation.map(({ label, href, icon: Icon }, index) => {
              const active = index === 0
              return (
                <a
                  key={label}
                  href={href}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                    active ? 'bg-[#1b1a27] text-white shadow-inner shadow-[#7c6cf6]/10' : 'text-[#c7cad4] hover:bg-[#12151d]'
                  }`}
                >
                  <Icon className="h-4 w-4 text-[#b7aefc]" />
                  {isAdmin && label === 'Activity' ? 'Transactions' : label === 'Activity' ? 'My activity' : label}
                </a>
              )
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/10 bg-[#111114] p-4">
            <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.22em] text-[#8a8b94]">{isAdmin ? 'Inventory status' : 'Your account'}</div>
            <div className="text-sm text-[#dfe3ef]">
              {isLoading ? 'Loading laboratory data…' : loadError ? 'Data is temporarily unavailable.' : isAdmin ? `${availableEquipment.length} items ready to issue.` : `${activeLoans.length} active loan${activeLoans.length === 1 ? '' : 's'} on your account.`}
            </div>
            <a href={isAdmin ? '#equipment' : '#activity'} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#201a2d] px-3 py-2 text-sm font-medium text-[#b7aefc]">
              {isAdmin ? 'Review inventory' : 'View my activity'} <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </aside>

        <div className="flex-1">
          <header className="border-b border-white/10 bg-[#0d0e12] px-4 py-4 sm:px-6">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8a8b94]">
                Laboratory / {isAdmin ? 'administration' : 'member workspace'}
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-[#17181d] px-3 py-2 text-xs text-[#dfe3ef] md:flex">
                  <span className={`h-2 w-2 rounded-full ${loadError ? 'bg-red-400' : isLoading ? 'bg-amber-300' : 'bg-[#7fe3b0]'}`} />
                  {loadError ? 'API unavailable' : isLoading ? 'Loading data' : 'Live data'}
                </div>

                <div className="flex items-center gap-3 rounded-full border border-white/10 bg-[#17181d] px-3 py-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2a234d] font-mono text-[10px] text-[#d8d0ff]">
                    {user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium">{user.name}</div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a8b94]">{user.role}</div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#17181d] px-3 py-2 text-sm text-[#dfe3ef] transition hover:border-red-500/50 hover:text-red-200"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <section id="overview" className="mb-8 grid scroll-mt-6 gap-6 rounded-3xl border border-white/10 bg-[#111114] p-6 md:grid-cols-[1.4fr_0.9fr]">
              <div>
                <div className="mb-4 font-mono text-[9px] uppercase tracking-[0.2em] text-[#7c6cf6]">
                  {isAdmin ? 'Admin console' : 'Member access'}
                </div>
                <h1 className="text-4xl font-semibold tracking-[-0.06em] md:text-6xl">
                  {greeting},<br />
                  {user.name.split(' ')[0]}.
                </h1>
                <p className="mt-4 max-w-xl text-base text-[#afafba]">
                  {isAdmin
                    ? 'Review the live equipment catalogue and recorded laboratory activity.'
                    : 'Your workspace shows equipment availability and activity linked to your account.'}
                </p>
              </div>

              <div className="flex min-h-[180px] flex-col justify-between rounded-2xl border border-[#7c6cf6]/20 bg-gradient-to-br from-[#2b2540] via-[#17181d] to-[#111114] p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#b7aefc]">{isAdmin ? 'Operations snapshot' : 'Account snapshot'}</div>
                <div>
                  <div className="text-3xl font-semibold tracking-[-0.04em]">{isLoading ? '…' : isAdmin ? equipment.length : activeLoans.length}</div>
                  <p className="mt-2 max-w-xs text-sm text-[#c7c3d5]">
                    {isAdmin ? 'equipment records currently in the catalogue' : 'active loan records associated with your account'}
                  </p>
                </div>
              </div>
            </section>

            {loadError ? (
              <div role="alert" className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm text-red-100">
                <span>{loadError}</span>
                <button type="button" onClick={() => window.location.reload()} className="shrink-0 underline underline-offset-4">Retry</button>
              </div>
            ) : null}

            <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map(({ label, value, detail, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-[#111114] p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a8b94]">{label}</div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1b1729] text-[#b7aefc]">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-semibold tracking-[-0.06em]">{isLoading ? '—' : value}</div>
                  <div className="mt-2 text-sm text-[#a1a1ad]">{detail}</div>
                </div>
              ))}
            </section>

            <section className="mb-8 grid gap-6 lg:grid-cols-[1.45fr_0.9fr]">
              <div id="equipment" className="scroll-mt-6 rounded-2xl border border-white/10 bg-[#111114] p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#7c6cf6]">{isAdmin ? 'Inventory' : 'Available equipment'}</div>
                  <span className="text-sm text-[#8a8b94]">{isLoading ? 'Loading…' : `${equipment.length} records`}</span>
                </div>

                <div className="space-y-3">
                  {(isAdmin ? equipment : availableEquipment).slice(0, 6).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#17181d] px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{item.name}</div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8a8b94]">{item.assetTag} · {item.location}</div>
                      </div>
                      <div className={`shrink-0 rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em] ${item.status === 'AVAILABLE' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-[#7c6cf6]/20 bg-[#201a2d] text-[#b7aefc]'}`}>
                        {item.status.replaceAll('_', ' ')}
                      </div>
                    </div>
                  ))}
                  {!isLoading && !loadError && (isAdmin ? equipment : availableEquipment).length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-[#8a8b94]">
                      {isAdmin ? 'No equipment has been added yet.' : 'No equipment is currently available.'}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111114] p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#7c6cf6]">{isAdmin ? 'Inventory health' : 'Loan summary'}</div>
                  {isAdmin ? <Wrench className="h-4 w-4 text-[#b7aefc]" /> : <ShieldCheck className="h-4 w-4 text-[#b7aefc]" />}
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-white/10 bg-[#17181d] p-4">
                    <div className="text-sm">{isAdmin ? 'Items available' : 'Active loans'}</div>
                    <div className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-[#b7aefc]">{isLoading ? '—' : isAdmin ? availableEquipment.length : activeLoans.length}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#17181d] p-4">
                    <div className="text-sm">{isAdmin ? 'Items in maintenance' : 'Overdue loans'}</div>
                    <div className={`mt-2 text-3xl font-semibold tracking-[-0.06em] ${overdueLoans.length ? 'text-amber-200' : 'text-[#dfe3ef]'}`}>
                      {isLoading ? '—' : isAdmin ? maintenanceEquipment.length : overdueLoans.length}
                    </div>
                  </div>
                  <p className="text-xs leading-5 text-[#8a8b94]">Counts are calculated from the current equipment and transaction records.</p>
                </div>
              </div>
            </section>

            <section id="activity" className="scroll-mt-6 rounded-2xl border border-white/10 bg-[#111114] p-6">
              <div className="mb-5 flex items-center justify-between">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#7c6cf6]">
                  {isAdmin ? 'Recent transactions' : 'My transactions'}
                </div>
                <span className="inline-flex items-center gap-2 text-sm text-[#8a8b94]">
                  {isAdmin ? `${transactions.length} total` : `${myTransactions.length} total`} <ChevronRight className="h-4 w-4" />
                </span>
              </div>

              <div className="space-y-3">
                {recentTransactions.map((transaction) => {
                  const item = equipmentById.get(transaction.equipmentId)
                  const overdue = isActiveLoan(transaction) && transaction.dueAt && new Date(transaction.dueAt).getTime() < Date.now()
                  return (
                    <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#17181d] p-4">
                      <div className="min-w-0">
                        <div className="font-medium">{item?.name ?? `Equipment #${transaction.equipmentId}`}</div>
                        <div className="mt-1 text-sm text-[#a1a1ad]">
                          {isAdmin ? `Member #${transaction.userId} · ` : ''}{transaction.action.replaceAll('_', ' ')}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8a8b94]">{transaction.returnedAt ? 'Returned' : 'Due'}</div>
                          <div className="mt-1 text-sm text-[#dfe3ef]">{formatDate(transaction.returnedAt ?? transaction.dueAt ?? transaction.createdAt)}</div>
                        </div>
                        <span className={`rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em] ${overdue ? 'border-amber-400/30 bg-amber-400/10 text-amber-200' : transaction.returnedAt ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-[#7c6cf6]/20 bg-[#201a2d] text-[#b7aefc]'}`}>
                          {overdue ? 'Overdue' : transaction.returnedAt ? 'Returned' : 'Active'}
                        </span>
                      </div>
                    </div>
                  )
                })}
                {!isLoading && !loadError && recentTransactions.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-[#8a8b94]">
                    {isAdmin ? 'No transactions have been recorded.' : 'No transactions are recorded for your account yet.'}
                  </p>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
