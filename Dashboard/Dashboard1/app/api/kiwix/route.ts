import { NextResponse } from 'next/server'
import { readdir, stat } from 'fs/promises'
import path from 'path'

const KIWIX_DATA_DIR = '/data/kiwix'

export async function GET() {
  try {
    const entries = await readdir(KIWIX_DATA_DIR)
    const zimFiles = entries.filter(f => f.endsWith('.zim'))

    const files = await Promise.all(
      zimFiles.map(async (name) => {
        try {
          const s = await stat(path.join(KIWIX_DATA_DIR, name))
          return { name, sizeBytes: s.size }
        } catch {
          return { name, sizeBytes: 0 }
        }
      })
    )

    return NextResponse.json({ files })
  } catch {
    // Directory missing or unreadable — return empty list
    return NextResponse.json({ files: [] })
  }
}
