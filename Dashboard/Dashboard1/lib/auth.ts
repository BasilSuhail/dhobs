import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, type SessionData } from './session'

/**
 * Read the current session from the Next.js cookie store.
 * Returns null if there is no valid session cookie.
 * Use this in Server Components and Route Handlers.
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies()
  const session     = await getIronSession<SessionData>(cookieStore, sessionOptions)
  if (!session.userId) return null
  return {
    userId:   session.userId,
    username: session.username,
    role:     session.role,
  }
}

/**
 * Require an authenticated session.
 * Redirects to /login if there is no valid session.
 * Use this at the top of protected Server Components.
 */
export async function requireSession(): Promise<SessionData> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

/**
 * Require an admin session.
 * Redirects to /login if unauthenticated, or / if the user is not an admin.
 * Use this at the top of admin-only Server Components and Route Handlers.
 */
export async function requireAdmin(): Promise<SessionData> {
  const session = await requireSession()
  if (session.role !== 'admin') redirect('/')
  return session
}
