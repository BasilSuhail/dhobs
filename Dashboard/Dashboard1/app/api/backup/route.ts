import { requireSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

const SIDECAR_URL = process.env.SIDECAR_URL ?? 'http://homeforge-backup:3070'

export async function GET(req: NextRequest) {
  await requireSession()
  const res = await fetch(`${SIDECAR_URL}/backups`, {
    headers: { Authorization: `Bearer ${process.env.INTERNAL_TOKEN}` }
  })
  const data = await res.json()
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  await requireSession()
  const body = await req.json()
  const res = await fetch(`${SIDECAR_URL}/backups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.INTERNAL_TOKEN}`
    },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
