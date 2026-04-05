/**
 * Unit tests for lib/session — verifies options shape and SESSION_SECRET guard.
 */
import { describe, it, expect, beforeAll } from 'vitest'

describe('sessionOptions', () => {
  beforeAll(() => {
    process.env.SESSION_SECRET = 'a'.repeat(64)   // 64 hex chars — valid iron-session password
  })

  it('exports correct cookieName', async () => {
    // Re-import after setting env (module may be cached; use dynamic import to isolate)
    const { sessionOptions } = await import('@/lib/session')
    expect(sessionOptions.cookieName).toBe('homeforge_session')
  })

  it('exports SESSION_SECRET as password', async () => {
    const { sessionOptions } = await import('@/lib/session')
    expect(sessionOptions.password).toBe(process.env.SESSION_SECRET)
  })

  it('sets ttl to 7 days in seconds', async () => {
    const { sessionOptions } = await import('@/lib/session')
    expect(sessionOptions.ttl).toBe(60 * 60 * 24 * 7)
  })

  it('sets httpOnly on the cookie', async () => {
    const { sessionOptions } = await import('@/lib/session')
    expect(sessionOptions.cookieOptions?.httpOnly).toBe(true)
  })

  it('sets sameSite to lax', async () => {
    const { sessionOptions } = await import('@/lib/session')
    expect(sessionOptions.cookieOptions?.sameSite).toBe('lax')
  })
})
