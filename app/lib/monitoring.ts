
import { prisma } from '@/lib/db'
import { logger } from '@/lib/error-handler'
import { WebSocketService } from '@/lib/websocket-service'
import { PushNotificationService } from '@/lib/push-notification-service'

// Health check status types
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

// Health check result interface
export interface HealthCheckResult {
  status: HealthStatus
  timestamp: Date
  duration: number
  error?: string
  details?: any
}

// System metrics interface
export interface SystemMetrics {
  cpu: {
    usage: number
    loadAverage: number[]
  }
  memory: {
    used: number
    total: number
    percentage: number
  }
  database: {
    connections: number
    queries: number
    avgResponseTime: number
  }
  websocket: {
    connections: number
    rooms: number
    messagesPerSecond: number
  }
  pushNotifications: {
    sent: number
    failed: number
    deliveryRate: number
  }
  api: {
    requestsPerMinute: number
    averageResponseTime: number
    errorRate: number
  }
}

// Health check service
export class HealthCheckService {
  private static instance: HealthCheckService
  private healthChecks: Map<string, () => Promise<HealthCheckResult>> = new Map()
  private lastResults: Map<string, HealthCheckResult> = new Map()
  private checkInterval: NodeJS.Timeout | null = null

  static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService()
    }
    return HealthCheckService.instance
  }

  constructor() {
    this.registerDefaultHealthChecks()
  }

  private registerDefaultHealthChecks() {
    // Database health check
    this.register('database', async () => {
      const startTime = Date.now()
      try {
        await prisma.$queryRaw`SELECT 1`
        const duration = Date.now() - startTime
        return {
          status: 'healthy' as HealthStatus,
          timestamp: new Date(),
          duration,
          details: { query: 'SELECT 1' }
        }
      } catch (error) {
        const duration = Date.now() - startTime
        return {
          status: 'unhealthy' as HealthStatus,
          timestamp: new Date(),
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // WebSocket health check
    this.register('websocket', async () => {
      const startTime = Date.now()
      try {
        const wsService = WebSocketService.getInstance()
        const stats = wsService.getConnectionStats()
        const duration = Date.now() - startTime
        
        return {
          status: 'healthy' as HealthStatus,
          timestamp: new Date(),
          duration,
          details: {
            connections: stats.totalConnections,
            users: stats.uniqueUsers,
            rooms: stats.activeRides
          }
        }
      } catch (error) {
        const duration = Date.now() - startTime
        return {
          status: 'unhealthy' as HealthStatus,
          timestamp: new Date(),
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Push notification health check
    this.register('push_notifications', async () => {
      const startTime = Date.now()
      try {
        const stats = await PushNotificationService.getNotificationStats()
        const duration = Date.now() - startTime
        
        return {
          status: 'healthy' as HealthStatus,
          timestamp: new Date(),
          duration,
          details: {
            totalNotifications: stats.totalNotifications,
            totalDeliveries: stats.totalDeliveries
          }
        }
      } catch (error) {
        const duration = Date.now() - startTime
        return {
          status: 'unhealthy' as HealthStatus,
          timestamp: new Date(),
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Memory health check
    this.register('memory', async () => {
      const startTime = Date.now()
      try {
        const memoryUsage = process.memoryUsage()
        const duration = Date.now() - startTime
        
        // Consider unhealthy if memory usage is over 90%
        const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024
        const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024
        const usage = (heapUsedMB / heapTotalMB) * 100
        
        let status: HealthStatus = 'healthy'
        if (usage > 90) {
          status = 'unhealthy'
        } else if (usage > 75) {
          status = 'degraded'
        }
        
        return {
          status,
          timestamp: new Date(),
          duration,
          details: {
            heapUsed: heapUsedMB,
            heapTotal: heapTotalMB,
            usage: usage
          }
        }
      } catch (error) {
        const duration = Date.now() - startTime
        return {
          status: 'unhealthy' as HealthStatus,
          timestamp: new Date(),
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // External services health check
    this.register('external_services', async () => {
      const startTime = Date.now()
      try {
        // Check various external services
        const checks = await Promise.allSettled([
          // Add your external service checks here
          // fetch('https://api.example.com/health', { timeout: 5000 }),
        ])
        
        const duration = Date.now() - startTime
        const failed = checks.filter((check: any) => check.status === 'rejected').length
        
        let status: HealthStatus = 'healthy'
        if (failed > 0) {
          status = checks.length === failed ? 'unhealthy' : 'degraded'
        }
        
        return {
          status,
          timestamp: new Date(),
          duration,
          details: {
            total: checks.length,
            failed,
            successful: checks.length - failed
          }
        }
      } catch (error) {
        const duration = Date.now() - startTime
        return {
          status: 'unhealthy' as HealthStatus,
          timestamp: new Date(),
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  }

  // Register a custom health check
  register(name: string, check: () => Promise<HealthCheckResult>) {
    this.healthChecks.set(name, check)
  }

  // Run a single health check
  async runCheck(name: string): Promise<HealthCheckResult> {
    const check = this.healthChecks.get(name)
    if (!check) {
      throw new Error(`Health check '${name}' not found`)
    }

    try {
      const result = await check()
      this.lastResults.set(name, result)
      return result
    } catch (error) {
      const result: HealthCheckResult = {
        status: 'unhealthy',
        timestamp: new Date(),
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      this.lastResults.set(name, result)
      return result
    }
  }

  // Run all health checks
  async runAllChecks(): Promise<Record<string, HealthCheckResult>> {
    const results: Record<string, HealthCheckResult> = {}
    
    const promises = Array.from(this.healthChecks.keys()).map(async (name) => {
      const result = await this.runCheck(name)
      results[name] = result
    })
    
    await Promise.all(promises)
    return results
  }

  // Get overall system health
  async getSystemHealth(): Promise<{
    status: HealthStatus
    checks: Record<string, HealthCheckResult>
    timestamp: Date
  }> {
    const checks = await this.runAllChecks()
    const statuses = Object.values(checks).map(check => check.status)
    
    let overallStatus: HealthStatus = 'healthy'
    if (statuses.includes('unhealthy')) {
      overallStatus = 'unhealthy'
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded'
    }
    
    return {
      status: overallStatus,
      checks,
      timestamp: new Date()
    }
  }

  // Start periodic health checks
  startPeriodicChecks(intervalMs: number = 60000) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
    
    this.checkInterval = setInterval(async () => {
      try {
        const health = await this.getSystemHealth()
        
        // Log health status
        logger.info('System health check completed', {
          status: health.status,
          timestamp: health.timestamp
        })
        
        // Alert on unhealthy status
        if (health.status === 'unhealthy') {
          logger.error('System health is unhealthy', {
            checks: health.checks,
            timestamp: health.timestamp
          })
          
          // Send alert to monitoring service
          await this.sendAlert(health)
        }
      } catch (error) {
        logger.error('Health check failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }, intervalMs)
  }

  // Stop periodic health checks
  stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  // Send alert for unhealthy status
  private async sendAlert(health: any) {
    // Implementation would depend on your alerting system
    // Could send to Slack, email, SMS, etc.
    logger.error('ALERT: System health is unhealthy', health)
  }

  // Get last results without running checks
  getLastResults(): Record<string, HealthCheckResult> {
    const results: Record<string, HealthCheckResult> = {}
    for (const [name, result] of this.lastResults.entries()) {
      results[name] = result
    }
    return results
  }
}

// Performance monitoring service
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number[]> = new Map()
  private startTimes: Map<string, number> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Start timing an operation
  startTimer(operation: string): string {
    const id = `${operation}_${Date.now()}_${Math.random()}`
    this.startTimes.set(id, Date.now())
    return id
  }

  // End timing an operation
  endTimer(timerId: string): number {
    const startTime = this.startTimes.get(timerId)
    if (!startTime) {
      throw new Error(`Timer ${timerId} not found`)
    }
    
    const duration = Date.now() - startTime
    this.startTimes.delete(timerId)
    
    // Extract operation name from timer ID
    const operation = timerId.split('_')[0]
    this.recordMetric(operation, duration)
    
    return duration
  }

  // Record a metric value
  recordMetric(metric: string, value: number) {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, [])
    }
    
    const values = this.metrics.get(metric)!
    values.push(value)
    
    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift()
    }
  }

  // Get metric statistics
  getMetricStats(metric: string): {
    count: number
    avg: number
    min: number
    max: number
    p95: number
    p99: number
  } | null {
    const values = this.metrics.get(metric)
    if (!values || values.length === 0) {
      return null
    }
    
    const sorted = [...values].sort((a, b) => a - b)
    const count = sorted.length
    const sum = sorted.reduce((a, b) => a + b, 0)
    const avg = sum / count
    const min = sorted[0]
    const max = sorted[count - 1]
    const p95 = sorted[Math.floor(count * 0.95)]
    const p99 = sorted[Math.floor(count * 0.99)]
    
    return { count, avg, min, max, p95, p99 }
  }

  // Get all metrics
  getAllMetrics(): Record<string, ReturnType<typeof this.getMetricStats>> {
    const result: Record<string, ReturnType<typeof this.getMetricStats>> = {}
    
    for (const metric of this.metrics.keys()) {
      result[metric] = this.getMetricStats(metric)
    }
    
    return result
  }

  // Clear metrics
  clearMetrics() {
    this.metrics.clear()
    this.startTimes.clear()
  }

  // Monitor function execution
  async monitor<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const timerId = this.startTimer(operation)
    try {
      const result = await fn()
      this.endTimer(timerId)
      return result
    } catch (error) {
      this.endTimer(timerId)
      this.recordMetric(`${operation}_error`, 1)
      throw error
    }
  }
}

// System metrics collector
export class SystemMetricsCollector {
  private static instance: SystemMetricsCollector

  static getInstance(): SystemMetricsCollector {
    if (!SystemMetricsCollector.instance) {
      SystemMetricsCollector.instance = new SystemMetricsCollector()
    }
    return SystemMetricsCollector.instance
  }

  // Collect system metrics
  async collectMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    
    // Get WebSocket metrics
    const wsService = WebSocketService.getInstance()
    const wsStats = wsService.getConnectionStats()
    
    // Get push notification metrics
    const pushStats = await PushNotificationService.getNotificationStats()
    
    // Get performance metrics
    const perfMonitor = PerformanceMonitor.getInstance()
    const apiMetrics = perfMonitor.getMetricStats('api_request') || { count: 0, avg: 0, min: 0, max: 0, p95: 0, p99: 0 }
    
    return {
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
        loadAverage: [0, 0, 0] // Load average not available in Node.js
      },
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      },
      database: {
        connections: 0, // Would need to implement connection pool monitoring
        queries: 0, // Would need to implement query counting
        avgResponseTime: perfMonitor.getMetricStats('database_query')?.avg || 0
      },
      websocket: {
        connections: wsStats.totalConnections,
        rooms: wsStats.activeRides,
        messagesPerSecond: perfMonitor.getMetricStats('websocket_message')?.count || 0
      },
      pushNotifications: {
        sent: pushStats.totalDeliveries,
        failed: pushStats.totalNotifications - pushStats.totalDeliveries,
        deliveryRate: pushStats.totalNotifications > 0 ? 
          (pushStats.totalDeliveries / pushStats.totalNotifications) * 100 : 0
      },
      api: {
        requestsPerMinute: apiMetrics.count,
        averageResponseTime: apiMetrics.avg,
        errorRate: (perfMonitor.getMetricStats('api_error')?.count || 0) / Math.max(apiMetrics.count, 1) * 100
      }
    }
  }
}

// Create monitoring middleware
export const createMonitoringMiddleware = (operation: string) => {
  return async (req: any, res: any, next: any) => {
    const perfMonitor = PerformanceMonitor.getInstance()
    const timerId = perfMonitor.startTimer(operation)
    
    // Override res.json to capture when response is sent
    const originalJson = res.json
    res.json = function(data: any) {
      perfMonitor.endTimer(timerId)
      return originalJson.call(this, data)
    }
    
    next()
  }
}

// Export singleton instances
export const healthCheck = HealthCheckService.getInstance()
export const performanceMonitor = PerformanceMonitor.getInstance()
export const systemMetrics = SystemMetricsCollector.getInstance()

// Start monitoring on module load
if (typeof window === 'undefined') {
  healthCheck.startPeriodicChecks(60000) // Check every minute
}
