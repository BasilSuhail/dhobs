import Database from 'better-sqlite3-multiple-ciphers'
import fs from 'fs'
import path from 'path'
import { getBackupKeyHex } from './crypto'

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db

  const dataDir = process.env.DATA_DIR || '/app/data'
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 })
  }

  const dbPath = path.join(dataDir, 'backup.db')
  const keyHex = getBackupKeyHex()

  _db = new Database(dbPath)
  _db.pragma(`key = "x'${keyHex}'"`)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')

  _db.exec(`
    CREATE TABLE IF NOT EXISTS backup_history (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
      job_id        TEXT NOT NULL UNIQUE,
      services      TEXT NOT NULL,
      archive_path  TEXT NOT NULL,
      archive_size  INTEGER NOT NULL,
      checksum      TEXT NOT NULL,
      iv            TEXT NOT NULL,
      status        TEXT NOT NULL CHECK(status IN ('in_progress','success','failed','restored')),
      error         TEXT
    );

    CREATE TABLE IF NOT EXISTS restore_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
      job_id        TEXT NOT NULL,
      services      TEXT NOT NULL,
      status        TEXT NOT NULL CHECK(status IN ('in_progress','success','failed')),
      error         TEXT
    );
  `)

  return _db
}
