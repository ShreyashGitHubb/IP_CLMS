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
    <main className="min-h-screen bg-[#0a0a0c] text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#111114] p-8 shadow-2xl shadow-[#7c6cf6]/10 md:p-10">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#7c6cf6]">New account</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">Create your lab profile</h1>
            </div>
            <Link href="/" className="text-sm text-[#a1a1ad] transition hover:text-white">Home</Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block text-sm text-[#dfe3ef]">
              <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-[#8a8b94]">Full name</span>
              <input
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-12 w-full rounded-xl border border-white/10 bg-[#0f1014] px-4 text-sm outline-none transition focus:border-[#7c6cf6]"
                placeholder="Shreyash Raut"
              />
            </label>

            <label className="block text-sm text-[#dfe3ef]">
              <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-[#8a8b94]">College email</span>
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
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-xl border border-white/10 bg-[#0f1014] px-4 text-sm outline-none transition focus:border-[#7c6cf6]"
                placeholder="At least 8 characters"
              />
            </label>

            <div className="flex items-start gap-3 border border-[#7c6cf6]/20 bg-[#171326] p-4 text-sm text-[#dfe3ef]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#b7aefc]" />
              <div><div className="font-medium text-[#b7aefc]">Member account</div><p className="mt-1 text-xs leading-5 text-[#b9b8c3]">New accounts receive member access. Administrator accounts are provisioned separately.</p></div>
            </div>

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
              {isLoading ? 'Creating account...' : 'Create account'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-8 border-t border-white/10 pt-5 text-sm text-[#a1a1ad]">
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
