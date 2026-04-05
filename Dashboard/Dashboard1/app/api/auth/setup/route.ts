import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { z } from 'zod'
import { isSetupComplete, createUser, markSetupComplete } from '@/lib/db/users'
import { storeEntropyKey } from '@/lib/crypto/keystore'
import { deriveSubKey } from '@/lib/crypto/entropy'
import { rekeyDatabase } from '@/lib/db/index'
import { sessionOptions, type SessionData } from '@/lib/session'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const SetupSchema = z.object({
  // 64 bytes of entropy derived client-side from mouse movements = 128 hex chars
  entropyKey: z.string().length(128).regex(/^[a-f0-9]+$/i),
  username:   z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password:   z.string().min(12),
})

// 5 attempts per IP per hour — this is a one-time operation
const SETUP_LIMIT = { windowMs: 60 * 60 * 1000, max: 5 }

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = checkRateLimit(`setup:${ip}`, SETUP_LIMIT)
  if (!rl.allowed) {
    const retryAfter = rl.resetAt - Math.floor(Date.now() / 1000)
    return NextResponse.json(
      { error: 'Too many setup attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit':     String(rl.limit),
          'X-RateLimit-Remaining': String(rl.remaining),
          'X-RateLimit-Reset':     String(rl.resetAt),
          'Retry-After':           String(retryAfter),
        },
      }
    )
  }

  if (isSetupComplete()) {
    return NextResponse.json({ error: 'Setup already complete' }, { status: 409 })
  }

  const body   = await req.json().catch(() => null)
  const parsed = SetupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { entropyKey, username, password } = parsed.data

  const entropyKeyBuf = Buffer.from(entropyKey, 'hex')

  // Store the user-generated entropy key (derived from mouse movements client-side)
  storeEntropyKey(entropyKeyBuf)

  // Re-key the database from the pre-setup UUID-derived key to the entropy-derived key.
  // The DB connection is already open on the old key; PRAGMA rekey re-encrypts in place.
  const newDbKey = deriveSubKey(entropyKeyBuf, 'sqlite-db-v1', 32).toString('hex')
  rekeyDatabase(newDbKey)

  const user = await createUser(username, password, 'admin')
  markSetupComplete()

  const res     = NextResponse.json({ ok: true })
  const session = await getIronSession<SessionData>(req, res, sessionOptions)
  session.userId   = user.id
  session.username = user.username
  session.role     = 'admin'
  await session.save()

  return res
}
