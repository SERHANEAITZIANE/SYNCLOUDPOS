/*
 * Server Action Validation Wrapper
 * Provides a standardized way to validate inputs for server actions
 */

import { validate, ValidationSchema } from "@/lib/validation"
import { handleAppError } from "@/lib/errors"
import logger from "@/lib/logger"

/**
 * Creates a server action with validation
 * Wraps a server action function with input validation
 * @param schema Validation schema for the input data
 * @param action The server action function
 * @param actionName Optional name for logging purposes
 */
export function createValidatedAction<Input, Output>(
  schema: ValidationSchema<Input>,
  action: (input: Input) => Promise<Output>,
  actionName?: string
): (input: Input) => Promise<Output | { error: string }> {

  return async (input: Input) => {
    const name = actionName || 'ServerAction'

    try {
      // Validate input against schema
      validate(input, schema)

      // Execute the action
      return await action(input)

    } catch (error) {
      // Handle validation and other errors
      const appError = handleAppError(error, name)

      // Log the error
      logger.error(`${name} failed`, {
        error: appError,
        input: sanitizeInputForLogging(input)
      })

      // Return error response
      return { error: appError.message }
    }
  }
}

/**
 * Sanitizes input data for logging to avoid logging sensitive information
 */
function sanitizeInputForLogging<Input>(input: Input): Partial<Input> {
  if (!input || typeof input !== 'object') return input

  const sanitized = { ...input }

  // Redact sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'whatsappToken']
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      (sanitized as any)[field] = '[REDACTED]'
    }
  }

  return sanitized
}

/**
 * Validates and executes a server action
 * Alternative to createValidatedAction for one-off validations
 */
export async function validateAndExecute<Input, Output>(
  input: Input,
  schema: ValidationSchema<Input>,
  action: (input: Input) => Promise<Output>,
  actionName?: string
): Promise<Output | { error: string }> {
  return createValidatedAction(schema, action, actionName)(input)
}