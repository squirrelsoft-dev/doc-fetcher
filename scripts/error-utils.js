/**
 * Error handling utilities for doc-fetcher
 * Provides error categorization, retry logic, and adaptive backoff strategies
 * @module error-utils
 */

/**
 * Error categories for different types of fetch failures
 * @enum {string}
 */
const ErrorCategory = {
  RATE_LIMIT: 'RATE_LIMIT',      // HTTP 429 - Too Many Requests
  RETRYABLE: 'RETRYABLE',        // Temporary errors (network, 5xx, timeouts)
  PERMANENT: 'PERMANENT',        // Permanent errors (404, 403, invalid URLs)
  UNKNOWN: 'UNKNOWN',            // Unclassified errors
  EXTRACTION: 'EXTRACTION',      // Content extraction failures
  SAVE_ERROR: 'SAVE_ERROR'       // File save failures
};

/**
 * Categorizes an error based on HTTP status code, error type, and message
 * @param {Error|Object} error - Error object from axios or other source
 * @returns {Object} Categorized error with type, retryable flag, and details
 * @example
 * const result = categorizeError(axiosError);
 * // { category: 'RATE_LIMIT', retryable: true, statusCode: 429, ... }
 */
function categorizeError(error) {
  const statusCode = error?.response?.status || error?.statusCode || null;
  const errorMessage = error?.message || String(error);

  // HTTP 429 - Rate Limit
  if (statusCode === 429) {
    return {
      category: ErrorCategory.RATE_LIMIT,
      retryable: true,
      statusCode,
      message: 'Rate limit exceeded',
      retryAfter: parseRetryAfter(error.response?.headers?.['retry-after']),
      suggestedAction: 'Wait for retry-after period and retry'
    };
  }

  // HTTP 5xx - Server errors (retryable)
  if (statusCode >= 500 && statusCode < 600) {
    return {
      category: ErrorCategory.RETRYABLE,
      retryable: true,
      statusCode,
      message: `Server error: ${statusCode}`,
      suggestedAction: 'Retry with exponential backoff'
    };
  }

  // HTTP 404, 403, 401, 410 - Permanent errors (not retryable)
  if ([404, 403, 401, 410].includes(statusCode)) {
    return {
      category: ErrorCategory.PERMANENT,
      retryable: false,
      statusCode,
      message: `Permanent error: ${statusCode}`,
      suggestedAction: 'Skip this URL and continue'
    };
  }

  // Network errors (ECONNREFUSED, ETIMEDOUT, ENOTFOUND, etc.)
  const networkErrorCodes = [
    'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET',
    'EHOSTUNREACH', 'ENETUNREACH', 'EAI_AGAIN'
  ];

  if (error?.code && networkErrorCodes.includes(error.code)) {
    return {
      category: ErrorCategory.RETRYABLE,
      retryable: true,
      statusCode: null,
      errorCode: error.code,
      message: `Network error: ${error.code}`,
      suggestedAction: 'Retry with exponential backoff'
    };
  }

  // Timeout errors
  if (errorMessage.toLowerCase().includes('timeout')) {
    return {
      category: ErrorCategory.RETRYABLE,
      retryable: true,
      statusCode,
      message: 'Request timeout',
      suggestedAction: 'Retry with increased timeout'
    };
  }

  // HTTP 3xx redirect errors (should be handled by axios, but just in case)
  if (statusCode >= 300 && statusCode < 400) {
    return {
      category: ErrorCategory.RETRYABLE,
      retryable: true,
      statusCode,
      message: 'Redirect error',
      suggestedAction: 'Follow redirects or retry'
    };
  }

  // HTTP 400, 405, 406, 408, etc. - Client errors (mostly permanent)
  if (statusCode >= 400 && statusCode < 500 && statusCode !== 408 && statusCode !== 429) {
    // 408 Request Timeout is retryable
    if (statusCode === 408) {
      return {
        category: ErrorCategory.RETRYABLE,
        retryable: true,
        statusCode,
        message: 'Request timeout',
        suggestedAction: 'Retry with exponential backoff'
      };
    }

    return {
      category: ErrorCategory.PERMANENT,
      retryable: false,
      statusCode,
      message: `Client error: ${statusCode}`,
      suggestedAction: 'Skip this URL and continue'
    };
  }

  // Unknown errors - default to retryable for safety
  return {
    category: ErrorCategory.UNKNOWN,
    retryable: true,
    statusCode,
    message: errorMessage,
    suggestedAction: 'Retry with caution'
  };
}

/**
 * Parses the Retry-After HTTP header value
 * Supports both delay-seconds format (integer) and HTTP-date format (string)
 * @param {string|number|undefined} retryAfterHeader - Value of Retry-After header
 * @returns {number|null} Delay in milliseconds, or null if header is invalid/missing
 * @example
 * parseRetryAfter('60') // 60000 (60 seconds)
 * parseRetryAfter('Wed, 21 Oct 2025 07:28:00 GMT') // milliseconds until that date
 */
function parseRetryAfter(retryAfterHeader) {
  if (!retryAfterHeader) {
    return null;
  }

  // Try parsing as integer (delay-seconds format)
  const delaySeconds = parseInt(retryAfterHeader, 10);
  if (!isNaN(delaySeconds) && delaySeconds > 0) {
    return delaySeconds * 1000; // Convert to milliseconds
  }

  // Try parsing as HTTP-date format
  try {
    const retryDate = new Date(retryAfterHeader);
    if (!isNaN(retryDate.getTime())) {
      const delay = retryDate.getTime() - Date.now();
      return delay > 0 ? delay : null;
    }
  } catch (e) {
    // Invalid date format
  }

  return null;
}

/**
 * Calculates adaptive exponential backoff delay with jitter
 * Implements exponential backoff: baseDelay * 2^retryCount, capped at maxDelay
 * Adds random jitter to prevent thundering herd problem
 *
 * @param {number} retryCount - Current retry attempt (0-indexed)
 * @param {Object} error - Categorized error object (optional, for error-specific delays)
 * @param {Object} options - Configuration options
 * @param {number} [options.baseDelay=1000] - Base delay in milliseconds
 * @param {number} [options.maxDelay=30000] - Maximum delay in milliseconds
 * @param {number} [options.jitterMax=1000] - Maximum random jitter in milliseconds
 * @returns {number} Delay in milliseconds
 * @example
 * adaptiveBackoff(0) // ~1000-2000ms (1s base + jitter)
 * adaptiveBackoff(3) // ~8000-9000ms (8s base + jitter)
 * adaptiveBackoff(10) // ~30000-31000ms (capped at max)
 */
function adaptiveBackoff(retryCount, error = null, options = {}) {
  const {
    baseDelay = 1000,
    maxDelay = 30000,
    jitterMax = 1000
  } = options;

  // For rate limit errors with Retry-After, use that value
  if (error?.category === ErrorCategory.RATE_LIMIT && error.retryAfter) {
    // Add small jitter to retry-after value
    const jitter = Math.random() * Math.min(jitterMax, 2000);
    return error.retryAfter + jitter;
  }

  // Exponential backoff: baseDelay * 2^retryCount
  const exponentialDelay = baseDelay * Math.pow(2, retryCount);

  // Cap at maximum delay
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Add random jitter (0 to jitterMax)
  const jitter = Math.random() * jitterMax;

  return Math.floor(cappedDelay + jitter);
}

/**
 * Determines if an error should trigger a retry
 * @param {Object} categorizedError - Error object from categorizeError()
 * @param {number} currentRetryCount - Current number of retries attempted
 * @param {number} maxRetries - Maximum number of retries allowed
 * @returns {boolean} True if should retry, false otherwise
 */
function shouldRetry(categorizedError, currentRetryCount, maxRetries) {
  // Don't retry if max retries exceeded
  if (currentRetryCount >= maxRetries) {
    return false;
  }

  // Don't retry permanent errors
  if (!categorizedError.retryable) {
    return false;
  }

  return true;
}

/**
 * Formats error details for user-friendly display
 * @param {Object} categorizedError - Error object from categorizeError()
 * @param {string} url - URL that failed
 * @returns {string} Formatted error message
 */
function formatErrorMessage(categorizedError, url) {
  const { category, statusCode, message, suggestedAction } = categorizedError;

  let prefix = '';
  switch (category) {
    case ErrorCategory.RATE_LIMIT:
      prefix = '⏱️  Rate Limit';
      break;
    case ErrorCategory.RETRYABLE:
      prefix = '🔄 Temporary Error';
      break;
    case ErrorCategory.PERMANENT:
      prefix = '❌ Permanent Error';
      break;
    default:
      prefix = '⚠️  Unknown Error';
  }

  const statusInfo = statusCode ? ` (HTTP ${statusCode})` : '';
  const urlShort = url.length > 60 ? url.substring(0, 57) + '...' : url;

  return `${prefix}${statusInfo}: ${message}\n   URL: ${urlShort}\n   Action: ${suggestedAction}`;
}

/**
 * Aggregates multiple errors into a summary
 * @param {Array<Object>} errors - Array of { url, error } objects
 * @returns {Object} Summary with counts by category
 */
function summarizeErrors(errors) {
  const summary = {
    total: errors.length,
    byCategory: {
      [ErrorCategory.RATE_LIMIT]: 0,
      [ErrorCategory.RETRYABLE]: 0,
      [ErrorCategory.PERMANENT]: 0,
      [ErrorCategory.UNKNOWN]: 0,
      [ErrorCategory.EXTRACTION]: 0,
      [ErrorCategory.SAVE_ERROR]: 0
    },
    details: []
  };

  errors.forEach(({ url, error }) => {
    const categorized = typeof error === 'object' && error.category
      ? error
      : categorizeError(error);

    summary.byCategory[categorized.category]++;
    summary.details.push({
      url,
      category: categorized.category,
      message: categorized.message,
      statusCode: categorized.statusCode
    });
  });

  return summary;
}

export {
  ErrorCategory,
  categorizeError,
  parseRetryAfter,
  adaptiveBackoff,
  shouldRetry,
  formatErrorMessage,
  summarizeErrors
};
