import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { getUserById } from '@/lib/db/users'
import { generateTotpSecret, generateTotpUri, generateQrDataUri } from '@/lib/totp'

export async function GET() {
  const session = await requireSession()
  const user = getUserById(session.userId)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (user.totp_enabled && user.totp_secret) {
    return NextResponse.json({ enabled: true })
  }

  const secret = generateTotpSecret()
  const uri = generateTotpUri(secret, session.username)
  const qrDataUri = await generateQrDataUri(uri)

  return NextResponse.json({ enabled: false, secret, qrDataUri })
}
