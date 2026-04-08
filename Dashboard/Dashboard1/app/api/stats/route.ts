import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { requireSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

const execAsync = promisify(exec)

// Function to get directory size in bytes
async function getDirSize(dirPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`du -sk "${dirPath}"`)
    return parseInt(stdout.split('\t')[0]) * 1024
  } catch {
    return 0
  }
}

// Dynamic storage scan — all subdirectories under /data
async function scanStorage(dataRoot: string): Promise<{ name: string; value: number }[]> {
  try {
    const entries = fs.readdirSync(dataRoot, { withFileTypes: true })
    const dirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.'))
    const results = await Promise.all(
      dirs.map(async (dir) => {
        const size = await getDirSize(path.join(dataRoot, dir.name))
        return { name: dir.name, value: size }
      })
    )
    return results.filter(s => s.value > 0)
  } catch {
    return []
  }
}

// GPU detection via nvidia-smi — silent fail if absent
async function readGpu(): Promise<{ load: number; temp: number } | null> {
  try {
    const { stdout } = await execAsync(
      'nvidia-smi --query-gpu=utilization.gpu,temperature.gpu --format=csv,noheader,nounits',
      { timeout: 5000 }
    )
    const [load, temp] = stdout.trim().split(',').map(Number)
    if (!isNaN(load) && !isNaN(temp)) return { load, temp }
  } catch { /* no GPU — silent fail */ }
  return null
}

// Temperature detection via /sys/class/thermal — Linux only
async function readTemps(gpuTemp: number | null): Promise<{ cpu: number | null; gpu: number | null; sys: number | null }> {
  const result: { cpu: number | null; gpu: number | null; sys: number | null } = {
    cpu: null,
    gpu: gpuTemp,
    sys: null,
  }

  try {
    const zones = fs.readdirSync('/sys/class/thermal').filter(f => f.startsWith('thermal_zone'))
    const readings = zones.map(zone => {
      try {
        const temp = parseInt(fs.readFileSync(`/sys/class/thermal/${zone}/temp`, 'utf-8').trim()) / 1000
        const type = fs.readFileSync(`/sys/class/thermal/${zone}/type`, 'utf-8').trim()
        return { type, temp }
      } catch {
        return null
      }
    }).filter(Boolean) as { type: string; temp: number }[]

    const cpuZones = readings.filter(r => r.type.toLowerCase().includes('cpu') || r.type.toLowerCase().includes('x86'))
    const cpuReading = cpuZones.length > 0 ? cpuZones.sort((a, b) => b.temp - a.temp)[0] : readings.sort((a, b) => b.temp - a.temp)[0]
    result.cpu = cpuReading?.temp ?? null
    result.sys = readings.length > 0 ? Math.max(...readings.map(r => r.temp)) : null
  } catch { /* /sys/class/thermal not available — silent fail */ }

  return result
}

// Disk usage % for root filesystem — Linux only
async function readDiskUsage(): Promise<number | null> {
  try {
    const { stdout } = await execAsync("df -h / | awk 'NR==2 {print $5}' | tr -d '%'", { timeout: 3000 })
    const perc = parseInt(stdout.trim())
    return isNaN(perc) ? null : perc
  } catch { return null }
}

// System uptime in days — Linux only
async function readUptime(): Promise<number | null> {
  try {
    const raw = fs.readFileSync('/proc/uptime', 'utf-8').trim()
    const seconds = parseFloat(raw.split(' ')[0])
    return Math.floor(seconds / 86400)
  } catch { return null }
}

// Container health via docker ps -a — includes exited/unhealthy containers
async function readContainerHealth(projectContainers: any[]): Promise<any[]> {
  try {
    const { stdout } = await execAsync(
      `docker ps -a --filter "name=project-s-" --format "{{.Names}}\\t{{.Status}}"`,
      { timeout: 5000 }
    )
    const lines = stdout.trim().split('\n').filter(Boolean)
    const healthMap = new Map<string, string>()

    for (const line of lines) {
      const parts = line.split('\t')
      if (parts.length >= 2) {
        healthMap.set(parts[0], parts[1])
      }
    }

    return projectContainers.map((c: any) => {
      const rawStatus = healthMap.get(c.Name) || 'Up'
      const statusLower = rawStatus.toLowerCase()

      // Determine display status from raw docker status string
      let displayStatus = 'running'
      if (statusLower.includes('unhealthy')) displayStatus = 'unhealthy'
      else if (statusLower.includes('restarting')) displayStatus = 'restarting'
      else if (statusLower.includes('exited')) displayStatus = 'exited'
      else if (statusLower.includes('dead')) displayStatus = 'dead'
      else if (statusLower.includes('paused')) displayStatus = 'paused'

      return {
        name: c.Name.replace('project-s-', ''),
        status: displayStatus,
        cpu: c.CPUPerc,
        mem: c.MemUsage,
      }
    })
  } catch {
    // Fallback: all containers running
    return projectContainers.map((c: any) => ({
      name: c.Name.replace('project-s-', ''),
      status: 'running',
      cpu: c.CPUPerc,
      mem: c.MemUsage,
    }))
  }
}

export async function GET() {
  await requireSession()
  try {
    // 1. Get Docker Stats
    const { stdout } = await execAsync("docker stats --no-stream --format '{{json .}}'")
    const lines = stdout.trim().split('\n')
    const containers = lines.filter(l => l.trim()).map(line => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    }).filter(Boolean)
    const projectContainers = containers.filter(c => c.Name.includes('project-s'))

    // 2. Get Storage Stats — dynamic scan of all /data subdirectories
    const dataRoot = '/data'
    const storageStats = await scanStorage(dataRoot)

    // 3. Read GPU data (nvidia-smi if available)
    const gpuData = await readGpu()

    // 4. Read temperatures
    const temps = await readTemps(gpuData?.temp ?? null)

    // 5. Read disk usage % and uptime
    const [diskPerc, uptimeDays] = await Promise.all([readDiskUsage(), readUptime()])

    let totalCpu = 0
    let totalMemPerc = 0
    let totalMemBytes = 0
    let totalNetIO = { up: 0, down: 0 }

    projectContainers.forEach(c => {
      totalCpu += parseFloat(c.CPUPerc.replace('%', ''))
      totalMemPerc += parseFloat(c.MemPerc.replace('%', ''))

      const memUsage = c.MemUsage.split(' / ')[0]
      if (memUsage.includes('GiB')) totalMemBytes += parseFloat(memUsage) * 1024 * 1024 * 1024
      else if (memUsage.includes('MiB')) totalMemBytes += parseFloat(memUsage) * 1024 * 1024
      else if (memUsage.includes('KiB')) totalMemBytes += parseFloat(memUsage) * 1024
      else totalMemBytes += parseFloat(memUsage)

      const netParts = c.NetIO.split(' / ')
      const parseNet = (val: string) => {
        if (val.includes('GB')) return parseFloat(val) * 1024 * 1024 * 1024
        if (val.includes('MB')) return parseFloat(val) * 1024 * 1024
        if (val.includes('kB')) return parseFloat(val) * 1024
        return parseFloat(val)
      }
      totalNetIO.down += parseNet(netParts[0])
      totalNetIO.up += parseNet(netParts[1])
    })

    const cpuVal = totalCpu
    const memPercVal = totalMemPerc
    const memBytesVal = totalMemBytes / (1024 * 1024 * 1024)
    const netDownVal = totalNetIO.down / (1024 * 1024)
    const netUpVal = totalNetIO.up / (1024 * 1024)

    // Get container health status
    const containersWithHealth = await readContainerHealth(projectContainers)

    const result = {
      cpu: cpuVal.toFixed(1),
      memPerc: memPercVal.toFixed(1),
      memBytes: memBytesVal.toFixed(2),
      netDown: netDownVal.toFixed(1),
      netUp: netUpVal.toFixed(1),
      storage: storageStats.map(s => ({
        name: s.name.charAt(0).toUpperCase() + s.name.slice(1),
        size: (s.value / (1024 * 1024)).toFixed(1),
        bytes: s.value
      })),
      topContainers: [...containersWithHealth]
        .sort((a, b) => parseFloat(b.cpu) - parseFloat(a.cpu))
        .slice(0, 5),
      containers: containersWithHealth,
      gpu: gpuData ? { load: gpuData.load, temp: gpuData.temp } : null,
      temps,
      diskUsedPerc: diskPerc,
      uptimeDays,
    }

    // Write to SQLite history (every poll)
    try {
      const db = getDb()
      db.exec('DELETE FROM metrics_history WHERE created_at < unixepoch() - 86400') // TTL 24h
      db.prepare(
        'INSERT INTO metrics_history (cpu, memory, gpu, disk, net_down, net_up) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(
        cpuVal,
        memPercVal,
        gpuData?.load ?? 0,
        diskPerc ?? 0,
        totalNetIO.down,
        totalNetIO.up,
      )
    } catch (err) {
      console.error('Failed to write metrics history:', err)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Stats API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch container stats' }, { status: 500 })
  }
}
