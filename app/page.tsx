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
    <main className="min-h-screen bg-[#101012] text-white">
      <div className="mx-auto max-w-[1120px] px-4 py-4 sm:px-6">
        <header className="mb-8 flex min-h-12 items-center justify-between gap-4 border border-white/10 bg-[#111113] px-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center bg-[#2a2540] text-[#b7aefc]">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#9a80ff]">CLMS / 26</div>
              <div className="text-[11px] font-medium">LAB / CONTROL</div>
            </div>
          </div>

          <nav className="hidden items-center gap-5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#9a9aa3] md:flex">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#workflow" className="transition hover:text-white">Workflow</a>
            <a href="#security" className="transition hover:text-white">Security</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="border border-white/10 px-3 py-2 text-[9px] uppercase tracking-[0.1em] text-[#dfe3ef] transition hover:border-[#9a80ff]/50 hover:text-white">
              Sign in
            </Link>
            <Link href="/sign-up" className="bg-[#8e73ff] px-3 py-2 text-[9px] font-medium uppercase tracking-[0.1em] text-white transition hover:bg-[#a18cff]">
              Create account
            </Link>
          </div>
        </header>

        <section className="grid items-center gap-5 border border-white/10 bg-[#1b1b1d] p-5 sm:p-7 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 border border-[#8b71ff]/40 bg-[#171326] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#c6bdfd]">
              <Sparkles className="h-3 w-3" />
              Lab operations platform
            </div>

            <h1 className="max-w-xl text-[34px] font-normal leading-[1.04] sm:text-[40px]">
              Equipment, accounts, and loan activity in one place.
            </h1>

            <p className="mt-4 max-w-xl text-[11px] leading-5 text-[#a5a7b2]">
              CLMS connects laboratory equipment and loan records to real member and administrator accounts, backed by your configured database.
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link href="/sign-in" className="inline-flex h-9 items-center justify-center gap-2 bg-[#8e73ff] px-4 text-[9px] font-medium uppercase tracking-[0.1em] text-white transition hover:bg-[#a18cff]">
                Access dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/sign-up" className="inline-flex h-9 items-center justify-center border border-white/10 px-4 text-[9px] font-medium uppercase tracking-[0.1em] text-[#dfe3ef] transition hover:border-white/20 hover:text-white">
                Get started
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[8px] uppercase tracking-[0.08em] text-[#8a8b94]">
              <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${apiStatus === 'connected' ? 'bg-[#7fe3b0]' : apiStatus === 'checking' ? 'bg-[#f2c879]' : 'bg-[#ff8b8b]'}`} />
                {apiStatus === 'connected' ? 'Backend connected' : apiStatus === 'checking' ? 'Checking backend' : 'Backend unavailable'}
              </div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#7c6cf6]" /> Database-backed inventory</div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#f2c879]" /> Member and admin access</div>
            </div>
          </div>

          <div className="relative overflow-hidden border border-white/10 bg-[#111114] p-4">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(160,130,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(160,130,255,0.07) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
            <div className="relative">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#8a8b94]">System connection</div>
                <div className="mt-1 text-[12px] font-medium">Lab Control API</div>
              </div>
              <div className={`border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em] ${apiStatus === 'connected' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : apiStatus === 'checking' ? 'border-amber-300/20 bg-amber-300/10 text-amber-200' : 'border-red-400/20 bg-red-400/10 text-red-200'}`}>
                {apiStatus === 'connected' ? 'Connected' : apiStatus === 'checking' ? 'Checking' : 'Unavailable'}
              </div>
            </div>

            <div className="grid min-h-52 grid-cols-2 gap-2 sm:min-h-56">
              <div className="flex flex-col justify-between border border-white/10 bg-[#17181d]/90 p-3">
                <Database className="h-4 w-4 text-[#b7aefc]" />
                <div><div className="text-[10px] font-medium">Equipment catalogue</div><div className="mt-1 text-[8px] text-[#8a8b94]">Live records from the lab database</div></div>
              </div>
              <div className="flex flex-col justify-between border border-white/10 bg-[#17181d]/90 p-3">
                <ClipboardList className="h-4 w-4 text-[#b7aefc]" />
                <div><div className="text-[10px] font-medium">Loan activity</div><div className="mt-1 text-[8px] text-[#8a8b94]">Issue and return transactions</div></div>
              </div>
              <div className="flex flex-col justify-between border border-white/10 bg-[#17181d]/90 p-3">
                <ShieldCheck className="h-4 w-4 text-[#b7aefc]" />
                <div><div className="text-[10px] font-medium">Account roles</div><div className="mt-1 text-[8px] text-[#8a8b94]">Separate member and admin access</div></div>
              </div>
              <div className="flex flex-col justify-between border border-white/10 bg-[#17181d]/90 p-3">
                <Activity className="h-4 w-4 text-[#b7aefc]" />
                <div><div className="text-[10px] font-medium">Service health</div><div className="mt-1 text-[8px] text-[#8a8b94]">{apiStatus === 'connected' ? 'API is responding' : apiStatus === 'checking' ? 'Waiting for health response' : 'API did not respond'}</div></div>
              </div>
            </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-8">
          <div className="mb-4">
            <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#9a80ff]">What the system covers</div>
            <h2 className="mt-2 text-[18px] font-medium">Built for everyday lab operations</h2>
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {features.map(({ title, description, icon: Icon }) => (
              <div key={title} className="border border-white/10 bg-[#1b1b1d] p-3.5">
                <div className="mb-4 flex h-7 w-7 items-center justify-center bg-[#29243a] text-[#b7aefc]">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-[11px] font-medium">{title}</h3>
                <p className="mt-2 text-[9px] leading-4 text-[#a5a7b2]">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="workflow" className="py-5">
          <div className="border border-white/10 bg-[#111114] p-4 sm:p-5">
            <div className="mb-4">
              <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#9a80ff]">Workflow</div>
              <h2 className="mt-2 text-[16px] font-medium">From sign-in to actionable operations</h2>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <div className="border border-white/10 bg-[#17181d] p-3.5">
                <div className="mb-3 font-mono text-[8px] uppercase text-[#b7aefc]">01 · Sign in</div>
                <p className="text-[9px] leading-4 text-[#a5a7b2]">Secure access to the lab dashboard with a real account flow and role-aware user identity.</p>
              </div>
              <div className="border border-white/10 bg-[#17181d] p-3.5">
                <div className="mb-3 font-mono text-[8px] uppercase text-[#b7aefc]">02 · Manage</div>
                <p className="text-[9px] leading-4 text-[#a5a7b2]">Review equipment availability and transaction history returned by the backend.</p>
              </div>
              <div className="border border-white/10 bg-[#17181d] p-3.5">
                <div className="mb-3 font-mono text-[8px] uppercase text-[#b7aefc]">03 · Act</div>
                <p className="text-[9px] leading-4 text-[#a5a7b2]">Use admin controls to manage equipment and records; members see their own transaction history.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="security" className="py-5 pb-10">
          <div className="flex flex-col gap-4 border border-white/10 bg-[#111114] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#9a80ff]">Ready for work</div>
                <h2 className="mt-2 text-[16px] font-medium">Open your laboratory workspace</h2>
              </div>
              <Link href="/sign-in" className="inline-flex h-9 items-center justify-center gap-2 bg-[#8e73ff] px-4 text-[9px] font-medium uppercase tracking-[0.1em] text-white transition hover:bg-[#a18cff]">
                Open app
                <ArrowRight className="h-4 w-4" />
              </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
