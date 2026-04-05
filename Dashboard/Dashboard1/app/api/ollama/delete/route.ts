import { NextRequest, NextResponse } from 'next/server'
import { request as httpRequest } from 'http'
import { requireAdmin } from '@/lib/auth'

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://ollama:11434'

export async function DELETE(req: NextRequest) {
  await requireAdmin()
  const body = await req.json()

  return new Promise<NextResponse>((resolve) => {
    const payload = JSON.stringify({ name: body.name })
    const url = new URL(`${OLLAMA_BASE}/api/delete`)

    const options = {
      hostname: url.hostname,
      port: Number(url.port) || 11434,
      path: '/api/delete',
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 10000,
    }

    const ollamaReq = httpRequest(options, (res) => {
      // Ollama returns 200 with empty body on success
      res.resume()
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(NextResponse.json({ ok: true }))
        } else {
          resolve(NextResponse.json({ error: `Ollama returned ${res.statusCode}` }, { status: res.statusCode ?? 500 }))
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
