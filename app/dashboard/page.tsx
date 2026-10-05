'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Database,
  Gauge,
  HardDrive,
  LogOut,
  Package,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react'
import { clearSession, getSession } from '@/lib/auth'

const stats = [
  { label: 'Total equipment', value: '56', change: '+4 this month', icon: Package },
  { label: 'Active loans', value: '18', change: '3 due today', icon: Database },
  { label: 'Pending requests', value: '06', change: 'Needs review', icon: ClipboardList },
  { label: 'Maintenance', value: '04', change: '2 in progress', icon: Wrench },
]

const requests = [
  { name: 'Aniruddha Kulkarni', item: 'Raspberry Pi 4 Kit', due: '14 Oct 2026', status: 'Pending' },
  { name: 'Dishita Shah', item: 'Arduino Uno R3', due: '11 Oct 2026', status: 'Approved' },
  { name: 'Sakshi Patil', item: 'Digital Oscilloscope', due: '09 Oct 2026', status: 'Overdue' },
]

const equipment = [
  { name: 'Arduino Uno R3', quantity: '14 / 20', status: 'Available' },
  { name: 'Digital Oscilloscope', quantity: '3 / 8', status: 'Low stock' },
  { name: 'Raspberry Pi 4 Kit', quantity: '12 / 16', status: 'Available' },
  { name: 'Digital Multimeter', quantity: '0 / 12', status: 'Maintenance' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null)

  useEffect(() => {
    const session = getSession()
    if (!session) {
      router.replace('/sign-in')
      return
    }
    setUser(session.user)
  }, [router])

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const handleLogout = () => {
    clearSession()
    router.push('/sign-in')
  }

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen bg-[#0a0a0c] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <header className="mb-8 flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#111114] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#7c6cf6]">Lab Control</div>
            <div className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{greeting}, {user.name.split(' ')[0]}</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-[#17181d] px-3 py-2 text-sm text-[#dfe3ef] md:flex">
              <Bell className="h-4 w-4 text-[#b7aefc]" />
              3 updates
            </div>

            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-[#17181d] px-3 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2a234d] font-mono text-[10px] text-[#d8d0ff]">
                {user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">{user.name}</div>
                <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8a8b94]">{user.role}</div>
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
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          {stats.map(({ label, value, change, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-[#111114] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a8b94]">{label}</div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1b1729] text-[#b7aefc]">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-semibold tracking-[-0.06em]">{value}</div>
              <div className="mt-2 text-sm text-[#7fe3b0]">{change}</div>
            </div>
          ))}
        </section>

        <section className="mb-8 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-[#111114] p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#7c6cf6]">Operations</div>
              <Link href="/equipment" className="inline-flex items-center gap-2 text-sm text-[#b7aefc] hover:text-white">
                View inventory <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {equipment.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#17181d] px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a8b94]">{item.quantity}</div>
                  </div>
                  <div className="rounded-full border border-[#7c6cf6]/20 bg-[#201a2d] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#b7aefc]">
                    {item.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111114] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#7c6cf6]">Today</div>
              <Sparkles className="h-4 w-4 text-[#b7aefc]" />
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#17181d] p-4">
                <div className="text-sm">Review open requests</div>
                <div className="mt-2 flex items-center gap-2 text-[#9fe4b7]">
                  <CheckCircle2 className="h-4 w-4" />
                  2 tasks complete
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#17181d] p-4">
                <div className="text-sm">Lab health</div>
                <div className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-[#b7aefc]">94%</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#17181d] p-4">
                <div className="text-sm">Next session</div>
                <div className="mt-2 flex items-center gap-2 text-[#dfe3ef]">
                  <CalendarDays className="h-4 w-4 text-[#b7aefc]" />
                  IoT Workshop · 10:00 AM
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-[#111114] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#7c6cf6]">Requests</div>
              <Link href="/requests" className="inline-flex items-center gap-2 text-sm text-[#b7aefc] hover:text-white">
                Open queue <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#17181d] p-4">
                  <div>
                    <div className="font-medium">{request.name}</div>
                    <div className="mt-1 text-sm text-[#a1a1ad]">{request.item}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a8b94]">Due {request.due}</div>
                    <div className="mt-2 inline-flex rounded-full border border-[#7c6cf6]/20 bg-[#201a2d] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#b7aefc]">
                      {request.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111114] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#7c6cf6]">System</div>
              <ShieldCheck className="h-4 w-4 text-[#b7aefc]" />
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#17181d] p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-[#b7aefc]" />
                  <div className="text-sm">Student access</div>
                </div>
                <div className="mt-2 text-[#a1a1ad]">128 active users</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#17181d] p-4">
                <div className="flex items-center gap-3">
                  <Gauge className="h-4 w-4 text-[#b7aefc]" />
                  <div className="text-sm">Utilization</div>
                </div>
                <div className="mt-2 text-[#a1a1ad]">68% this month</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#17181d] p-4">
                <div className="flex items-center gap-3">
                  <HardDrive className="h-4 w-4 text-[#b7aefc]" />
                  <div className="text-sm">Storage</div>
                </div>
                <div className="mt-2 text-[#a1a1ad]">4.8 TB across labs</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
