import { NextResponse } from 'next/server'
import { isSetupComplete } from '@/lib/db/users'

export async function GET() {
  return NextResponse.json({ complete: isSetupComplete() })
}
