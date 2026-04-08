import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  await requireSession()
  try {
    const db = getDb()

    // Auto-cleanup old entries
    db.exec('DELETE FROM metrics_history WHERE created_at < unixepoch() - 86400')

    // Fetch last 120 readings (~1h at 30s intervals)
    const rows = db.prepare(
      'SELECT created_at, cpu, memory, gpu, disk, net_down, net_up FROM metrics_history ORDER BY id DESC LIMIT 120'
    ).all() as Array<{
      created_at: number
      cpu: number | null
      memory: number | null
      gpu: number | null
      disk: number | null
      net_down: number | null
      net_up: number | null
    }>

    // Convert to time-series format for charts
    const history = rows.reverse().map(r => ({
      time: new Date(r.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      cpu: r.cpu ?? 0,
      memory: r.memory ?? 0,
      gpu: r.gpu ?? 0,
      disk: r.disk ?? 0,
      netDown: r.net_down ? (r.net_down / (1024 * 1024)).toFixed(1) : '0',
      netUp: r.net_up ? (r.net_up / (1024 * 1024)).toFixed(1) : '0',
    }))

    return NextResponse.json(history)
  } catch (error) {
    console.error('History API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
