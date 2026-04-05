import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://ollama:11434'

/**
 * Streaming proxy for Ollama pull — pipes NDJSON progress directly to the browser.
 * Uses fetch() instead of Node http.request so Next.js App Router can stream
 * the response body without buffering it.
 */
export async function POST(req: NextRequest) {
  await requireAdmin()
  const { name } = await req.json()

  let ollamaRes: Response
  try {
    ollamaRes = await fetch(`${OLLAMA_BASE}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, stream: true }),
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(ollamaRes.body, {
    status: ollamaRes.status,
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
    },
  })
}
