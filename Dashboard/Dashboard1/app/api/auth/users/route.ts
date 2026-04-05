import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { listUsers, createUser } from '@/lib/db/users'

export async function GET() {
  await requireAdmin()
  return NextResponse.json(listUsers())
}

const CreateSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(12),
  role:     z.enum(['admin', 'viewer']),
})

export async function POST(req: NextRequest) {
  await requireAdmin()

  const body   = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const user = await createUser(parsed.data.username, parsed.data.password, parsed.data.role)
    return NextResponse.json(user, { status: 201 })
  } catch (err: any) {
    // Unique constraint violation — username already taken
    if (err?.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }
    throw err
  }
}
