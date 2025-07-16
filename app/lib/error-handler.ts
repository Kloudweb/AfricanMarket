
import { NextResponse } from 'next/server'
import React from 'react'
import { prisma } from '@/lib/db'

// Error types
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
  PUSH_NOTIFICATION_ERROR = 'PUSH_NOTIFICATION_ERROR'
}

// Custom error class
export class AppError extends Error {
  public readonly type: ErrorType
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly timestamp: Date
  public readonly requestId?: string
  public readonly userId?: string
  public readonly details?: any

  constructor(
    type: ErrorType,
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any,
    requestId?: string,
    userId?: string
  ) {
    super(message)
    
    this.type = type
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.timestamp = new Date()
    this.requestId = requestId
    this.userId = userId
    this.details = details
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor)
  }
}

// Error factory functions
export const createError = {
  validation: (message: string, details?: any, requestId?: string, userId?: string) =>
    new AppError(ErrorType.VALIDATION_ERROR, message, 400, true, details, requestId, userId),
  
  authentication: (message: string = 'Authentication required', requestId?: string, userId?: string) =>
    new AppError(ErrorType.AUTHENTICATION_ERROR, message, 401, true, undefined, requestId, userId),
  
  authorization: (message: string = 'Access denied', requestId?: string, userId?: string) =>
    new AppError(ErrorType.AUTHORIZATION_ERROR, message, 403, true, undefined, requestId, userId),
  
  notFound: (resource: string, requestId?: string, userId?: string) =>
    new AppError(ErrorType.NOT_FOUND_ERROR, `${resource} not found`, 404, true, undefined, requestId, userId),
  
  rateLimit: (message: string = 'Rate limit exceeded', requestId?: string, userId?: string) =>
    new AppError(ErrorType.RATE_LIMIT_ERROR, message, 429, true, undefined, requestId, userId),
  
  database: (message: string, originalError?: Error, requestId?: string, userId?: string) =>
    new AppError(ErrorType.DATABASE_ERROR, message, 500, true, { originalError: originalError?.message }, requestId, userId),
  
  externalService: (service: string, message: string, requestId?: string, userId?: string) =>
    new AppError(ErrorType.EXTERNAL_SERVICE_ERROR, `${service}: ${message}`, 503, true, { service }, requestId, userId),
  
  websocket: (message: string, details?: any, requestId?: string, userId?: string) =>
    new AppError(ErrorType.WEBSOCKET_ERROR, message, 500, true, details, requestId, userId),
  
  pushNotification: (message: string, details?: any, requestId?: string, userId?: string) =>
    new AppError(ErrorType.PUSH_NOTIFICATION_ERROR, message, 500, true, details, requestId, userId),
  
  internal: (message: string = 'Internal server error', originalError?: Error, requestId?: string, userId?: string) =>
    new AppError(ErrorType.INTERNAL_SERVER_ERROR, message, 500, false, { originalError: originalError?.message }, requestId, userId)
}

// Error handler middleware for API routes
export const handleApiError = (error: any, requestId?: string, userId?: string): NextResponse => {
  // Log the error
  logger.error('API Error occurred', {
    error: error.message,
    stack: error.stack,
    type: error.type || 'UNKNOWN',
    statusCode: error.statusCode || 500,
    requestId,
    userId,
    timestamp: new Date().toISOString()
  })

  // If it's an AppError, use its properties
  if (error instanceof AppError) {
    return NextResponse.json({
      error: {
        type: error.type,
        message: error.message,
        statusCode: error.statusCode,
        timestamp: error.timestamp,
        requestId: error.requestId,
        ...(process.env.NODE_ENV === 'development' && { details: error.details })
      }
    }, { status: error.statusCode })
  }

  // Handle Prisma errors
  if (error.code) {
    return handlePrismaError(error, requestId, userId)
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return NextResponse.json({
      error: {
        type: ErrorType.VALIDATION_ERROR,
        message: 'Validation failed',
        statusCode: 400,
        timestamp: new Date(),
        requestId,
        ...(process.env.NODE_ENV === 'development' && { details: error.details })
      }
    }, { status: 400 })
  }

  // Default to internal server error
  return NextResponse.json({
    error: {
      type: ErrorType.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      statusCode: 500,
      timestamp: new Date(),
      requestId,
      ...(process.env.NODE_ENV === 'development' && { originalError: error.message })
    }
  }, { status: 500 })
}

// Handle Prisma specific errors
const handlePrismaError = (error: any, requestId?: string, userId?: string): NextResponse => {
  const statusCode = getPrismaErrorStatusCode(error.code)
  const message = getPrismaErrorMessage(error.code)
  
  return NextResponse.json({
    error: {
      type: ErrorType.DATABASE_ERROR,
      message,
      statusCode,
      timestamp: new Date(),
      requestId,
      ...(process.env.NODE_ENV === 'development' && { 
        prismaCode: error.code,
        details: error.message 
      })
    }
  }, { status: statusCode })
}

// Map Prisma error codes to HTTP status codes
const getPrismaErrorStatusCode = (code: string): number => {
  switch (code) {
    case 'P2002': return 409 // Unique constraint violation
    case 'P2025': return 404 // Record not found
    case 'P2003': return 400 // Foreign key constraint
    case 'P2004': return 400 // Constraint failed
    case 'P2011': return 400 // Null constraint violation
    case 'P2012': return 400 // Missing required value
    case 'P2014': return 400 // Invalid ID
    case 'P2015': return 404 // Related record not found
    case 'P2016': return 400 // Query interpretation error
    case 'P2017': return 400 // Records not connected
    case 'P2018': return 404 // Required connected records not found
    case 'P2019': return 400 // Input error
    case 'P2020': return 400 // Value out of range
    case 'P2021': return 404 // Table not found
    case 'P2022': return 404 // Column not found
    default: return 500
  }
}

// Map Prisma error codes to user-friendly messages
const getPrismaErrorMessage = (code: string): string => {
  switch (code) {
    case 'P2002': return 'A record with this information already exists'
    case 'P2025': return 'The requested record was not found'
    case 'P2003': return 'This operation violates a database constraint'
    case 'P2004': return 'A constraint failed on the database'
    case 'P2011': return 'A required field is missing'
    case 'P2012': return 'A required value is missing'
    case 'P2014': return 'The provided ID is invalid'
    case 'P2015': return 'A related record could not be found'
    case 'P2016': return 'Query interpretation error'
    case 'P2017': return 'The records are not connected'
    case 'P2018': return 'Required connected records not found'
    case 'P2019': return 'Input error'
    case 'P2020': return 'Value out of range for the field type'
    case 'P2021': return 'The table does not exist in the current database'
    case 'P2022': return 'The column does not exist in the current database'
    default: return 'A database error occurred'
  }
}

// Logger utility
export const logger = {
  error: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString()
    const logEntry = {
      level: 'ERROR',
      message,
      timestamp,
      ...meta
    }
    
    console.error(JSON.stringify(logEntry))
    
    // In production, you might want to send to external logging service
    if (process.env.NODE_ENV === 'production') {
      // Send to external logging service like Winston, Sentry, etc.
    }
  },
  
  warn: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString()
    const logEntry = {
      level: 'WARN',
      message,
      timestamp,
      ...meta
    }
    
    console.warn(JSON.stringify(logEntry))
  },
  
  info: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString()
    const logEntry = {
      level: 'INFO',
      message,
      timestamp,
      ...meta
    }
    
    console.info(JSON.stringify(logEntry))
  },
  
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString()
      const logEntry = {
        level: 'DEBUG',
        message,
        timestamp,
        ...meta
      }
      
      console.debug(JSON.stringify(logEntry))
    }
  }
}

// Error boundary for React components
export const createErrorBoundary = (fallback: React.ComponentType<{error: Error}>) => {
  return class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
    state = { hasError: false, error: null }
    
    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error }
    }
    
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      logger.error('React Error Boundary caught an error', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      })
    }
    
    render() {
      if (this.state.hasError && this.state.error) {
        return React.createElement(fallback, { error: this.state.error })
      }
      
      return this.props.children
    }
  }
}

// Async error handler for promises
export const handleAsyncError = async <T>(
  promise: Promise<T>,
  errorMessage?: string,
  requestId?: string,
  userId?: string
): Promise<T> => {
  try {
    return await promise
  } catch (error) {
    const errorObj = error as Error
    logger.error(errorMessage || 'Async operation failed', {
      error: errorObj.message,
      stack: errorObj.stack,
      requestId,
      userId,
      timestamp: new Date().toISOString()
    })
    
    throw error instanceof AppError ? error : createError.internal(
      errorMessage || 'Async operation failed',
      errorObj,
      requestId,
      userId
    )
  }
}

// Request ID generator
export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Health check utility
export const healthCheck = {
  database: async (): Promise<boolean> => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      logger.error('Database health check failed', { error: (error as Error).message })
      return false
    }
  },
  
  external: async (service: string, url: string): Promise<boolean> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(url, { 
        method: 'HEAD', 
        signal: controller.signal 
      })
      
      clearTimeout(timeoutId)
      return response.ok
    } catch (error) {
      logger.error(`External service health check failed for ${service}`, { error: (error as Error).message })
      return false
    }
  }
}
