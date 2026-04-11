import { runBackupJob } from './snapshot'
import { getDb } from './db'

export function startScheduler() {
  // Daily backup at 3 AM
  setInterval(() => {
    const now = new Date()
    if (now.getHours() === 3 && now.getMinutes() === 0) {
      const jobId = Math.random().toString(36).substring(2, 15)
      const services = ['dashboard', 'jellyfin', 'nextcloud', 'mariadb', 'matrix', 'vaultwarden']
      const db = getDb()
      
      db.prepare(`
        INSERT INTO backup_history (job_id, services, archive_path, archive_size, checksum, iv, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(jobId, JSON.stringify(services), '', 0, '', '', 'in_progress')
      
      runBackupJob(jobId, services).catch(e => {
        console.error('Scheduled backup failed:', e)
        db.prepare('UPDATE backup_history SET status = ?, error = ? WHERE job_id = ?')
          .run('failed', String(e), jobId)
      })
    }
  }, 60 * 1000)
}
