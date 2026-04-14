import { getDb } from './index'
import argon2 from 'argon2'

export interface User {
  id:            number
  username:      string
  password_hash: string
  role:          'admin' | 'viewer'
  totp_secret:   string | null
  totp_enabled:  boolean
  created_at:    number
}

export interface PublicUser {
  id:            number
  username:      string
  role:          'admin' | 'viewer'
  totp_secret:   string | null
  totp_enabled:  boolean
  created_at:    number
}

const ARGON2_OPTIONS: argon2.Options = {
  type:        argon2.argon2id,
  memoryCost:  65536,  // 64 MiB
  timeCost:    3,
  parallelism: 4,
}

export async function createUser(
  username: string,
  password: string,
  role: 'admin' | 'viewer' = 'viewer',
  totpSecret?: string
): Promise<PublicUser> {
  const hash = await argon2.hash(password, ARGON2_OPTIONS)
  const db   = getDb()
  const info = db
    .prepare('INSERT INTO users (username, password_hash, role, totp_secret) VALUES (?, ?, ?, ?)')
    .run(username, hash, role, totpSecret ?? null)
  return getUserById(info.lastInsertRowid as number)!
}

export async function verifyUser(
  username: string,
  password: string
): Promise<PublicUser | null> {
  const db   = getDb()
  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username) as User | undefined
  if (!user) return null
  const valid = await argon2.verify(user.password_hash, password)
  if (!valid) return null
  return { id: user.id, username: user.username, role: user.role, totp_secret: user.totp_secret, totp_enabled: !!user.totp_enabled, created_at: user.created_at }
}

export function getUserById(id: number): PublicUser | null {
  const db   = getDb()
  const user = db
    .prepare('SELECT id, username, role, totp_secret, totp_enabled, created_at FROM users WHERE id = ?')
    .get(id) as PublicUser | undefined
  return user ? { ...user, totp_enabled: !!user.totp_enabled } : null
}

export function listUsers(): PublicUser[] {
  return getDb()
    .prepare('SELECT id, username, role, totp_secret, totp_enabled, created_at FROM users ORDER BY created_at ASC')
    .all() as PublicUser[]
}

export function deleteUser(id: number): boolean {
  const info = getDb().prepare('DELETE FROM users WHERE id = ?').run(id)
  return info.changes > 0
}

export function updateUserRole(id: number, role: 'admin' | 'viewer'): PublicUser | null {
  getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id)
  return getUserById(id)
}

export function isSetupComplete(): boolean {
  const row = getDb()
    .prepare("SELECT value FROM app_state WHERE key = 'setup_complete'")
    .get() as { value: string } | undefined
  return row?.value === '1'
}

export function markSetupComplete(): void {
  getDb()
    .prepare("UPDATE app_state SET value = '1' WHERE key = 'setup_complete'")
    .run()
}
