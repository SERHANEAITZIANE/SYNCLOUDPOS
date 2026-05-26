/*
 * Validation Middleware for Server Actions
 * Provides utilities for validating inputs across server actions
 */

import { AppErrorType, ValidationError } from "@/lib/errors"

// Validation rules and utilities
export interface ValidationRule<T> {
  validate: (value: T, context?: any) => boolean
  message: string
}

export type ValidationSchema<T> = {
  [K in keyof T]?: ValidationRule<T[K]>[]
}

// Common validation rules
export const rules = {
  /**
   * Required field validation
   */
  required: <T>(message = "This field is required"): ValidationRule<T> => ({
    validate: (value) => value !== null && value !== undefined && value !== '',
    message
  }),

  /**
   * String length validation
   */
  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => value.length >= min,
    message: message || `Must be at least ${min} characters long`
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => value.length <= max,
    message: message || `Must be at most ${max} characters long`
  }),

  /**
   * Numeric validation
   */
  min: (min: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value >= min,
    message: message || `Must be at least ${min}`
  }),

  max: (max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value <= max,
    message: message || `Must be at most ${max}`
  }),

  /**
   * Email validation
   */
  email: (message = "Must be a valid email address"): ValidationRule<string> => ({
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message
  }),

  /**
   * Phone number validation
   */
  phone: (message = "Must be a valid phone number"): ValidationRule<string> => ({
    validate: (value) => /^\+?[1-9]\d{1,14}$/.test(value.replace(/\D/g, '')),
    message
  }),

  /**
   * Array validation
   */
  minItems: <T>(min: number, message?: string): ValidationRule<T[]> => ({
    validate: (value) => value.length >= min,
    message: message || `Must contain at least ${min} items`
  }),

  maxItems: <T>(max: number, message?: string): ValidationRule<T[]> => ({
    validate: (value) => value.length <= max,
    message: message || `Must contain at most ${max} items`
  }),

  /**
   * Custom validation function
   */
  custom: <T>(validateFn: (value: T, context?: any) => boolean, message: string): ValidationRule<T> => ({
    validate: validateFn,
    message
  })
}

/**
 * Validates an object against a schema
 * Throws ValidationError if validation fails
 */
export function validate<T>(data: T, schema: ValidationSchema<T>, context?: any): void {
  const errors: { field: string; message: string }[] = []

  for (const [field, fieldRules] of Object.entries(schema)) {
    const value = (data as any)[field]

    if (fieldRules) {
      for (const rule of (fieldRules as any[])) {
        if (!rule.validate(value, context)) {
          errors.push({
            field,
            message: rule.message
          })
          break // Stop at first failed rule for this field
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationError("Validation failed", { errors })
  }
}

/**
 * Creates a validation middleware function
 * Useful for wrapping server actions
 */
export function withValidation<T>(
  schema: ValidationSchema<T>,
  validator: (data: T) => Promise<any>
) {
  return async (data: T) => {
    validate(data, schema)
    return await validator(data)
  }
}