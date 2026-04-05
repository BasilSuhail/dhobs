/**
 * In-memory sliding-window rate limiter.
 *
 * Suitable for a single-process Node.js deployment (standalone Docker container).
 * Each key tracks an array of request timestamps; on every call the window is
 * slid forward by dropping entries older than windowMs before counting.
 *
 * Memory footprint stays bounded: a GC sweep runs every 5 minutes and removes
 * keys whose most-recent timestamp is older than 1 hour.
 */

interface Entry {
  timestamps: number[]
}

const store = new Map<string, Entry>()

// Prune idle keys every 5 minutes so long-running servers don't accumulate
// stale entries for IPs that haven't sent a request in over an hour.
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000
  for (const [key, entry] of store) {
    if (entry.timestamps.length === 0 || entry.timestamps.at(-1)! < cutoff) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000).unref() // .unref() lets the process exit cleanly in tests

export interface RateLimitOptions {
  /** Length of the sliding window in milliseconds. */
  windowMs: number
  /** Maximum number of requests allowed per window per key. */
  max:      number
}

export interface RateLimitResult {
  allowed:   boolean
  limit:     number   // max requests per window
  remaining: number   // requests left in the current window
  resetAt:   number   // Unix timestamp (seconds) when the oldest entry expires
}

/**
 * Check and record a request against the sliding-window counter for `key`.
 * If `allowed` is false the request should be rejected with HTTP 429.
 */
export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now         = Date.now()
  const windowStart = now - opts.windowMs
  const entry       = store.get(key) ?? { timestamps: [] }

  // Drop timestamps that have fallen outside the current window
  entry.timestamps = entry.timestamps.filter(t => t > windowStart)

  const count   = entry.timestamps.length
  const allowed = count < opts.max

  // Only record the request if it is allowed — rejected requests do not consume
  // a slot so they cannot be used to artificially inflate the counter.
  if (allowed) {
    entry.timestamps.push(now)
    store.set(key, entry)
  }

  const remaining = Math.max(0, opts.max - entry.timestamps.length)

  // resetAt = when the oldest entry in the current window expires
  const oldestInWindow = entry.timestamps[0] ?? now
  const resetAt        = Math.ceil((oldestInWindow + opts.windowMs) / 1000)

  return { allowed, limit: opts.max, remaining, resetAt }
}

/**
 * Extract the real client IP from a Next.js request.
 * Checks x-forwarded-for (reverse-proxy standard) then x-real-ip, with a
 * fallback of 'unknown' so callers never have to handle undefined.
 */
export function getClientIp(
  req: { headers: { get(name: string): string | null } }
): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return 'unknown'
}

/** Reset the store — only for use in tests. */
export function _resetRateLimitStore(): void {
  store.clear()
}
