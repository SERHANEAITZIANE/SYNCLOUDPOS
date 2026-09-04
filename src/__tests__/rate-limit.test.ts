import { describe, it, expect, vi, beforeEach } from 'vitest'

// Simulate Redis being unavailable: connect() rejects, so getClient() returns a
// client that is never `isReady`. This is the exact condition the fallback
// exists for.
vi.mock('redis', () => ({
  createClient: () => ({
    isReady: false,
    on: () => {},
    connect: () => Promise.reject(new Error('ECONNREFUSED')),
    multi: () => ({ incr: () => {}, pTTL: () => {}, exec: async () => [1, -1] }),
    pExpire: async () => {},
  }),
}))

import { rateLimit } from '@/lib/redis'

/**
 * Regression test for PROJECT_AUDIT.md finding M-4.
 *
 * rateLimit() used to `return { success: true }` whenever Redis was down or
 * threw — it failed *open*. Redis is deliberately optional in this codebase, so
 * "Redis is down" is a supported state, which meant login brute-force
 * protection could be removed simply by making Redis unavailable.
 *
 * It now degrades to a per-process limiter: weaker than Redis across a PM2
 * cluster, but never unlimited.
 */
describe('rateLimit with Redis unavailable', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('still enforces the limit instead of passing everything through', async () => {
    const key = `test-fail-closed-${Math.random()}`
    const limit = 3

    const results = []
    for (let i = 0; i < 5; i++) {
      results.push(await rateLimit(key, limit, 60_000))
    }

    expect(results.slice(0, 3).every(r => r.success)).toBe(true)
    expect(results[3].success).toBe(false)
    expect(results[4].success).toBe(false)
  })

  it('reports that it is running degraded, so callers can alert', async () => {
    const result = await rateLimit(`test-degraded-${Math.random()}`, 5, 60_000)

    expect(result.degraded).toBe(true)
  })

  it('counts each identifier independently', async () => {
    const a = `test-a-${Math.random()}`
    const b = `test-b-${Math.random()}`

    await rateLimit(a, 1, 60_000)
    const aSecond = await rateLimit(a, 1, 60_000)
    const bFirst = await rateLimit(b, 1, 60_000)

    expect(aSecond.success).toBe(false)
    expect(bFirst.success).toBe(true)
  })

  it('lets the window expire', async () => {
    const key = `test-window-${Math.random()}`

    await rateLimit(key, 1, 1) // 1ms window
    const blocked = await rateLimit(key, 1, 1)
    expect(blocked.success).toBe(false)

    await new Promise(resolve => setTimeout(resolve, 20))

    const afterWindow = await rateLimit(key, 1, 1)
    expect(afterWindow.success).toBe(true)
  })
})
