// Standalone WebSocket terminal server — runs alongside Next.js standalone (server.js).
// No Next.js import: avoids webpack-lib MODULE_NOT_FOUND in standalone mode.
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import * as pty from 'node-pty'

const WS_PORT = parseInt(process.env.WS_PORT || '3070', 10)
const hostname = '0.0.0.0'

const server = createServer((_req, res) => {
  res.writeHead(200)
  res.end('Project S Terminal WS Server\n')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws: WebSocket) => {
  let shell: pty.IPty | null = null

  try {
    shell = pty.spawn('/bin/bash', [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: process.env.HOME || '/root',
      env: process.env as Record<string, string>,
    })
  } catch (err) {
    ws.send('\r\n\x1b[31mFailed to spawn shell: ' + String(err) + '\x1b[0m\r\n')
    ws.close()
    return
  }

  // pty output → WebSocket
  shell.onData((data: string) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data)
    }
  })

  shell.onExit(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send('\r\n\x1b[33m[Process exited]\x1b[0m\r\n')
      ws.close()
    }
  })

  // WebSocket → pty input / resize
  ws.on('message', (message: Buffer) => {
    try {
      const msg = JSON.parse(message.toString())
      if (msg.type === 'input' && shell) {
        shell.write(msg.data)
      } else if (msg.type === 'resize' && shell) {
        const cols = Math.max(1, parseInt(msg.cols, 10))
        const rows = Math.max(1, parseInt(msg.rows, 10))
        shell.resize(cols, rows)
      }
    } catch {
      if (shell) shell.write(message.toString())
    }
  })

  const cleanup = () => {
    if (shell) {
      try { shell.kill() } catch { /* already dead */ }
      shell = null
    }
  }

  ws.on('close', cleanup)
  ws.on('error', cleanup)
})

server.listen(WS_PORT, hostname, () => {
  console.log(`> Terminal WS server ready on ws://${hostname}:${WS_PORT}`)
})
