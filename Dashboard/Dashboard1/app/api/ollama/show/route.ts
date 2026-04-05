import { NextRequest, NextResponse } from 'next/server'
import { request as httpRequest } from 'http'
import { requireSession } from '@/lib/auth'

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://ollama:11434'

export async function POST(req: NextRequest) {
  await requireSession()
  const body = await req.json()

  return new Promise<NextResponse>((resolve) => {
    const payload = JSON.stringify({ name: body.name })
    const url = new URL(`${OLLAMA_BASE}/api/show`)

    const options = {
      hostname: url.hostname,
      port: Number(url.port) || 11434,
      path: '/api/show',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 10000,
    }

    const ollamaReq = httpRequest(options, (res) => {
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

    ollamaReq.on('error', (err) => {
      resolve(NextResponse.json({ error: err.message }, { status: 503 }))
    })
    ollamaReq.on('timeout', () => {
      ollamaReq.destroy()
      resolve(NextResponse.json({ error: 'Ollama connection timed out' }, { status: 504 }))
    })

    ollamaReq.write(payload)
    ollamaReq.end()
  })
}
