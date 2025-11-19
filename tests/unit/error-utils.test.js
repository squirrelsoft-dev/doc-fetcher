/**
 * Unit tests for error-utils module
 * Tests error categorization, retry logic, and adaptive backoff
 */

import { describe, it, expect } from '@jest/globals';
import {
  ErrorCategory,
  categorizeError,
  parseRetryAfter,
  adaptiveBackoff,
  shouldRetry,
  formatErrorMessage,
  summarizeErrors
} from '../../scripts/error-utils.js';

describe('error-utils', () => {
  describe('categorizeError', () => {
    describe('Rate Limit Errors (429)', () => {
      it('should categorize HTTP 429 as RATE_LIMIT', () => {
        const error = {
          response: {
            status: 429,
            headers: { 'retry-after': '60' }
          },
          message: 'Too Many Requests'
        };

        const result = categorizeError(error);

        expect(result.category).toBe(ErrorCategory.RATE_LIMIT);
        expect(result.retryable).toBe(true);
        expect(result.statusCode).toBe(429);
        expect(result.retryAfter).toBe(60000); // 60 seconds in ms
      });

      it('should categorize 429 without Retry-After header', () => {
        const error = {
          response: { status: 429, headers: {} },
          message: 'Too Many Requests'
        };

        const result = categorizeError(error);

        expect(result.category).toBe(ErrorCategory.RATE_LIMIT);
        expect(result.retryAfter).toBeNull();
      });
    });

    describe('Server Errors (5xx)', () => {
      it('should categorize HTTP 500 as RETRYABLE', () => {
        const error = {
          response: { status: 500 },
          message: 'Internal Server Error'
        };

        const result = categorizeError(error);

        expect(result.category).toBe(ErrorCategory.RETRYABLE);
        expect(result.retryable).toBe(true);
        expect(result.statusCode).toBe(500);
      });

      it('should categorize HTTP 502 Bad Gateway as RETRYABLE', () => {
        const error = {
          response: { status: 502 },
          message: 'Bad Gateway'
        };

        const result = categorizeError(error);

        expect(result.category).toBe(ErrorCategory.RETRYABLE);
        expect(result.retryable).toBe(true);
      });

      it('should categorize HTTP 503 Service Unavailable as RETRYABLE', () => {
        const error = {
          response: { status: 503 },
          message: 'Service Unavailable'
        };

        const result = categorizeError(error);

        expect(result.category).toBe(ErrorCategory.RETRYABLE);
        expect(result.retryable).toBe(true);
      });
    });

    describe('Permanent Client Errors (4xx)', () => {
      it('should categorize HTTP 404 as PERMANENT', () => {
        const error = {
          response: { status: 404 },
          message: 'Not Found'
        };

        const result = categorizeError(error);

        expect(result.category).toBe(ErrorCategory.PERMANENT);
        expect(result.retryable).toBe(false);
        expect(result.statusCode).toBe(404);
      });

      it('should categorize HTTP 403 as PERMANENT', () => {
        const error = {
          response: { status: 403 },
          message: 'Forbidden'
        };

        const result = categorizeError(error);

        expect(result.category).toBe(ErrorCategory.PERMANENT);
        expect(result.retryable).toBe(false);
      });

      it('should categorize HTTP 401 as PERMANENT', () => {
        const error = {
          response: { status: 401 },
          message: 'Unauthorized'
        };

        const result = categorizeError(error);

        expect(result.category).toBe(ErrorCategory.PERMANENT);
        expect(result.retryable).toBe(false);
      });

      it('should categorize HTTP 410 Gone as PERMANENT', () => {
        const error = {
          response: { status: 410 },
          message: 'Gone'
        };

        const result = categorizeError(error);

        expect(result.category).toBe(ErrorCategory.PERMANENT);
        expect(result.retryable).toBe(false);
      });
    });

    describe('Retryable Client Errors', () => {
      it('should categorize HTTP 408 Request Timeout as RETRYABLE', () => {
        const error = {
          response: { status: 408 },
          message: 'Request Timeout'
        };

        const result = categorizeError(error);

        expect(result.category).toBe(ErrorCategory.RETRYABLE);
        expect(result.retryable).toBe(true);
        expect(result.statusCode).toBe(408);
      });
    });

    describe('Network Errors', () => {
      it('should categorize ECONNREFUSED as RETRYABLE', () => {
        const error = {
          code: 'ECONNREFUSED',
          message: 'Connection refused'
        };

        const result = categorizeError(error);

        expect(result.category).toBe(ErrorCategory.RETRYABLE);
        expect(result.retryable).toBe(true);
        expect(result.errorCode).toBe('ECONNREFUSED');
      });

      it('should categorize ETIMEDOUT as RETRYABLE', () => {
        const error = {
          code: 'ETIMEDOUT',
          message: 'Connection timed out'
        };

        const result = categorizeError(error);

        expect(result.category).toBe(ErrorCategory.RETRYABLE);
        expect(result.retryable).toBe(true);
      });

      it('should categorize ENOTFOUND as RETRYABLE', () => {
        const error = {
          code: 'ENOTFOUND',
          message: 'DNS lookup failed'
        };

        const result = categorizeError(error);

        expect(result.category).toBe(ErrorCategory.RETRYABLE);
        expect(result.retryable).toBe(true);
      });

      it('should categorize ECONNRESET as RETRYABLE', () => {
        const error = {
          code: 'ECONNRESET',
          message: 'Connection reset'
        };

        const result = categorizeError(error);

        expect(result.category).toBe(ErrorCategory.RETRYABLE);
        expect(result.retryable).toBe(true);
      });
    });

    describe('Timeout Errors', () => {
      it('should categorize timeout message as RETRYABLE', () => {
        const error = {
          message: 'timeout of 30000ms exceeded'
        };

        const result = categorizeError(error);

        expect(result.category).toBe(ErrorCategory.RETRYABLE);
        expect(result.retryable).toBe(true);
      });
    });

    describe('Unknown Errors', () => {
      it('should categorize unknown error as UNKNOWN with retryable=true', () => {
        const error = {
          message: 'Something went wrong'
        };

        const result = categorizeError(error);

        expect(result.category).toBe(ErrorCategory.UNKNOWN);
        expect(result.retryable).toBe(true); // Default to retryable for safety
      });

      it('should handle error without response object', () => {
        const error = new Error('Generic error');

        const result = categorizeError(error);

        expect(result.category).toBe(ErrorCategory.UNKNOWN);
        expect(result.retryable).toBe(true);
      });
    });
  });

  describe('parseRetryAfter', () => {
    it('should parse delay-seconds format', () => {
      const result = parseRetryAfter('60');
      expect(result).toBe(60000); // 60 seconds in milliseconds
    });

    it('should parse large delay-seconds value', () => {
      const result = parseRetryAfter('3600');
      expect(result).toBe(3600000); // 1 hour in milliseconds
    });

    it('should parse HTTP-date format', () => {
      const futureDate = new Date(Date.now() + 60000); // 60 seconds from now
      const result = parseRetryAfter(futureDate.toUTCString());

      expect(result).toBeGreaterThan(59000); // At least 59 seconds
      expect(result).toBeLessThan(61000);    // At most 61 seconds
    });

    it('should return null for missing header', () => {
      expect(parseRetryAfter(undefined)).toBeNull();
      expect(parseRetryAfter(null)).toBeNull();
      expect(parseRetryAfter('')).toBeNull();
    });

    it('should return null for invalid format', () => {
      expect(parseRetryAfter('invalid')).toBeNull();
      expect(parseRetryAfter('abc123')).toBeNull();
    });

    it('should return null for past date', () => {
      const pastDate = new Date(Date.now() - 60000); // 60 seconds ago
      const result = parseRetryAfter(pastDate.toUTCString());

      expect(result).toBeNull();
    });

    it('should return null for negative delay', () => {
      expect(parseRetryAfter('-60')).toBeNull();
    });

    it('should return null for zero delay', () => {
      expect(parseRetryAfter('0')).toBeNull();
    });
  });

  describe('adaptiveBackoff', () => {
    it('should calculate exponential backoff for retry count 0', () => {
      const delay = adaptiveBackoff(0);

      // Base delay 1000ms + jitter (0-1000ms) = 1000-2000ms
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThan(2100);
    });

    it('should calculate exponential backoff for retry count 1', () => {
      const delay = adaptiveBackoff(1);

      // 1000 * 2^1 = 2000ms + jitter (0-1000ms) = 2000-3000ms
      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThan(3100);
    });

    it('should calculate exponential backoff for retry count 3', () => {
      const delay = adaptiveBackoff(3);

      // 1000 * 2^3 = 8000ms + jitter (0-1000ms) = 8000-9000ms
      expect(delay).toBeGreaterThanOrEqual(8000);
      expect(delay).toBeLessThan(9100);
    });

    it('should cap at maximum delay', () => {
      const delay = adaptiveBackoff(10); // 1000 * 2^10 = 1,024,000ms

      // Should be capped at 30000ms + jitter (0-1000ms) = 30000-31000ms
      expect(delay).toBeGreaterThanOrEqual(30000);
      expect(delay).toBeLessThan(31100);
    });

    it('should use custom base delay', () => {
      const delay = adaptiveBackoff(0, null, { baseDelay: 2000 });

      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThan(3100);
    });

    it('should use custom max delay', () => {
      const delay = adaptiveBackoff(10, null, { maxDelay: 10000 });

      expect(delay).toBeGreaterThanOrEqual(10000);
      expect(delay).toBeLessThan(11100);
    });

    it('should use Retry-After value for rate limit errors', () => {
      const rateLimitError = {
        category: ErrorCategory.RATE_LIMIT,
        retryAfter: 60000 // 60 seconds
      };

      const delay = adaptiveBackoff(0, rateLimitError);

      // Should use retry-after + jitter
      expect(delay).toBeGreaterThanOrEqual(60000);
      expect(delay).toBeLessThan(62100);
    });

    it('should add minimal jitter to Retry-After value', () => {
      const rateLimitError = {
        category: ErrorCategory.RATE_LIMIT,
        retryAfter: 5000
      };

      const delay = adaptiveBackoff(0, rateLimitError);

      // Should use retry-after + small jitter (max 1000ms or 2000ms)
      expect(delay).toBeGreaterThanOrEqual(5000);
      expect(delay).toBeLessThan(7100);
    });

    it('should return integer value', () => {
      const delay = adaptiveBackoff(2);

      expect(Number.isInteger(delay)).toBe(true);
    });
  });

  describe('shouldRetry', () => {
    it('should return true for retryable error within max retries', () => {
      const error = { retryable: true, category: ErrorCategory.RETRYABLE };
      const result = shouldRetry(error, 1, 3);

      expect(result).toBe(true);
    });

    it('should return false when max retries exceeded', () => {
      const error = { retryable: true, category: ErrorCategory.RETRYABLE };
      const result = shouldRetry(error, 3, 3);

      expect(result).toBe(false);
    });

    it('should return false for permanent errors', () => {
      const error = { retryable: false, category: ErrorCategory.PERMANENT };
      const result = shouldRetry(error, 0, 3);

      expect(result).toBe(false);
    });

    it('should return true for retryable error at retry count 0', () => {
      const error = { retryable: true, category: ErrorCategory.RETRYABLE };
      const result = shouldRetry(error, 0, 3);

      expect(result).toBe(true);
    });

    it('should return false when current retry equals max', () => {
      const error = { retryable: true, category: ErrorCategory.RETRYABLE };
      const result = shouldRetry(error, 5, 5);

      expect(result).toBe(false);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format rate limit error', () => {
      const error = {
        category: ErrorCategory.RATE_LIMIT,
        statusCode: 429,
        message: 'Rate limit exceeded',
        suggestedAction: 'Wait and retry'
      };

      const message = formatErrorMessage(error, 'https://example.com/page');

      expect(message).toContain('⏱️  Rate Limit');
      expect(message).toContain('HTTP 429');
      expect(message).toContain('Rate limit exceeded');
      expect(message).toContain('https://example.com/page');
      expect(message).toContain('Wait and retry');
    });

    it('should format retryable error', () => {
      const error = {
        category: ErrorCategory.RETRYABLE,
        statusCode: 503,
        message: 'Service Unavailable',
        suggestedAction: 'Retry with backoff'
      };

      const message = formatErrorMessage(error, 'https://example.com');

      expect(message).toContain('🔄 Temporary Error');
      expect(message).toContain('HTTP 503');
    });

    it('should format permanent error', () => {
      const error = {
        category: ErrorCategory.PERMANENT,
        statusCode: 404,
        message: 'Not Found',
        suggestedAction: 'Skip this URL'
      };

      const message = formatErrorMessage(error, 'https://example.com/404');

      expect(message).toContain('❌ Permanent Error');
      expect(message).toContain('HTTP 404');
      expect(message).toContain('Skip this URL');
    });

    it('should truncate long URLs', () => {
      const error = {
        category: ErrorCategory.PERMANENT,
        statusCode: 404,
        message: 'Not Found',
        suggestedAction: 'Skip'
      };

      const longUrl = 'https://example.com/' + 'a'.repeat(100);
      const message = formatErrorMessage(error, longUrl);

      expect(message).toContain('...');
      expect(message.length).toBeLessThan(longUrl.length + 100);
    });

    it('should handle error without status code', () => {
      const error = {
        category: ErrorCategory.RETRYABLE,
        statusCode: null,
        message: 'Network error',
        suggestedAction: 'Retry'
      };

      const message = formatErrorMessage(error, 'https://example.com');

      expect(message).toContain('🔄 Temporary Error');
      expect(message).not.toContain('HTTP');
      expect(message).toContain('Network error');
    });
  });

  describe('summarizeErrors', () => {
    it('should summarize multiple errors by category', () => {
      const errors = [
        {
          url: 'https://example.com/1',
          error: { response: { status: 429 } }
        },
        {
          url: 'https://example.com/2',
          error: { response: { status: 404 } }
        },
        {
          url: 'https://example.com/3',
          error: { response: { status: 500 } }
        },
        {
          url: 'https://example.com/4',
          error: { response: { status: 404 } }
        }
      ];

      const summary = summarizeErrors(errors);

      expect(summary.total).toBe(4);
      expect(summary.byCategory[ErrorCategory.RATE_LIMIT]).toBe(1);
      expect(summary.byCategory[ErrorCategory.PERMANENT]).toBe(2);
      expect(summary.byCategory[ErrorCategory.RETRYABLE]).toBe(1);
    });

    it('should handle empty error array', () => {
      const summary = summarizeErrors([]);

      expect(summary.total).toBe(0);
      expect(summary.byCategory[ErrorCategory.RATE_LIMIT]).toBe(0);
      expect(summary.details).toHaveLength(0);
    });

    it('should include error details', () => {
      const errors = [
        {
          url: 'https://example.com/page',
          error: { response: { status: 404 } }
        }
      ];

      const summary = summarizeErrors(errors);

      expect(summary.details).toHaveLength(1);
      expect(summary.details[0].url).toBe('https://example.com/page');
      expect(summary.details[0].category).toBe(ErrorCategory.PERMANENT);
      expect(summary.details[0].statusCode).toBe(404);
    });

    it('should handle pre-categorized errors', () => {
      const errors = [
        {
          url: 'https://example.com/1',
          error: {
            category: ErrorCategory.RATE_LIMIT,
            statusCode: 429,
            message: 'Rate limited'
          }
        }
      ];

      const summary = summarizeErrors(errors);

      expect(summary.byCategory[ErrorCategory.RATE_LIMIT]).toBe(1);
      expect(summary.details[0].category).toBe(ErrorCategory.RATE_LIMIT);
    });
  });
});
