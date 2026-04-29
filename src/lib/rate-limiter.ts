/*
 * Rate Limiter Utility
 * Implements rate limiting for API endpoints to prevent abuse
 */

// In-memory store for rate limit data
// In production, this should be backed by Redis or another persistent store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number

  /** Time window in milliseconds */
  window: number

  /** Optional prefix for the rate limit key */
  prefix?: string
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean

  /** Number of requests remaining in the current window */
  remaining: number

  /** When the rate limit resets (timestamp) */
  resetTime: number

  /** Total limit */
  limit: number
}

/**
 * Check if a request is allowed based on rate limiting rules
 * @param key Unique identifier for the rate limit (e.g., tenantId:phoneNumber)
 * @param config Rate limiting configuration
 * @returns Rate limit result
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const limiterKey = config.prefix ? `${config.prefix}:${key}` : key

  // Get or initialize the rate limit data
  let limiter = rateLimitStore.get(limiterKey)

  if (!limiter || now >= limiter.resetTime) {
    // Reset the counter if the window has expired
    limiter = {
      count: 1,
      resetTime: now + config.window
    }
    rateLimitStore.set(limiterKey, limiter)
  } else {
    // Increment the counter if under the limit
    if (limiter.count < config.limit) {
      limiter.count++
    }
    // Don't update resetTime - it stays fixed for the window
    rateLimitStore.set(limiterKey, limiter)
  }

  const remaining = Math.max(0, config.limit - limiter.count)

  return {
    allowed: limiter.count <= config.limit,
    remaining,
    resetTime: limiter.resetTime,
    limit: config.limit
  }
}

/**
 * Get current rate limit status without incrementing the counter
 * Useful for debugging or UI display
 */
export function getRateLimitStatus(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const limiterKey = config.prefix ? `${config.prefix}:${key}` : key
  const limiter = rateLimitStore.get(limiterKey)

  if (!limiter || now >= limiter.resetTime) {
    return {
      allowed: true,
      remaining: config.limit,
      resetTime: now + config.window,
      limit: config.limit
    }
  }

  return {
    allowed: limiter.count < config.limit,
    remaining: Math.max(0, config.limit - limiter.count),
    resetTime: limiter.resetTime,
    limit: config.limit
  }
}

/**
 * Reset rate limit counter for a key
 * Primarily for testing purposes
 */
export function resetRateLimit(key: string, config: RateLimitConfig): void {
  const limiterKey = config.prefix ? `${config.prefix}:${key}` : key
  rateLimitStore.delete(limiterKey)
}

// Regular cleanup of expired rate limit entries
// Runs every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now >= value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)
