import express from 'express'
import fs from 'fs'
import path from 'path'
import { getDb } from './db'
import { getInternalToken } from './crypto'
import { runBackupJob } from './snapshot'
import { runRestoreJob } from './restore'
import { startScheduler } from './scheduler'

const app = express()
const PORT = process.env.BACKUP_PORT || 3070
const INTERNAL_TOKEN = getInternalToken()

app.use(express.json())

app.use((req, res, next) => {
  const auth = req.headers.authorization
  if (!auth || auth !== `Bearer ${INTERNAL_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
})

app.get('/health', (req, res) => {
  res.json({ ok: true })
})

app.get('/backups', (req, res) => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM backup_history ORDER BY created_at DESC').all()
  res.json(rows)
})

app.post('/backups', (req, res) => {
  const { services, includeMedia } = req.body
  if (!Array.isArray(services)) {
    return res.status(400).json({ error: 'Invalid services array' })
  }
  
  const jobId = Math.random().toString(36).substring(2, 15)
  const db = getDb()
  
  db.prepare(`
    INSERT INTO backup_history (job_id, services, archive_path, archive_size, checksum, iv, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(jobId, JSON.stringify(services), '', 0, '', '', 'in_progress')

  // Run async
  runBackupJob(jobId, services, !!includeMedia).catch(e => {
    console.error('Backup failed:', e)
    db.prepare('UPDATE backup_history SET status = ?, error = ? WHERE job_id = ?')
      .run('failed', String(e), jobId)
  })

  res.json({ jobId })
})

app.get('/backups/:jobId', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM backup_history WHERE job_id = ?').get(req.params.jobId)
  if (!row) return res.status(404).json({ error: 'Job not found' })
  res.json(row)
})

app.delete('/backups/:jobId', (req, res) => {
  const { jobId } = req.params
  const db = getDb()
  const row = db.prepare('SELECT * FROM backup_history WHERE job_id = ?').get(jobId) as any
  
  if (!row) return res.status(404).json({ error: 'Backup not found' })

  // Delete the physical file only if it exists and is valid
  if (row.archive_path && typeof row.archive_path === 'string' && row.archive_path.trim() !== '') {
    const archivePath = path.join(process.env.SNAPSHOT_DIR || '/backups', row.archive_path)
    try {
      if (fs.existsSync(archivePath) && fs.lstatSync(archivePath).isFile()) {
        fs.unlinkSync(archivePath)
      }
    } catch (e) {
      console.warn(`Failed to delete file ${archivePath}: ${e}`)
    }
  }

  // Always delete from DB to clean up the UI
  db.prepare('DELETE FROM backup_history WHERE job_id = ?').run(jobId)
  
  res.json({ success: true })
})

app.post('/restore', (req, res) => {
  const { jobId, services } = req.body
  if (!jobId || !Array.isArray(services)) {
    return res.status(400).json({ error: 'Invalid request' })
  }
  
  const db = getDb()
  const row = db.prepare('SELECT * FROM backup_history WHERE job_id = ?').get(jobId) as any
  if (!row) return res.status(404).json({ error: 'Backup not found' })

  // Log restore intent
  const restoreInfo = db.prepare(`
    INSERT INTO restore_log (job_id, services, status)
    VALUES (?, ?, ?)
  `).run(jobId, JSON.stringify(services), 'in_progress')

  // Run async
  runRestoreJob(jobId, row, services, restoreInfo.lastInsertRowid as number).catch(e => {
    console.error('Restore failed:', e)
    db.prepare('UPDATE restore_log SET status = ?, error = ? WHERE id = ?')
      .run('failed', String(e), restoreInfo.lastInsertRowid)
  })

  res.json({ restoreId: restoreInfo.lastInsertRowid })
})

app.get('/restore/:restoreId', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM restore_log WHERE id = ?').get(req.params.restoreId)
  if (!row) return res.status(404).json({ error: 'Restore not found' })
  res.json(row)
})

startScheduler()

app.listen(PORT, () => {
  console.log(`Backup sidecar internal API listening on ${PORT}`)
})