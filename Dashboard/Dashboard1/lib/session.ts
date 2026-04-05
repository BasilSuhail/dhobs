import type { SessionOptions } from 'iron-session'

export interface SessionData {
  userId:   number
  username: string
  role:     'admin' | 'viewer'
}

/**
 * Session options — password is read from the environment at call time so that
 * tests can set SESSION_SECRET before the first call without hitting a
 * module-level throw.
 */
export const sessionOptions: SessionOptions = {
  get password(): string {
    const secret = process.env.SESSION_SECRET
    if (!secret) {
      throw new Error(
        'SESSION_SECRET is not set. Ensure start.sh ran bootstrap.js before starting the server.'
      )
    }
    return secret
  },
  cookieName: 'homeforge_session',
  // ttl in seconds — iron-session v8 uses ttl, not maxAge inside cookieOptions
  ttl:        60 * 60 * 24 * 7,  // 7 days
  cookieOptions: {
    httpOnly: true,
    // Only enforce secure in production; allows local dev over http
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  },
}
