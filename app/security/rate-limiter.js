
// Advanced rate limiting implementation for AfricanMarket
// Supports multiple strategies and dynamic limits

const Redis = require('redis');
const { SecurityConfig } = require('./security-config');

class RateLimiter {
  constructor(options = {}) {
    this.redis = options.redis || this.createRedisClient();
    this.config = { ...SecurityConfig.rateLimiting, ...options };
    this.strategies = {
      FIXED_WINDOW: 'fixed-window',
      SLIDING_WINDOW: 'sliding-window',
      TOKEN_BUCKET: 'token-bucket',
      LEAKY_BUCKET: 'leaky-bucket'
    };
  }

  // Create Redis client
  createRedisClient() {
    const client = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          return new Error('Redis connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    client.on('error', (err) => {
      console.error('Redis Rate Limiter Error:', err);
    });

    return client;
  }

  // Main rate limiting middleware
  createLimiter(limitType = 'api', strategy = this.strategies.SLIDING_WINDOW) {
    return async (req, res, next) => {
      try {
        const result = await this.checkLimit(req, limitType, strategy);
        
        // Set rate limit headers
        this.setRateLimitHeaders(res, result);
        
        if (result.allowed) {
          next();
        } else {
          res.status(429).json({
            error: 'Rate limit exceeded',
            message: this.config[limitType]?.message || 'Too many requests',
            retryAfter: result.retryAfter
          });
        }
      } catch (error) {
        console.error('Rate limiter error:', error);
        // Fail open - allow request if rate limiter fails
        next();
      }
    };
  }

  // Check rate limit for a request
  async checkLimit(req, limitType, strategy) {
    const key = this.generateKey(req, limitType);
    const config = this.config[limitType] || this.config.api;
    
    switch (strategy) {
      case this.strategies.FIXED_WINDOW:
        return await this.fixedWindowCheck(key, config);
      
      case this.strategies.SLIDING_WINDOW:
        return await this.slidingWindowCheck(key, config);
      
      case this.strategies.TOKEN_BUCKET:
        return await this.tokenBucketCheck(key, config);
      
      case this.strategies.LEAKY_BUCKET:
        return await this.leakyBucketCheck(key, config);
      
      default:
        return await this.slidingWindowCheck(key, config);
    }
  }

  // Generate unique key for rate limiting
  generateKey(req, limitType) {
    const ip = this.getClientIP(req);
    const userId = req.user?.id || 'anonymous';
    const endpoint = req.route?.path || req.path;
    
    // Use different key strategies based on limit type
    switch (limitType) {
      case 'auth':
        return `rate_limit:auth:${ip}`;
      
      case 'payment':
        return `rate_limit:payment:${userId}:${ip}`;
      
      case 'upload':
        return `rate_limit:upload:${userId}:${ip}`;
      
      default:
        return `rate_limit:api:${ip}:${endpoint}`;
    }
  }

  // Get client IP address
  getClientIP(req) {
    return req.ip ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.connection?.socket?.remoteAddress ||
           req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           'unknown';
  }

  // Fixed window rate limiting
  async fixedWindowCheck(key, config) {
    const windowStart = Math.floor(Date.now() / config.windowMs) * config.windowMs;
    const windowKey = `${key}:${windowStart}`;
    
    const count = await this.redis.incr(windowKey);
    
    if (count === 1) {
      await this.redis.expire(windowKey, Math.ceil(config.windowMs / 1000));
    }
    
    const remaining = Math.max(0, config.max - count);
    const resetTime = windowStart + config.windowMs;
    
    return {
      allowed: count <= config.max,
      count,
      remaining,
      resetTime,
      retryAfter: count > config.max ? Math.ceil((resetTime - Date.now()) / 1000) : null
    };
  }

  // Sliding window rate limiting
  async slidingWindowCheck(key, config) {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Remove old entries
    await this.redis.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests in window
    const count = await this.redis.zcard(key);
    
    if (count >= config.max) {
      const retryAfter = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const oldestTimestamp = retryAfter[1] ? parseInt(retryAfter[1]) : now;
      
      return {
        allowed: false,
        count,
        remaining: 0,
        resetTime: oldestTimestamp + config.windowMs,
        retryAfter: Math.ceil((oldestTimestamp + config.windowMs - now) / 1000)
      };
    }
    
    // Add current request
    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    await this.redis.expire(key, Math.ceil(config.windowMs / 1000));
    
    return {
      allowed: true,
      count: count + 1,
      remaining: config.max - count - 1,
      resetTime: null,
      retryAfter: null
    };
  }

  // Token bucket rate limiting
  async tokenBucketCheck(key, config) {
    const now = Date.now();
    const bucketKey = `${key}:bucket`;
    
    // Get current bucket state
    const bucket = await this.redis.hmget(bucketKey, 'tokens', 'lastRefill');
    let tokens = parseInt(bucket[0]) || config.max;
    let lastRefill = parseInt(bucket[1]) || now;
    
    // Refill tokens based on time passed
    const timePassed = now - lastRefill;
    const tokensToAdd = Math.floor(timePassed / (config.windowMs / config.max));
    tokens = Math.min(config.max, tokens + tokensToAdd);
    
    if (tokens < 1) {
      const nextRefill = lastRefill + (config.windowMs / config.max);
      return {
        allowed: false,
        count: config.max - tokens,
        remaining: 0,
        resetTime: nextRefill,
        retryAfter: Math.ceil((nextRefill - now) / 1000)
      };
    }
    
    // Consume token
    tokens -= 1;
    
    // Update bucket state
    await this.redis.hmset(bucketKey, {
      tokens: tokens,
      lastRefill: now
    });
    await this.redis.expire(bucketKey, Math.ceil(config.windowMs / 1000));
    
    return {
      allowed: true,
      count: config.max - tokens,
      remaining: tokens,
      resetTime: null,
      retryAfter: null
    };
  }

  // Leaky bucket rate limiting
  async leakyBucketCheck(key, config) {
    const now = Date.now();
    const bucketKey = `${key}:leaky`;
    
    // Get current bucket state
    const bucket = await this.redis.hmget(bucketKey, 'volume', 'lastLeak');
    let volume = parseInt(bucket[0]) || 0;
    let lastLeak = parseInt(bucket[1]) || now;
    
    // Leak tokens based on time passed
    const timePassed = now - lastLeak;
    const leakRate = config.max / config.windowMs; // tokens per ms
    const tokensToLeak = timePassed * leakRate;
    volume = Math.max(0, volume - tokensToLeak);
    
    // Check if bucket is full
    if (volume >= config.max) {
      return {
        allowed: false,
        count: Math.ceil(volume),
        remaining: 0,
        resetTime: now + ((volume - config.max + 1) / leakRate),
        retryAfter: Math.ceil((volume - config.max + 1) / leakRate / 1000)
      };
    }
    
    // Add request to bucket
    volume += 1;
    
    // Update bucket state
    await this.redis.hmset(bucketKey, {
      volume: volume,
      lastLeak: now
    });
    await this.redis.expire(bucketKey, Math.ceil(config.windowMs / 1000));
    
    return {
      allowed: true,
      count: Math.ceil(volume),
      remaining: Math.floor(config.max - volume),
      resetTime: null,
      retryAfter: null
    };
  }

  // Set rate limit headers
  setRateLimitHeaders(res, result) {
    res.set({
      'X-RateLimit-Limit': result.count + result.remaining,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Used': result.count
    });
    
    if (result.resetTime) {
      res.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
    }
    
    if (result.retryAfter) {
      res.set('Retry-After', result.retryAfter);
    }
  }

  // Dynamic rate limiting based on user behavior
  async getDynamicLimit(req, baseLimit) {
    const userKey = `user_behavior:${req.user?.id || this.getClientIP(req)}`;
    const behavior = await this.redis.hmget(userKey, 'score', 'lastUpdate');
    
    const score = parseInt(behavior[0]) || 0;
    const lastUpdate = parseInt(behavior[1]) || Date.now();
    
    // Adjust limit based on user behavior score
    let multiplier = 1;
    
    if (score < -50) {
      multiplier = 0.5; // Reduce limit for suspicious users
    } else if (score > 100) {
      multiplier = 2; // Increase limit for trusted users
    }
    
    return Math.floor(baseLimit * multiplier);
  }

  // Update user behavior score
  async updateUserBehavior(req, action, points) {
    const userKey = `user_behavior:${req.user?.id || this.getClientIP(req)}`;
    
    await this.redis.hincrby(userKey, 'score', points);
    await this.redis.hset(userKey, 'lastUpdate', Date.now());
    await this.redis.expire(userKey, 7 * 24 * 60 * 60); // 7 days
  }

  // Get rate limit status
  async getStatus(req, limitType) {
    const key = this.generateKey(req, limitType);
    const config = this.config[limitType] || this.config.api;
    
    return await this.slidingWindowCheck(key, config);
  }

  // Reset rate limit for a key
  async reset(req, limitType) {
    const key = this.generateKey(req, limitType);
    await this.redis.del(key);
  }
}

module.exports = RateLimiter;
