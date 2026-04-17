import { NextResponse } from 'next/server'
import { isSetupComplete } from '@/lib/db/users'
import { getSession } from '@/lib/auth'

export async function GET() {
  // Allow unauthenticated access only before setup is complete —
  // the setup wizard needs to check status before a session exists.
  // Once setup is done, require a valid session to prevent enumeration.
  if (isSetupComplete()) {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  return NextResponse.json({ complete: isSetupComplete() })
}
