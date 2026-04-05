import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { z } from 'zod'
import { verifyUser, isSetupComplete } from '@/lib/db/users'
import { sessionOptions, type SessionData } from '@/lib/session'
import { checkRateLimit } from '@/lib/rate-limit'

const LoginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(12),
})

// 10 attempts per IP per 15-minute sliding window
const LOGIN_LIMIT = { windowMs: 15 * 60 * 1000, max: 10 }

export async function POST(req: NextRequest) {
  if (!isSetupComplete()) {
    return NextResponse.json({ error: 'Setup not complete' }, { status: 403 })
  }

  const body   = await req.json().catch(() => null)
  const parsed = LoginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // Rate-limit by username — protects each account individually.
  // IP-based keying is unreliable in a direct Docker deployment (no reverse
  // proxy means x-forwarded-for is never set and all clients appear as the
  // same IP). Username-keying is a better fit: it limits brute force against
  // a specific account regardless of where the attacker's requests originate.
  const username = parsed.data.username.toLowerCase()
  const rl = checkRateLimit(`login:${username}`, LOGIN_LIMIT)
  const rlHeaders = {
    'X-RateLimit-Limit':     String(rl.limit),
    'X-RateLimit-Remaining': String(rl.remaining),
    'X-RateLimit-Reset':     String(rl.resetAt),
  }

  if (!rl.allowed) {
    const retryAfter = rl.resetAt - Math.floor(Date.now() / 1000)
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: { ...rlHeaders, 'Retry-After': String(retryAfter) } }
    )
  }

  const user = await verifyUser(parsed.data.username, parsed.data.password)

  if (!user) {
    // Small random delay to blunt timing-based username enumeration
    await new Promise(r => setTimeout(r, 200 + Math.random() * 100))
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const res     = NextResponse.json({ ok: true, role: user.role }, { headers: rlHeaders })
  const session = await getIronSession<SessionData>(req, res, sessionOptions)
  session.userId   = user.id
  session.username = user.username
  session.role     = user.role
  await session.save()

  return res
}
