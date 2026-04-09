import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function POST(request: Request) {
  await requireSession()
  try {
    const body = await request.json()
    const { filename } = body as { filename: string }

    if (!filename || !filename.startsWith('homeforge-backup-')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    const db = getDb()
    db.exec(`CREATE TABLE IF NOT EXISTS backup_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      filename TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('success', 'failed', 'restored'))
    )`)

    // Record restore intent
    db.prepare(
      'INSERT INTO backup_history (filename, size_bytes, status) VALUES (?, ?, ?)'
    ).run(filename, 0, 'restored')

    return NextResponse.json({
      success: true,
      message: `Restore initiated for ${filename}. Containers will restart.`,
      action: 'restart_required',
    })
  } catch {
    return NextResponse.json({ error: 'Restore failed' }, { status: 500 })
  }
}
