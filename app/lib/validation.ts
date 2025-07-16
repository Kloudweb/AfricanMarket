
import { z } from 'zod'
import { createError } from '@/lib/error-handler'

// Common validation schemas
export const commonSchemas = {
  id: z.string().min(1, 'ID is required'),
  uuid: z.string().uuid('Invalid UUID format'),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  url: z.string().url('Invalid URL format'),
  coordinate: z.number().min(-180).max(180),
  positiveNumber: z.number().positive('Must be a positive number'),
  nonNegativeNumber: z.number().min(0, 'Must be non-negative'),
  dateString: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    'Invalid date format'
  ),
  mongoId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ID format'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  json: z.string().refine(
    (val) => {
      try {
        JSON.parse(val)
        return true
      } catch {
        return false
      }
    },
    'Invalid JSON format'
  )
}

// User validation schemas
export const userSchemas = {
  register: z.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    phone: commonSchemas.phone.optional(),
    role: z.enum(['USER', 'DRIVER', 'VENDOR', 'ADMIN']).default('USER')
  }),

  login: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password is required')
  }),

  updateProfile: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
    phone: commonSchemas.phone.optional(),
    avatar: commonSchemas.url.optional()
  }),

  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: commonSchemas.password,
    confirmPassword: z.string().min(1, 'Confirm password is required')
  }).refine(
    (data) => data.newPassword === data.confirmPassword,
    {
      message: 'Passwords do not match',
      path: ['confirmPassword']
    }
  )
}

// Ride validation schemas
export const rideSchemas = {
  createRide: z.object({
    pickupLatitude: commonSchemas.coordinate,
    pickupLongitude: commonSchemas.coordinate,
    pickupAddress: z.string().min(1, 'Pickup address is required').max(500, 'Address too long'),
    destinationLatitude: commonSchemas.coordinate,
    destinationLongitude: commonSchemas.coordinate,
    destinationAddress: z.string().min(1, 'Destination address is required').max(500, 'Address too long'),
    rideType: z.enum(['STANDARD', 'PREMIUM', 'SHARED']).default('STANDARD'),
    scheduledAt: commonSchemas.dateString.optional(),
    notes: z.string().max(500, 'Notes too long').optional()
  }),

  updateRideStatus: z.object({
    rideId: commonSchemas.id,
    status: z.enum(['PENDING', 'ACCEPTED', 'DRIVER_ARRIVING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    notes: z.string().max(500, 'Notes too long').optional()
  }),

  rateRide: z.object({
    rideId: commonSchemas.id,
    rating: z.number().min(1).max(5),
    comment: z.string().max(500, 'Comment too long').optional()
  })
}

// Push notification validation schemas
export const pushNotificationSchemas = {
  subscribe: z.object({
    userId: commonSchemas.id,
    subscription: z.object({
      endpoint: commonSchemas.url,
      keys: z.object({
        p256dh: z.string().min(1, 'P256DH key is required'),
        auth: z.string().min(1, 'Auth key is required')
      })
    }),
    deviceInfo: z.object({
      userAgent: z.string().optional(),
      platform: z.string().optional(),
      language: z.string().optional(),
      timezone: z.string().optional()
    }).optional()
  }),

  send: z.object({
    userId: commonSchemas.id,
    type: z.enum(['ride_status', 'safety_alert', 'incoming_call', 'new_message', 'eta_update', 'order_update', 'trip_share', 'promotion']),
    title: z.string().min(1, 'Title is required').max(100, 'Title too long').optional(),
    body: z.string().min(1, 'Body is required').max(500, 'Body too long').optional(),
    data: z.record(z.any()).optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    scheduledAt: commonSchemas.dateString.optional()
  }),

  updatePreferences: z.object({
    userId: commonSchemas.id,
    preferences: z.object({
      orderUpdates: z.boolean().optional(),
      preparationTime: z.boolean().optional(),
      driverAssigned: z.boolean().optional(),
      driverLocation: z.boolean().optional(),
      deliveryConfirmation: z.boolean().optional(),
      promotions: z.boolean().optional(),
      email: z.boolean().optional(),
      sms: z.boolean().optional(),
      push: z.boolean().optional(),
      realTimeUpdates: z.boolean().optional(),
      digest: z.boolean().optional(),
      quietHours: z.boolean().optional(),
      quietHoursStart: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional(),
      quietHoursEnd: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional()
    })
  })
}

// WebSocket validation schemas
export const websocketSchemas = {
  joinRide: z.object({
    rideId: commonSchemas.id
  }),

  sendMessage: z.object({
    rideId: commonSchemas.id,
    content: z.string().min(1, 'Message content is required').max(1000, 'Message too long'),
    type: z.enum(['text', 'image', 'location', 'voice']).default('text'),
    metadata: z.record(z.any()).optional()
  }),

  locationUpdate: z.object({
    rideId: commonSchemas.id,
    latitude: commonSchemas.coordinate,
    longitude: commonSchemas.coordinate,
    speed: commonSchemas.nonNegativeNumber.optional(),
    heading: z.number().min(0).max(360).optional()
  }),

  safetyAlert: z.object({
    rideId: commonSchemas.id,
    alertType: z.enum(['PANIC_BUTTON', 'ROUTE_DEVIATION', 'SPEED_VIOLATION', 'UNUSUAL_STOP', 'EMERGENCY_CONTACT', 'DRIVER_DISTRESS', 'PASSENGER_DISTRESS', 'AUTOMATIC_DETECTION']),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    description: z.string().max(500, 'Description too long').optional(),
    location: z.record(z.any()).optional()
  }),

  callInitiate: z.object({
    rideId: commonSchemas.id,
    calleeId: commonSchemas.id,
    callType: z.enum(['voice', 'video'])
  })
}

// File validation schemas
export const fileSchemas = {
  image: z.object({
    file: z.instanceof(File).refine(
      (file) => file.size <= 5 * 1024 * 1024, // 5MB
      'File size must be less than 5MB'
    ).refine(
      (file) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type),
      'File must be a valid image type (JPEG, PNG, GIF, or WebP)'
    ),
    alt: z.string().max(200, 'Alt text too long').optional()
  }),

  document: z.object({
    file: z.instanceof(File).refine(
      (file) => file.size <= 10 * 1024 * 1024, // 10MB
      'File size must be less than 10MB'
    ).refine(
      (file) => ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type),
      'File must be a valid document type (PDF, DOC, or DOCX)'
    )
  })
}

// Input sanitization utilities
export const sanitizers = {
  html: (input: string): string => {
    // Remove HTML tags and dangerous characters
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>]/g, '') // Remove remaining < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
  },

  sql: (input: string): string => {
    // Basic SQL injection prevention
    return input
      .replace(/['";]/g, '') // Remove quotes and semicolons
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove block comments start
      .replace(/\*\//g, '') // Remove block comments end
      .replace(/\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b/gi, '') // Remove SQL keywords
      .trim()
  },

  xss: (input: string): string => {
    // Cross-site scripting prevention
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim()
  },

  phone: (input: string): string => {
    // Normalize phone number format
    return input.replace(/\D/g, '') // Remove all non-digits
  },

  email: (input: string): string => {
    // Normalize email format
    return input.toLowerCase().trim()
  },

  filename: (input: string): string => {
    // Sanitize filename
    return input
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace invalid characters with underscore
      .replace(/^\.+/, '') // Remove leading dots
      .replace(/\.+$/, '') // Remove trailing dots
      .slice(0, 255) // Limit length
  },

  url: (input: string): string => {
    // Basic URL sanitization
    try {
      const url = new URL(input)
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return ''
      }
      return url.toString()
    } catch {
      return ''
    }
  }
}

// Validation middleware factory
export const createValidationMiddleware = <T>(schema: z.ZodSchema<T>) => {
  return async (data: any, requestId?: string, userId?: string): Promise<T> => {
    try {
      return await schema.parseAsync(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
        
        throw createError.validation(
          'Validation failed',
          { errors: validationErrors },
          requestId,
          userId
        )
      }
      throw error
    }
  }
}

// Request body validation
export const validateRequestBody = async <T>(
  body: any,
  schema: z.ZodSchema<T>,
  requestId?: string,
  userId?: string
): Promise<T> => {
  const validator = createValidationMiddleware(schema)
  return await validator(body, requestId, userId)
}

// Query parameters validation
export const validateQueryParams = async <T>(
  params: any,
  schema: z.ZodSchema<T>,
  requestId?: string,
  userId?: string
): Promise<T> => {
  const validator = createValidationMiddleware(schema)
  return await validator(params, requestId, userId)
}

// File validation
export const validateFile = (
  file: File,
  options: {
    maxSize?: number // in bytes
    allowedTypes?: string[]
    maxFiles?: number
  } = {}
): boolean => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxFiles = 1
  } = options

  // Check file size
  if (file.size > maxSize) {
    throw createError.validation(`File size must be less than ${maxSize / (1024 * 1024)}MB`)
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    throw createError.validation(`File type must be one of: ${allowedTypes.join(', ')}`)
  }

  return true
}

// Content sanitization pipeline
export const sanitizeContent = (content: string, type: 'html' | 'text' | 'sql' = 'text'): string => {
  let sanitized = content

  // Apply XSS protection
  sanitized = sanitizers.xss(sanitized)

  // Apply specific sanitization based on type
  switch (type) {
    case 'html':
      sanitized = sanitizers.html(sanitized)
      break
    case 'sql':
      sanitized = sanitizers.sql(sanitized)
      break
    case 'text':
    default:
      // Text is already XSS protected
      break
  }

  return sanitized
}

// Validation error formatter
export const formatValidationErrors = (errors: z.ZodError['errors']) => {
  return errors.reduce((acc, error) => {
    const field = error.path.join('.')
    acc[field] = error.message
    return acc
  }, {} as Record<string, string>)
}

// Custom validation rules
export const customValidators = {
  isStrongPassword: (password: string): boolean => {
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    const isLongEnough = password.length >= 8

    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && isLongEnough
  },

  isValidCoordinate: (lat: number, lng: number): boolean => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  },

  isValidPhoneNumber: (phone: string): boolean => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    return phoneRegex.test(phone)
  },

  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  isValidUrl: (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  },

  isValidJson: (json: string): boolean => {
    try {
      JSON.parse(json)
      return true
    } catch {
      return false
    }
  }
}

// Rate limiting validation
export const validateRateLimit = (
  key: string,
  limit: number,
  windowMs: number,
  store: Map<string, { count: number; resetTime: number }> = new Map()
): boolean => {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (entry.count >= limit) {
    return false
  }

  entry.count++
  return true
}

// Export all schemas for easy access
export const schemas = {
  common: commonSchemas,
  user: userSchemas,
  ride: rideSchemas,
  pushNotification: pushNotificationSchemas,
  websocket: websocketSchemas,
  file: fileSchemas
}

export default schemas
