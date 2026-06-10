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
            // In a real implementation, this might be an event or a separate tracking mechanism
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
 * Uses SCAN instead of KEYS to avoid blocking Redis.
 * Call this after any write operation.
 */
export async function invalidateCache(prefix: string) {
    try {
        const redis = await getClient()
        if (!redis?.isReady) return

        let totalDeleted = 0
        let cursor = "0"
        do {
            const result = await redis.scan(cursor, { MATCH: `${prefix}:*`, COUNT: 100 })
            cursor = typeof result.cursor === 'string' ? result.cursor : String(result.cursor)
            if (result.keys.length > 0) {
                await redis.del(result.keys)
                totalDeleted += result.keys.length
            }
        } while (cursor !== "0")

        if (totalDeleted > 0 && process.env.NODE_ENV !== 'production') {
            console.log(`InvalidateCache: prefix=${prefix}, deleted=${totalDeleted}`)
        }
    } catch {
        // Non-critical — ignore
    }
}

/**
 * Cache with tag-based invalidation support.
 * Tags allow efficient bulk invalidation of related cache entries.
 * e.g. withCacheTagged("products:tenant1:list", ["tenant:tenant1", "products"], fn, 60)
 */
export async function withCacheTagged<T>(
    key: string,
    tags: string[],
    fn: () => Promise<T>,
    ttl: number = 30
): Promise<T> {
    try {
        const redis = await getClient()
        if (!redis?.isReady) return fn()

        const cached = await redis.get(key)
        if (cached) return JSON.parse(cached.toString()) as T

        const result = await fn()
        const multi = redis.multi()
        multi.setEx(key, ttl, JSON.stringify(result))
        // Register this key under each tag set for fast invalidation
        tags.forEach(tag => multi.sAdd(`tag:${tag}`, key))
        // Tags themselves expire after 24h to prevent unbounded growth
        tags.forEach(tag => multi.expire(`tag:${tag}`, 86400))
        await multi.exec()

        return result
    } catch {
        return fn()
    }
}

/**
 * Invalidate all cache entries associated with a specific tag.
 * More efficient than prefix-based invalidation for cross-cutting concerns.
 */
export async function invalidateByTag(tag: string) {
    try {
        const redis = await getClient()
        if (!redis?.isReady) return

        const keys = await redis.sMembers(`tag:${tag}`)
        const keysArray = Array.isArray(keys) ? keys : Array.from(keys)
        const keysStrArray = keysArray.map(k => typeof k === 'string' ? k : String(k))
        if (keysStrArray.length > 0) {
            await redis.del([...keysStrArray, `tag:${tag}`])
        }
    } catch {
        // Non-critical — ignore
    }
}

/**
 * Basic Token Bucket Rate Limiter using Redis.
 * Useful for protecting auth endpoints from brute force attacks.
 */
export async function rateLimit(identifier: string, limit: number = 5, windowMs: number = 60000): Promise<{ success: boolean; remaining: number }> {
    try {
        const redis = await getClient();
        if (!redis?.isReady) return { success: true, remaining: 1 }; // Fallback pass-through if Redis is down

        const key = `ratelimit:${identifier}`;
        
        // Use a transaction/pipeline to increment and set expiry
        const multi = redis.multi();
        multi.incr(key);
        multi.pTTL(key);
        
        const [count, ttl] = await multi.exec() as unknown as [number, number];

        if (count === 1 || ttl < 0) {
            // First time or key expired without TTL
            await redis.pExpire(key, windowMs);
        }

        return {
            success: count <= limit,
            remaining: Math.max(0, limit - count)
        };
    } catch (error) {
        console.error("Rate limit error:", error);
        return { success: true, remaining: 1 }; // Fail open
    }
}
