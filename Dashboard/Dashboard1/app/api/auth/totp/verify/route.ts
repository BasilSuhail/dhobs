import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession, getSession } from '@/lib/auth'
import { getUserById } from '@/lib/db/users'
import { verifyTotpCode } from '@/lib/totp'
import { getDb } from '@/lib/db'
import { getIronSession } from 'iron-session'
import { sessionOptions, type SessionData } from '@/lib/session'
import { checkRateLimit } from '@/lib/rate-limit'

// 5 attempts per temp token per 15-minute window — prevents TOTP brute-force
const TOTP_LIMIT = { windowMs: 15 * 60 * 1000, max: 5 }

const TotpSchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
  tempToken: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = TotpSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { code, tempToken } = parsed.data

  // Login mode with tempToken
  if (tempToken) {
    // Rate-limit by temp token — prevents brute-forcing the 6-digit TOTP code
    const rl = checkRateLimit(`totp:${tempToken}`, TOTP_LIMIT)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please log in again.' },
        { status: 429 }
      )
    }

    const db = getDb()
    const tokenData = db.prepare(
      'SELECT user_id, username, role, expires_at FROM totp_temp_tokens WHERE token = ?'
    ).get(tempToken) as { user_id: number; username: string; role: string; expires_at: number } | undefined

    if (!tokenData || tokenData.expires_at < Date.now()) {
      db.prepare('DELETE FROM totp_temp_tokens WHERE token = ?').run(tempToken)
      return NextResponse.json({ error: 'Token expired' }, { status: 401 })
    }

    const user = getUserById(tokenData.user_id)
    if (!user || !user.totp_secret) {
      return NextResponse.json({ error: 'TOTP not configured' }, { status: 400 })
    }

    const valid = await verifyTotpCode(code, user.totp_secret)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
    }

    db.prepare('DELETE FROM totp_temp_tokens WHERE token = ?').run(tempToken)

    // Create session via cookie response
    const cookieRes = new NextResponse()
    const session = await getIronSession<SessionData>(req, cookieRes, sessionOptions)
    session.userId = tokenData.user_id
    session.username = tokenData.username
    session.role = tokenData.role as 'admin' | 'viewer'
    await session.save()

    // Copy session cookie to the response
    const setCookie = cookieRes.headers.getSetCookie()
    const res = NextResponse.json({ ok: true })
    for (const cookie of setCookie) {
      res.headers.append('Set-Cookie', cookie)
    }
    return res
  }

  // Setup mode (authenticated)
  const session = await requireSession()
  const user = getUserById(session.userId)
  if (!user || !user.totp_secret) {
    return NextResponse.json({ error: 'TOTP not configured' }, { status: 400 })
  }

  const valid = await verifyTotpCode(code, user.totp_secret)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
  }

  getDb().prepare('UPDATE users SET totp_enabled = 1 WHERE id = ?').run(session.userId)
  return NextResponse.json({ ok: true, enabled: true })
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession()
  const user = getUserById(session.userId)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = TotpSchema.safeParse(body)
  if (!parsed.success || !body.code) {
    return NextResponse.json({ error: 'Current TOTP code required' }, { status: 400 })
  }

  if (!user.totp_secret || !(await verifyTotpCode(body.code, user.totp_secret))) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
  }

  getDb().prepare('UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?').run(session.userId)
  return NextResponse.json({ ok: true })
}
