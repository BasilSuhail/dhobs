#!/usr/bin/env node
/**
 * HomeForge Host Agent
 * Runs on the host machine (macOS/Windows/Linux) to provide real system metrics
 * to the Dashboard container via HTTP.
 *
 * Usage: node scripts/host-agent.js
 * Port: 9101 (default)
 */

const http = require('http');
const os = require('os');
const { execSync } = require('child_process');

const PORT = process.env.HOMEFORGE_AGENT_PORT || 9101;

function getDiskUsage() {
  try {
    // macOS: df -h
    // Windows: wmic (deprecated, but reliable on older; Powershell on newer) -> stick to df -h for now (WSL/Linux/Mac compatible)
    const output = execSync("df -h | grep -v -E 'tmpfs|devtmpfs|overlay|udev|shm'").toString();
    const lines = output.trim().split('\n').slice(1);
    return lines.map(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 6) {
        return {
          mount: parts[5],
          total: parts[1],
          used: parts[2],
          avail: parts[3],
          usePerc: parseInt(parts[4]) || 0
        };
      }
      return null;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function getNetworkStats() {
  const netInterfaces = os.networkInterfaces();
  let rxBytes = 0;
  let txBytes = 0;
  
  // Note: Node.js 'os' module doesn't give byte counters directly. 
  // We would need a native addon or parsing /proc/net/dev. 
  // For a JS-only agent, we'll return current IPs and skip byte counters for now.
  // *Refinement*: On macOS we can parse `netstat -ib`.
  
  try {
    // macOS / Linux
    const output = execSync("netstat -ibn").toString();
    const lines = output.trim().split('\n').slice(1);
    
    for (const line of lines) {
      if (line.includes('lo') || line.includes('Link')) continue;
      const parts = line.trim().split(/\s+/);
      // netstat -ib columns vary, but usually bytes are around index 6/9
      // This is tricky cross-platform. 
      // Fallback to 0 for safety until we implement proper parsing.
    }
  } catch {}
  
  return { rxBytes, txBytes };
}

const server = http.createServer((req, res) => {
  if (req.url === '/metrics') {
    const cpus = os.cpus();
    const loadAvgs = os.loadavg();
    
    // Calculate simple CPU usage (idle time vs total time) is hard without sampling.
    // We will return Load Averages which are standard and useful.
    
    const metrics = {
      platform: os.platform(),
      hostname: os.hostname(),
      uptime: Math.floor(os.uptime() / 86400), // Days
      loadAvg: loadAvgs,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        usedPerc: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(1)
      },
      disk: getDiskUsage(),
      cpu: {
        model: cpus[0]?.model || 'Unknown',
        cores: cpus.length,
        load: loadAvgs // We use Load Avg as the primary "CPU pressure" metric for this agent
      }
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metrics));
  } else if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🩺 HomeForge Host Agent running on port ${PORT}`);
  console.log(`   Platform: ${os.platform()}`);
  console.log(`   Metrics: http://localhost:${PORT}/metrics`);
});
