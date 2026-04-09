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

// Per-disk breakdown — df output for real filesystems
async function readDiskBreakdown(): Promise<Array<{ mount: string; total: string; used: string; avail: string; usePerc: number; device: string }>> {
  try {
    const { stdout } = await execAsync(
      "df -h --output=source,size,used,avail,pcent,target | grep -v -E 'tmpfs|devtmpfs|overlay|udev|shm' | tail -n +2",
      { timeout: 3000 }
    )
    const lines = stdout.trim().split('\n').filter(Boolean)
    return lines.map(line => {
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 6) {
        return {
          device: parts[0],
          total: parts[1],
          used: parts[2],
          avail: parts[3],
          usePerc: parseInt(parts[4]) || 0,
          mount: parts[5],
        }
      }
      return null
    }).filter(Boolean) as Array<{ mount: string; total: string; used: string; avail: string; usePerc: number; device: string }>
  } catch { return [] }
}

// SMART disk health — requires smartctl
async function readSmartHealth(): Promise<Array<{ device: string; model: string; temperature: number | null; powerOnHours: number | null; health: string; reallocated: number | null }>> {
  try {
    // First check if smartctl is available
    await execAsync('which smartctl', { timeout: 2000 })
  } catch { return [] } // smartctl not installed

  try {
    // Scan for devices
    const { stdout: scanOut } = await execAsync('smartctl --scan --json', { timeout: 5000 })
    const scanData = JSON.parse(scanOut)
    const devices = scanData.devices || []

    const results = []
    for (const dev of devices.slice(0, 10)) { // Limit to 10 devices
      try {
        const { stdout } = await execAsync(`smartctl --json --all ${dev.name}`, { timeout: 5000 })
        const data = JSON.parse(stdout)

        results.push({
          device: dev.name,
          model: data.model_name || dev.name,
          temperature: data.temperature?.current ?? null,
          powerOnHours: data.power_on_time?.hours ?? data.power_cycle_count ?? null,
          health: data.smart_status?.passed ? 'OK' : data.smart_status?.output || 'Unknown',
          reallocated: data.vendor_attributes?.['5']?.raw?.value ?? data.vendor_attributes?.['5']?.raw?.string ?? null,
        })
      } catch { /* skip devices that fail */ }
    }
    return results
  } catch { return [] }
}

// Power consumption — via Intel RAPL or powercap
async function readPower(): Promise<{ watts: number | null; kwhEstimate: number | null }> {
  try {
    // Intel RAPL (most common on Intel CPUs)
    const energyFile = '/sys/class/powercap/intel-rapl/intel-rapl:0/energy_uj'
    if (fs.existsSync(energyFile)) {
      const energyUj = parseInt(fs.readFileSync(energyFile, 'utf-8').trim())
      const maxPowerFile = '/sys/class/powercap/intel-rapl/intel-rapl:0/max_energy_range_uj'
      const maxEnergy = fs.existsSync(maxPowerFile) ? parseInt(fs.readFileSync(maxPowerFile, 'utf-8').trim()) : 0
      // This gives cumulative energy, not instantaneous watts
      // For a rough watts estimate, we'd need two readings — skip for now
      return { watts: null, kwhEstimate: energyUj / 3.6e9 } // microjoules to kWh
    }
  } catch { /* not available */ }
  return { watts: null, kwhEstimate: null }
}

// Backup status — checks common backup locations for last successful run
async function readBackupStatus(): Promise<{ lastRun: number | null; lastRunAgo: string | null; success: boolean | null; size: string | null }> {
  try {
    // Check common backup locations under /data
    const backupDirs = ['backups', 'backup', '.backups']
    for (const dir of backupDirs) {
      const backupPath = `/data/${dir}`
      if (fs.existsSync(backupPath)) {
        const entries = fs.readdirSync(backupPath, { withFileTypes: true })
        // Look for recent files/dirs that indicate a successful backup
        const backupFiles = entries
          .filter(e => e.isFile() || e.isDirectory())
          .map(e => {
            const stat = fs.statSync(`${backupPath}/${e.name}`)
            return { name: e.name, mtime: stat.mtimeMs, size: stat.size }
          })
          .sort((a, b) => b.mtime - a.mtime)

        if (backupFiles.length > 0) {
          const last = backupFiles[0]
          const hoursAgo = Math.floor((Date.now() - last.mtime) / (1000 * 60 * 60))
          const ago = hoursAgo < 1 ? 'Just now' : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.floor(hoursAgo / 24)}d ago`
          const size = last.size >= 1024 ** 3 ? `${(last.size / 1024 ** 3).toFixed(1)} GB` : `${(last.size / 1024 ** 2).toFixed(0)} MB`
          return { lastRun: Math.floor(last.mtime / 1000), lastRunAgo: ago, success: true, size }
        }
        return { lastRun: null, lastRunAgo: null, success: null, size: null }
      }
    }
  } catch { /* no backup dir found */ }
  return { lastRun: null, lastRunAgo: null, success: null, size: null }
}

// UPS status — via apcupsd or /proc/acpi
async function readUPSStatus(): Promise<{ batteryPerc: number | null; loadPerc: number | null; runtimeMin: number | null; status: string | null }> {
  try {
    // Try apcaccess first (APC UPS)
    const { stdout } = await execAsync('apcaccess status 2>/dev/null | grep -E "^(BCHARGE|LOADPCT|TIMELEFT|STATUS):"', { timeout: 3000 })
    const lines = stdout.trim().split('\n')
    const data: Record<string, string> = {}
    for (const line of lines) {
      const [key, ...rest] = line.split(':')
      if (key && rest) data[key.trim()] = rest.join(':').trim()
    }

    if (Object.keys(data).length > 0) {
      const batteryPerc = data.BCHARGE ? parseFloat(data.BCHARGE) : null
      const loadPerc = data.LOADPCT ? parseFloat(data.LOADPCT) : null
      const runtimeMin = data.TIMELEFT ? parseFloat(data.TIMELEFT) : null
      const status = data.STATUS || null
      return { batteryPerc, loadPerc, runtimeMin, status }
    }
  } catch { /* apcaccess not available */ }

  // Try NUT (Network UPS Tools)
  try {
    const { stdout } = await execAsync('upsc ups@localhost 2>/dev/null | grep -E "^(battery\\.charge|ups\\.load|battery\\.runtime|ups\\.status):"', { timeout: 3000 })
    const lines = stdout.trim().split('\n')
    const data: Record<string, string> = {}
    for (const line of lines) {
      const [key, value] = line.split(':')
      if (key && value) data[key.trim()] = value.trim()
    }

    if (Object.keys(data).length > 0) {
      return {
        batteryPerc: data['battery.charge'] ? parseFloat(data['battery.charge']) : null,
        loadPerc: data['ups.load'] ? parseFloat(data['ups.load']) : null,
        runtimeMin: data['battery.runtime'] ? parseFloat(data['battery.runtime']) / 60 : null,
        status: data['ups.status'] || null,
      }
    }
  } catch { /* NUT not available */ }

  return { batteryPerc: null, loadPerc: null, runtimeMin: null, status: null }
}

// Swap usage — Linux only
async function readSwap(): Promise<{ total: number; used: number; perc: number } | null> {
  try {
    const raw = fs.readFileSync('/proc/meminfo', 'utf-8')
    const parse = (key: string) => {
      const line = raw.split('\n').find(l => l.startsWith(key))
      return line ? parseInt(line.split(/\s+/)[1]) * 1024 : 0 // kB → bytes
    }
    const total = parse('SwapTotal')
    if (total === 0) return null // no swap configured
    const free = parse('SwapFree')
    const used = total - free
    return { total, used, perc: total > 0 ? ((used / total) * 100) : 0 }
  } catch { return null }
}

// System load averages — Linux only
async function readLoadAverages(): Promise<{ load1: number; load5: number; load15: number } | null> {
  try {
    const raw = fs.readFileSync('/proc/loadavg', 'utf-8').trim()
    const [load1, load5, load15] = raw.split(/\s+/).slice(0, 3).map(Number)
    return { load1, load5, load15 }
  } catch { return null }
}

// Network errors/dropped packets — Linux only
async function readNetErrors(): Promise<{ rxErrors: number; txErrors: number; rxDropped: number; txDropped: number } | null> {
  try {
    const lines = fs.readFileSync('/proc/net/dev', 'utf-8').trim().split('\n').slice(2)
    let rxErrors = 0, txErrors = 0, rxDropped = 0, txDropped = 0
    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      const iface = parts[0].replace(':', '')
      // Skip virtual interfaces
      if (['lo', 'docker0', 'br-1'].some(p => iface.startsWith(p)) || iface.startsWith('veth')) continue
      // Format: face |rx bytes packets errs drop fifo frame compressed multicast|tx bytes packets errs drop fifo colls carrier compressed
      rxDropped += parseInt(parts[4]) || 0
      rxErrors += parseInt(parts[3]) || 0
      txDropped += parseInt(parts[12]) || 0
      txErrors += parseInt(parts[11]) || 0
    }
    return { rxErrors, txErrors, rxDropped, txDropped }
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
    const [diskPerc, uptimeDays, swapData, loadAvg, netErrors, diskBreakdown, smartHealth, powerData, backupData, upsData] = await Promise.all([
      readDiskUsage(),
      readUptime(),
      readSwap(),
      readLoadAverages(),
      readNetErrors(),
      readDiskBreakdown(),
      readSmartHealth(),
      readPower(),
      readBackupStatus(),
      readUPSStatus(),
    ])

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
      swap: swapData ? { total: swapData.total, used: swapData.used, perc: swapData.perc } : null,
      loadAvg: loadAvg ? { load1: loadAvg.load1, load5: loadAvg.load5, load15: loadAvg.load15 } : null,
      netErrors: netErrors || null,
      disks: diskBreakdown,
      smart: smartHealth,
      power: powerData,
      backup: backupData,
      ups: upsData,
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
