import Database from 'better-sqlite3-multiple-ciphers'
import { mkdirSync, existsSync } from 'fs'
import path from 'path'

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db

  // Read at call time so tests can set process.env.SECURITY_DIR / DB_KEY before first use
  const DB_DIR  = process.env.SECURITY_DIR || '/app/data/security'
  const DB_PATH = path.join(DB_DIR, 'homeforge.db')
  const DB_KEY  = process.env.DB_KEY

  if (!DB_KEY) {
    throw new Error('DB_KEY is not set. Ensure start.sh ran bootstrap.js before starting the server.')
  }

  if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true, mode: 0o700 })

  _db = new Database(DB_PATH, { fileMustExist: false })

  // Apply the SQLCipher encryption key immediately after opening.
  // Raw 256-bit hex key — SQLCipher uses it directly without PBKDF2 stretching.
  _db.pragma(`key = "x'${DB_KEY}'"`)

  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL CHECK(role IN ('admin', 'viewer')) DEFAULT 'viewer',
      created_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS app_state (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS metrics_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      cpu         REAL,
      memory      REAL,
      gpu         REAL,
      disk        REAL,
      net_down    REAL,
      net_up      REAL
    );

    CREATE TABLE IF NOT EXISTS backup_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      filename    TEXT NOT NULL,
      size_bytes  INTEGER NOT NULL,
      status      TEXT NOT NULL CHECK(status IN ('success', 'failed', 'restored'))
    );

    -- Keep only last 24h of metrics (auto-cleanup on each read)
    -- Run periodically via index check

    INSERT OR IGNORE INTO app_state(key, value) VALUES ('setup_complete', '0');
  `)

  return _db
}

/**
 * Re-encrypt the open database with a new key.
 * Called during /setup after the entropy key is stored so the database
 * transitions from the pre-setup UUID-derived key to the entropy-derived key.
 * Safe to call on an already-open connection — SQLCipher re-encrypts in place.
 */
export function rekeyDatabase(newKey: string): void {
  const db = getDb()
  // SQLCipher's PRAGMA rekey is not supported in WAL journal mode.
  // Temporarily switch to DELETE mode, rekey, then restore WAL.
  db.pragma('journal_mode = DELETE')
  db.pragma(`rekey = "x'${newKey}'"`)
  db.pragma('journal_mode = WAL')
  // Keep process.env in sync so any subsequent getDb() call (after _db reset)
  // opens with the correct key.
  process.env.DB_KEY = newKey
}
