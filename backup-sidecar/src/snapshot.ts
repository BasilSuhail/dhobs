import { pauseContainer, unpauseContainer } from './docker'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { encryptArchiveStream } from './crypto'
import { getDb } from './db'

const containerMap: Record<string, string> = {
  dashboard: 'project-s-dashboard',
  jellyfin: 'project-s-jellyfin',
  nextcloud: 'project-s-nextcloud',
  mariadb: 'project-s-nextcloud-db',
  matrix: 'project-s-matrix-server',
  vaultwarden: 'project-s-vaultwarden'
}

export async function runBackupJob(jobId: string, services: string[], includeMedia: boolean = false) {
  const backupsDir = process.env.SNAPSHOT_DIR || '/backups'
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true })
  
  const stagingDir = `/tmp/staging-${jobId}`
  fs.mkdirSync(stagingDir, { recursive: true })
  
  const backupServices = [...services]
  if (includeMedia) backupServices.push('media')

  for (const service of backupServices) {
    const containerName = containerMap[service] || `project-s-${service}`
    const snapshotPath = `/snapshots/${service}`
    const serviceStaging = path.join(stagingDir, service)
    
    if (!fs.existsSync(snapshotPath)) continue
    
    fs.mkdirSync(serviceStaging, { recursive: true })
    
    if (service === 'mariadb') {
      try {
        execSync(`docker exec project-s-nextcloud-db sh -c 'exec mysqldump --all-databases -uroot -p"$MYSQL_ROOT_PASSWORD" > /var/lib/mysql/dump.sql'`, { stdio: 'ignore' })
      } catch (e) { console.warn('mysqldump failed', e) }
    }
    
    const startPause = Date.now()
    if (service !== 'media') pauseContainer(containerName)
    
    try {
      execSync(`cp -a ${snapshotPath}/. ${serviceStaging}/`, { stdio: 'ignore' })
    } finally {
      if (service !== 'media') unpauseContainer(containerName)
      const duration = Date.now() - startPause
      if (service !== 'media') console.log(`Paused ${containerName} for ${duration}ms`)
    }
  }

  const tarPath = `/tmp/backup-${jobId}.tar.gz`
  const encPath = path.join(backupsDir, `backup-${jobId}.enc`)
  
  execSync(`tar -czf ${tarPath} -C ${stagingDir} .`)
  
  const { ivHex, checksum } = await encryptArchiveStream(tarPath, encPath)
  
  const size = fs.statSync(encPath).size
  
  fs.unlinkSync(tarPath)
  fs.rmSync(stagingDir, { recursive: true, force: true })
  
  const db = getDb()
  db.prepare(`
    UPDATE backup_history 
    SET status = 'success', archive_path = ?, archive_size = ?, checksum = ?, iv = ? 
    WHERE job_id = ?
  `).run(`backup-${jobId}.enc`, size, checksum, ivHex, jobId)
}
