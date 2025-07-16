
// Sentry configuration for AfricanMarket error monitoring
// Implements comprehensive error tracking and performance monitoring

const Sentry = require('@sentry/nextjs');

const SentryConfig = {
  // Core configuration
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session replay (user interactions)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Release tracking
  release: process.env.GIT_HASH || `africanmarket@${require('../package.json').version}`,
  
  // Error filtering
  beforeSend(event, hint) {
    // Filter out common non-critical errors
    if (event.exception) {
      const error = hint.originalException;
      
      // Skip network errors
      if (error?.message?.includes('NetworkError') || 
          error?.message?.includes('Failed to fetch')) {
        return null;
      }
      
      // Skip cancelled requests
      if (error?.name === 'AbortError') {
        return null;
      }
      
      // Skip hydration errors in development
      if (process.env.NODE_ENV === 'development' && 
          error?.message?.includes('Hydration')) {
        return null;
      }
    }
    
    return event;
  },
  
  // Performance transaction filtering
  beforeSendTransaction(event) {
    // Skip health check transactions
    if (event.transaction?.includes('/api/health')) {
      return null;
    }
    
    // Skip static asset requests
    if (event.transaction?.includes('/_next/static/')) {
      return null;
    }
    
    return event;
  },
  
  // Additional integrations
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
    new Sentry.Integrations.LocalVariables({
      captureAllExceptions: false,
    }),
  ],
  
  // Debug settings
  debug: process.env.NODE_ENV === 'development',
  
  // User context
  initialScope: {
    tags: {
      component: 'africanmarket',
      version: require('../package.json').version,
    },
  },
};

// Initialize Sentry
function initSentry() {
  if (process.env.SENTRY_DSN) {
    Sentry.init(SentryConfig);
    
    // Set up additional context
    Sentry.setTag('server', typeof window === 'undefined' ? 'server' : 'client');
    
    console.log('Sentry initialized for error monitoring');
  } else {
    console.warn('Sentry DSN not configured - error monitoring disabled');
  }
}

// Custom error reporting functions
const ErrorReporting = {
  // Report application errors
  reportError(error, context = {}) {
    if (process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        // Add context information
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
        
        // Set error level
        scope.setLevel('error');
        
        // Capture the error
        Sentry.captureException(error);
      });
    } else {
      console.error('Application Error:', error, context);
    }
  },
  
  // Report API errors
  reportApiError(error, request, response = {}) {
    this.reportError(error, {
      type: 'api_error',
      method: request.method,
      url: request.url,
      statusCode: response.statusCode,
      userAgent: request.headers?.['user-agent'],
      ip: request.ip,
      userId: request.user?.id,
    });
  },
  
  // Report authentication errors
  reportAuthError(error, context = {}) {
    this.reportError(error, {
      type: 'auth_error',
      ...context,
    });
  },
  
  // Report payment errors
  reportPaymentError(error, paymentData = {}) {
    // Sanitize payment data to remove sensitive information
    const sanitizedData = {
      paymentMethod: paymentData.paymentMethod,
      amount: paymentData.amount,
      currency: paymentData.currency,
      orderId: paymentData.orderId,
      // Don't include card details or tokens
    };
    
    this.reportError(error, {
      type: 'payment_error',
      ...sanitizedData,
    });
  },
  
  // Report performance issues
  reportPerformanceIssue(metric, value, context = {}) {
    if (process.env.SENTRY_DSN) {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `${metric}: ${value}`,
        level: 'info',
        data: context,
      });
    }
  },
  
  // Report business logic errors
  reportBusinessError(message, context = {}) {
    if (process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        scope.setLevel('warning');
        scope.setTag('type', 'business_logic');
        
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
        
        Sentry.captureMessage(message);
      });
    }
  },
  
  // Set user context
  setUserContext(user) {
    if (process.env.SENTRY_DSN) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      });
    }
  },
  
  // Clear user context (on logout)
  clearUserContext() {
    if (process.env.SENTRY_DSN) {
      Sentry.setUser(null);
    }
  },
  
  // Add breadcrumb
  addBreadcrumb(message, category = 'navigation', data = {}) {
    if (process.env.SENTRY_DSN) {
      Sentry.addBreadcrumb({
        message,
        category,
        level: 'info',
        data,
        timestamp: Date.now() / 1000,
      });
    }
  },
  
  // Start transaction for performance monitoring
  startTransaction(name, operation = 'navigation') {
    if (process.env.SENTRY_DSN) {
      return Sentry.startTransaction({
        name,
        op: operation,
      });
    }
    return null;
  },
  
  // Finish transaction
  finishTransaction(transaction, status = 'ok') {
    if (transaction) {
      transaction.setStatus(status);
      transaction.finish();
    }
  },
};

// Performance monitoring
const PerformanceMonitoring = {
  // Monitor page load performance
  monitorPageLoad() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0];
          
          if (navigation) {
            const metrics = {
              domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
              loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
              totalLoadTime: navigation.loadEventEnd - navigation.fetchStart,
              dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
              tcpConnection: navigation.connectEnd - navigation.connectStart,
              serverResponse: navigation.responseEnd - navigation.requestStart,
            };
            
            Object.entries(metrics).forEach(([metric, value]) => {
              if (value > 0) {
                ErrorReporting.reportPerformanceIssue(`page_load_${metric}`, value);
              }
            });
          }
        }, 0);
      });
    }
  },
  
  // Monitor API performance
  monitorApiCall(url, method, startTime) {
    const duration = Date.now() - startTime;
    
    ErrorReporting.reportPerformanceIssue('api_response_time', duration, {
      url,
      method,
    });
    
    // Alert on slow API calls
    if (duration > 5000) {
      ErrorReporting.reportBusinessError('Slow API call detected', {
        url,
        method,
        duration,
      });
    }
  },
  
  // Monitor database query performance
  monitorDatabaseQuery(query, duration, context = {}) {
    ErrorReporting.reportPerformanceIssue('database_query_time', duration, {
      query: query.substring(0, 100), // Truncate long queries
      ...context,
    });
    
    if (duration > 1000) {
      ErrorReporting.reportBusinessError('Slow database query detected', {
        query: query.substring(0, 100),
        duration,
        ...context,
      });
    }
  },
  
  // Monitor memory usage
  monitorMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      
      ErrorReporting.reportPerformanceIssue('memory_usage', usage.heapUsed, {
        heapTotal: usage.heapTotal,
        heapUsed: usage.heapUsed,
        external: usage.external,
        rss: usage.rss,
      });
      
      // Alert on high memory usage (>500MB)
      if (usage.heapUsed > 500 * 1024 * 1024) {
        ErrorReporting.reportBusinessError('High memory usage detected', {
          heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
        });
      }
    }
  },
};

// Express.js error handling middleware
const sentryErrorHandler = (err, req, res, next) => {
  // Report to Sentry
  ErrorReporting.reportApiError(err, req, res);
  
  // Continue with normal error handling
  next(err);
};

// Next.js error boundary
const SentryErrorBoundary = ({ children, fallback }) => {
  if (process.env.SENTRY_DSN) {
    return (
      <Sentry.ErrorBoundary fallback={fallback} showDialog>
        {children}
      </Sentry.ErrorBoundary>
    );
  }
  
  return children;
};

module.exports = {
  SentryConfig,
  initSentry,
  ErrorReporting,
  PerformanceMonitoring,
  sentryErrorHandler,
  SentryErrorBoundary,
};
