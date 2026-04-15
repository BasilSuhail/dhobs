/**
 * API route tests — call route handlers directly (no HTTP server needed).
 * Uses vi.spyOn on lib/auth to control session state per test.
 */
import { describe, it, expect, beforeAll, afterAll, vi, afterEach } from 'vitest'
import os   from 'os'
import path from 'path'
import fs   from 'fs'
import { NextRequest } from 'next/server'
import { sealData } from 'iron-session'

// ── Environment bootstrap (must happen before any module that reads these) ───
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'homeforge-api-test-'))
process.env.SECURITY_DIR   = tmpDir
process.env.SESSION_SECRET = 'b'.repeat(64)
process.env.WS_SECRET      = 'c'.repeat(64)
process.env.DB_KEY         = 'd'.repeat(64)   // 32-byte test key as hex

// ── Test credentials — must be set via env vars (see .env.example) ──────────
const TEST_ADMIN_USER = process.env.TEST_ADMIN_USER     ?? 'test_admin'
const TEST_ADMIN_PASS = process.env.TEST_ADMIN_PASSWORD ?? (() => { throw new Error('TEST_ADMIN_PASSWORD env var is required') })()
const TEST_VIEWER_PASS = process.env.TEST_VIEWER_PASSWORD ?? (() => { throw new Error('TEST_VIEWER_PASSWORD env var is required') })()

import * as authLib from '@/lib/auth'
import { storeEntropyKey } from '@/lib/crypto/keystore'
import { randomKey } from '@/lib/crypto/entropy'
import { sessionOptions, type SessionData } from '@/lib/session'
import { listUsers } from '@/lib/db/users'
import { _resetRateLimitStore } from '@/lib/rate-limit'

// Wrong-credential fixtures used in negative tests (not real secrets)
const WRONG_PASS   = 'incorrect-12'
const WRONG_USER   = 'ghostuser'

import { GET  as setupStatus } from '@/app/api/auth/setup/status/route'
import { POST as setupPost   } from '@/app/api/auth/setup/route'
import { POST as loginPost   } from '@/app/api/auth/login/route'
import { POST as logoutPost  } from '@/app/api/auth/logout/route'
import { GET  as meGet       } from '@/app/api/auth/me/route'
import { GET  as wsTicket    } from '@/app/api/auth/ws-ticket/route'
import { GET  as usersGet, POST as usersPost } from '@/app/api/auth/users/route'
import { DELETE as userDelete, PUT as userPut } from '@/app/api/auth/users/[id]/route'

// ── Helpers ──────────────────────────────────────────────────────────────────

const ADMIN_SESSION: SessionData = { userId: 1, username: TEST_ADMIN_USER, role: 'admin' }

/** Build a NextRequest with optional JSON body and session cookie. */
async function makeReq(
  url: string,
  opts: { method?: string; body?: object; session?: SessionData } = {}
): Promise<NextRequest> {
  const { method = 'GET', body, session } = opts
  const headers = new Headers({ 'content-type': 'application/json' })
  if (session) {
    const sealed = await sealData(session, sessionOptions)
    headers.set('cookie', `homeforge_session=${sealed}`)
  }
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

/** Stub lib/auth.getSession to return a fixed value for one test. */
function stubSession(value: SessionData | null) {
  vi.spyOn(authLib, 'getSession').mockResolvedValue(value)
}

/** Stub lib/auth.requireAdmin to return a fixed value (or throw redirect). */
function stubAdmin(value: SessionData | null = ADMIN_SESSION) {
  if (value) {
    vi.spyOn(authLib, 'requireAdmin').mockResolvedValue(value)
  } else {
    vi.spyOn(authLib, 'requireAdmin').mockRejectedValue(new Error('Unauthorized'))
  }
}

afterEach(() => { vi.restoreAllMocks(); _resetRateLimitStore() })
afterAll(()  => { fs.rmSync(tmpDir, { recursive: true }) })

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/auth/setup/status', () => {
  it('returns complete: false before setup', async () => {
    const res  = await setupStatus()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.complete).toBe(false)
  })
})

describe('POST /api/auth/setup', () => {
  let entropyHex: string

  beforeAll(() => {
    // Simulate the client-generated key (mouse entropy + CSPRNG) arriving at the server
    const key  = randomKey(64)
    storeEntropyKey(key)
    entropyHex = key.toString('hex')
  })

  it('rejects missing fields (400)', async () => {
    const req = await makeReq('/api/auth/setup', { method: 'POST', body: {} })
    expect((await setupPost(req)).status).toBe(400)
  })

  it('rejects non-hex or wrong-length entropy key (400)', async () => {
    const req = await makeReq('/api/auth/setup', {
      method: 'POST',
      // 127 chars — one short of required 128
      body: { entropyKey: 'a'.repeat(127), username: TEST_ADMIN_USER, password: TEST_ADMIN_PASS },
    })
    expect((await setupPost(req)).status).toBe(400)
  })

  it('accepts any valid 128-char hex entropy key and completes setup (200)', async () => {
    const req = await makeReq('/api/auth/setup', {
      method: 'POST',
      body: { entropyKey: entropyHex, username: TEST_ADMIN_USER, password: TEST_ADMIN_PASS },
    })
    const res  = await setupPost(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    // Cookie should be set after successful setup
    expect(res.headers.get('set-cookie')).toContain('homeforge_session')
  })

  it('returns 409 when called again after setup', async () => {
    const req = await makeReq('/api/auth/setup', {
      method: 'POST',
      body: { entropyKey: entropyHex, username: TEST_ADMIN_USER + '2', password: TEST_ADMIN_PASS },
    })
    expect((await setupPost(req)).status).toBe(409)
  })

  it('GET /status returns complete: true after setup', async () => {
    const data = await (await setupStatus()).json()
    expect(data.complete).toBe(true)
  })
})

describe('POST /api/auth/login', () => {
  it('accepts correct credentials and sets cookie (200)', async () => {
    const req  = await makeReq('/api/auth/login', {
      method: 'POST',
      body: { username: TEST_ADMIN_USER, password: TEST_ADMIN_PASS },
    })
    const res  = await loginPost(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.role).toBe('admin')
    expect(res.headers.get('set-cookie')).toContain('homeforge_session')
  })

  it('rejects wrong password (401)', async () => {
    const req = await makeReq('/api/auth/login', {
      method: 'POST',
      body: { username: TEST_ADMIN_USER, password: WRONG_PASS },
    })
    expect((await loginPost(req)).status).toBe(401)
  })

  it('rejects non-existent user (401)', async () => {
    const req = await makeReq('/api/auth/login', {
      method: 'POST',
      body: { username: WRONG_USER, password: WRONG_PASS },
    })
    expect((await loginPost(req)).status).toBe(401)
  })
})

describe('POST /api/auth/logout', () => {
  it('clears session cookie and returns ok (200)', async () => {
    const req  = await makeReq('/api/auth/logout', { method: 'POST', session: ADMIN_SESSION })
    const res  = await logoutPost(req)
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie).toMatch(/homeforge_session=;|Max-Age=0/i)
  })
})

describe('GET /api/auth/me', () => {
  it('returns user info when authenticated (200)', async () => {
    stubSession(ADMIN_SESSION)
    const data = await (await meGet()).json()
    expect(data.username).toBe(TEST_ADMIN_USER)
    expect(data.role).toBe('admin')
    expect(data.password_hash).toBeUndefined()
  })

  it('returns 401 when not authenticated', async () => {
    stubSession(null)
    expect((await meGet()).status).toBe(401)
  })
})

describe('GET /api/auth/ws-ticket', () => {
  it('returns a valid ticket when authenticated (200)', async () => {
    stubSession(ADMIN_SESSION)
    const res  = await wsTicket()
    const data = await res.json()
    expect(res.status).toBe(200)
    // Format: "{timestamp}.{64 hex chars}"
    expect(data.ticket).toMatch(/^\d+\.[a-f0-9]{64}$/)
  })

  it('returns 401 when not authenticated', async () => {
    stubSession(null)
    expect((await wsTicket()).status).toBe(401)
  })
})

describe('GET /api/auth/users', () => {
  it('returns user array for admin (200)', async () => {
    stubAdmin()
    const data = await (await usersGet()).json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.some((u: any) => u.username === TEST_ADMIN_USER)).toBe(true)
    expect(data.every((u: any) => u.password_hash === undefined)).toBe(true)
  })
})

describe('POST /api/auth/users', () => {
  it('creates a viewer and returns 201', async () => {
    stubAdmin()
    const req  = await makeReq('/api/auth/users', {
      method: 'POST',
      body: { username: 'test_viewer', password: TEST_VIEWER_PASS, role: 'viewer' },
    })
    const res  = await usersPost(req)
    const data = await res.json()
    expect(res.status).toBe(201)
    expect(data.role).toBe('viewer')
  })

  it('returns 409 for duplicate username', async () => {
    stubAdmin()
    const req = await makeReq('/api/auth/users', {
      method: 'POST',
      body: { username: TEST_ADMIN_USER.toUpperCase(), password: TEST_VIEWER_PASS, role: 'viewer' },
    })
    expect((await usersPost(req)).status).toBe(409)
  })

  it('returns 400 for short password', async () => {
    stubAdmin()
    const req = await makeReq('/api/auth/users', {
      method: 'POST',
      body: { username: 'newuser', password: 'short', role: 'viewer' },
    })
    expect((await usersPost(req)).status).toBe(400)
  })
})

describe('DELETE /api/auth/users/[id]', () => {
  it('deletes an existing user (200)', async () => {
    stubAdmin()
    const viewer = listUsers().find(u => u.username === 'test_viewer')!
    const req = await makeReq(`/api/auth/users/${viewer.id}`, { method: 'DELETE' })
    const res = await userDelete(req, { params: Promise.resolve({ id: String(viewer.id) }) })
    expect(res.status).toBe(200)
  })

  it('returns 400 when deleting own account', async () => {
    stubAdmin()
    const req = await makeReq('/api/auth/users/1', { method: 'DELETE' })
    const res = await userDelete(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 404 for non-existent user', async () => {
    stubAdmin()
    const req = await makeReq('/api/auth/users/99999', { method: 'DELETE' })
    const res = await userDelete(req, { params: Promise.resolve({ id: '99999' }) })
    expect(res.status).toBe(404)
  })
})

describe('PUT /api/auth/users/[id]', () => {
  it('promotes a viewer to admin (200)', async () => {
    // Create a temp user to update
    stubAdmin()
    const createReq = await makeReq('/api/auth/users', {
      method: 'POST',
      body: { username: 'test_toupdate', password: TEST_VIEWER_PASS, role: 'viewer' },
    })
    const created = await (await usersPost(createReq)).json()

    stubAdmin()
    const req  = await makeReq(`/api/auth/users/${created.id}`, {
      method: 'PUT',
      body:   { role: 'admin' },
    })
    const res  = await userPut(req, { params: Promise.resolve({ id: String(created.id) }) })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.role).toBe('admin')
  })

  it('rejects invalid role value (400)', async () => {
    stubAdmin()
    const req = await makeReq('/api/auth/users/1', {
      method: 'PUT',
      body:   { role: 'superuser' },
    })
    const res = await userPut(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(400)
  })
})

describe('Rate limiting — POST /api/auth/login', () => {
  /** Build a login request for a given username and password. */
  function loginReq(username: string, password: string): NextRequest {
    return new NextRequest('http://localhost/api/auth/login', {
      method:  'POST',
      headers: new Headers({ 'content-type': 'application/json' }),
      body:    JSON.stringify({ username, password }),
    })
  }

  it('returns X-RateLimit headers on allowed requests', async () => {
    const res = await loginPost(loginReq(TEST_ADMIN_USER, TEST_ADMIN_PASS))
    expect(res.status).toBe(200)
    expect(res.headers.get('x-ratelimit-limit')).toBe('10')
    expect(res.headers.get('x-ratelimit-remaining')).toBeDefined()
    expect(res.headers.get('x-ratelimit-reset')).toBeDefined()
  })

  it('returns 429 after exceeding 10 attempts against the same username', async () => {
    // Exhaust the 10-attempt window with wrong passwords for 'ratelimituser'
    for (let i = 0; i < 10; i++) {
      await loginPost(loginReq('ratelimituser', WRONG_PASS))
    }
    // 11th attempt must be rate-limited
    const res  = await loginPost(loginReq('ratelimituser', WRONG_PASS))
    const data = await res.json()
    expect(res.status).toBe(429)
    expect(data.error).toMatch(/too many/i)
    expect(res.headers.get('retry-after')).toBeDefined()
    expect(res.headers.get('x-ratelimit-remaining')).toBe('0')
  })

  it('does not share rate-limit state between different usernames', async () => {
    // Exhaust the limit for one username
    for (let i = 0; i < 10; i++) {
      await loginPost(loginReq('usera', WRONG_PASS))
    }
    // A different username must still be allowed (will get 401 invalid creds, not 429)
    const res = await loginPost(loginReq(TEST_ADMIN_USER, TEST_ADMIN_PASS))
    expect(res.status).toBe(200)
  })
})
