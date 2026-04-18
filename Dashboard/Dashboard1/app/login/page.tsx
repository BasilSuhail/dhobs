'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'

type LoginStep = 'credentials' | 'totp'

export default function LoginPage() {
  const router = useRouter()
  const [loginStep, setLoginStep] = useState<LoginStep>('credentials')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [tempToken, setTempToken] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    fetch('/api/auth/setup/status')
      .then(async r => {
        // 401 = setup complete but unauthenticated — stay on /login
        if (r.status === 401) return
        const data = await r.json()
        if (!data.complete) router.replace('/setup')
      })
      .catch(() => {})
  }, [])

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (data.needsTotp) {
        setTempToken(data.tempToken)
        setLoginStep('totp')
      } else if (res.ok) {
        router.replace('/')
      } else {
        setError(data.error || 'Invalid username or password')
        setPassword('')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/totp/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code: totpCode, tempToken }),
      })

      if (res.ok) {
        router.replace('/')
      } else {
        const data = await res.json()
        setError(data.error || 'Invalid code')
        setTotpCode('')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="pointer-events-none fixed inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, var(--glow-primary), transparent)' }} />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-primary mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="size-6 text-primary-foreground" stroke="currentColor" strokeWidth={2}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9,22 9,12 15,12 15,22" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">HomeForge</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loginStep === 'totp' ? 'Two-factor authentication' : 'Sign in to your dashboard'}
          </p>
        </div>

        {loginStep === 'credentials' && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
            <CardContent className="pt-6">
              <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" type="text" autoComplete="username" autoFocus value={username} onChange={e => setUsername(e.target.value)} placeholder="username" required disabled={loading} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} />
                </div>
                {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">{error}</p>}
                <Button type="submit" className="w-full mt-1" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {loginStep === 'totp' && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
            <CardContent className="pt-6">
              <form onSubmit={handleTotpSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5 items-center">
                  <Label htmlFor="totp">Enter 6-digit code</Label>
                  <InputOTP maxLength={6} value={totpCode} onChange={setTotpCode} id="totp">
                    <InputOTPGroup>
                      {Array.from({ length: 6 }, (_, i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 text-center">{error}</p>}
                <Button type="submit" className="w-full mt-1" disabled={totpCode.length < 6 || loading}>{loading ? 'Verifying…' : 'Verify'}</Button>
                <Button type="button" variant="ghost" className="text-xs text-muted-foreground" onClick={() => { setLoginStep('credentials'); setTempToken(''); setTotpCode(''); setError('') }}>← Back</Button>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">HomeForge · Self-hosted server dashboard</p>
      </div>
    </div>
  )
}
