#!/usr/bin/env node
/**
 * HomeForge Host Agent — Cross-platform metrics collector
 * 
 * Reads host machine metrics (CPU, memory, disk, network, temps)
 * and exposes them via HTTP for the Dashboard to consume.
 * 
 * Usage: node scripts/host-agent.js
 * Access: http://localhost:9101/metrics
 * 
 * No dependencies required — uses only Node.js built-in modules.
 */

const http = require('http');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const PORT = 9101;
const HOST = '0.0.0.0';

// Cache metrics for 2 seconds to avoid excessive polling
let cachedMetrics = null;
let cacheTime = 0;
const CACHE_TTL = 2000;

/**
 * Get CPU usage percentage
 */
function getCPUUsage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  for (const cpu of cpus) {
    const { user, nice, sys, irq, idle } = cpu.times;
    totalIdle += idle;
    totalTick += user + nice + sys + irq + idle;
  }

  const usage = 1 - (totalIdle / totalTick);
  return Math.round(usage * 100 * 10) / 10;
}

/**
 * Get memory info
 */
function getMemoryInfo() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const usedPerc = Math.round((used / total) * 100 * 10) / 10;
  
  return { total, free, used, usedPerc };
}

/**
 * Get disk usage — platform specific
 */
async function getDiskInfo() {
  try {
    if (process.platform === 'win32') {
      // Windows: Use wmic
      const { stdout } = await execAsync(
        'wmic logicaldisk get Size,FreeSpace,DeviceID /format:csv'
      );
      const lines = stdout.trim().split('\n').slice(1);
      return lines.map(line => {
        const [, device, free, size] = line.split(',');
        const sizeNum = parseInt(size) || 0;
        const freeNum = parseInt(free) || 0;
        const used = sizeNum - freeNum;
        const usePerc = sizeNum > 0 ? Math.round((used / sizeNum) * 100) : 0;
        return {
          mount: device,
          total: sizeNum,
          free: freeNum,
          used,
          usePerc
        };
      }).filter(d => d.total > 0);
    } else {
      // macOS/Linux: Use df
      const { stdout } = await execAsync(
        'df -k / | tail -1'
      );
      const parts = stdout.trim().split(/\s+/);
      const total = parseInt(parts[1]) * 1024;
      const used = parseInt(parts[2]) * 1024;
      const free = parseInt(parts[3]) * 1024;
      const usePerc = parseInt(parts[4]) || 0;
      
      return [{ mount: '/', total, used, free, usePerc }];
    }
  } catch (err) {
    console.error('Disk info error:', err.message);
    return [];
  }
}

/**
 * Get network stats — platform specific
 */
async function getNetworkInfo() {
  try {
    const interfaces = os.networkInterfaces();
    let rxBytes = 0;
    let txBytes = 0;
    let rxErrors = 0;
    let txErrors = 0;

    if (process.platform === 'linux') {
      // Linux: Read from /proc/net/dev
      try {
        const { stdout } = await execAsync(
          'cat /proc/net/dev | grep -v "lo:" | tail -n +3'
        );
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 11) {
            rxBytes += parseInt(parts[1]) || 0;
            txBytes += parseInt(parts[9]) || 0;
            rxErrors += parseInt(parts[2]) || 0;
            txErrors += parseInt(parts[10]) || 0;
          }
        }
      } catch {
        // Fallback to 0
      }
    } else if (process.platform === 'darwin') {
      // macOS: Use netstat
      try {
        const { stdout } = await execAsync(
          'netstat -ib | grep -v "Name" | grep -v "loopback"'
        );
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const parts = line.split(/\s+/);
          if (parts.length >= 7) {
            rxBytes += parseInt(parts[parts.length - 2]) || 0;
            txBytes += parseInt(parts[parts.length - 1]) || 0;
          }
        }
      } catch {
        // Fallback to 0
      }
    } else {
      // Windows: Use performance counters
      try {
        const { stdout } = await execAsync(
          'powershell "Get-NetAdapter | Where-Object Status -eq \'Up\' | Measure-Object -Property BytesReceived,BytesSent -Sum"'
        );
        // Parse PowerShell output
        const match = stdout.match(/BytesReceived\s*:\s*(\d+)/);
        const match2 = stdout.match(/BytesSent\s*:\s*(\d+)/);
        if (match) rxBytes = parseInt(match[1]) || 0;
        if (match2) txBytes = parseInt(match2[1]) || 0;
      } catch {
        // Fallback to 0
      }
    }

    return { rxBytes, txBytes, rxErrors, txErrors };
  } catch (err) {
    console.error('Network info error:', err.message);
    return { rxBytes: 0, txBytes: 0, rxErrors: 0, txErrors: 0 };
  }
}

/**
 * Get CPU temperature — platform specific
 */
async function getTemps() {
  try {
    if (process.platform === 'darwin') {
      // macOS: Use osx-cpu-temp or powermetrics
      try {
        const { stdout } = await execAsync(
          'powermetrics --samplers smc | grep -i "CPU die temperature" | head -1'
        );
        const match = stdout.match(/(\d+\.\d+)/);
        const cpu = match ? parseFloat(match[1]) : null;
        return { cpu: cpu || null, sys: null };
      } catch {
        return { cpu: null, sys: null };
      }
    } else if (process.platform === 'linux') {
      // Linux: Read from hwmon
      try {
        const { stdout } = await execAsync(
          'cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null | head -1'
        );
        const cpu = parseInt(stdout) / 1000 || null;
        return { cpu: cpu > 0 ? cpu : null, sys: null };
      } catch {
        return { cpu: null, sys: null };
      }
    } else {
      // Windows: Use OpenHardwareMonitor or wmi
      try {
        const { stdout } = await execAsync(
          'wmic /namespace:\\\\root\\OpenHardwareMonitor path HardwareSensor where SensorType=4 get CurrentValue /value'
        );
        const match = stdout.match(/CurrentValue=(\d+)/);
        const cpu = match ? parseInt(match[1]) : null;
        return { cpu, sys: null };
      } catch {
        return { cpu: null, sys: null };
      }
    }
  } catch (err) {
    console.error('Temp info error:', err.message);
    return { cpu: null, sys: null };
  }
}

/**
 * Collect all metrics
 */
async function collectMetrics() {
  const platform = process.platform;
  const hostname = os.hostname();
  const uptime = Math.round(os.uptime());
  const loadAvg = os.loadavg();
  const cpuCount = os.cpus().length;
  
  const [disk, network, temps] = await Promise.all([
    getDiskInfo(),
    getNetworkInfo(),
    getTemps()
  ]);

  return {
    platform,
    hostname,
    uptime,
    cpu: {
      usage: getCPUUsage(),
      loadAvg,
      cores: cpuCount
    },
    memory: getMemoryInfo(),
    disk,
    network,
    temps,
    timestamp: Date.now()
  };
}

/**
 * Get metrics with caching
 */
async function getMetrics() {
  const now = Date.now();
  if (cachedMetrics && now - cacheTime < CACHE_TTL) {
    return cachedMetrics;
  }
  
  cachedMetrics = await collectMetrics();
  cacheTime = now;
  return cachedMetrics;
}

/**
 * Health check endpoint
 */
function healthCheck(res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', platform: process.platform }));
}

/**
 * Metrics endpoint
 */
async function metricsHandler(res) {
  try {
    const metrics = await getMetrics();
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify(metrics, null, 2));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

/**
 * HTTP server
 */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // CORS headers for local access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  if (url.pathname === '/health') {
    healthCheck(res);
  } else if (url.pathname === '/metrics') {
    await metricsHandler(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`🔧 HomeForge Host Agent running on http://${HOST}:${PORT}`);
  console.log(`   Metrics: http://localhost:${PORT}/metrics`);
  console.log(`   Health:  http://localhost:${PORT}/health`);
  console.log(`   Platform: ${process.platform}`);
  console.log('');
  console.log('Press Ctrl+C to stop');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
