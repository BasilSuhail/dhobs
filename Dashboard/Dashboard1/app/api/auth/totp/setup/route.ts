import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { getUserById } from '@/lib/db/users'
import { generateTotpSecret, generateTotpUri, generateQrDataUri } from '@/lib/totp'
import { getDb } from '@/lib/db'

export async function GET() {
  const session = await requireSession()
  const user = getUserById(session.userId)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (user.totp_enabled && user.totp_secret) {
    return NextResponse.json({ enabled: true })
  }

  // Reuse any pending (unconfirmed) secret — avoids rotating mid-setup if the
  // endpoint is called more than once before the user scans the QR code.
  const secret = user.totp_secret ?? generateTotpSecret()
  if (!user.totp_secret) {
    getDb().prepare('UPDATE users SET totp_secret = ? WHERE id = ?').run(secret, session.userId)
  }

  const uri = generateTotpUri(secret, session.username)
  const qrDataUri = await generateQrDataUri(uri)

  return NextResponse.json({ enabled: false, secret, qrDataUri })
}

