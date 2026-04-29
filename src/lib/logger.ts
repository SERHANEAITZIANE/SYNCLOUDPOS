/*
 * Centralized Logging Utility
 * Provides structured logging with context and different log levels
 */

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  timestamp: string
  context?: string
  metadata?: Record<string, any>
}

export interface Logger {
  debug(message: string, metadata?: Record<string, any>): void
  info(message: string, metadata?: Record<string, any>): void
  warn(message: string, metadata?: Record<string, any>): void
  error(message: string, metadata?: Record<string, any>): void
}

// Default logger implementation
const defaultLogger: Logger = {
  debug(message: string, metadata?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatLog('debug', message, metadata))
    }
  },

  info(message: string, metadata?: Record<string, any>) {
    console.log(formatLog('info', message, metadata))
  },

  warn(message: string, metadata?: Record<string, any>) {
    console.warn(formatLog('warn', message, metadata))
  },

  error(message: string, metadata?: Record<string, any>) {
    console.error(formatLog('error', message, metadata))
  }
}

function formatLog(level: LogEntry['level'], message: string, metadata?: Record<string, any>): string {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString()
  }

  // Add context from environment if available
  if (typeof window !== 'undefined' && window.location) {
    entry.context = window.location.pathname
  }

  if (metadata) {
    entry.metadata = metadata
  }

  return JSON.stringify(entry)
}

// Create a namespaced logger
export function createLogger(context: string): Logger {
  return {
    debug(message: string, metadata?: Record<string, any>) {
      defaultLogger.debug(message, { ...metadata, context })
    },
    info(message: string, metadata?: Record<string, any>) {
      defaultLogger.info(message, { ...metadata, context })
    },
    warn(message: string, metadata?: Record<string, any>) {
      defaultLogger.warn(message, { ...metadata, context })
    },
    error(message: string, metadata?: Record<string, any>) {
      defaultLogger.error(message, { ...metadata, context })
    }
  }
}

// Export default logger
export default defaultLogger
