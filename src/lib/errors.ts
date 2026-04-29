/*
 * Unified Error Handling
 * Standardizes error types and responses across the application
 */

// Standard error types
export enum AppErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  INTEGRATION = 'INTEGRATION_ERROR',
  DATABASE = 'DATABASE_ERROR',
  SERVER = 'SERVER_ERROR',
  INPUT = 'INPUT_ERROR',
  BUSINESS = 'BUSINESS_LOGIC_ERROR'
}

// Standard error response interface
export interface AppError {
  type: AppErrorType
  message: string
  details?: string | Record<string, any>
  timestamp: string
  correlationId?: string
}

// Base class for application errors
export abstract class AppException extends Error {
  public readonly type: AppErrorType
  public readonly details?: any
  public readonly correlationId?: string
  public readonly timestamp: string

  constructor(type: AppErrorType, message: string, details?: any, correlationId?: string) {
    super(message)
    this.type = type
    this.details = details
    this.correlationId = correlationId
    this.timestamp = new Date().toISOString()

    // Set the prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, new.target.prototype)
  }

  // Convert to plain object for JSON serialization
  toResponse(): AppError {
    return {
      type: this.type,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      correlationId: this.correlationId
    }
  }
}

// Specific error classes
export class ValidationError extends AppException {
  constructor(message: string, details?: any) {
    super(AppErrorType.VALIDATION, message, details)
  }
}

export class AuthenticationError extends AppException {
  constructor(message: string = 'Authentication required') {
    super(AppErrorType.AUTHENTICATION, message)
  }
}

export class AuthorizationError extends AppException {
  constructor(message: string = 'Insufficient permissions') {
    super(AppErrorType.AUTHORIZATION, message)
  }
}

export class NotFoundError extends AppException {
  constructor(entity: string, id?: string) {
    const message = id ? `${entity} with ID ${id} not found` : `${entity} not found`
    super(AppErrorType.NOT_FOUND, message, { entity, id })
  }
}

export class ConflictError extends AppException {
  constructor(message: string, details?: any) {
    super(AppErrorType.CONFLICT, message, details)
  }
}

export class RateLimitError extends AppException {
  constructor(message: string = 'Rate limit exceeded', resetTime?: number) {
    super(AppErrorType.RATE_LIMIT, message, { resetTime })
  }
}

export class IntegrationError extends AppException {
  constructor(service: string, message: string, details?: any) {
    super(AppErrorType.INTEGRATION, `Error communicating with ${service}: ${message}`, details)
  }
}

export class DatabaseError extends AppException {
  constructor(message: string, details?: any) {
    super(AppErrorType.DATABASE, message, details)
  }
}

export class ServerError extends AppException {
  constructor(message: string = 'Internal server error', details?: any) {
    super(AppErrorType.SERVER, message, details)
  }
}

export class InputError extends AppException {
  constructor(message: string, details?: any) {
    super(AppErrorType.INPUT, message, details)
  }
}

export class BusinessLogicError extends AppException {
  constructor(message: string, details?: any) {
    super(AppErrorType.BUSINESS, message, details)
  }
}

// Utility function to handle errors consistently
export function handleAppError(error: unknown, context?: string): AppError {
  // If it's already an AppException, convert to response format
  if (error instanceof AppException) {
    return error.toResponse()
  }

  // Handle Prisma-specific errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as any
    switch (prismaError.code) {
      case 'P2002': // Unique constraint failed
        return new ConflictError(`Duplicate entry: ${prismaError.meta?.target}`)
          .toResponse()
      case 'P2025': // Record not found
        return new NotFoundError(prismaError.meta?.cause || 'Record')
          .toResponse()
      default:
        return new DatabaseError(`Database error: ${prismaError.code}`, {
          code: prismaError.code,
          meta: prismaError.meta
        }).toResponse()
    }
  }

  // Handle NextAuth errors
  if (error instanceof Error && 'type' in error) {
    const authError = error as any
    if (authError.type === 'CredentialsSignin') {
      return new AuthenticationError('Invalid credentials')
        .toResponse()
    }
  }

  // Handle generic errors
  const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'

  // Log unexpected errors
  if (error instanceof Error) {
    console.error('Unexpected error', { error, context })
  }

  // Return generic server error
  return new ServerError(errorMessage).toResponse()
}

// Type guard for AppError
export function isAppError(error: any): error is AppError {
  return error && typeof error === 'object' && 'type' in error && 'message' in error
}
