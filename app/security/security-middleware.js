
// Security middleware for AfricanMarket application
// Implements comprehensive security measures

const helmet = require('helmet');
const cors = require('cors');
const RateLimiter = require('./rate-limiter');
const { SecurityConfig, SecurityHelpers } = require('./security-config');

class SecurityMiddleware {
  constructor() {
    this.rateLimiter = new RateLimiter();
    this.suspiciousIPs = new Set();
    this.blockedIPs = new Set();
  }

  // Initialize all security middleware
  initializeAll() {
    return [
      this.helmetSecurity(),
      this.corsSetup(),
      this.rateLimitingSetup(),
      this.inputValidation(),
      this.sqlInjectionProtection(),
      this.xssProtection(),
      this.csrfProtection(),
      this.securityHeaders(),
      this.ipFiltering(),
      this.requestLogging()
    ];
  }

  // Helmet security configuration
  helmetSecurity() {
    return helmet({
      contentSecurityPolicy: {
        directives: SecurityConfig.contentSecurityPolicy.directives,
        reportOnly: SecurityConfig.contentSecurityPolicy.reportOnly
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      frameguard: { action: 'deny' },
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hidePoweredBy: true
    });
  }

  // CORS setup
  corsSetup() {
    return cors(SecurityConfig.cors);
  }

  // Rate limiting setup
  rateLimitingSetup() {
    return (req, res, next) => {
      // Apply different rate limits based on endpoint
      if (req.path.startsWith('/api/auth/')) {
        return this.rateLimiter.createLimiter('auth')(req, res, next);
      } else if (req.path.startsWith('/api/payments/')) {
        return this.rateLimiter.createLimiter('payment')(req, res, next);
      } else if (req.path.includes('upload')) {
        return this.rateLimiter.createLimiter('upload')(req, res, next);
      } else if (req.path.includes('password-reset')) {
        return this.rateLimiter.createLimiter('passwordReset')(req, res, next);
      } else {
        return this.rateLimiter.createLimiter('api')(req, res, next);
      }
    };
  }

  // Input validation middleware
  inputValidation() {
    return (req, res, next) => {
      try {
        // Validate content type
        if (req.method !== 'GET' && req.headers['content-type']) {
          const contentType = req.headers['content-type'].split(';')[0];
          const allowedTypes = [
            'application/json',
            'application/x-www-form-urlencoded',
            'multipart/form-data',
            'text/plain'
          ];
          
          if (!allowedTypes.includes(contentType)) {
            return res.status(400).json({ error: 'Invalid content type' });
          }
        }

        // Validate content length
        const contentLength = parseInt(req.headers['content-length'] || '0');
        const maxSize = this.getMaxPayloadSize(req.headers['content-type']);
        
        if (contentLength > maxSize) {
          return res.status(413).json({ error: 'Payload too large' });
        }

        // Sanitize input data
        if (req.body && typeof req.body === 'object') {
          req.body = this.sanitizeObject(req.body);
        }

        // Validate query parameters
        if (req.query && typeof req.query === 'object') {
          req.query = this.sanitizeObject(req.query);
        }

        next();
      } catch (error) {
        console.error('Input validation error:', error);
        res.status(400).json({ error: 'Invalid input' });
      }
    };
  }

  // SQL injection protection
  sqlInjectionProtection() {
    return (req, res, next) => {
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
        /(;|\s)(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|EXEC)\s/gi,
        /('|(\\');|(\\');|(\|\|))/gi,
        /-(-|=|\+|\s)/gi
      ];

      const checkForSQLI = (obj) => {
        for (const key in obj) {
          if (typeof obj[key] === 'string') {
            for (const pattern of sqlPatterns) {
              if (pattern.test(obj[key])) {
                return true;
              }
            }
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            if (checkForSQLI(obj[key])) return true;
          }
        }
        return false;
      };

      if ((req.body && checkForSQLI(req.body)) || 
          (req.query && checkForSQLI(req.query)) ||
          (req.params && checkForSQLI(req.params))) {
        
        this.logSecurityEvent(req, 'SQL_INJECTION_ATTEMPT');
        return res.status(400).json({ error: 'Invalid request' });
      }

      next();
    };
  }

  // XSS protection
  xssProtection() {
    return (req, res, next) => {
      const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<img[^>]+src[\\s]*=[\\s]*[\"']javascript:/gi
      ];

      const checkForXSS = (obj) => {
        for (const key in obj) {
          if (typeof obj[key] === 'string') {
            for (const pattern of xssPatterns) {
              if (pattern.test(obj[key])) {
                return true;
              }
            }
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            if (checkForXSS(obj[key])) return true;
          }
        }
        return false;
      };

      if ((req.body && checkForXSS(req.body)) || 
          (req.query && checkForXSS(req.query))) {
        
        this.logSecurityEvent(req, 'XSS_ATTEMPT');
        return res.status(400).json({ error: 'Invalid request' });
      }

      next();
    };
  }

  // CSRF protection
  csrfProtection() {
    return (req, res, next) => {
      // Skip CSRF for GET requests and API endpoints with API keys
      if (req.method === 'GET' || req.headers['x-api-key']) {
        return next();
      }

      // Check for CSRF token in header or body
      const token = req.headers['x-csrf-token'] || 
                   req.body?.csrfToken || 
                   req.query?.csrfToken;

      // For now, we'll implement a simple CSRF check
      // In production, use a proper CSRF library like 'csurf'
      if (!token && req.method !== 'GET') {
        // For API requests, require proper authentication
        if (req.path.startsWith('/api/') && !req.headers.authorization) {
          return res.status(403).json({ error: 'CSRF token required' });
        }
      }

      next();
    };
  }

  // Additional security headers
  securityHeaders() {
    return (req, res, next) => {
      // Set security headers
      Object.entries(SecurityConfig.securityHeaders).forEach(([key, value]) => {
        res.setHeader(key, Array.isArray(value) ? value.join(', ') : value);
      });

      // Remove sensitive headers
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      next();
    };
  }

  // IP filtering and blocking
  ipFiltering() {
    return (req, res, next) => {
      const clientIP = this.getClientIP(req);

      // Check if IP is blocked
      if (this.blockedIPs.has(clientIP)) {
        this.logSecurityEvent(req, 'BLOCKED_IP_ACCESS');
        return res.status(403).json({ error: 'Access denied' });
      }

      // Check if IP is suspicious
      if (this.suspiciousIPs.has(clientIP)) {
        // Add extra scrutiny for suspicious IPs
        res.setHeader('X-Security-Level', 'high');
      }

      // Update IP reputation based on request patterns
      this.updateIPReputation(clientIP, req);

      next();
    };
  }

  // Request logging for security monitoring
  requestLogging() {
    return (req, res, next) => {
      const startTime = Date.now();

      // Log security-relevant information
      const logData = {
        timestamp: new Date().toISOString(),
        ip: this.getClientIP(req),
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer,
        userId: req.user?.id,
        sessionId: req.sessionID
      };

      // Log to security monitoring system
      this.logSecurityEvent(req, 'REQUEST', logData);

      // Monitor response
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        // Log suspicious patterns
        if (res.statusCode >= 400) {
          this.logSecurityEvent(req, 'ERROR_RESPONSE', {
            ...logData,
            statusCode: res.statusCode,
            duration
          });
        }

        // Detect potential attacks based on response patterns
        this.detectAttackPatterns(req, res, duration);
      });

      next();
    };
  }

  // Helper methods

  getClientIP(req) {
    return req.ip ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           'unknown';
  }

  getMaxPayloadSize(contentType) {
    const config = SecurityConfig.inputValidation.maxPayloadSize;
    
    if (contentType?.includes('application/json')) {
      return this.parseSize(config.json);
    } else if (contentType?.includes('multipart/form-data')) {
      return this.parseSize(config.raw);
    } else if (contentType?.includes('text/')) {
      return this.parseSize(config.text);
    }
    
    return this.parseSize(config.urlencoded);
  }

  parseSize(sizeStr) {
    const units = { kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
    const match = sizeStr.match(/^(\d+)(\w+)$/);
    
    if (match) {
      const [, size, unit] = match;
      return parseInt(size) * (units[unit.toLowerCase()] || 1);
    }
    
    return parseInt(sizeStr) || 0;
  }

  sanitizeObject(obj) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = SecurityHelpers.sanitizeInput(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = Array.isArray(value) 
          ? value.map(item => typeof item === 'string' ? SecurityHelpers.sanitizeInput(item) : item)
          : this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  updateIPReputation(ip, req) {
    // Implement IP reputation scoring
    // This would typically integrate with external threat intelligence
  }

  detectAttackPatterns(req, res, duration) {
    // Detect potential DDoS
    if (duration > 5000) {
      this.logSecurityEvent(req, 'SLOW_REQUEST', { duration });
    }

    // Detect scanning attempts
    if (res.statusCode === 404 && req.url.includes('..')) {
      this.logSecurityEvent(req, 'DIRECTORY_TRAVERSAL_ATTEMPT');
    }

    // Detect brute force attempts
    if (res.statusCode === 401 && req.path.includes('auth')) {
      this.logSecurityEvent(req, 'AUTHENTICATION_FAILURE');
    }
  }

  logSecurityEvent(req, eventType, data = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      type: eventType,
      ip: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      url: req.url,
      method: req.method,
      userId: req.user?.id,
      ...data
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Security Event:', event);
    }

    // In production, send to security monitoring service
    // Example: Sentry, DataDog, custom logging service
    if (process.env.NODE_ENV === 'production') {
      // this.sendToSecurityMonitoring(event);
    }
  }
}

module.exports = SecurityMiddleware;
