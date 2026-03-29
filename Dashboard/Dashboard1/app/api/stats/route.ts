import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

// Function to get directory size in bytes
async function getDirSize(dirPath: string): Promise<number> {
  try {
    // Inside the Alpine container, we use du -sk or du -sb
    const { stdout } = await execAsync(`du -sk "${dirPath}"`)
    return parseInt(stdout.split('\t')[0]) * 1024
  } catch (error) {
    return 0
  }
}

export async function GET() {
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
    
    // 2. Get Storage Stats (Mounted at /data in the container)
    const dataRoot = '/data'
    const storagePaths = ['jellyfin', 'nextcloud', 'matrix', 'media', 'vaultwarden']
    const storageStats = await Promise.all(
      storagePaths.map(async (folder) => {
        const size = await getDirSize(path.join(dataRoot, folder))
        return { name: folder, value: size }
      })
    )

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

    const result = {
      cpu: cpuVal.toFixed(1),
      memPerc: memPercVal.toFixed(1),
      memBytes: memBytesVal.toFixed(2),
      netDown: netDownVal.toFixed(1),
      netUp: netUpVal.toFixed(1),
      storage: storageStats.map(s => ({
        name: s.name.charAt(0).toUpperCase() + s.name.slice(1),
        size: (s.value / (1024 * 1024)).toFixed(1), // MB
        bytes: s.value
      })),
      topContainers: [...projectContainers]
        .sort((a, b) => parseFloat(b.CPUPerc) - parseFloat(a.CPUPerc))
        .slice(0, 5)
        .map(c => ({
          name: c.Name.replace('project-s-', ''),
          cpu: c.CPUPerc,
          mem: c.MemUsage
        })),
      containers: projectContainers.map(c => ({
        name: c.Name.replace('project-s-', ''),
        status: 'running', // docker stats only returns running containers
        cpu: c.CPUPerc,
        mem: c.MemUsage
      }))
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Stats API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch container stats' }, { status: 500 })
  }
}
