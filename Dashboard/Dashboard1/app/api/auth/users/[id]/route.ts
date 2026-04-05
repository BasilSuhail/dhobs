import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, getSession } from '@/lib/auth'
import { deleteUser, updateUserRole, getUserById } from '@/lib/db/users'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin()
  const { id }  = await params
  const userId  = parseInt(id, 10)

  if (isNaN(userId)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
  }

  // Prevent admins from deleting their own account
  if (userId === session.userId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  const deleted = deleteUser(userId)
  if (!deleted) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

const UpdateSchema = z.object({ role: z.enum(['admin', 'viewer']) })

export async function PUT(req: NextRequest, { params }: Params) {
  await requireAdmin()
  const { id } = await params
  const userId = parseInt(id, 10)

  if (isNaN(userId)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
  }

  const body   = await req.json().catch(() => null)
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid role — must be "admin" or "viewer"' }, { status: 400 })
  }

  const updated = updateUserRole(userId, parsed.data.role)
  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(updated)
}
