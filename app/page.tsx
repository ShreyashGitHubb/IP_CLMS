'use client'

import Link from 'next/link'
import { Activity, ArrowRight, ClipboardList, Database, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getApiBaseUrl } from '@/lib/auth'

const features = [
  { title: 'Live inventory', description: 'Browse equipment records, asset tags, locations, and availability from the connected database.', icon: Database },
  { title: 'Loan transactions', description: 'Keep equipment issue and return activity attached to the right account.', icon: ClipboardList },
  { title: 'Role-based access', description: 'Members see their own activity while administrators manage lab records and accounts.', icon: ShieldCheck },
  { title: 'Persistent records', description: 'Store user, equipment, and transaction data in the configured relational database.', icon: Users },
]

export default function LandingPage() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'unavailable'>('checking')

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${getApiBaseUrl()}/api/health`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Backend health check failed')
        setApiStatus('connected')
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return
        setApiStatus('unavailable')
      })
    return () => controller.abort()
  }, [])

  return (
    <main className="min-h-screen bg-[#0a0a0c] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8 md:px-8">
        <header className="mb-16 flex items-center justify-between rounded-full border border-white/10 bg-[#111114]/80 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a1528] text-[#b7aefc]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#7c6cf6]">CLMS</div>
              <div className="text-sm font-medium tracking-[-0.04em]">Lab Control</div>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-[#b3b3bc] md:flex">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#workflow" className="transition hover:text-white">Workflow</a>
            <a href="#security" className="transition hover:text-white">Security</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#dfe3ef] transition hover:border-[#7c6cf6]/50 hover:text-white">
              Sign in
            </Link>
            <Link href="/sign-up" className="rounded-full bg-[#7c6cf6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#8e80ff]">
              Create account
            </Link>
          </div>
        </header>

        <section className="grid items-center gap-10 pb-16 pt-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#7c6cf6]/30 bg-[#171326] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[#c6bdfd]">
              <Sparkles className="h-3.5 w-3.5" />
              Lab operations platform
            </div>

            <h1 className="max-w-xl text-5xl font-semibold tracking-[-0.08em] md:text-6xl">
              Equipment, accounts, and loan activity in one place.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-[#a5a7b2]">
              CLMS connects laboratory equipment and loan records to real member and administrator accounts, backed by your configured database.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/sign-in" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7c6cf6] px-6 py-3.5 text-sm font-medium text-white transition hover:bg-[#8e80ff]">
                Access dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/sign-up" className="inline-flex items-center justify-center rounded-xl border border-white/10 px-6 py-3.5 text-sm font-medium text-[#dfe3ef] transition hover:border-white/20 hover:text-white">
                Get started
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-[#8a8b94]">
              <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${apiStatus === 'connected' ? 'bg-[#7fe3b0]' : apiStatus === 'checking' ? 'bg-[#f2c879]' : 'bg-[#ff8b8b]'}`} />
                {apiStatus === 'connected' ? 'Backend connected' : apiStatus === 'checking' ? 'Checking backend' : 'Backend unavailable'}
              </div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#7c6cf6]" /> Database-backed inventory</div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#f2c879]" /> Member and admin access</div>
            </div>
          </div>

          <div className="relative overflow-hidden border border-white/10 bg-[#111114] p-6 shadow-2xl shadow-[#7c6cf6]/10">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(160,130,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(160,130,255,0.07) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
            <div className="relative">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8a8b94]">System connection</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.05em]">Lab Control API</div>
              </div>
              <div className={`border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em] ${apiStatus === 'connected' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : apiStatus === 'checking' ? 'border-amber-300/20 bg-amber-300/10 text-amber-200' : 'border-red-400/20 bg-red-400/10 text-red-200'}`}>
                {apiStatus === 'connected' ? 'Connected' : apiStatus === 'checking' ? 'Checking' : 'Unavailable'}
              </div>
            </div>

            <div className="grid min-h-56 grid-cols-2 gap-3 sm:min-h-64">
              <div className="flex flex-col justify-between border border-white/10 bg-[#17181d]/90 p-4">
                <Database className="h-5 w-5 text-[#b7aefc]" />
                <div><div className="text-sm font-medium">Equipment catalogue</div><div className="mt-1 text-xs text-[#8a8b94]">Live records from the lab database</div></div>
              </div>
              <div className="flex flex-col justify-between border border-white/10 bg-[#17181d]/90 p-4">
                <ClipboardList className="h-5 w-5 text-[#b7aefc]" />
                <div><div className="text-sm font-medium">Loan activity</div><div className="mt-1 text-xs text-[#8a8b94]">Issue and return transactions</div></div>
              </div>
              <div className="flex flex-col justify-between border border-white/10 bg-[#17181d]/90 p-4">
                <ShieldCheck className="h-5 w-5 text-[#b7aefc]" />
                <div><div className="text-sm font-medium">Account roles</div><div className="mt-1 text-xs text-[#8a8b94]">Separate member and admin access</div></div>
              </div>
              <div className="flex flex-col justify-between border border-white/10 bg-[#17181d]/90 p-4">
                <Activity className="h-5 w-5 text-[#b7aefc]" />
                <div><div className="text-sm font-medium">Service health</div><div className="mt-1 text-xs text-[#8a8b94]">{apiStatus === 'connected' ? 'API is responding' : apiStatus === 'checking' ? 'Waiting for health response' : 'API did not respond'}</div></div>
              </div>
            </div>
            </div>
          </div>
        </section>

        <section id="features" className="pb-20">
          <div className="mb-8 text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7c6cf6]">What the system covers</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.06em] md:text-4xl">Built for everyday lab operations</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {features.map(({ title, description, icon: Icon }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-[#111114] p-5">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1a1528] text-[#b7aefc]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-medium tracking-[-0.04em]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#a5a7b2]">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="workflow" className="pb-20">
          <div className="rounded-3xl border border-white/10 bg-[#111114] p-8 md:p-10">
            <div className="mb-8 text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7c6cf6]">Workflow</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.06em] md:text-4xl">From sign-in to actionable operations</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#17181d] p-5">
                <div className="mb-4 text-sm font-medium text-[#b7aefc]">01 · Sign in</div>
                <p className="text-sm leading-6 text-[#a5a7b2]">Secure access to the lab dashboard with a real account flow and role-aware user identity.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#17181d] p-5">
                <div className="mb-4 text-sm font-medium text-[#b7aefc]">02 · Manage</div>
                <p className="text-sm leading-6 text-[#a5a7b2]">Review equipment availability and transaction history returned by the backend.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#17181d] p-5">
                <div className="mb-4 text-sm font-medium text-[#b7aefc]">03 · Act</div>
                <p className="text-sm leading-6 text-[#a5a7b2]">Use admin controls to manage equipment and records; members see their own transaction history.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="security" className="pb-20">
          <div className="rounded-3xl border border-white/10 bg-[#111114] p-8 md:p-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7c6cf6]">Ready for work</div>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.06em]">Open your laboratory workspace</h2>
              </div>
              <Link href="/sign-in" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7c6cf6] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#8e80ff]">
                Open app
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
