import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'

/**
 * Returns Tailscale connection status and IP.
 * Called from the dashboard frontend to display connection state.
 */
export async function GET() {
  await requireSession()
  try {
    const res = await fetch('http://tailscale:0/api/local/tailscale/status', {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) {
      return NextResponse.json({ connected: false, reason: 'not_connected' })
    }
    const data = await res.json()
    const self = data.Self || {}
    return NextResponse.json({
      connected: true,
      ips: self.TailscaleIPs || [],
      hostname: self.HostName || 'homeforge',
    })
  } catch {
    return NextResponse.json({ connected: false, reason: 'unreachable' })
  }
}
