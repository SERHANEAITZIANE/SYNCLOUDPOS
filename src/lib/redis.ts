import { createClient } from "redis"

// Singleton Redis client — reused across requests in the same Node.js process
const globalForRedis = globalThis as unknown as { _redis?: ReturnType<typeof createClient> }

let client: ReturnType<typeof createClient> | null = null

async function getClient() {
    if (globalForRedis._redis?.isReady) return globalForRedis._redis

    // Skip Redis initialization if no URL is provided and not in production
    // or fail fast if Redis is not running locally.
    const c = createClient({
        url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
        socket: {
            // Fail after 3 attempts instead of blocking the app forever
            reconnectStrategy: (retries) => {
                if (retries > 3) return new Error("Redis connection limits reached");
                return Math.min(retries * 100, 3000);
            },
            connectTimeout: 5000 // 5 second timeout
        },
    })

    c.on("error", () => { }) // Silence

    try {
        await c.connect();
        globalForRedis._redis = c;
    } catch {
        // Silently fail if Redis is down, we use DB fallback
    }

    return c
}

/**
 * Get a cached value, or compute it and cache it.
 * This function is also used internally by the monitoring system.
 *
 * @param key   Unique cache key (namespaced by tenantId)
 * @param fn    Async function to compute the value if not cached
 * @param ttl   Time-to-live in seconds (default 30s)
 */
export async function withCache<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = 30
): Promise<T> {
    try {
        const redis = await getClient()
        if (!redis?.isReady) return fn()

        const cached = await redis.get(key)
        if (cached) return JSON.parse(cached.toString()) as T

        const result = await fn()
        await redis.setEx(key, ttl, JSON.stringify(result))

        // Notify the monitoring system of this cache operation
        try {
            // This is a fire-and-forget call to maintain loose coupling
n            // In a real implementation, this might be an event or a separate tracking mechanism
            console.log(`Cache event: Set key=${key} ttl=${ttl}`); // Debug only
        } catch (e) {
            // Ignore monitoring errors
        }

        return result
    } catch {
        // Redis failure — fall through to live query
        return fn()
    }
}

/**
 * Invalidate cache keys matching a pattern prefix.
 * Call this after any write operation.
 * This function is also used internally by the monitoring system.
 */
export async function invalidateCache(prefix: string) {
    try {
        const redis = await getClient()
        if (!redis?.isReady) return

        const keys = await redis.keys(`${prefix}:*`)
        if (keys.length >0) await redis.del(keys)

        // Notify the monitoring system of this invalidation operation
        try {
            // This is a fire-and-forget call to maintain loose coupling
            // In a real implementation, this might be an event or a separate tracking mechanism
            console.log(`InvalidateCache: prefix=${prefix}, keys=${keys.length}`); // Debug only
        } catch (e) {
            // Ignore monitoring errors
        }
    } catch {
        // Non-critical — ignore
    }
}
