
// Rate limiting service
import { prisma } from '@/lib/db'

interface RateLimitRecord {
  key: string
  count: number
  resetTime: number
}

export class RateLimiter {
  private cache: Map<string, RateLimitRecord> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired records every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  // Check if request is within rate limit
  async checkLimit(
    key: string,
    maxRequests: number,
    windowMs: number,
    identifier?: string
  ): Promise<boolean> {
    try {
      const now = Date.now()
      const rateLimitKey = identifier ? `${key}:${identifier}` : key
      
      let record = this.cache.get(rateLimitKey)
      
      if (!record || now >= record.resetTime) {
        // Create new record or reset expired one
        record = {
          key: rateLimitKey,
          count: 1,
          resetTime: now + windowMs
        }
        this.cache.set(rateLimitKey, record)
        return true
      }
      
      if (record.count >= maxRequests) {
        return false
      }
      
      record.count++
      return true
    } catch (error) {
      console.error('Error checking rate limit:', error)
      return true // Allow on error
    }
  }

  // Check WebSocket connection rate limit
  async checkConnectionLimit(ipAddress: string): Promise<boolean> {
    return this.checkLimit('connection', 10, 60000, ipAddress) // 10 connections per minute per IP
  }

  // Check message rate limit
  async checkMessageLimit(userId: string): Promise<boolean> {
    return this.checkLimit('message', 60, 60000, userId) // 60 messages per minute per user
  }

  // Check API rate limit
  async checkApiLimit(userId: string, endpoint: string): Promise<boolean> {
    return this.checkLimit(`api:${endpoint}`, 100, 60000, userId) // 100 requests per minute per user per endpoint
  }

  // Check notification rate limit
  async checkNotificationLimit(userId: string): Promise<boolean> {
    return this.checkLimit('notification', 20, 60000, userId) // 20 notifications per minute per user
  }

  // Check location update rate limit
  async checkLocationLimit(driverId: string): Promise<boolean> {
    return this.checkLimit('location', 120, 60000, driverId) // 120 location updates per minute per driver
  }

  // Check SMS rate limit
  async checkSmsLimit(phoneNumber: string): Promise<boolean> {
    return this.checkLimit('sms', 5, 3600000, phoneNumber) // 5 SMS per hour per phone number
  }

  // Check email rate limit
  async checkEmailLimit(email: string): Promise<boolean> {
    return this.checkLimit('email', 10, 3600000, email) // 10 emails per hour per email address
  }

  // Check push notification rate limit
  async checkPushLimit(userId: string): Promise<boolean> {
    return this.checkLimit('push', 100, 3600000, userId) // 100 push notifications per hour per user
  }

  // Get rate limit status
  async getRateLimitStatus(key: string, identifier?: string): Promise<{
    allowed: boolean
    limit: number
    remaining: number
    resetTime: number
  }> {
    try {
      const rateLimitKey = identifier ? `${key}:${identifier}` : key
      const record = this.cache.get(rateLimitKey)
      
      if (!record) {
        return {
          allowed: true,
          limit: 0,
          remaining: 0,
          resetTime: 0
        }
      }
      
      const now = Date.now()
      if (now >= record.resetTime) {
        return {
          allowed: true,
          limit: 0,
          remaining: 0,
          resetTime: 0
        }
      }
      
      return {
        allowed: record.count < 100, // Default limit
        limit: 100,
        remaining: Math.max(0, 100 - record.count),
        resetTime: record.resetTime
      }
    } catch (error) {
      console.error('Error getting rate limit status:', error)
      return {
        allowed: true,
        limit: 0,
        remaining: 0,
        resetTime: 0
      }
    }
  }

  // Reset rate limit for key
  async resetRateLimit(key: string, identifier?: string): Promise<void> {
    try {
      const rateLimitKey = identifier ? `${key}:${identifier}` : key
      this.cache.delete(rateLimitKey)
    } catch (error) {
      console.error('Error resetting rate limit:', error)
    }
  }

  // Clean up expired records
  private cleanup(): void {
    const now = Date.now()
    for (const [key, record] of this.cache.entries()) {
      if (now >= record.resetTime) {
        this.cache.delete(key)
      }
    }
  }

  // Get all rate limit records
  async getAllRateLimits(): Promise<RateLimitRecord[]> {
    return Array.from(this.cache.values())
  }

  // Clear all rate limits
  async clearAllRateLimits(): Promise<void> {
    this.cache.clear()
  }

  // Advanced rate limiting with sliding window
  async checkSlidingWindowLimit(
    key: string,
    maxRequests: number,
    windowMs: number,
    identifier?: string
  ): Promise<boolean> {
    try {
      const now = Date.now()
      const rateLimitKey = identifier ? `${key}:${identifier}` : key
      
      // Get requests in the current window
      const requests = await prisma.rateLimitRequest.findMany({
        where: {
          key: rateLimitKey,
          timestamp: {
            gte: new Date(now - windowMs)
          }
        },
        orderBy: { timestamp: 'desc' }
      })
      
      if (requests.length >= maxRequests) {
        return false
      }
      
      // Record this request
      await prisma.rateLimitRequest.create({
        data: {
          key: rateLimitKey,
          timestamp: new Date(now)
        }
      })
      
      return true
    } catch (error) {
      console.error('Error checking sliding window limit:', error)
      return true // Allow on error
    }
  }

  // Clean up old rate limit requests
  async cleanupOldRequests(): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      
      await prisma.rateLimitRequest.deleteMany({
        where: {
          timestamp: {
            lt: cutoffTime
          }
        }
      })
    } catch (error) {
      console.error('Error cleaning up old requests:', error)
    }
  }

  // Get rate limit statistics
  async getRateLimitStats(): Promise<any> {
    try {
      const stats = await prisma.rateLimitRequest.groupBy({
        by: ['key'],
        where: {
          timestamp: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
          }
        },
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        }
      })

      return {
        topKeys: stats.slice(0, 10),
        totalRequests: stats.reduce((sum, stat) => sum + stat._count.id, 0),
        cacheSize: this.cache.size
      }
    } catch (error) {
      console.error('Error getting rate limit stats:', error)
      return {
        topKeys: [],
        totalRequests: 0,
        cacheSize: this.cache.size
      }
    }
  }

  // Shutdown cleanup
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}

