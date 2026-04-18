import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!process.env.WS_SECRET) {
    return NextResponse.json({ error: 'Server not initialised' }, { status: 503 })
  }

  const ts  = Date.now().toString()
  const sig = createHmac('sha256', process.env.WS_SECRET)
    .update(ts)
    .digest('hex')

  // Ticket format: "{timestamp}.{hmac-hex}" — 5 second TTL enforced by the WS server
  return NextResponse.json({ ticket: `${ts}.${sig}` })
}
