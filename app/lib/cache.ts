
import { logger } from '@/lib/error-handler'
import { prisma } from '@/lib/db'

// Cache entry interface
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

// Cache configuration
export interface CacheConfig {
  defaultTtl: number // Default time-to-live in milliseconds
  maxSize: number // Maximum number of entries
  cleanupInterval: number // Cleanup interval in milliseconds
}

// In-memory cache implementation
export class MemoryCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private config: CacheConfig
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      maxSize: 1000,
      cleanupInterval: 60 * 1000, // 1 minute
      ...config
    }
    
    this.startCleanup()
  }

  // Get value from cache
  get(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }
    
    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  // Set value in cache
  set(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTtl
    }
    
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
    
    this.cache.set(key, entry)
  }

  // Delete value from cache
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  // Clear all cache
  clear(): void {
    this.cache.clear()
  }

  // Check if key exists and is not expired
  has(key: string): boolean {
    return this.get(key) !== null
  }

  // Get cache statistics
  getStats(): {
    size: number
    maxSize: number
    hitRate: number
    missRate: number
  } {
    // Note: This is a simplified implementation
    // In production, you'd want to track hits/misses
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // Would need to implement hit/miss tracking
      missRate: 0
    }
  }

  // Start cleanup timer
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key))
    
    if (keysToDelete.length > 0) {
      logger.debug(`Cleaned up ${keysToDelete.length} expired cache entries`)
    }
  }

  // Destroy cache and cleanup timer
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.cache.clear()
  }
}

// Cache with async get/set for database operations
export class AsyncCache<T = any> extends MemoryCache<T> {
  // Get value with fallback function
  async getOrSet(
    key: string,
    fallback: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key)
    
    if (cached !== null) {
      return cached
    }
    
    try {
      const value = await fallback()
      this.set(key, value, ttl)
      return value
    } catch (error) {
      logger.error('AsyncCache fallback failed', { key, error })
      throw error
    }
  }

  // Warm up cache with multiple keys
  async warmUp(
    keys: string[],
    fallback: (key: string) => Promise<T>,
    ttl?: number
  ): Promise<void> {
    const promises = keys.map(async (key) => {
      try {
        const value = await fallback(key)
        this.set(key, value, ttl)
      } catch (error) {
        logger.error('Cache warmup failed', { key, error })
      }
    })
    
    await Promise.all(promises)
  }
}

// Redis cache implementation (for production)
export class RedisCache<T = any> {
  private client: any // Redis client
  private prefix: string
  private defaultTtl: number

  constructor(redisClient: any, prefix: string = 'cache:', defaultTtl: number = 300) {
    this.client = redisClient
    this.prefix = prefix
    this.defaultTtl = defaultTtl
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`
  }

  async get(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(this.getKey(key))
      return value ? JSON.parse(value) : null
    } catch (error) {
      logger.error('RedisCache get failed', { key, error })
      return null
    }
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value)
      const expiration = ttl || this.defaultTtl
      await this.client.setex(this.getKey(key), expiration, serialized)
    } catch (error) {
      logger.error('RedisCache set failed', { key, error })
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(this.getKey(key))
      return result === 1
    } catch (error) {
      logger.error('RedisCache delete failed', { key, error })
      return false
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.client.keys(`${this.prefix}*`)
      if (keys.length > 0) {
        await this.client.del(...keys)
      }
    } catch (error) {
      logger.error('RedisCache clear failed', { error })
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(this.getKey(key))
      return exists === 1
    } catch (error) {
      logger.error('RedisCache has failed', { key, error })
      return false
    }
  }

  async getOrSet(
    key: string,
    fallback: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get(key)
    
    if (cached !== null) {
      return cached
    }
    
    try {
      const value = await fallback()
      await this.set(key, value, ttl)
      return value
    } catch (error) {
      logger.error('RedisCache fallback failed', { key, error })
      throw error
    }
  }
}

// Cache manager for different cache types
export class CacheManager {
  private caches: Map<string, MemoryCache | AsyncCache | RedisCache> = new Map()
  private static instance: CacheManager

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  // Register a cache instance
  register(name: string, cache: MemoryCache | AsyncCache | RedisCache): void {
    this.caches.set(name, cache)
  }

  // Get cache instance by name
  getCache(name: string): MemoryCache | AsyncCache | RedisCache | null {
    return this.caches.get(name) || null
  }

  // Clear all caches
  async clearAll(): Promise<void> {
    for (const cache of this.caches.values()) {
      if (cache instanceof MemoryCache) {
        cache.clear()
      } else if ('clear' in cache) {
        await cache.clear()
      }
    }
  }

  // Get stats for all caches
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {}
    
    for (const [name, cache] of this.caches.entries()) {
      if (cache instanceof MemoryCache) {
        stats[name] = cache.getStats()
      } else {
        stats[name] = { type: 'redis', name }
      }
    }
    
    return stats
  }
}

// Cache decorators for methods
export function cached<T>(
  key: ((...args: any[]) => string) | string,
  ttl?: number,
  cacheName: string = 'default'
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const cacheManager = CacheManager.getInstance()
      const cache = cacheManager.getCache(cacheName)
      
      if (!cache) {
        return originalMethod.apply(this, args)
      }
      
      const cacheKey = typeof key === 'function' ? key(...args) : key
      
      if (cache instanceof AsyncCache) {
        return cache.getOrSet(
          cacheKey,
          () => originalMethod.apply(this, args),
          ttl
        )
      } else if ('getOrSet' in cache) {
        return cache.getOrSet(
          cacheKey,
          () => originalMethod.apply(this, args),
          ttl
        )
      } else {
        const cached = cache.get(cacheKey)
        if (cached !== null) {
          return cached
        }
        
        const result = await originalMethod.apply(this, args)
        cache.set(cacheKey, result, ttl)
        return result
      }
    }
  }
}

// Predefined cache instances
export const caches = {
  // User data cache
  users: new AsyncCache<any>({
    defaultTtl: 15 * 60 * 1000, // 15 minutes
    maxSize: 1000
  }),

  // Ride data cache
  rides: new AsyncCache<any>({
    defaultTtl: 5 * 60 * 1000, // 5 minutes
    maxSize: 2000
  }),

  // Notification preferences cache
  notifications: new AsyncCache<any>({
    defaultTtl: 30 * 60 * 1000, // 30 minutes
    maxSize: 500
  }),

  // API responses cache
  api: new AsyncCache<any>({
    defaultTtl: 2 * 60 * 1000, // 2 minutes
    maxSize: 5000
  }),

  // Static data cache (longer TTL)
  static: new AsyncCache<any>({
    defaultTtl: 60 * 60 * 1000, // 1 hour
    maxSize: 100
  })
}

// Initialize cache manager
const cacheManager = CacheManager.getInstance()
cacheManager.register('users', caches.users)
cacheManager.register('rides', caches.rides)
cacheManager.register('notifications', caches.notifications)
cacheManager.register('api', caches.api)
cacheManager.register('static', caches.static)

// Cache utility functions
export const cacheUtils = {
  // Generate cache key
  generateKey: (prefix: string, ...parts: (string | number)[]): string => {
    return `${prefix}:${parts.join(':')}`
  },

  // Cache user data
  cacheUser: (userId: string, userData: any, ttl?: number): void => {
    const key = cacheUtils.generateKey('user', userId)
    caches.users.set(key, userData, ttl)
  },

  // Get cached user data
  getCachedUser: (userId: string): any => {
    const key = cacheUtils.generateKey('user', userId)
    return caches.users.get(key)
  },

  // Cache ride data
  cacheRide: (rideId: string, rideData: any, ttl?: number): void => {
    const key = cacheUtils.generateKey('ride', rideId)
    caches.rides.set(key, rideData, ttl)
  },

  // Get cached ride data
  getCachedRide: (rideId: string): any => {
    const key = cacheUtils.generateKey('ride', rideId)
    return caches.rides.get(key)
  },

  // Cache notification preferences
  cacheNotificationPreferences: (userId: string, preferences: any, ttl?: number): void => {
    const key = cacheUtils.generateKey('notification_prefs', userId)
    caches.notifications.set(key, preferences, ttl)
  },

  // Get cached notification preferences
  getCachedNotificationPreferences: (userId: string): any => {
    const key = cacheUtils.generateKey('notification_prefs', userId)
    return caches.notifications.get(key)
  },

  // Cache API response
  cacheApiResponse: (endpoint: string, params: string, response: any, ttl?: number): void => {
    const key = cacheUtils.generateKey('api', endpoint, params)
    caches.api.set(key, response, ttl)
  },

  // Get cached API response
  getCachedApiResponse: (endpoint: string, params: string): any => {
    const key = cacheUtils.generateKey('api', endpoint, params)
    return caches.api.get(key)
  },

  // Invalidate user cache
  invalidateUserCache: (userId: string): void => {
    const key = cacheUtils.generateKey('user', userId)
    caches.users.delete(key)
  },

  // Invalidate ride cache
  invalidateRideCache: (rideId: string): void => {
    const key = cacheUtils.generateKey('ride', rideId)
    caches.rides.delete(key)
  },

  // Warm up cache with user data
  warmUpUserCache: async (userIds: string[]): Promise<void> => {
    await caches.users.warmUp(
      userIds.map(id => cacheUtils.generateKey('user', id)),
      async (key) => {
        const userId = key.split(':')[1]
        // Fetch user data from database
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true, avatar: true }
        })
        return user
      }
    )
  }
}

// Export cache manager instance
export const cache = cacheManager
export default cacheManager
