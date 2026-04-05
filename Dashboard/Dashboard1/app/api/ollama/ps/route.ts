import { NextResponse } from 'next/server'
import { get as httpGet } from 'http'
import { requireSession } from '@/lib/auth'

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://ollama:11434'

export async function GET() {
  await requireSession()
  return new Promise<NextResponse>((resolve) => {
    const req = httpGet(`${OLLAMA_BASE}/api/ps`, { timeout: 5000 }, (res) => {
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
