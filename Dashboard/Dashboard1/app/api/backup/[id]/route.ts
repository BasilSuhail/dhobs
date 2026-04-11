import { requireAdmin } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

const SIDECAR_URL = process.env.SIDECAR_URL ?? 'http://homeforge-backup:3070'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Deleting backups requires admin role
  await requireAdmin()
  const { id } = await params
  
  const res = await fetch(`${SIDECAR_URL}/backups/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${process.env.INTERNAL_TOKEN}`
    }
  })
  
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
