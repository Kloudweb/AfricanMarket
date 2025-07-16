
// Performance monitoring system for AfricanMarket
// Tracks application performance metrics and identifies bottlenecks

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      pageLoad: 3000, // 3 seconds
      apiResponse: 1000, // 1 second
      databaseQuery: 500, // 500ms
      memoryUsage: 0.8, // 80%
      cpuUsage: 0.7, // 70%
    };
    this.observers = [];
    this.initializeMonitoring();
  }

  // Initialize performance monitoring
  initializeMonitoring() {
    if (typeof window !== 'undefined') {
      this.initializeClientMonitoring();
    } else {
      this.initializeServerMonitoring();
    }
  }

  // Client-side performance monitoring
  initializeClientMonitoring() {
    // Performance Observer for various metrics
    this.setupPerformanceObserver();
    
    // Web Vitals monitoring
    this.setupWebVitalsMonitoring();
    
    // User interaction monitoring
    this.setupInteractionMonitoring();
    
    // Resource monitoring
    this.setupResourceMonitoring();
  }

  // Server-side performance monitoring
  initializeServerMonitoring() {
    // Memory monitoring
    this.setupMemoryMonitoring();
    
    // CPU monitoring
    this.setupCPUMonitoring();
    
    // Database monitoring
    this.setupDatabaseMonitoring();
    
    // API monitoring
    this.setupAPIMonitoring();
  }

  // Setup Performance Observer
  setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      // Navigation timing
      const navObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          this.recordNavigationMetrics(entry);
        });
      });
      navObserver.observe({ entryTypes: ['navigation'] });

      // Resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          this.recordResourceMetrics(entry);
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });

      // Measure timing
      const measureObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          this.recordMeasureMetrics(entry);
        });
      });
      measureObserver.observe({ entryTypes: ['measure'] });

      this.observers.push(navObserver, resourceObserver, measureObserver);
    }
  }

  // Setup Web Vitals monitoring
  setupWebVitalsMonitoring() {
    // Largest Contentful Paint (LCP)
    this.observeLCP();
    
    // First Input Delay (FID)
    this.observeFID();
    
    // Cumulative Layout Shift (CLS)
    this.observeCLS();
    
    // First Contentful Paint (FCP)
    this.observeFCP();
    
    // Time to First Byte (TTFB)
    this.observeTTFB();
  }

  // Observe Largest Contentful Paint
  observeLCP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        this.recordMetric('LCP', lastEntry.startTime, {
          element: lastEntry.element?.tagName,
          url: lastEntry.url,
          size: lastEntry.size
        });
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    }
  }

  // Observe First Input Delay
  observeFID() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          this.recordMetric('FID', entry.processingStart - entry.startTime, {
            eventType: entry.name,
            target: entry.target?.tagName
          });
        });
      });
      
      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    }
  }

  // Observe Cumulative Layout Shift
  observeCLS() {
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.recordMetric('CLS', clsValue, {
              sources: entry.sources?.map(source => source.node?.tagName)
            });
          }
        });
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    }
  }

  // Observe First Contentful Paint
  observeFCP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric('FCP', entry.startTime);
          }
        });
      });
      
      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    }
  }

  // Observe Time to First Byte
  observeTTFB() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.entryType === 'navigation') {
            const ttfb = entry.responseStart - entry.requestStart;
            this.recordMetric('TTFB', ttfb, {
              protocol: entry.nextHopProtocol,
              transferSize: entry.transferSize
            });
          }
        });
      });
      
      observer.observe({ entryTypes: ['navigation'] });
      this.observers.push(observer);
    }
  }

  // Setup user interaction monitoring
  setupInteractionMonitoring() {
    // Click responsiveness
    document.addEventListener('click', (event) => {
      const startTime = performance.now();
      
      requestAnimationFrame(() => {
        const duration = performance.now() - startTime;
        this.recordMetric('click_responsiveness', duration, {
          element: event.target.tagName,
          id: event.target.id,
          className: event.target.className
        });
      });
    });

    // Scroll performance
    let scrollStartTime = null;
    document.addEventListener('scroll', () => {
      if (!scrollStartTime) {
        scrollStartTime = performance.now();
        
        requestAnimationFrame(() => {
          const duration = performance.now() - scrollStartTime;
          this.recordMetric('scroll_performance', duration);
          scrollStartTime = null;
        });
      }
    });
  }

  // Setup resource monitoring
  setupResourceMonitoring() {
    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        
        this.recordMetric('fetch_request', duration, {
          url,
          status: response.status,
          method: args[1]?.method || 'GET'
        });
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        this.recordMetric('fetch_error', duration, {
          url,
          error: error.message
        });
        
        throw error;
      }
    };
  }

  // Setup memory monitoring (server-side)
  setupMemoryMonitoring() {
    if (typeof process !== 'undefined') {
      setInterval(() => {
        const usage = process.memoryUsage();
        
        this.recordMetric('memory_heap_used', usage.heapUsed);
        this.recordMetric('memory_heap_total', usage.heapTotal);
        this.recordMetric('memory_external', usage.external);
        this.recordMetric('memory_rss', usage.rss);
        
        // Calculate heap usage percentage
        const heapUsagePercent = usage.heapUsed / usage.heapTotal;
        this.recordMetric('memory_heap_usage_percent', heapUsagePercent);
        
        // Alert on high memory usage
        if (heapUsagePercent > this.thresholds.memoryUsage) {
          this.alertHighMemoryUsage(heapUsagePercent);
        }
      }, 30000); // Every 30 seconds
    }
  }

  // Setup CPU monitoring (server-side)
  setupCPUMonitoring() {
    if (typeof process !== 'undefined') {
      let lastCpuUsage = process.cpuUsage();
      
      setInterval(() => {
        const currentCpuUsage = process.cpuUsage(lastCpuUsage);
        const cpuPercent = (currentCpuUsage.user + currentCpuUsage.system) / 1000000; // Convert to seconds
        
        this.recordMetric('cpu_usage_percent', cpuPercent);
        
        if (cpuPercent > this.thresholds.cpuUsage) {
          this.alertHighCPUUsage(cpuPercent);
        }
        
        lastCpuUsage = process.cpuUsage();
      }, 30000); // Every 30 seconds
    }
  }

  // Setup database monitoring
  setupDatabaseMonitoring() {
    // This would be integrated with Prisma middleware
    // Example implementation:
    this.setupPrismaMonitoring();
  }

  // Setup Prisma monitoring
  setupPrismaMonitoring() {
    // Prisma middleware for query monitoring
    const prismaMiddleware = async (params, next) => {
      const startTime = Date.now();
      const result = await next(params);
      const duration = Date.now() - startTime;
      
      this.recordMetric('database_query', duration, {
        model: params.model,
        action: params.action,
        args: JSON.stringify(params.args).substring(0, 100) // Truncate long args
      });
      
      if (duration > this.thresholds.databaseQuery) {
        this.alertSlowQuery(params, duration);
      }
      
      return result;
    };
    
    // This would be added to Prisma client initialization
    // prisma.$use(prismaMiddleware);
  }

  // Setup API monitoring
  setupAPIMonitoring() {
    // This would be integrated with Express.js middleware
    this.createAPIMonitoringMiddleware();
  }

  // Create API monitoring middleware
  createAPIMonitoringMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        this.recordMetric('api_response_time', duration, {
          method: req.method,
          route: req.route?.path || req.path,
          statusCode: res.statusCode,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
        
        if (duration > this.thresholds.apiResponse) {
          this.alertSlowAPI(req, duration);
        }
      });
      
      next();
    };
  }

  // Record navigation metrics
  recordNavigationMetrics(entry) {
    const metrics = {
      dns_lookup: entry.domainLookupEnd - entry.domainLookupStart,
      tcp_connection: entry.connectEnd - entry.connectStart,
      tls_negotiation: entry.secureConnectionStart ? entry.connectEnd - entry.secureConnectionStart : 0,
      request_time: entry.responseStart - entry.requestStart,
      response_time: entry.responseEnd - entry.responseStart,
      dom_processing: entry.domComplete - entry.domLoading,
      load_event: entry.loadEventEnd - entry.loadEventStart,
      total_load_time: entry.loadEventEnd - entry.fetchStart
    };
    
    Object.entries(metrics).forEach(([name, value]) => {
      if (value > 0) {
        this.recordMetric(`navigation_${name}`, value);
      }
    });
  }

  // Record resource metrics
  recordResourceMetrics(entry) {
    if (entry.initiatorType && entry.duration > 0) {
      this.recordMetric('resource_load_time', entry.duration, {
        type: entry.initiatorType,
        name: entry.name,
        size: entry.transferSize,
        protocol: entry.nextHopProtocol
      });
      
      // Alert on slow resources
      if (entry.duration > 2000) {
        this.alertSlowResource(entry);
      }
    }
  }

  // Record measure metrics
  recordMeasureMetrics(entry) {
    this.recordMetric('custom_measure', entry.duration, {
      name: entry.name,
      detail: entry.detail
    });
  }

  // Record a performance metric
  recordMetric(name, value, context = {}) {
    const metric = {
      name,
      value,
      timestamp: Date.now(),
      context,
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server'
    };
    
    // Store metric
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name).push(metric);
    
    // Keep only last 100 metrics per type
    if (this.metrics.get(name).length > 100) {
      this.metrics.get(name).shift();
    }
    
    // Send to monitoring service
    this.sendMetricToService(metric);
    
    // Log critical metrics
    this.logCriticalMetrics(metric);
  }

  // Send metric to monitoring service
  async sendMetricToService(metric) {
    try {
      if (typeof window !== 'undefined') {
        // Client-side: send to API
        await fetch('/api/monitoring/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metric)
        });
      } else {
        // Server-side: send to external monitoring service
        // This could be DataDog, New Relic, etc.
        this.sendToExternalMonitoring(metric);
      }
    } catch (error) {
      console.error('Failed to send metric to monitoring service:', error);
    }
  }

  // Send to external monitoring service
  sendToExternalMonitoring(metric) {
    // Example: DataDog StatsD
    if (process.env.DATADOG_API_KEY) {
      // Implementation would depend on the monitoring service
      console.log('Sending metric to DataDog:', metric);
    }
  }

  // Log critical metrics
  logCriticalMetrics(metric) {
    const criticalThresholds = {
      LCP: 2500,
      FID: 100,
      CLS: 0.1,
      FCP: 1800,
      TTFB: 600
    };
    
    if (criticalThresholds[metric.name] && metric.value > criticalThresholds[metric.name]) {
      console.warn(`Critical performance metric: ${metric.name} = ${metric.value}ms (threshold: ${criticalThresholds[metric.name]}ms)`);
    }
  }

  // Alert handlers
  alertHighMemoryUsage(percent) {
    console.warn(`High memory usage detected: ${Math.round(percent * 100)}%`);
    this.sendAlert('high_memory_usage', { percent });
  }

  alertHighCPUUsage(percent) {
    console.warn(`High CPU usage detected: ${Math.round(percent * 100)}%`);
    this.sendAlert('high_cpu_usage', { percent });
  }

  alertSlowQuery(params, duration) {
    console.warn(`Slow database query detected: ${params.model}.${params.action} took ${duration}ms`);
    this.sendAlert('slow_database_query', { params, duration });
  }

  alertSlowAPI(req, duration) {
    console.warn(`Slow API response detected: ${req.method} ${req.path} took ${duration}ms`);
    this.sendAlert('slow_api_response', { method: req.method, path: req.path, duration });
  }

  alertSlowResource(entry) {
    console.warn(`Slow resource loading detected: ${entry.name} took ${entry.duration}ms`);
    this.sendAlert('slow_resource_loading', { name: entry.name, duration: entry.duration });
  }

  // Send alert to monitoring system
  async sendAlert(type, data) {
    try {
      await fetch('/api/monitoring/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data, timestamp: Date.now() })
      });
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  // Get performance summary
  getPerformanceSummary() {
    const summary = {};
    
    for (const [name, metrics] of this.metrics) {
      if (metrics.length > 0) {
        const values = metrics.map(m => m.value);
        summary[name] = {
          count: values.length,
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          p50: this.percentile(values, 0.5),
          p95: this.percentile(values, 0.95),
          p99: this.percentile(values, 0.99)
        };
      }
    }
    
    return summary;
  }

  // Calculate percentile
  percentile(values, p) {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }

  // Cleanup observers
  cleanup() {
    this.observers.forEach(observer => {
      if (observer && observer.disconnect) {
        observer.disconnect();
      }
    });
    this.observers = [];
  }
}

// Create global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

// Auto-cleanup on page unload (client-side)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceMonitor.cleanup();
  });
}

module.exports = {
  PerformanceMonitor,
  performanceMonitor
};
