'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { cn } from '@/lib/utils'
import { generateRecoveryKey } from '@/lib/recovery-key'

type Step = 'collect' | 'confirm' | 'account' | 'totp' | 'done'

// ── Entropy derivation (Web Crypto API, runs in the browser) ─────────────────

interface MousePoint { x: number; y: number; t: number }

/**
 * Derive a 64-byte (128 hex char) entropy key from:
 *  1. Mouse movement data collected on the canvas
 *  2. 32 bytes of window.crypto.getRandomValues() — the actual security anchor
 *
 * Both are hashed together via SHA-512 so neither alone is sufficient to
 * reconstruct the key. The mouse data acts as an additional entropy source
 * and makes the key unique to this specific setup session.
 */
async function deriveEntropyKey(points: MousePoint[]): Promise<string> {
  // Strong CSPRNG seed — this is the primary security guarantee
  const csrng = window.crypto.getRandomValues(new Uint8Array(32))

  // Mouse entropy — positions + timestamps concatenated as a string
  const mouseStr   = points.map(p => `${p.x},${p.y},${p.t}`).join(';')
  const mouseBytes = new TextEncoder().encode(mouseStr)

  // Combine: [CSPRNG bytes | mouse bytes]
  const combined = new Uint8Array(csrng.length + mouseBytes.length)
  combined.set(csrng, 0)
  combined.set(mouseBytes, csrng.length)

  // SHA-512 → 64 bytes → 128 hex chars
  const hashBuf = await window.crypto.subtle.digest('SHA-512', combined)
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Entropy canvas component ─────────────────────────────────────────────────

const REQUIRED_POINTS = 150   // unique mouse positions needed to fill the bar

interface EntropyCanvasProps {
  onComplete: (key: string) => void
}

function EntropyCanvas({ onComplete }: EntropyCanvasProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const pointsRef  = useRef<MousePoint[]>([])
  const doneRef    = useRef(false)
  const [progress, setProgress] = useState(0)

  const addPoint = useCallback(async (x: number, y: number) => {
    if (doneRef.current) return
    const points = pointsRef.current
    const last   = points[points.length - 1]

    // Deduplicate — only record if moved at least 3px from last point
    if (last && Math.abs(x - last.x) < 3 && Math.abs(y - last.y) < 3) return

    points.push({ x, y, t: Date.now() })
    const pct = Math.min(100, Math.round((points.length / REQUIRED_POINTS) * 100))
    setProgress(pct)

    // Draw trail dot on canvas
    const canvas = canvasRef.current
    if (canvas) {
      const ctx   = canvas.getContext('2d')
      const alpha = 0.3 + Math.random() * 0.4
      const size  = 2 + Math.random() * 3
      if (ctx) {
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(212, 225, 87, ${alpha})`  // --primary colour
        ctx.fill()
      }
    }

    if (points.length >= REQUIRED_POINTS && !doneRef.current) {
      doneRef.current = true
      const key = await deriveEntropyKey(points)
      onComplete(key)
    }
  }, [onComplete])

  // Mouse handler
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    addPoint(e.clientX - rect.left, e.clientY - rect.top)
  }, [addPoint])

  // Touch handler (mobile)
  const onTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const rect  = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const touch = e.touches[0]
    addPoint(touch.clientX - rect.left, touch.clientY - rect.top)
  }, [addPoint])

  return (
    <div className="flex flex-col gap-3">
      <canvas
        ref={canvasRef}
        width={400}
        height={180}
        onMouseMove={onMouseMove}
        onTouchMove={onTouchMove}
        className="w-full rounded-lg border border-border/50 cursor-crosshair touch-none"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      />

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
          {progress}%
        </span>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {progress < 100
          ? 'Move your mouse freely across the box above'
          : 'Entropy collected — deriving your key…'}
      </p>
    </div>
  )
}

// ── Main setup page ───────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter()

  const [step,        setStep]        = useState<Step>('collect')
  const [entropyKey,  setEntropyKey]  = useState('')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [keyVisible,  setKeyVisible]  = useState(false)
  const [keySaved,    setKeySaved]    = useState(false)
  const [copied,      setCopied]      = useState(false)
  const [username,    setUsername]    = useState('')
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [totpSecret,  setTotpSecret]  = useState('')
  const [qrDataUri,   setQrDataUri]   = useState('')
  const [totpCode,    setTotpCode]    = useState('')

  // Redirect away if setup is already complete
  useEffect(() => {
    fetch('/api/auth/setup/status')
      .then(r => r.json())
      .then(data => { if (data.complete) router.replace('/login') })
      .catch(() => {})
  }, [])

  // ── Step 1 complete: key derived from mouse movements ──────────────────────
  async function handleEntropyComplete(key: string) {
    setEntropyKey(key)
    const encodedKey = await generateRecoveryKey(key)
    setRecoveryKey(encodedKey)
    setStep('confirm')
  }

  // ── Copy key to clipboard ──────────────────────────────────────────────────
  async function copyKey() {
    await navigator.clipboard.writeText(recoveryKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Step 3: create admin account and submit ────────────────────────────────
  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 12) { setError('Password must be at least 12 characters.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/setup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ entropyKey, username, password }),
      })

      if (res.ok) {
        // Fetch TOTP setup data
        try {
          const totpRes = await fetch('/api/auth/totp/setup')
          if (totpRes.ok) {
            const totpData = await totpRes.json()
            if (!totpData.enabled && totpData.secret) {
              setTotpSecret(totpData.secret)
              setQrDataUri(totpData.qrDataUri)
              setStep('totp')
              return
            }
          }
        } catch { /* ignore — go to done */ }
        setStep('done')
        setTimeout(() => router.replace('/'), 1500)
      } else {
        const data = await res.json()
        setError(data.error || 'Setup failed — please try again.')
      }
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step indicator labels ──────────────────────────────────────────────────
  const stepLabels: Record<Step, string> = {
    collect: 'Step 1 of 4 — Generate your entropy key',
    confirm: 'Step 2 of 4 — Save your recovery key',
    account: 'Step 3 of 4 — Create your admin account',
    totp:    'Step 4 of 4 — Set up two-factor authentication',
    done:    'Setup complete — redirecting…',
  }

  const stepIndex = { collect: 0, confirm: 1, account: 2, totp: 3, done: 4 }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, var(--glow-primary), transparent)' }}
      />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-primary mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="size-6 text-primary-foreground" stroke="currentColor" strokeWidth={2}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9,22 9,12 15,12 15,22" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">HomeForge Setup</h1>
          <p className="text-sm text-muted-foreground mt-1">{stepLabels[step]}</p>
        </div>

        {/* Step progress bar */}
        <div className="flex gap-2 mb-6">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-300',
                stepIndex[step] > i || step === 'done' ? 'bg-primary' : 'bg-border'
              )}
            />
          ))}
        </div>

        {/* ── Step 1: Mouse Entropy Collection ── */}
        {step === 'collect' && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
            <CardHeader>
              <CardTitle className="text-base">Generate Your Encryption Key</CardTitle>
              <CardDescription>
                Move your mouse freely inside the box below. Your unique movement pattern
                is mixed with cryptographic randomness to create your personal encryption key.
                No one else can reproduce your exact movements.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EntropyCanvas onComplete={handleEntropyComplete} />
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Show + Confirm key saved ── */}
        {step === 'confirm' && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
            <CardHeader>
              <CardTitle className="text-base">Save Your Post-Quantum Recovery Key</CardTitle>
              <CardDescription>
                This Base58-encoded string is your recovery key. Write it down and store it safely. The hyphens make it easier to read, and it contains a built-in checksum to prevent typos.
                You can recover your entire HomeForge installation from this key alone.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div
                className={cn(
                  'font-mono text-center text-sm md:text-base break-all rounded-lg border border-border/50 p-4 leading-relaxed select-all tracking-wider',
                  keyVisible ? 'text-foreground bg-muted/30' : 'text-transparent select-none blur-sm'
                )}
                style={{ minHeight: '6rem' }}
              >
                {recoveryKey}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setKeyVisible(v => !v)}
                >
                  {keyVisible ? 'Hide' : 'Reveal'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={copyKey}
                  disabled={!keyVisible}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>

              {/* Confirmation checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={keySaved}
                  onChange={e => setKeySaved(e.target.checked)}
                  className="mt-0.5 accent-primary"
                />
                <span className="text-sm text-muted-foreground leading-snug">
                  I have saved my Post-Quantum Recovery Key in a secure location.
                  I understand my HomeForge cannot be recovered if lost.
                </span>
              </label>

              <Button
                type="button"
                className="w-full"
                disabled={!keySaved}
                onClick={() => setStep('account')}
              >
                Continue →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Admin Account ── */}
        {step === 'account' && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
            <CardHeader>
              <CardTitle className="text-base">Create Admin Account</CardTitle>
              <CardDescription>
                This will be the primary administrator account. Additional users can be
                created from the dashboard after setup.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAccountSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="admin"
                    autoFocus
                    required
                    minLength={3}
                    maxLength={32}
                    pattern="[a-zA-Z0-9_-]+"
                    title="Letters, numbers, underscores and hyphens only"
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 12 characters"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="confirm">Confirm Password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    required
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </div>

                {/* Password strength bar */}
                {password.length > 0 && (
                  <div className="flex gap-1.5 items-center">
                    {[12, 16, 20, 24].map(len => (
                      <div
                        key={len}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors',
                          password.length >= len ? 'bg-primary' : 'bg-border'
                        )}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">
                      {password.length < 12 ? 'Too short'
                        : password.length < 16 ? 'Fair'
                        : password.length < 20 ? 'Good'
                        : 'Strong'}
                    </span>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex gap-2 mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setStep('confirm'); setError('') }}
                    disabled={loading}
                  >
                    ← Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? 'Creating…' : 'Complete Setup'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Step 4: TOTP Setup ── */}
        {step === 'totp' && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
            <CardHeader>
              <CardTitle className="text-base">Set Up Two-Factor Authentication</CardTitle>
              <CardDescription>
                Scan the QR code with your authenticator app (Google Authenticator, Authy, or 1Password).
                Then enter the 6-digit code to verify.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex justify-center">
                <img src={qrDataUri} alt="TOTP QR Code" className="w-48 h-48 rounded-lg border border-border/50" />
              </div>
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">Can't scan? Enter manually</summary>
                <div className="mt-2 font-mono text-xs bg-muted/30 rounded-lg border border-border/50 p-3 text-center select-all break-all">{totpSecret}</div>
              </details>
              <div className="flex flex-col gap-1.5 items-center">
                <Label htmlFor="totp-setup">Enter 6-digit code</Label>
                <InputOTP maxLength={6} value={totpCode} onChange={setTotpCode} id="totp-setup">
                  <InputOTPGroup>
                    {Array.from({ length: 6 }, (_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 text-center">{error}</p>}
              <Button type="button" className="w-full" disabled={totpCode.length < 6 || loading} onClick={async () => {
                setLoading(true); setError('')
                try {
                  const res = await fetch('/api/auth/totp/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: totpCode }),
                  })
                  if (res.ok) { setStep('done') } else {
                    const data = await res.json(); setError(data.error || 'Invalid code'); setTotpCode('')
                  }
                } catch { setError('Network error — please try again') } finally { setLoading(false) }
              }}>{loading ? 'Verifying…' : 'Verify & Complete Setup'}</Button>
              <Button type="button" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setStep('done')}>Skip for now (set up later in settings)</Button>
            </CardContent>
          </Card>
        )}

        {/* ── Done ── */}
        {step === 'done' && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
            <CardContent className="pt-6 pb-6 flex flex-col items-center gap-4 text-center">
              <div className="size-12 rounded-full bg-success/20 border border-success/40 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="size-6 text-success" stroke="currentColor" strokeWidth={2.5}>
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground">Setup complete!</p>
                <p className="text-sm text-muted-foreground mt-1">Redirecting to your dashboard…</p>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <span>HomeForge · Self-hosted server dashboard</span>
          <span className="text-border">|</span>
          <a href="/login" className="text-primary hover:underline transition-all">Sign In</a>
        </p>
      </div>
    </div>
  )
}
