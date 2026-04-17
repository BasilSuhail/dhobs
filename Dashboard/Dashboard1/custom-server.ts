// Standalone WebSocket terminal server — runs alongside Next.js standalone (server.js).
// No Next.js import: avoids webpack-lib MODULE_NOT_FOUND in standalone mode.
import { createServer, get as httpGet, IncomingMessage } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import * as pty from 'node-pty'
import { createHmac, timingSafeEqual } from 'crypto'

const WS_PORT = parseInt(process.env.WS_PORT || '3070', 10)
const hostname = '0.0.0.0'

const ALLOWED_CONTAINERS = new Set([
  'project-s-jellyfin',
  'project-s-nextcloud',
  'project-s-nextcloud-db',
  'project-s-ollama',
  'project-s-open-webui',
  'project-s-kiwix-reader',
  'project-s-kiwix-manager',
  'project-s-collabora',
  'project-s-vaultwarden',
  'project-s-dashboard',
  'project-s-theia',
  'project-s-matrix-server',
  'project-s-matrix-client',
  'project-s-matrix-db',
  'project-s-openvpn',
  'project-s-openvpn-ui',
])

const VALID_SHELL_TYPES = new Set(['ollama', 'container', null])

// Close idle PTY sessions after 30 minutes of no input
const IDLE_TIMEOUT_MS = 30 * 60 * 1000


/** Check if a named container is running via socket-proxy (TCP). */
function isContainerRunning(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = httpGet({
      host: 'socket-proxy',
      port: 2375,
      path: `/containers/${name}/json`,
    }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve(json?.State?.Running === true)
        } catch {
          resolve(false)
        }
      })
    })
    req.on('error', () => resolve(false))
    req.setTimeout(2000, () => { req.destroy(); resolve(false) })
  })
}

/**
 * Verify a WS auth ticket issued by GET /api/auth/ws-ticket.
 * Ticket format: "{timestamp_ms}.{hmac-sha256-hex}"
 * Returns true only when the HMAC is valid AND the ticket is within 30 seconds of issue.
 */
function verifyWsTicket(ticket: string | null): boolean {
  const secret = process.env.WS_SECRET
  if (!ticket || !secret) return false

  const dot = ticket.lastIndexOf('.')
  if (dot === -1) return false

  const ts  = ticket.slice(0, dot)
  const sig = ticket.slice(dot + 1)

  // Reject tickets older than 30 seconds
  const timestamp = parseInt(ts, 10)
  if (isNaN(timestamp) || Date.now() - timestamp > 30_000) return false

  // Constant-time HMAC comparison — prevents timing oracle attacks
  const expected = createHmac('sha256', secret).update(ts).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    // Buffer.from throws if sig is not valid hex or wrong length
    return false
  }
}

const server = createServer((_req, res) => {
  res.writeHead(200)
  res.end('Project S Terminal WS Server\n')
})

const wss = new WebSocketServer({ server })

wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
  let shell: pty.IPty | null = null

  const url = new URL(req.url || '/', `http://localhost:${WS_PORT}`)

  // Verify auth ticket before spawning any shell or sending any data
  const ticket = url.searchParams.get('ticket')
  if (!verifyWsTicket(ticket)) {
    ws.close(4401, 'Unauthorized')
    return
  }

  const shellType = url.searchParams.get('shell') // 'ollama' | 'container' | null
  const containerName = url.searchParams.get('container') // e.g. 'project-s-jellyfin'

  // Validate shell type
  if (!VALID_SHELL_TYPES.has(shellType)) {
    ws.close(4400, 'Invalid shell type')
    return
  }

  // Validate container name against whitelist
  if (shellType === 'container' && (!containerName || !ALLOWED_CONTAINERS.has(containerName))) {
    ws.close(4400, 'Container not allowed')
    return
  }

  let cmd: string
  let args: string[]

  if (shellType === 'ollama') {
    cmd = 'docker'
    args = ['exec', '-it', 'project-s-ollama', '/bin/sh']
    ws.send('\x1b]0;ollama\x07') // set tab title via OSC
    ws.send('\x1b[2m[connected to project-s-ollama]\x1b[0m\r\n')
  } else if (shellType === 'container' && containerName) {
    const running = await isContainerRunning(containerName)
    if (!running) {
      ws.send(`\r\n\x1b[31mContainer '${containerName}' is not running.\x1b[0m\r\n`)
      ws.close()
      return
    }
    cmd = 'docker'
    args = ['exec', '-it', containerName, '/bin/sh']
    const shortName = containerName.replace('project-s-', '')
    ws.send(`\x1b]0;${shortName}\x07`) // set tab title via OSC
    ws.send(`\x1b[2m[connected to ${containerName}]\x1b[0m\r\n`)
  } else {
    // Unified shell — runs in the dashboard container which has docker.io installed.
    // All docker/compose commands work natively. Theia IDE is at localhost:3030.
    cmd = '/bin/bash'
    args = []
  }

  try {
    shell = pty.spawn(cmd, args, {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: process.env.HOME || '/',
      env: { ...process.env, TERM: 'xterm-256color' } as Record<string, string>,
    })
  } catch (err) {
    ws.send('\r\n\x1b[31mFailed to spawn shell: ' + String(err) + '\x1b[0m\r\n')
    ws.close()
    return
  }

  // Inject convenience aliases into the default unified shell
  if (shellType !== 'ollama' && shellType !== 'container') {
    setTimeout(() => {
      if (shell) shell.write([
        "alias ollama='docker exec -it project-s-ollama ollama'",
        "alias theia='docker exec -it project-s-theia /bin/bash'",
        "clear",
      ].join(' && ') + '\n')
    }, 300)
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

  // Idle timeout — close session after 30 minutes of no input
  let idleTimer = setTimeout(() => {
    ws.close(4408, 'Session idle timeout')
  }, IDLE_TIMEOUT_MS)

  // WebSocket → pty input / resize
  ws.on('message', (message: Buffer) => {
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
      ws.close(4408, 'Session idle timeout')
    }, IDLE_TIMEOUT_MS)

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
    clearTimeout(idleTimer)
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
