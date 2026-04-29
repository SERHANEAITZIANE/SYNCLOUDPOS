/*
 * Input Sanitizer Utility
 * Provides functions to sanitize user inputs and prevent injection attacks
 */

/**
 * Sanitizes a string input by removing potentially dangerous characters
 * while preserving basic alphanumeric characters and common symbols
 */
export function sanitizeString(input: string): string {
  if (!input) return ''

  // Remove potentially dangerous characters while preserving letters, numbers, spaces, and common symbols
  return input
    .trim()
    .replace(/[^a-zA-Z0-9\s\-_\.'@+()&]/g, '')
}

/**
 * Sanitizes a phone number by keeping only digits and international format indicators
 */
export function sanitizePhone(input: string): string {
  if (!input) return ''

  // Remove all non-digit characters except '+' at the beginning
  return input.replace(/[^\d+]/g, '').replace(/^\++/, '+')
}

/**
 * Sanitizes an email address
 * Note: This doesn't validate the email format, just removes dangerous characters
 */
export function sanitizeEmail(input: string): string {
  if (!input) return ''

  // Keep email-safe characters
  return input.toLowerCase().trim().replace(/[^a-z0-9@._-]/g, '')
}

/**
 * Sanitizes HTML content by removing script tags and dangerous attributes
 * Use for user-generated content that needs to display HTML
 */
export function sanitizeHTML(input: string): string {
  if (!input) return ''

  // Remove script tags
  let sanitized = input.replace(/<script[^>]*?>[\s\S]*?<\/script>/gi, '')

  // Remove dangerous attributes
  sanitized = sanitized.replace(/on\w+\s*=\s*(["']).*?\1/gi, '')

  // Remove javascript: and vbscript: protocols
  sanitized = sanitized.replace(/(javascript|vbscript):/gi, '')

  return sanitized
}

/**
 * Sanitizes a database query parameter
 * Prevents SQL injection by removing potentially dangerous characters
 */
export function sanitizeQuery(input: string): string {
  if (!input) return ''

  // Remove SQL meta-characters
  return input
    .replace(/['";\(\)\{\}\[\]\*\%\-\+\=\\]/g, '')
    .replace(/\b(AND|OR|SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC)\b/gi, '')
}
