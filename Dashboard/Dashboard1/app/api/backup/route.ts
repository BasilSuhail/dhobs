import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { requireSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

const execAsync = promisify(exec)
const BACKUP_DIR = '/data/backups'

export async function GET() {
  await requireSession()
  try {
    // Ensure backup dir exists
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })

    // Scan for backup files
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('homeforge-backup-') && f.endsWith('.tar.gz'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f))
        return { filename: f, sizeBytes: stat.size, createdAt: Math.floor(stat.mtimeMs / 1000) }
      })
      .sort((a, b) => b.createdAt - a.createdAt)

    // Cross-reference with DB history
    const db = getDb()
    db.exec(`CREATE TABLE IF NOT EXISTS backup_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      filename TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('success', 'failed', 'restored'))
    )`)

    const history = db.prepare(
      'SELECT filename, status, created_at FROM backup_history ORDER BY id DESC LIMIT 20'
    ).all() as Array<{ filename: string; status: string; created_at: number }>

    // Merge: add status from DB to file list
    const statusMap = new Map<string, string>()
    for (const h of history) statusMap.set(h.filename, h.status)

    const result = files.map(f => ({
      filename: f.filename,
      sizeBytes: f.sizeBytes,
      createdAt: f.createdAt,
      status: statusMap.get(f.filename) || 'unknown',
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Backup list error:', error)
    return NextResponse.json({ error: 'Failed to list backups' }, { status: 500 })
  }
}

export async function POST() {
  await requireSession()
  const db = getDb()
  db.exec(`CREATE TABLE IF NOT EXISTS backup_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    filename TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('success', 'failed', 'restored'))
  )`)

  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `homeforge-backup-${timestamp}.tar.gz`
    const filepath = path.join(BACKUP_DIR, filename)

    // Check if tar is available
    try {
      await execAsync('which tar', { timeout: 2000 })
    } catch {
      throw new Error('tar command not found in container')
    }

    // Use absolute paths and simpler tar command
    // The container mounts /data from the host, so we tar from there
    const cmd = `cd / && tar -czf "${filepath}" --exclude='backups' --exclude='node_modules' --exclude='.git' --exclude='.next' --exclude='*.log' --exclude='tmp' data/`

    const { stdout, stderr } = await execAsync(cmd, { timeout: 300000, maxBuffer: 10 * 1024 * 1024 })
    if (stderr) console.error('Backup stderr:', stderr)
    if (stdout) console.log('Backup stdout:', stdout)

    // Verify the file was actually created
    if (!fs.existsSync(filepath)) {
      throw new Error(`Backup file was not created at ${filepath}`)
    }

    const stat = fs.statSync(filepath)
    const sizeBytes = stat.size

    // Sanity check: file should be at least 1KB
    if (sizeBytes < 1024) {
      throw new Error(`Backup file too small (${sizeBytes} bytes) — likely empty or failed`)
    }

    // Record in DB
    db.prepare(
      'INSERT INTO backup_history (filename, size_bytes, status) VALUES (?, ?, ?)'
    ).run(filename, sizeBytes, 'success')

    return NextResponse.json({ success: true, filename, sizeBytes })
  } catch (error) {
    console.error('Backup failed:', error)
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    db.prepare(
      'INSERT INTO backup_history (filename, size_bytes, status) VALUES (?, ?, ?)'
    ).run(`error-${Date.now()}`, 0, 'failed')

    return NextResponse.json({ error: `Backup failed: ${errMsg}` }, { status: 500 })
  }
}
