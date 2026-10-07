'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { getApiBaseUrl, getSession, saveSession } from '@/lib/auth'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
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
      const response = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'Account creation failed.')
      }

      saveSession(payload.user, payload.token)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account right now.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#101012] text-white">
      <div className="mx-auto flex min-h-screen max-w-[960px] items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[520px] border border-white/10 bg-[#1b1b1d] p-5 sm:p-7">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#9a80ff]">New account / Member</div>
              <h1 className="mt-2 text-[22px] font-medium">Create your lab profile</h1>
            </div>
            <Link href="/" className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#a1a1ad] transition hover:text-white">Home</Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-[10px] text-[#dfe3ef]">
              <span className="mb-1.5 block font-mono text-[8px] uppercase tracking-[0.14em] text-[#8a8b94]">Full name</span>
              <input
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-9 w-full rounded-[6px] border border-white/10 bg-[#111113] px-3 text-[10px] outline-none transition focus:border-[#9a80ff]"
                placeholder="Shreyash Raut"
              />
            </label>

            <label className="block text-[10px] text-[#dfe3ef]">
              <span className="mb-1.5 block font-mono text-[8px] uppercase tracking-[0.14em] text-[#8a8b94]">College email</span>
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
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-9 w-full rounded-[6px] border border-white/10 bg-[#111113] px-3 text-[10px] outline-none transition focus:border-[#9a80ff]"
                placeholder="At least 8 characters"
              />
            </label>

            <div className="flex items-start gap-2.5 border border-[#7c6cf6]/20 bg-[#171719] p-3 text-[10px] text-[#dfe3ef]">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b7aefc]" />
              <div><div className="font-medium text-[#b7aefc]">Member account</div><p className="mt-1 text-[9px] leading-4 text-[#b9b8c3]">New accounts receive member access. Administrator accounts are provisioned separately.</p></div>
            </div>

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
              {isLoading ? 'Creating account...' : 'Create account'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-4 text-[10px] text-[#a1a1ad]">
            Already registered?{' '}
            <Link href="/sign-in" className="font-medium text-[#b7aefc] hover:text-white">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
