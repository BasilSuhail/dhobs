import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import type { SessionData } from '@/lib/session'

// Routes that do not require authentication
const PUBLIC_PREFIXES = [
  '/login',
  '/setup',
  '/api/auth',
  '/_next',
  '/favicon',
]

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isPublic(pathname)) return NextResponse.next()

  // Validate the iron-session cookie.
  // In middleware we use the 3-arg form: (Request, Response, options).
  const res     = NextResponse.next()
  const session = await getIronSession<SessionData>(req, res, {
    password:   process.env.SESSION_SECRET as string,
    cookieName: 'homeforge_session',
  })

  if (!session.userId) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Propagate user identity as headers so Server Components can read them
  // without re-decrypting the cookie (via request.headers in page.tsx)
  res.headers.set('x-user-id',   String(session.userId))
  res.headers.set('x-user-role', session.role)
  res.headers.set('x-username',  session.username)

  return res
}

export const config = {
  // Match all paths except static files and images
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
