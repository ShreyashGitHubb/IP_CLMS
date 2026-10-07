'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Activity,
  ArrowRight,
  Bell,
  Boxes,
  CalendarDays,
  ClipboardList,
  Database,
  FileText,
  HardDrive,
  LogOut,
  Package,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react'
import { getApiBaseUrl, getSession, logoutSession, type AuthUser } from '@/lib/auth'
import type { EquipmentRequest } from '@/lib/clms-api'

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

type LabUser = {
  id: number
  name: string
  role: string
}

const navigation = [
  { label: 'Dashboard', href: '/dashboard', icon: Activity, group: 'Manage' },
  { label: 'Equipment', href: '/equipment', icon: Boxes, group: 'Manage' },
  { label: 'Requests', href: '/requests', icon: ClipboardList, group: 'Manage' },
  { label: 'Transactions', href: '/transactions', icon: Database, group: 'Manage' },
  { label: 'Notifications', href: '/notifications', icon: Bell, group: 'Manage' },
  { label: 'Maintenance', href: '/maintenance', icon: Wrench, group: 'Operate', admin: true },
  { label: 'Students', href: '/students', icon: Users, group: 'Operate', admin: true },
  { label: 'Calendar', href: '/calendar', icon: CalendarDays, group: 'Operate' },
  { label: 'Reports', href: '/reports', icon: FileText, group: 'System', admin: true },
  { label: 'Audit log', href: '/audit', icon: ShieldCheck, group: 'System', admin: true },
  { label: 'Settings', href: '/settings', icon: HardDrive, group: 'System', admin: true },
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
  const [requests, setRequests] = useState<EquipmentRequest[]>([])
  const [labUsers, setLabUsers] = useState<LabUser[]>([])
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
    const headers = { Authorization: `Bearer ${session.token}` }
    const dataRequests = [
      fetch(`${apiBaseUrl}/api/equipment`, { headers, signal: controller.signal }),
      fetch(`${apiBaseUrl}/api/transactions`, { headers, signal: controller.signal }),
      fetch(`${apiBaseUrl}/api/requests`, { headers, signal: controller.signal }),
    ]
    if (session.user.role === 'ADMIN') {
      dataRequests.push(fetch(`${apiBaseUrl}/api/users`, { headers, signal: controller.signal }))
    }
    Promise.all(dataRequests)
      .then(async (responses) => {
        if (responses.some((response) => response.status === 401)) {
          clearSession()
          router.replace('/sign-in')
          return
        }
        if (responses.some((response) => !response.ok)) {
          throw new Error('Could not load laboratory data. Please try again.')
        }
        const equipmentData = await responses[0].json() as EquipmentItem[]
        const transactionData = await responses[1].json() as LoanTransaction[]
        const requestsData = await responses[2].json() as EquipmentRequest[]
        const usersData = responses[3] ? await responses[3].json() as LabUser[] : []
        setEquipment(equipmentData)
        setTransactions(transactionData)
        setRequests(requestsData)
        setLabUsers(usersData ?? [])
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
  const pendingRequests = requests.filter((request) => request.status === 'PENDING')
  const recentTransactions = [...visibleTransactions]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 6)
  const recentRequests = [...requests]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 4)
  const equipmentById = new Map(equipment.map((item) => [item.id, item]))
  const userById = new Map(labUsers.map((item) => [item.id, item]))
  const availabilityRate = equipment.length ? Math.round((availableEquipment.length / equipment.length) * 100) : 0
  const attentionCount = maintenanceEquipment.length + overdueLoans.length + pendingRequests.length
  const nextSteps = isAdmin
    ? [
        { title: 'Review equipment in maintenance', detail: `${maintenanceEquipment.length} item${maintenanceEquipment.length === 1 ? '' : 's'} currently unavailable`, href: '#equipment', action: 'VIEW INVENTORY' },
        { title: 'Review active loans', detail: `${activeLoans.length} active · ${overdueLoans.length} overdue`, href: '#activity', action: 'OPEN TRANSACTIONS' },
        { title: 'Review equipment requests', detail: `${pendingRequests.length} awaiting a decision`, href: '/requests', action: 'OPEN REQUESTS' },
        { title: 'Check available equipment', detail: `${availableEquipment.length} item${availableEquipment.length === 1 ? '' : 's'} ready to issue`, href: '#equipment', action: 'BROWSE CATALOGUE' },
      ]
    : [
        { title: 'Browse available equipment', detail: `${availableEquipment.length} item${availableEquipment.length === 1 ? '' : 's'} ready to issue`, href: '#equipment', action: 'VIEW CATALOGUE' },
        { title: 'Check your active loans', detail: `${activeLoans.length} active · ${overdueLoans.length} overdue`, href: '#activity', action: 'VIEW MY ACTIVITY' },
      ]
  const currentDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date())
  const stats = isAdmin
    ? [
        { label: 'Total equipment', value: equipment.length, detail: 'In the inventory', icon: Package },
        { label: 'Active loans', value: activeLoans.length, detail: 'Not yet returned', icon: Database },
        { label: 'Pending requests', value: pendingRequests.length, detail: 'Awaiting review', icon: ClipboardList },
        { label: 'Maintenance', value: maintenanceEquipment.length, detail: 'Currently unavailable', icon: Wrench },
      ]
    : [
        { label: 'Available equipment', value: availableEquipment.length, detail: 'In the lab catalogue', icon: Package },
        { label: 'My active loans', value: activeLoans.length, detail: 'Assigned to your account', icon: Database },
        { label: 'My requests', value: requests.length, detail: 'Request history', icon: ClipboardList },
        { label: 'Overdue', value: overdueLoans.length, detail: 'Please return or contact staff', icon: CalendarDays },
      ]

  const handleLogout = async () => {
    await logoutSession()
    router.push('/sign-in')
  }

  if (!user) {
    return null
  }

  return (
    <main className="h-dvh overflow-hidden bg-[#101012] text-white">
      <div className="mx-auto flex h-full max-w-[1600px] overflow-hidden">
        <aside className="hidden h-full w-40 shrink-0 overflow-y-auto border-r border-white/10 bg-[#171719] px-3 py-5 lg:flex lg:flex-col">
          <a href="#overview" className="mb-9 px-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#9a80ff]">CLMS / 26</div>
            <div className="mt-1 text-sm font-medium tracking-tight">LAB / CONTROL</div>
          </a>
          <nav aria-label="Dashboard sections" className="space-y-4">
            {['Manage', 'Operate', 'System'].map((group) => {
              const items = navigation.filter((item) => item.group === group && (!item.admin || isAdmin))
              if (!items.length) return null
              return <div key={group}><div className="mb-2 px-2 font-mono text-[8px] uppercase tracking-[0.24em] text-[#777780]">{group}</div><div className="space-y-1">{items.map(({ label, href, icon: Icon }) => (
                <Link key={label} href={href} aria-current={label === 'Dashboard' ? 'page' : undefined} className={`flex min-h-8 items-center gap-2 border px-2 text-[11px] transition ${label === 'Dashboard' ? 'border-white/10 bg-white/[0.07] text-white' : 'border-transparent text-[#aaaab2] hover:bg-white/[0.04] hover:text-white'}`}>
                  <Icon className="h-3 w-3 text-[#9a80ff]" />{label === 'Transactions' && !isAdmin ? 'My activity' : label}
                </Link>
              ))}</div></div>
            })}
          </nav>
          <div className="mt-8 px-2 font-mono text-[8px] uppercase tracking-[0.24em] text-[#777780]">{isAdmin ? 'Operations' : 'Account'}</div>
          <div className="mt-2 px-2 text-[10px] leading-4 text-[#9a9aa3]">
            {isLoading ? 'Syncing with lab records…' : loadError ? 'API connection unavailable.' : isAdmin ? `${attentionCount} items need attention.` : `${activeLoans.length} active loan${activeLoans.length === 1 ? '' : 's'}.`}
          </div>
          <a href={isAdmin ? '#equipment' : '#activity'} className="mt-auto border border-white/10 bg-[#131315] p-3 hover:border-[#9a80ff]/50">
            <div className="mb-2 font-mono text-[8px] uppercase tracking-[0.18em] text-[#9a80ff]">{isAdmin ? 'Today’s focus' : 'Your workspace'}</div>
            <div className="text-[10px] leading-4 text-[#c1c1c8]">{isAdmin ? 'Check inventory status and open loans.' : 'Review your loans and available equipment.'}</div>
            <div className="mt-3 flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.08em]">Open view <ArrowRight className="h-3 w-3" /></div>
          </a>
        </aside>

        <div className="h-full min-w-0 flex-1 overflow-y-auto overscroll-contain">
          <header className="sticky top-0 z-30 flex min-h-12 items-center justify-between gap-3 border-b border-white/10 bg-[#111113] px-4 sm:px-6">
            <div className="min-w-0">
              <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#777780]">Laboratory / {isAdmin ? 'Dashboard' : 'Member workspace'}</div>
              <div className="mt-0.5 text-[11px]">{isAdmin ? 'Dashboard' : 'My dashboard'}</div>
            </div>
            <div className="flex items-center gap-3 sm:gap-5">
              <div className="hidden items-center gap-2 font-mono text-[8px] uppercase tracking-[0.08em] text-[#9a9aa3] sm:flex">
                <CalendarDays className="h-3 w-3" /> {currentDate}
              </div>
              <div className="hidden items-center gap-2 font-mono text-[8px] uppercase tracking-[0.08em] sm:flex">
                <span className={`h-1.5 w-1.5 rounded-full ${loadError ? 'bg-red-400' : isLoading ? 'bg-amber-300' : 'bg-emerald-300'}`} />
                <span className="text-[#9a9aa3]">{loadError ? 'API offline' : isLoading ? 'Syncing' : 'Connected'}</span>
              </div>
              <div className="flex items-center gap-2 border-l border-white/10 pl-3">
                <div className="flex h-6 w-6 items-center justify-center bg-[#2a2540] font-mono text-[8px] text-[#d8d0ff]">
                  {user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <div className="max-w-28 truncate text-[9px]">{user.name}</div>
                  <div className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#777780]">{user.role}</div>
                </div>
              </div>
              <button onClick={handleLogout} aria-label="Log out" title="Log out" className="flex h-7 w-7 items-center justify-center border border-white/10 text-[#bdbdc4] transition hover:border-red-400/40 hover:text-red-200">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </header>

          <nav aria-label="Dashboard sections" className="sticky top-12 z-20 flex gap-2 overflow-x-auto border-b border-white/10 bg-[#141416] px-4 py-2 lg:hidden">
            {navigation.filter((item) => !item.admin || isAdmin).map(({ label, href }) => (
              <Link key={label} href={href} className={`shrink-0 border px-3 py-1.5 text-[10px] ${label === 'Dashboard' ? 'border-[#9a80ff]/50 bg-[#9a80ff]/10 text-white' : 'border-white/10 text-[#c6c6cd]'}`}>{label === 'Transactions' && !isAdmin ? 'My activity' : label}</Link>
            ))}
          </nav>

          <div className="mx-auto max-w-[744px] px-4 py-6 sm:px-6 sm:py-7">
            {loadError ? (
              <div role="alert" className="mb-4 flex items-center justify-between gap-4 border border-red-400/30 bg-red-950/30 px-3 py-2 text-[11px] text-red-100">
                <span>{loadError}</span>
                <button type="button" onClick={() => window.location.reload()} className="shrink-0 underline underline-offset-4">Retry</button>
              </div>
            ) : null}

            <section id="overview" className="mb-5 grid scroll-mt-4 border border-white/10 bg-[#1b1b1d] md:grid-cols-[1.2fr_1fr]">
              <div className="flex min-h-52 flex-col justify-center px-6 py-7 sm:px-7">
                <div className="mb-4 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.16em] text-[#9a80ff]">
                  <span className="border border-[#8b71ff] px-1.5 py-1">{isAdmin ? 'Admin console' : 'Member workspace'}</span>
                  <span className="text-[#777780]">{currentDate}</span>
                </div>
                <h1 className="text-[34px] font-normal leading-[1.04] tracking-[-0.025em] sm:text-[40px]">
                  {greeting},<br /><span className="text-[#9b78ff]">{user.name.split(' ')[0]}.</span>
                </h1>
                <p className="mt-4 max-w-sm text-[10px] leading-5 text-[#a3a3ab]">
                  {isAdmin ? 'Review live inventory and recorded lab activity from your operations console.' : 'Review equipment availability and transactions linked to your lab account.'}
                </p>
              </div>
              <div aria-hidden="true" className="relative min-h-44 overflow-hidden border-t border-white/10 bg-[#211c2b] md:border-l md:border-t-0" style={{ backgroundImage: 'linear-gradient(rgba(160,130,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(160,130,255,0.07) 1px, transparent 1px)', backgroundSize: '19px 19px' }}>
                <div className="absolute right-[-4%] top-[10%] h-[62%] w-[48%] rotate-[-8deg] bg-gradient-to-br from-[#cc6ba9] to-[#715deb]" style={{ clipPath: 'polygon(18% 0, 100% 14%, 100% 78%, 58% 100%, 0 72%, 8% 30%)' }} />
                <div className="absolute bottom-[12%] left-[9%] h-[30%] w-[27%] rotate-[5deg] bg-gradient-to-br from-[#c89a65] to-[#a44365]" style={{ clipPath: 'polygon(8% 10%, 75% 0, 100% 40%, 91% 100%, 23% 88%, 0 48%)' }} />
              </div>
            </section>

            <section className="mb-5 grid gap-4 md:grid-cols-[1.55fr_0.9fr]">
              <div className="border border-white/10 bg-[#1b1b1d] px-4 py-4 sm:px-5">
                <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#777780]">Next steps</div>
                    <h2 className="mt-1 text-[11px] font-medium">{isAdmin ? 'Live operations' : 'Your lab activity'}</h2>
                  </div>
                  <div className="font-mono text-[7px] uppercase tracking-[0.12em] text-[#9a80ff]">{isLoading ? 'SYNCING' : `${nextSteps.length} ITEMS`}</div>
                </div>
                <div>
                  {nextSteps.map((step, index) => (
                    <div key={step.title} className={`flex items-center gap-3 py-2.5 ${index < nextSteps.length - 1 ? 'border-b border-white/[0.08]' : ''}`}>
                      <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center border ${index === 0 && !isLoading ? 'border-[#8b71ff] bg-[#8b71ff] text-white' : 'border-white/20 text-transparent'}`}>
                        <span className="text-[8px]">✓</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[10px] text-[#eeeeef]">{step.title}</div>
                        <div className="mt-1 truncate text-[8px] text-[#777780]">{isLoading ? 'Loading records…' : step.detail}</div>
                      </div>
                      <a href={step.href} className="hidden shrink-0 items-center gap-1 font-mono text-[7px] uppercase tracking-[0.08em] text-[#a487ff] sm:flex">
                        {step.action} <ArrowRight className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-white/10 bg-[#1b1b1d] px-4 py-4 sm:px-5">
                <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#777780]">{isAdmin ? 'Lab status' : 'Account status'}</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-[30px] leading-none">{isLoading ? '—' : isAdmin ? availabilityRate : activeLoans.length}</span>
                  <span className="font-mono text-[7px] uppercase tracking-[0.08em] text-[#777780]">{isAdmin ? '/ availability' : 'active loans'}</span>
                </div>
                {isAdmin ? <div className="mt-3 h-[3px] bg-white/10"><div className="h-full bg-[#9a78ff] transition-all" style={{ width: `${isLoading ? 0 : availabilityRate}%` }} /></div> : null}
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-[8px] text-[#96969f]"><span>{isAdmin ? 'Available equipment' : 'My transactions'}</span><span className="text-[#e5e5e9]">{isLoading ? '—' : isAdmin ? availableEquipment.length : myTransactions.length}</span></div>
                  <div className="flex justify-between text-[8px] text-[#96969f]"><span>{isAdmin ? 'Active loans' : 'Overdue loans'}</span><span className={overdueLoans.length ? 'text-amber-300' : 'text-[#e5e5e9]'}>{isLoading ? '—' : isAdmin ? activeLoans.length : overdueLoans.length}</span></div>
                  {isAdmin ? <div className="flex justify-between text-[8px] text-[#96969f]"><span>Needs attention</span><span className={attentionCount ? 'text-amber-300' : 'text-[#e5e5e9]'}>{isLoading ? '—' : attentionCount}</span></div> : null}
                </div>
              </div>
            </section>

            <section aria-label="Dashboard metrics" className="mb-5 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
              {stats.map(({ label, value, detail, icon: Icon }) => (
                <div key={label} className="min-h-[92px] border border-white/10 bg-[#1b1b1d] px-3.5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono text-[7px] uppercase tracking-[0.16em] text-[#777780]">{label}</div>
                    <Icon className="h-3 w-3 shrink-0 text-[#777780]" />
                  </div>
                  <div className="mt-3 text-[21px] leading-none">{isLoading ? '—' : value}</div>
                  <div className="mt-2 text-[8px] text-[#96969f]">{detail}</div>
                </div>
              ))}
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div id="equipment" className="scroll-mt-4 border border-white/10 bg-[#1b1b1d] p-4">
                <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#777780]">{isAdmin ? 'Equipment inventory' : 'Available equipment'}</div>
                    <h2 className="mt-1 text-[11px]">{isLoading ? 'Loading catalogue…' : `${isAdmin ? equipment.length : availableEquipment.length} records`}</h2>
                  </div>
                  <Package className="h-3.5 w-3.5 text-[#9a80ff]" />
                </div>
                <div className="space-y-2">
                  {(isAdmin ? equipment : availableEquipment).slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 border-b border-white/[0.07] py-2 last:border-0">
                      <div className="min-w-0"><div className="truncate text-[10px]">{item.name}</div><div className="mt-1 font-mono text-[7px] uppercase tracking-[0.1em] text-[#777780]">{item.assetTag} · {item.location}</div></div>
                      <span className={`shrink-0 font-mono text-[7px] uppercase tracking-[0.08em] ${item.status === 'AVAILABLE' ? 'text-emerald-300' : item.status === 'MAINTENANCE' ? 'text-amber-300' : 'text-[#b49eff]'}`}>{item.status.replaceAll('_', ' ')}</span>
                    </div>
                  ))}
                  {!isLoading && !loadError && (isAdmin ? equipment : availableEquipment).length === 0 ? <p className="py-5 text-center text-[9px] text-[#777780]">{isAdmin ? 'No equipment has been added yet.' : 'No equipment is currently available.'}</p> : null}
                </div>
              </div>

              <div id="activity" className="scroll-mt-4 border border-white/10 bg-[#1b1b1d] p-4">
                <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#777780]">{isAdmin ? 'Recent transactions' : 'My transactions'}</div>
                    <h2 className="mt-1 text-[11px]">{isLoading ? 'Loading activity…' : `${visibleTransactions.length} recorded`}</h2>
                  </div>
                  <Database className="h-3.5 w-3.5 text-[#9a80ff]" />
                </div>
                <div className="space-y-2">
                  {recentTransactions.slice(0, 5).map((transaction) => {
                    const item = equipmentById.get(transaction.equipmentId)
                    const memberName = userById.get(transaction.userId)?.name ?? `Member #${transaction.userId}`
                    const overdue = isActiveLoan(transaction) && transaction.dueAt && new Date(transaction.dueAt).getTime() < Date.now()
                    const dateLabel = transaction.returnedAt ? 'Returned' : transaction.dueAt ? 'Due' : 'Recorded'
                    return <div key={transaction.id} className="flex items-center justify-between gap-3 border-b border-white/[0.07] py-2 last:border-0"><div className="min-w-0"><div className="truncate text-[10px]">{item?.name ?? `Equipment #${transaction.equipmentId}`}</div><div className="mt-1 truncate text-[8px] text-[#777780]">{isAdmin ? `${memberName} · ` : ''}{transaction.action.replaceAll('_', ' ')}</div></div><span className={`shrink-0 text-right font-mono text-[7px] uppercase tracking-[0.08em] ${overdue ? 'text-amber-300' : transaction.returnedAt ? 'text-emerald-300' : 'text-[#b49eff]'}`}>{overdue ? 'Overdue' : `${dateLabel} ${formatDate(transaction.returnedAt ?? transaction.dueAt ?? transaction.createdAt)}`}</span></div>
                  })}
                  {!isLoading && !loadError && recentTransactions.length === 0 ? <p className="py-5 text-center text-[9px] text-[#777780]">{isAdmin ? 'No transactions have been recorded.' : 'No transactions are recorded for your account yet.'}</p> : null}
                </div>
              </div>

              <div id="requests" className="scroll-mt-4 border border-white/10 bg-[#1b1b1d] p-4">
                <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
                  <div><div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#777780]">{isAdmin ? 'Requests' : 'My requests'}</div><h2 className="mt-1 text-[11px]">{isLoading ? 'Loading requests…' : `${pendingRequests.length} awaiting review`}</h2></div>
                  <Link href="/requests" className="font-mono text-[7px] uppercase tracking-[0.1em] text-[#b49eff]">Open queue</Link>
                </div>
                <div className="space-y-2">
                  {recentRequests.map((request) => {
                    const item = equipmentById.get(request.equipmentId)
                    const requester = userById.get(request.userId)?.name ?? `Member #${request.userId}`
                    return <div key={request.id} className="flex items-center justify-between gap-2 border-b border-white/[0.07] py-2 last:border-0"><div className="min-w-0"><div className="truncate text-[9px] font-medium">{isAdmin ? requester : item?.name ?? `Equipment #${request.equipmentId}`}</div><div className="mt-1 truncate text-[8px] text-[#777780]">{isAdmin ? item?.name ?? `Equipment #${request.equipmentId}` : request.purpose}</div></div><span className={`shrink-0 font-mono text-[7px] uppercase ${request.status === 'PENDING' ? 'text-[#b49eff]' : request.status === 'APPROVED' ? 'text-emerald-300' : 'text-red-300'}`}>{request.status}</span></div>
                  })}
                  {!isLoading && !loadError && recentRequests.length === 0 ? <p className="py-5 text-center text-[9px] text-[#777780]">No request records yet.</p> : null}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
