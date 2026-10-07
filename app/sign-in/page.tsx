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
    <main className="min-h-screen bg-[#101012] text-white">
      <div className="mx-auto flex min-h-screen max-w-[960px] flex-col items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[744px] overflow-hidden border border-white/10 bg-[#1b1b1d]">
          <div className="grid lg:grid-cols-2">
            <div className="relative hidden min-h-[390px] overflow-hidden border-r border-white/10 bg-[#211c2b] p-6 lg:flex lg:flex-col lg:justify-between">
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(160,130,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(160,130,255,0.12) 1px, transparent 1px)', backgroundSize: '19px 19px' }} />
              <div className="relative">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center bg-[#2a2540] text-[#b7aefc]">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#9a80ff]">CLMS / 26</div>
                    <div className="text-[11px] font-medium">LAB / CONTROL</div>
                  </div>
                </div>
                <h1 className="max-w-sm text-[28px] font-normal leading-[1.05]">Equipment, loans, and lab access.</h1>
                <p className="mt-3 max-w-sm text-[10px] leading-5 text-[#b3b3bc]">
                  Sign in to view live laboratory inventory and the requests or transactions linked to your account.
                </p>
              </div>

              <div className="relative border border-white/10 bg-[#171719]/90 p-3.5">
                <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#b7aefc]">Account access</div>
                <p className="mt-2 text-[9px] leading-4 text-[#c3c3cb]">Use your registered account. Administrator access is provisioned by the laboratory administrator.</p>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#9a80ff]">Welcome back</div>
                  <h2 className="mt-2 text-[22px] font-medium">Sign in</h2>
                </div>
                <Link href="/" className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#a1a1ad] transition hover:text-white">Back home</Link>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block text-[10px] text-[#dfe3ef]">
                  <span className="mb-1.5 block font-mono text-[8px] uppercase tracking-[0.14em] text-[#8a8b94]">Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-9 w-full rounded-[6px] border border-white/10 bg-[#111113] px-3 text-[10px] outline-none transition focus:border-[#9a80ff]"
                    placeholder="name@college.edu"
                  />
                </label>

                <label className="block text-[10px] text-[#dfe3ef]">
                  <span className="mb-1.5 block font-mono text-[8px] uppercase tracking-[0.14em] text-[#8a8b94]">Password</span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-9 w-full rounded-[6px] border border-white/10 bg-[#111113] px-3 text-[10px] outline-none transition focus:border-[#9a80ff]"
                    placeholder="••••••••"
                  />
                </label>

                {error ? (
                  <div className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-[10px] text-red-200">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[6px] bg-[#8e73ff] px-4 text-[9px] font-medium uppercase tracking-[0.1em] text-white transition hover:bg-[#a18cff] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? 'Signing in...' : 'Continue to dashboard'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              <div className="mt-6 border-t border-white/10 pt-4 text-[10px] text-[#a1a1ad]">
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
