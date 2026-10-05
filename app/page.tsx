'use client'

import Link from 'next/link'
import { ArrowRight, ClipboardList, Database, ShieldCheck, Sparkles, Users, Wrench } from 'lucide-react'

const features = [
  { title: 'Inventory visibility', description: 'Track every device, lab station, and asset with clear status and availability info.', icon: Database },
  { title: 'Request workflow', description: 'Approve or reject equipment requests with a clean operational queue and timeline.', icon: ClipboardList },
  { title: 'Maintenance control', description: 'Keep equipment health, repairs, and service windows in one reliable place.', icon: Wrench },
  { title: 'Student operations', description: 'Manage users, access, and active loans without spreadsheet chaos.', icon: Users },
]

export default function LandingPage() {
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
              Control every lab, request, and asset in one place.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-[#a5a7b2]">
              CLMS helps colleges and training labs manage equipment, student borrowing, service issues, and daily operations with a modern control center built for real work.
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
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#7fe3b0]" /> Available assets</div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#f2c879]" /> Maintenance tracking</div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#7c6cf6]" /> Student requests</div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#111114] p-6 shadow-2xl shadow-[#7c6cf6]/10">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8a8b94]">Sample workspace</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.05em]">Operations health</div>
              </div>
              <div className="rounded-full border border-[#7c6cf6]/20 bg-[#201a2d] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#b7aefc]">
                94% healthy
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#17181d] p-4">
                <div className="text-sm text-[#a5a7b2]">Inventory</div>
                <div className="mt-2 text-3xl font-semibold tracking-[-0.06em]">56</div>
                <div className="mt-1 text-sm text-[#7fe3b0]">+4 this month</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#17181d] p-4">
                <div className="text-sm text-[#a5a7b2]">Open requests</div>
                <div className="mt-2 text-3xl font-semibold tracking-[-0.06em]">06</div>
                <div className="mt-1 text-sm text-[#f2c879]">3 require attention</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#17181d] p-4">
                <div className="text-sm text-[#a5a7b2]">Maintenance</div>
                <div className="mt-2 text-3xl font-semibold tracking-[-0.06em]">04</div>
                <div className="mt-1 text-sm text-[#ff8b8b]">2 in progress</div>
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
                <p className="text-sm leading-6 text-[#a5a7b2]">Review inventory, requests, and maintenance tasks from interactive operational cards.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#17181d] p-5">
                <div className="mb-4 text-sm font-medium text-[#b7aefc]">03 · Act</div>
                <p className="text-sm leading-6 text-[#a5a7b2]">Approve, schedule, and resolve issues with a clear system designed for daily lab work.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="security" className="pb-20">
          <div className="rounded-3xl border border-white/10 bg-[#111114] p-8 md:p-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7c6cf6]">Ready for work</div>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.06em]">Production-ready direction for a real deployment</h2>
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
