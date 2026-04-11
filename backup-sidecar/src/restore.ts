import { stopContainer, startContainer } from './docker'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { decryptArchiveStream } from './crypto'
import { getDb } from './db'
import crypto from 'crypto'

const containerMap: Record<string, string> = {
  dashboard: 'project-s-dashboard',
  jellyfin: 'project-s-jellyfin',
  nextcloud: 'project-s-nextcloud',
  mariadb: 'project-s-nextcloud-db',
  matrix: 'project-s-matrix-server',
  vaultwarden: 'project-s-vaultwarden'
}

export async function runRestoreJob(jobId: string, backupRow: any, services: string[], restoreId: number) {
  const backupsDir = process.env.SNAPSHOT_DIR || '/backups'
  const encPath = path.join(backupsDir, backupRow.archive_path)
  
  if (!fs.existsSync(encPath)) throw new Error('Archive not found')
  
  // Verify checksum via streams
  const hash = crypto.createHash('sha256')
  const readStream = fs.createReadStream(encPath)
  
  await new Promise<void>((resolve, reject) => {
    readStream.on('data', chunk => hash.update(chunk))
    readStream.on('end', () => resolve())
    readStream.on('error', reject)
  })
  
  const currentChecksum = hash.digest('hex')
  
  if (currentChecksum !== backupRow.checksum) {
    throw new Error('Checksum mismatch')
  }
  
  const tarPath = `/tmp/restore-${jobId}.tar.gz`
  await decryptArchiveStream(encPath, tarPath, backupRow.iv)
  
  const stagingDir = `/tmp/restore-staging-${jobId}`
  fs.mkdirSync(stagingDir, { recursive: true })
  execSync(`tar -xzf ${tarPath} -C ${stagingDir}`)
  
  for (const service of services) {
    const containerName = containerMap[service] || `project-s-${service}`
    const snapshotPath = `/snapshots/${service}`
    const serviceStaging = path.join(stagingDir, service)
    
    if (!fs.existsSync(serviceStaging)) continue // Not in this backup
    
    stopContainer(containerName)
    try {
      execSync(`rm -rf ${snapshotPath}/*`, { stdio: 'ignore' })
      execSync(`cp -a ${serviceStaging}/. ${snapshotPath}/`, { stdio: 'ignore' })
    } finally {
      startContainer(containerName)
    }
  }
  
  fs.unlinkSync(tarPath)
  fs.rmSync(stagingDir, { recursive: true, force: true })
  
  const db = getDb()
  db.prepare('UPDATE restore_log SET status = ? WHERE id = ?').run('success', restoreId)
  db.prepare('UPDATE backup_history SET status = ? WHERE job_id = ?').run('restored', jobId)
}
