'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import {
  Activity,
  Boxes,
  CalendarDays,
  ClipboardList,
  Database,
  FileText,
  LogOut,
  Settings2,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react'
import { clearSession, getSession, type AuthUser } from '@/lib/auth'

const sections = [
  { group: 'Manage', items: [
    { label: 'Dashboard', href: '/dashboard', icon: Activity },
    { label: 'Equipment', href: '/equipment', icon: Boxes },
    { label: 'Requests', href: '/requests', icon: ClipboardList },
    { label: 'Transactions', href: '/transactions', icon: Database },
  ] },
  { group: 'Operate', items: [
    { label: 'Maintenance', href: '/maintenance', icon: Wrench, admin: true },
    { label: 'Students', href: '/students', icon: Users, admin: true },
    { label: 'Calendar', href: '/calendar', icon: CalendarDays },
  ] },
  { group: 'System', items: [
    { label: 'Reports', href: '/reports', icon: FileText, admin: true },
    { label: 'Settings', href: '/settings', icon: Settings2, admin: true },
  ] },
]

type WorkspaceShellProps = {
  title: string
  eyebrow: string
  description: string
  children: ReactNode
  adminOnly?: boolean
  action?: ReactNode
}

export function WorkspaceShell({ title, eyebrow, description, children, adminOnly = false, action }: WorkspaceShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const session = getSession()
    if (!session) {
      router.replace('/sign-in')
      return
    }
    if (adminOnly && session.user.role !== 'ADMIN') {
      router.replace('/dashboard')
      return
    }
    setUser(session.user)
  }, [adminOnly, router])

  const logout = () => {
    clearSession()
    router.replace('/sign-in')
  }

  if (!user || (adminOnly && user.role !== 'ADMIN')) return null
  const isAdmin = user.role === 'ADMIN'
  const initials = user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()

  return (
    <main className="workspace-ui h-dvh overflow-hidden bg-[#0a0a0c] text-white">
      <div className="mx-auto flex h-full max-w-[1600px] overflow-hidden">
        <aside className="hidden h-full w-40 shrink-0 overflow-y-auto border-r border-white/10 bg-[#171719] px-3 py-5 lg:flex lg:flex-col">
          <Link href="/dashboard" className="mb-9 px-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#9a80ff]">CLMS / 26</div>
            <div className="mt-1 text-sm font-medium tracking-tight">LAB / CONTROL</div>
          </Link>
          {sections.map((section) => {
            const items = section.items.filter((item) => !item.admin || isAdmin)
            if (items.length === 0) return null
            return <div key={section.group} className="mb-5">
              <div className="mb-2 px-2 font-mono text-[8px] uppercase tracking-[0.24em] text-[#777780]">{section.group}</div>
              <nav aria-label={section.group} className="space-y-1">
                {items.map(({ label, href, icon: Icon }) => {
                  const active = pathname === href
                  return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex min-h-8 items-center gap-2 border px-2 text-[11px] transition ${active ? 'border-white/10 bg-white/[0.07] text-white' : 'border-transparent text-[#aaaab2] hover:bg-white/[0.04] hover:text-white'}`}>
                    <Icon className="h-3 w-3 text-[#9a80ff]" />{label === 'Transactions' && !isAdmin ? 'My activity' : label}
                  </Link>
                })}
              </nav>
            </div>
          })}
          <div className="mt-auto border border-white/10 bg-[#131315] p-3">
            <div className="mb-2 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-[#9a80ff]"><ShieldCheck className="h-3 w-3" /> Signed in as</div>
            <div className="truncate text-[10px] text-[#dedee2]">{user.name}</div>
            <div className="mt-1 font-mono text-[8px] uppercase text-[#777780]">{user.role}</div>
          </div>
        </aside>

        <div className="h-full min-w-0 flex-1 overflow-y-auto overscroll-contain">
          <header className="sticky top-0 z-30 flex min-h-12 items-center justify-between gap-3 border-b border-white/10 bg-[#111113] px-4 sm:px-6">
            <div className="min-w-0">
              <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#777780]">Laboratory / {title}</div>
              <div className="mt-0.5 text-[11px]">{title}</div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden font-mono text-[8px] uppercase tracking-[0.08em] text-[#9a9aa3] sm:block">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date())}</div>
              <div className="flex items-center gap-2 border-l border-white/10 pl-3">
                <div className="flex h-6 w-6 items-center justify-center bg-[#2a2540] font-mono text-[8px] text-[#d8d0ff]">{initials}</div>
                <div className="hidden sm:block"><div className="max-w-28 truncate text-[9px]">{user.name}</div><div className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#777780]">{user.role}</div></div>
              </div>
              <button onClick={logout} aria-label="Log out" title="Log out" className="flex h-7 w-7 items-center justify-center border border-white/10 text-[#bdbdc4] transition hover:border-red-400/40 hover:text-red-200"><LogOut className="h-3.5 w-3.5" /></button>
            </div>
          </header>

          <nav aria-label="Workspace navigation" className="sticky top-12 z-20 flex gap-2 overflow-x-auto border-b border-white/10 bg-[#141416] px-4 py-2 lg:hidden">
            {sections.flatMap((section) => section.items).filter((item) => !item.admin || isAdmin).map(({ label, href }) => <Link key={href} href={href} className={`shrink-0 border px-3 py-1.5 text-[10px] ${pathname === href ? 'border-[#9a80ff]/50 bg-[#9a80ff]/10 text-white' : 'border-white/10 text-[#c6c6cd]'}`}>{label === 'Transactions' && !isAdmin ? 'My activity' : label}</Link>)}
          </nav>

          <div className="mx-auto max-w-[744px] px-4 py-6 sm:px-6 sm:py-7">
            <section className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="mb-2 font-mono text-[8px] uppercase tracking-[0.2em] text-[#9a80ff]">{eyebrow}</div>
                <h1 className="text-[32px] font-normal leading-none tracking-[-0.025em] sm:text-[38px]">{title}</h1>
                <p className="mt-3 max-w-2xl text-[11px] leading-5 text-[#a3a3ab]">{description}</p>
              </div>
              {action}
            </section>
            {children}
          </div>
        </div>
      </div>
    </main>
  )
}