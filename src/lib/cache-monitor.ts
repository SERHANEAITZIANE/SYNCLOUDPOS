/*
 * Redis Cache Monitoring Utility
 * Adds monitoring capabilities to Redis operations
 */

import { withCache, invalidateCache } from "@/lib/redis"
import { v4 as uuidv4 } from 'uuid'

// Cache monitoring metrics
interface CacheMetrics {
  hits: number
  misses: number
  timeouts: number
  errors: number
  averageResponseTime: number
  totalRequests: number
}

// Global cache metrics
const cacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  timeouts: 0,
  errors: 0,
  averageResponseTime: 0,
  totalRequests: 0
}

// Active operations monitoring
const activeOperations = new Map<string, {
  key: string
  startTime: number
  startTimeDate: Date
  context: string
}>()

// Middleware functions
export function monitorWithCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = 30,
  context: string = 'unknown'
): Promise<T> {
  const operationId = uuidv4()
  const startTime = Date.now()

  // Register this operation as active
  activeOperations.set(operationId, {
    key,
    startTime,
    startTimeDate: new Date(),
    context
  })

  // Track the promise to update metrics
  return withCache(key, fn, ttl).then(
    (result) => {
      // Operation completed successfully
      updateMetrics('success', Date.now() - startTime)
      activeOperations.delete(operationId)
      return result
    },
    (error) => {
      // Operation failed
      if (error?.name === 'AbortError' || error?.code === 'ETIMEOUT') {
        updateMetrics('timeout', Date.now() - startTime)
      } else {
        updateMetrics('error', Date.now() - startTime)
      }
      activeOperations.delete(operationId)
      throw error
    }
  )
}

// Invalidate cache operation with monitoring
export function monitorInvalidateCache(
  prefix: string,
  context: string = 'unknown'
) {
  const startTime = Date.now()

  try {
    const result = invalidateCache(prefix)
    // This is a fire-and-forget operation
    // In a real monitoring system, we might want to track its completion
    return result
  } catch (error) {
    updateMetrics('error', Date.now() - startTime)
    throw error
  }
}

// Update cache metrics
function updateMetrics(resultType: 'success' | 'timeout' | 'error', responseTime: number) {
  cacheMetrics.totalRequests++

  switch (resultType) {
    case 'success':
      cacheMetrics.hits++
      break

    case 'timeout':
      cacheMetrics.timeouts++
      cacheMetrics.misses++
      break

    case 'error':
      cacheMetrics.errors++
      cacheMetrics.misses++
      break
  }

  // Update average response time with exponential smoothing
  const alpha = 0.1 // Smoothing factor
  cacheMetrics.averageResponseTime = alpha * responseTime + (1 - alpha) * cacheMetrics.averageResponseTime;
}

// Get cache metrics for monitoring purposes
export function getCacheMetrics(): Readonly<CacheMetrics> {
  return {...cacheMetrics}
}

// Get active cache operations
export function getActiveCacheOperations(): Readonly<ReturnType<typeof activeOperations.get>>[] {
  returnArray.from(activeOperations.values())
}

// Clear completed operations - useful for testing
export function clearActiveOperations() {
  activeOperations.clear()
}

// Reset metrics - useful for testing
export function resetCacheMetrics() {
  cacheMetrics.hits = 0
  cacheMetrics.misses = 0
  cacheMetrics.timeouts = 0
  cacheMetrics.errors = 0
  cacheMetrics.averageResponseTime = 0
  cacheMetrics.totalRequests = 0
}

// Track cache operations with transaction monitoring
export function withCacheTransaction<T>(key: string, fn: () => Promise<T>, ttl: number = 30, operationName: string = 'cache') {
  return monitorWithCache(key, fn, ttl, operationName)
}

// Export original functions with monitoring
export default {
  withCache: monitorWithCache,
  invalidateCache: monitorInvalidateCache,
  getMetrics: getCacheMetrics,
  getActiveOperations: getActiveCacheOperations,
  clearActive: clearActiveOperations,
  resetMetrics: resetCacheMetrics,
  withTransaction: withCacheTransaction
}