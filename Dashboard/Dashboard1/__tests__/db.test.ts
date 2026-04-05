/**
 * Integration tests for lib/db — runs against a real in-memory/temp SQLite file.
 * Vitest uses Node environment so better-sqlite3 and argon2 load fine.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import os   from 'os'
import path from 'path'
import fs   from 'fs'

// Point the DB at a temp directory and set encryption key before any db modules are imported
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'homeforge-db-test-'))
process.env.SECURITY_DIR = tmpDir
process.env.DB_KEY        = 'd'.repeat(64)   // 32-byte test key as hex

// Imported synchronously — top-level await not needed since better-sqlite3 is sync
import { getDb }                from '@/lib/db/index'
import {
  createUser, verifyUser, getUserById, listUsers,
  deleteUser, updateUserRole,
  isSetupComplete, markSetupComplete,
} from '@/lib/db/users'

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true })
})

describe('Database schema', () => {
  it('creates users and app_state tables', () => {
    const db     = getDb()
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {name:string}[]
    const names  = tables.map(t => t.name)
    expect(names).toContain('users')
    expect(names).toContain('app_state')
  })
})

describe('Setup state', () => {
  it('starts as not complete', () => {
    expect(isSetupComplete()).toBe(false)
  })

  it('markSetupComplete() flips the flag', () => {
    markSetupComplete()
    expect(isSetupComplete()).toBe(true)
  })
})

describe('createUser', () => {
  it('creates an admin user and returns a PublicUser', async () => {
    const admin = await createUser('admin', 'PLACEHOLDER_TEST_PASS', 'admin')
    expect(admin.id).toBeGreaterThan(0)
    expect(admin.username).toBe('admin')
    expect(admin.role).toBe('admin')
    expect((admin as any).password_hash).toBeUndefined()
  })

  it('creates a viewer user', async () => {
    const viewer = await createUser('alice', 'ViewerPass456!', 'viewer')
    expect(viewer.role).toBe('viewer')
  })

  it('rejects duplicate username (COLLATE NOCASE)', async () => {
    await expect(createUser('ADMIN', 'Another123!', 'viewer')).rejects.toThrow(/UNIQUE/)
  })
})

describe('getUserById', () => {
  it('returns user without password_hash', () => {
    const users = listUsers()
    const user  = getUserById(users[0].id) as any
    expect(user).not.toBeNull()
    expect(user.password_hash).toBeUndefined()
  })

  it('returns null for non-existent id', () => {
    expect(getUserById(99999)).toBeNull()
  })
})

describe('listUsers', () => {
  it('returns all created users', () => {
    expect(listUsers().length).toBe(2)
  })
})

describe('verifyUser', () => {
  it('accepts correct password', async () => {
    const user = await verifyUser('admin', 'PLACEHOLDER_TEST_PASS')
    expect(user).not.toBeNull()
    expect(user!.username).toBe('admin')
  })

  it('rejects wrong password', async () => {
    expect(await verifyUser('admin', 'WrongPassword!')).toBeNull()
  })

  it('returns null for non-existent user', async () => {
    expect(await verifyUser('ghost', 'anything')).toBeNull()
  })
})

describe('updateUserRole', () => {
  it('promotes viewer to admin', () => {
    const users   = listUsers()
    const viewer  = users.find(u => u.role === 'viewer')!
    const updated = updateUserRole(viewer.id, 'admin')
    expect(updated?.role).toBe('admin')
  })

  it('returns null for non-existent id', () => {
    expect(updateUserRole(99999, 'admin')).toBeNull()
  })
})

describe('deleteUser', () => {
  it('removes a user and returns true', () => {
    const users  = listUsers()
    const target = users[users.length - 1]
    expect(deleteUser(target.id)).toBe(true)
    expect(getUserById(target.id)).toBeNull()
  })

  it('returns false for non-existent id', () => {
    expect(deleteUser(99999)).toBe(false)
  })
})
