
// Comprehensive health check system for AfricanMarket
// Monitors all critical system components

const { PrismaClient } = require('@prisma/client');
const Redis = require('redis');

class HealthCheck {
  constructor() {
    this.prisma = new PrismaClient();
    this.redis = null;
    this.checks = new Map();
    this.initializeRedis();
    this.registerChecks();
  }

  async initializeRedis() {
    try {
      this.redis = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      await this.redis.connect();
    } catch (error) {
      console.error('Redis connection failed:', error);
    }
  }

  // Register all health checks
  registerChecks() {
    this.checks.set('database', this.checkDatabase.bind(this));
    this.checks.set('redis', this.checkRedis.bind(this));
    this.checks.set('external_apis', this.checkExternalAPIs.bind(this));
    this.checks.set('file_storage', this.checkFileStorage.bind(this));
    this.checks.set('email_service', this.checkEmailService.bind(this));
    this.checks.set('payment_service', this.checkPaymentService.bind(this));
    this.checks.set('memory_usage', this.checkMemoryUsage.bind(this));
    this.checks.set('disk_space', this.checkDiskSpace.bind(this));
    this.checks.set('ssl_certificate', this.checkSSLCertificate.bind(this));
  }

  // Main health check endpoint
  async performHealthCheck(detailed = false) {
    const startTime = Date.now();
    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: require('../package.json').version,
      environment: process.env.NODE_ENV,
      checks: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };

    // Run all health checks
    for (const [name, checkFunction] of this.checks) {
      try {
        const checkResult = await this.runCheck(name, checkFunction, detailed);
        results.checks[name] = checkResult;
        
        results.summary.total++;
        
        switch (checkResult.status) {
          case 'healthy':
            results.summary.passed++;
            break;
          case 'unhealthy':
            results.summary.failed++;
            results.status = 'unhealthy';
            break;
          case 'warning':
            results.summary.warnings++;
            if (results.status === 'healthy') {
              results.status = 'degraded';
            }
            break;
        }
      } catch (error) {
        results.checks[name] = {
          status: 'unhealthy',
          message: 'Health check failed to execute',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        results.summary.failed++;
        results.status = 'unhealthy';
      }
    }

    results.responseTime = Date.now() - startTime;
    
    // Store health check results for monitoring
    await this.storeHealthCheckResult(results);
    
    return results;
  }

  // Run individual health check with timeout
  async runCheck(name, checkFunction, detailed) {
    const startTime = Date.now();
    
    try {
      const result = await Promise.race([
        checkFunction(detailed),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
      ]);
      
      return {
        ...result,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Database health check
  async checkDatabase(detailed = false) {
    try {
      const startTime = Date.now();
      
      // Basic connectivity test
      await this.prisma.$queryRaw`SELECT 1`;
      
      const queryTime = Date.now() - startTime;
      
      let result = {
        status: 'healthy',
        message: 'Database connection successful',
        responseTime: queryTime
      };

      if (detailed) {
        // Additional database metrics
        const userCount = await this.prisma.user.count();
        const orderCount = await this.prisma.order.count();
        
        result.details = {
          userCount,
          orderCount,
          connectionPool: {
            // Prisma doesn't expose pool stats directly
            status: 'active'
          }
        };
      }

      // Check for slow queries
      if (queryTime > 1000) {
        result.status = 'warning';
        result.message = `Database response time is slow: ${queryTime}ms`;
      }

      return result;
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Database connection failed',
        error: error.message
      };
    }
  }

  // Redis health check
  async checkRedis(detailed = false) {
    if (!this.redis) {
      return {
        status: 'unhealthy',
        message: 'Redis client not initialized'
      };
    }

    try {
      const startTime = Date.now();
      
      // Test Redis connectivity
      await this.redis.ping();
      
      const responseTime = Date.now() - startTime;
      
      let result = {
        status: 'healthy',
        message: 'Redis connection successful',
        responseTime
      };

      if (detailed) {
        const info = await this.redis.info();
        const memoryUsage = await this.redis.info('memory');
        
        result.details = {
          version: info.match(/redis_version:(.+)/)?.[1],
          memoryUsage: memoryUsage.match(/used_memory_human:(.+)/)?.[1],
          connectedClients: info.match(/connected_clients:(\d+)/)?.[1]
        };
      }

      if (responseTime > 500) {
        result.status = 'warning';
        result.message = `Redis response time is slow: ${responseTime}ms`;
      }

      return result;
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Redis connection failed',
        error: error.message
      };
    }
  }

  // External APIs health check
  async checkExternalAPIs(detailed = false) {
    const apis = [
      { name: 'Stripe', url: 'https://api.stripe.com/v1/ping', required: true },
      { name: 'Cloudinary', url: 'https://api.cloudinary.com/v1_1/demo/ping', required: false },
      { name: 'SendGrid', url: 'https://api.sendgrid.com/v3/health', required: false }
    ];

    const results = [];
    let overallStatus = 'healthy';

    for (const api of apis) {
      try {
        const response = await fetch(api.url, {
          method: 'GET',
          timeout: 3000,
          headers: {
            'User-Agent': 'AfricanMarket-HealthCheck/1.0'
          }
        });

        const status = response.ok ? 'healthy' : 'unhealthy';
        
        if (!response.ok && api.required) {
          overallStatus = 'unhealthy';
        } else if (!response.ok) {
          overallStatus = overallStatus === 'healthy' ? 'warning' : overallStatus;
        }

        results.push({
          name: api.name,
          status,
          statusCode: response.status,
          required: api.required
        });
      } catch (error) {
        const status = 'unhealthy';
        
        if (api.required) {
          overallStatus = 'unhealthy';
        } else {
          overallStatus = overallStatus === 'healthy' ? 'warning' : overallStatus;
        }

        results.push({
          name: api.name,
          status,
          error: error.message,
          required: api.required
        });
      }
    }

    return {
      status: overallStatus,
      message: `External APIs check completed`,
      details: detailed ? results : undefined
    };
  }

  // File storage health check
  async checkFileStorage(detailed = false) {
    try {
      // Check Cloudinary if configured
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        const cloudinary = require('cloudinary').v2;
        
        // Simple ping to Cloudinary
        const result = await cloudinary.api.ping();
        
        return {
          status: 'healthy',
          message: 'File storage accessible',
          provider: 'Cloudinary',
          details: detailed ? result : undefined
        };
      }

      // If no cloud storage configured, check local storage
      const fs = require('fs').promises;
      const path = require('path');
      
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      
      try {
        await fs.access(uploadsDir);
        const stats = await fs.stat(uploadsDir);
        
        return {
          status: 'healthy',
          message: 'Local file storage accessible',
          provider: 'Local',
          details: detailed ? { writable: stats.isDirectory() } : undefined
        };
      } catch (error) {
        return {
          status: 'warning',
          message: 'Local uploads directory not accessible',
          provider: 'Local'
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'File storage check failed',
        error: error.message
      };
    }
  }

  // Email service health check
  async checkEmailService(detailed = false) {
    if (!process.env.SENDGRID_API_KEY) {
      return {
        status: 'warning',
        message: 'Email service not configured'
      };
    }

    try {
      // Simple SendGrid API health check
      const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`
        },
        timeout: 3000
      });

      if (response.ok) {
        return {
          status: 'healthy',
          message: 'Email service accessible',
          provider: 'SendGrid'
        };
      } else {
        return {
          status: 'unhealthy',
          message: `Email service error: ${response.status}`,
          provider: 'SendGrid'
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Email service check failed',
        error: error.message
      };
    }
  }

  // Payment service health check
  async checkPaymentService(detailed = false) {
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        status: 'warning',
        message: 'Payment service not configured'
      };
    }

    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      
      // Simple Stripe API health check
      const account = await stripe.accounts.retrieve();
      
      return {
        status: 'healthy',
        message: 'Payment service accessible',
        provider: 'Stripe',
        details: detailed ? { 
          accountId: account.id,
          country: account.country 
        } : undefined
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Payment service check failed',
        error: error.message
      };
    }
  }

  // Memory usage check
  async checkMemoryUsage(detailed = false) {
    const usage = process.memoryUsage();
    const totalHeap = usage.heapTotal;
    const usedHeap = usage.heapUsed;
    const usagePercent = (usedHeap / totalHeap) * 100;

    let status = 'healthy';
    let message = `Memory usage: ${Math.round(usagePercent)}%`;

    if (usagePercent > 90) {
      status = 'unhealthy';
      message = `Critical memory usage: ${Math.round(usagePercent)}%`;
    } else if (usagePercent > 80) {
      status = 'warning';
      message = `High memory usage: ${Math.round(usagePercent)}%`;
    }

    return {
      status,
      message,
      details: detailed ? {
        heapUsed: Math.round(usedHeap / 1024 / 1024) + 'MB',
        heapTotal: Math.round(totalHeap / 1024 / 1024) + 'MB',
        external: Math.round(usage.external / 1024 / 1024) + 'MB',
        rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
        usagePercent: Math.round(usagePercent) + '%'
      } : undefined
    };
  }

  // Disk space check
  async checkDiskSpace(detailed = false) {
    try {
      const { execSync } = require('child_process');
      const output = execSync("df -h / | tail -1 | awk '{print $5}'", { encoding: 'utf8' });
      const usagePercent = parseInt(output.replace('%', ''));

      let status = 'healthy';
      let message = `Disk usage: ${usagePercent}%`;

      if (usagePercent > 90) {
        status = 'unhealthy';
        message = `Critical disk usage: ${usagePercent}%`;
      } else if (usagePercent > 80) {
        status = 'warning';
        message = `High disk usage: ${usagePercent}%`;
      }

      return {
        status,
        message,
        details: detailed ? { usagePercent: usagePercent + '%' } : undefined
      };
    } catch (error) {
      return {
        status: 'warning',
        message: 'Could not check disk space',
        error: error.message
      };
    }
  }

  // SSL certificate check
  async checkSSLCertificate(detailed = false) {
    if (!process.env.NEXT_PUBLIC_APP_URL || process.env.NODE_ENV !== 'production') {
      return {
        status: 'healthy',
        message: 'SSL check skipped (not production or URL not configured)'
      };
    }

    try {
      const https = require('https');
      const url = new URL(process.env.NEXT_PUBLIC_APP_URL);
      
      return new Promise((resolve) => {
        const req = https.request({
          hostname: url.hostname,
          port: 443,
          method: 'HEAD',
          path: '/',
          timeout: 5000
        }, (res) => {
          const cert = res.connection.getPeerCertificate();
          const now = new Date();
          const expiry = new Date(cert.valid_to);
          const daysUntilExpiry = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));

          let status = 'healthy';
          let message = `SSL certificate valid for ${daysUntilExpiry} days`;

          if (daysUntilExpiry < 7) {
            status = 'unhealthy';
            message = `SSL certificate expires in ${daysUntilExpiry} days`;
          } else if (daysUntilExpiry < 30) {
            status = 'warning';
            message = `SSL certificate expires in ${daysUntilExpiry} days`;
          }

          resolve({
            status,
            message,
            details: detailed ? {
              issuer: cert.issuer.CN,
              validFrom: cert.valid_from,
              validTo: cert.valid_to,
              daysUntilExpiry
            } : undefined
          });
        });

        req.on('error', () => {
          resolve({
            status: 'unhealthy',
            message: 'SSL certificate check failed'
          });
        });

        req.end();
      });
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'SSL certificate check failed',
        error: error.message
      };
    }
  }

  // Store health check results for historical analysis
  async storeHealthCheckResult(results) {
    try {
      if (this.redis) {
        const key = `health_check:${Date.now()}`;
        await this.redis.setex(key, 3600, JSON.stringify(results)); // Store for 1 hour
        
        // Keep only last 100 results
        const keys = await this.redis.keys('health_check:*');
        if (keys.length > 100) {
          const sortedKeys = keys.sort();
          const keysToDelete = sortedKeys.slice(0, keys.length - 100);
          if (keysToDelete.length > 0) {
            await this.redis.del(keysToDelete);
          }
        }
      }
    } catch (error) {
      console.error('Failed to store health check result:', error);
    }
  }

  // Get health check history
  async getHealthCheckHistory(limit = 24) {
    try {
      if (!this.redis) return [];
      
      const keys = await this.redis.keys('health_check:*');
      const sortedKeys = keys.sort().slice(-limit);
      
      const results = [];
      for (const key of sortedKeys) {
        const data = await this.redis.get(key);
        if (data) {
          results.push(JSON.parse(data));
        }
      }
      
      return results;
    } catch (error) {
      console.error('Failed to get health check history:', error);
      return [];
    }
  }

  // Cleanup resources
  async cleanup() {
    try {
      await this.prisma.$disconnect();
      if (this.redis) {
        await this.redis.quit();
      }
    } catch (error) {
      console.error('Health check cleanup error:', error);
    }
  }
}

module.exports = HealthCheck;
