
// Comprehensive security configuration for AfricanMarket
// Implements OWASP security best practices

const SecurityConfig = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-eval'", // Required for Next.js development
        "'unsafe-inline'", // Required for some third-party scripts
        "https://js.stripe.com",
        "https://maps.googleapis.com",
        "https://www.googletagmanager.com",
        "https://connect.facebook.net",
        "https://www.google-analytics.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for styled-components and CSS-in-JS
        "https://fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:",
        "https://res.cloudinary.com",
        "https://images.unsplash.com",
        "https://www.google-analytics.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      connectSrc: [
        "'self'",
        "https://api.stripe.com",
        "https://maps.googleapis.com",
        "https://api.cloudinary.com",
        "https://www.google-analytics.com",
        "wss:",
        "ws:"
      ],
      frameSrc: [
        "https://js.stripe.com",
        "https://hooks.stripe.com"
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      manifestSrc: ["'self'"]
    },
    reportOnly: false,
    reportUri: '/api/security/csp-report'
  },

  // HTTP Security Headers
  securityHeaders: {
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Enable XSS protection
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Strict Transport Security
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    
    // Permissions policy
    'Permissions-Policy': [
      'camera=(self)',
      'microphone=(self)',
      'geolocation=(self)',
      'payment=(self)',
      'accelerometer=()',
      'gyroscope=()',
      'magnetometer=()',
      'usb=()'
    ].join(', '),
    
    // Cross-Origin policies
    'Cross-Origin-Embedder-Policy': 'unsafe-none',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Cross-Origin-Resource-Policy': 'cross-origin'
  },

  // CORS Configuration
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.NEXT_PUBLIC_APP_URL] 
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count']
  },

  // Rate Limiting Configuration
  rateLimiting: {
    // General API rate limiting
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // requests per window
      message: 'Too many requests from this IP',
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    },
    
    // Authentication endpoints
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // attempts per window
      message: 'Too many authentication attempts',
      skipSuccessfulRequests: true
    },
    
    // Password reset
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // attempts per window
      message: 'Too many password reset attempts'
    },
    
    // File uploads
    upload: {
      windowMs: 60 * 1000, // 1 minute
      max: 10, // uploads per window
      message: 'Too many upload attempts'
    },
    
    // Payment endpoints
    payment: {
      windowMs: 60 * 1000, // 1 minute
      max: 3, // payments per window
      message: 'Too many payment attempts'
    }
  },

  // Input Validation & Sanitization
  inputValidation: {
    // Maximum payload sizes
    maxPayloadSize: {
      json: '10mb',
      urlencoded: '10mb',
      text: '1mb',
      raw: '50mb' // For file uploads
    },
    
    // Allowed file types for uploads
    allowedFileTypes: {
      images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
      documents: ['.pdf', '.doc', '.docx', '.txt'],
      all: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf', '.doc', '.docx', '.txt']
    },
    
    // Maximum file sizes (in bytes)
    maxFileSize: {
      image: 10 * 1024 * 1024, // 10MB
      document: 25 * 1024 * 1024, // 25MB
      avatar: 2 * 1024 * 1024 // 2MB
    },
    
    // Content filtering
    contentFiltering: {
      enableProfanityFilter: true,
      enableMalwareScanning: true,
      enablePhishingDetection: true
    }
  },

  // Authentication Security
  authentication: {
    // Password requirements
    password: {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      preventCommonPasswords: true,
      preventUserInfoInPassword: true
    },
    
    // Session security
    session: {
      name: 'africanmarket.session',
      secret: process.env.NEXTAUTH_SECRET,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
      }
    },
    
    // JWT settings
    jwt: {
      algorithm: 'HS256',
      expiresIn: '1h',
      issuer: 'africanmarket',
      audience: 'africanmarket-users'
    },
    
    // Account security
    account: {
      maxLoginAttempts: 5,
      lockoutDuration: 30 * 60 * 1000, // 30 minutes
      requireEmailVerification: true,
      enableTwoFactor: true,
      sessionTimeout: 30 * 60 * 1000 // 30 minutes
    }
  },

  // Data Protection
  dataProtection: {
    // Encryption settings
    encryption: {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'pbkdf2',
      iterations: 100000,
      saltLength: 32,
      ivLength: 16
    },
    
    // Data anonymization
    anonymization: {
      enableDataMasking: true,
      piiFields: ['email', 'phone', 'address', 'name'],
      retentionPeriod: 365 * 24 * 60 * 60 * 1000 // 1 year
    },
    
    // Audit logging
    auditLogging: {
      enableAuditTrail: true,
      logSensitiveOperations: true,
      logRetentionDays: 90,
      logLevel: 'info'
    }
  },

  // API Security
  apiSecurity: {
    // API versioning
    versioning: {
      strategy: 'header', // or 'path'
      header: 'API-Version',
      defaultVersion: 'v1'
    },
    
    // Request validation
    requestValidation: {
      validateContentType: true,
      validateContentLength: true,
      validateHeaders: true,
      rejectUnknownFields: true
    },
    
    // Response security
    responseSecurity: {
      hideServerInfo: true,
      removePoweredBy: true,
      sanitizeErrorMessages: true,
      enableResponseSigning: false
    }
  },

  // Security Monitoring
  monitoring: {
    // Intrusion detection
    intrusionDetection: {
      enableBruteForceDetection: true,
      enableSQLInjectionDetection: true,
      enableXSSDetection: true,
      enableCSRFDetection: true,
      enableDOSDetection: true
    },
    
    // Alert thresholds
    alertThresholds: {
      failedLogins: 10,
      suspiciousRequests: 50,
      errorRate: 0.05, // 5%
      responseTime: 2000 // 2 seconds
    },
    
    // Security metrics
    metrics: {
      trackSecurityEvents: true,
      trackVulnerabilities: true,
      trackComplianceStatus: true
    }
  },

  // Compliance settings
  compliance: {
    // GDPR compliance
    gdpr: {
      enableDataSubjectRights: true,
      enableConsentManagement: true,
      enableDataPortability: true,
      enableRightToBeForgotten: true
    },
    
    // PCI DSS (for payment processing)
    pciDss: {
      enableCardDataProtection: true,
      enableSecureTransmission: true,
      enableAccessControl: true,
      enableRegularTesting: true
    }
  }
};

// Helper functions for security implementation
const SecurityHelpers = {
  // Generate CSP header string
  generateCSPHeader(config = SecurityConfig.contentSecurityPolicy) {
    const directives = Object.entries(config.directives)
      .map(([key, values]) => {
        const directive = key.replace(/[A-Z]/g, '-$&').toLowerCase();
        return `${directive} ${values.join(' ')}`;
      })
      .join('; ');
    
    return config.reportOnly ? `${directives}; report-uri ${config.reportUri}` : directives;
  },

  // Validate password strength
  validatePassword(password, requirements = SecurityConfig.authentication.password) {
    const errors = [];
    
    if (password.length < requirements.minLength) {
      errors.push(`Password must be at least ${requirements.minLength} characters`);
    }
    
    if (password.length > requirements.maxLength) {
      errors.push(`Password must be no more than ${requirements.maxLength} characters`);
    }
    
    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (requirements.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (requirements.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Sanitize user input
  sanitizeInput(input, type = 'text') {
    if (typeof input !== 'string') return input;
    
    switch (type) {
      case 'html':
        return input
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
      
      case 'sql':
        return input.replace(/['";\\]/g, '\\$&');
      
      case 'email':
        return input.toLowerCase().trim();
      
      case 'phone':
        return input.replace(/\D/g, '');
      
      default:
        return input.trim();
    }
  }
};

module.exports = { SecurityConfig, SecurityHelpers };
