'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { WorkspaceShell } from '@/components/workspace-shell'
import { apiRequest } from '@/lib/clms-api'
import { getApiBaseUrl, getSession } from '@/lib/auth'

export default function SettingsPage() {
  const [apiStatus, setApiStatus] = useState('Checking')
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null)

  useEffect(() => {
    setUser(getSession()?.user ?? null)
    apiRequest<{ status: string }>('/api/health')
      .then((response) => setApiStatus(response.status === 'ok' ? 'Connected' : response.status))
      .catch(() => setApiStatus('Unavailable'))
  }, [])

  return <WorkspaceShell title="Settings" eyebrow="System / Account" description="Review your account identity, access role, and service connection." adminOnly>
    <div className="grid gap-3 md:grid-cols-[0.7fr_1.3fr]">
      <nav className="space-y-1 text-[10px]"><div className="border border-white/10 bg-[#1b1b1d] px-3 py-2.5 text-white">Account profile</div><div className="px-3 py-2.5 text-[#8f8f98]">Access and session</div><div className="px-3 py-2.5 text-[#8f8f98]">Service connection</div></nav>
      <section className="border border-white/10 bg-[#1b1b1d] p-4"><div className="mb-4 font-mono text-[8px] uppercase tracking-[0.18em] text-[#777780]">Signed-in account</div><div className="space-y-4">{[['Name', user?.name ?? 'Loading…'], ['Email', user?.email ?? 'Loading…'], ['Role', user?.role ?? 'Loading…'], ['Backend API', apiStatus], ['API endpoint', getApiBaseUrl()]].map(([label, value]) => <div key={label} className="border-b border-white/[0.08] pb-3 last:border-0"><div className="text-[8px] text-[#777780]">{label}</div><div className="mt-1 break-all text-[10px] text-[#e2e2e6]">{value}</div></div>)}</div><div className="mt-2 flex items-start gap-2 border border-white/10 bg-[#151517] p-3 text-[9px] leading-4 text-[#a5a5ad]"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b49eff]" />Role restrictions are enforced by the API. Account creation is available through the sign-up page; role changes and password resets are not exposed by this backend.</div></section>
    </div>
  </WorkspaceShell>
}