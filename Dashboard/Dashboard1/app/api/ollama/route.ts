import { NextResponse } from 'next/server'
import { get as httpGet } from 'http'

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://ollama:11434'

/**
 * Proxy for Ollama API — called from the dashboard frontend.
 * Runs server-side so the browser never needs direct access to port 11434.
 * Works regardless of how HomeForge is accessed (localhost, LAN IP, domain).
 */
export async function GET() {
  return new Promise<NextResponse>((resolve) => {
    const req = httpGet(`${OLLAMA_BASE}/api/tags`, { timeout: 5000 }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve(NextResponse.json(JSON.parse(data)))
        } catch {
          resolve(NextResponse.json({ error: 'Invalid response from Ollama' }, { status: 502 }))
        }
      })
    })
    req.on('error', (err) => {
      resolve(NextResponse.json({ error: err.message }, { status: 503 }))
    })
    req.on('timeout', () => {
      req.destroy()
      resolve(NextResponse.json({ error: 'Ollama connection timed out' }, { status: 504 }))
    })
  })
}
