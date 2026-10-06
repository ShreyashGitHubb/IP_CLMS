'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { getApiBaseUrl, getSession, saveSession } from '@/lib/auth'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (getSession()) {
      router.replace('/dashboard')
    }
  }, [router])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'Sign in failed.')
      }

      saveSession(payload.user, payload.token)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in right now.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0c] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#111114] shadow-2xl shadow-[#7c6cf6]/10">
          <div className="grid lg:grid-cols-2">
            <div className="relative hidden overflow-hidden bg-[#1a1528] p-10 lg:flex lg:flex-col lg:justify-between">
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(124,108,246,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(124,108,246,0.2) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              <div className="relative">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7c6cf6]/20 text-[#b7aefc]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-medium tracking-[0.28em] text-[#b7aefc]">CLMS</div>
                    <div className="text-xl font-semibold">Lab Control</div>
                  </div>
                </div>
                <h1 className="max-w-sm text-4xl font-semibold tracking-[-0.06em]">Equipment, loans, and lab access.</h1>
                <p className="mt-4 max-w-sm text-sm leading-6 text-[#b3b3bc]">
                  Sign in to view live laboratory inventory and the requests or transactions linked to your account.
                </p>
              </div>

              <div className="relative border border-white/10 bg-white/[0.04] p-5">
                <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#b7aefc]">Account access</div>
                <p className="mt-3 text-xs leading-5 text-[#c3c3cb]">Use your registered account. Administrator access is provisioned by the laboratory administrator.</p>
              </div>
            </div>

            <div className="p-8 md:p-10">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#7c6cf6]">Welcome back</div>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">Sign in</h2>
                </div>
                <Link href="/" className="text-sm text-[#a1a1ad] transition hover:text-white">Back home</Link>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <label className="block text-sm text-[#dfe3ef]">
                  <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-[#8a8b94]">Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 w-full rounded-xl border border-white/10 bg-[#0f1014] px-4 text-sm outline-none transition focus:border-[#7c6cf6]"
                    placeholder="name@college.edu"
                  />
                </label>

                <label className="block text-sm text-[#dfe3ef]">
                  <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-[#8a8b94]">Password</span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 w-full rounded-xl border border-white/10 bg-[#0f1014] px-4 text-sm outline-none transition focus:border-[#7c6cf6]"
                    placeholder="••••••••"
                  />
                </label>

                {error ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7c6cf6] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#8e80ff] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? 'Signing in...' : 'Continue to dashboard'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              <div className="mt-8 border-t border-white/10 pt-5 text-sm text-[#a1a1ad]">
                Don&apos;t have an account?{' '}
                <Link href="/sign-up" className="font-medium text-[#b7aefc] hover:text-white">
                  Create one
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
