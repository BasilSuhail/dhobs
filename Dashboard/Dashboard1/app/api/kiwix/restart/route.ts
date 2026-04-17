import { NextResponse } from 'next/server'
import http from 'http'
import { requireAdmin } from '@/lib/auth'

export async function POST() {
  await requireAdmin()
  return new Promise<NextResponse>((resolve) => {
    const req = http.request(
      {
        host: 'socket-proxy',
        port: 2375,
        path: '/containers/project-s-kiwix-reader/restart',
        method: 'POST',
      },
      (res) => {
        if (res.statusCode === 204) {
          resolve(NextResponse.json({ ok: true }))
        } else {
          resolve(NextResponse.json({ ok: false, status: res.statusCode }, { status: 500 }))
        }
      }
    )
    req.on('error', (err) => {
      resolve(NextResponse.json({ ok: false, error: err.message }, { status: 500 }))
    })
    req.end()
  })
}
