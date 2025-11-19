/**
 * Input Validation Module
 *
 * Provides comprehensive validation for user inputs across all doc-fetcher commands.
 * Prevents common errors, security issues, and provides clear, contextual error messages.
 *
 * @module validate
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Validation error with contextual information
 */
export class ValidationError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} field - Field name that failed validation
   * @param {string} value - Invalid value provided
   * @param {string} [suggestion] - Suggested fix or example
   */
  constructor(message, field, value, suggestion = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    this.suggestion = suggestion;
  }
}

/**
 * Allowed skill templates
 */
const ALLOWED_TEMPLATES = [
  'expert',
  'quick-reference',
  'migration-guide',
  'troubleshooter',
  'best-practices'
];

/**
 * Validate a library name
 *
 * Library names must be:
 * - 1-100 characters long
 * - Alphanumeric with hyphens, underscores, periods, and @ (for scoped packages)
 * - No path traversal sequences (../, ./, \\)
 * - No leading/trailing special characters
 *
 * @param {string} library - Library name to validate
 * @param {string} [fieldName='library'] - Field name for error messages
 * @returns {string} - Normalized library name (trimmed, lowercase)
 * @throws {ValidationError} - If validation fails
 *
 * @example
 * validateLibraryName('nextjs') // Returns 'nextjs'
 * validateLibraryName('@types/react') // Returns '@types/react'
 * validateLibraryName('../malicious') // Throws ValidationError
 */
export function validateLibraryName(library, fieldName = 'library') {
  // Check if provided
  if (!library || typeof library !== 'string') {
    throw new ValidationError(
      'Library name is required',
      fieldName,
      library,
      'Example: nextjs, react, @types/node'
    );
  }

  // Trim and convert to lowercase for consistency
  const normalized = library.trim();

  // Check length
  if (normalized.length === 0) {
    throw new ValidationError(
      'Library name cannot be empty',
      fieldName,
      library,
      'Example: nextjs, react, vue'
    );
  }

  if (normalized.length > 100) {
    throw new ValidationError(
      'Library name is too long (max 100 characters)',
      fieldName,
      library
    );
  }

  // Check for path traversal attempts
  if (normalized.includes('..') || normalized.includes('./') || normalized.includes('\\\\')) {
    throw new ValidationError(
      'Library name contains invalid path sequences',
      fieldName,
      library,
      'Library names should not contain path separators or traversal sequences'
    );
  }

  // Validate format: alphanumeric, hyphens, underscores, periods, @ and / for scoped packages
  // Allows: library, @scope/library, library-name, etc.
  const validPattern = /^(@[a-z0-9]([a-z0-9._-]*[a-z0-9])?\/)?[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/i;
  if (!validPattern.test(normalized)) {
    throw new ValidationError(
      'Library name contains invalid characters',
      fieldName,
      library,
      'Use only letters, numbers, hyphens, underscores, periods, and @ for scoped packages (e.g., @org/package)'
    );
  }

  // Check for leading/trailing special characters (except @ for scoped packages)
  if (/^[-._]|[-._]$/.test(normalized)) {
    throw new ValidationError(
      'Library name cannot start or end with special characters',
      fieldName,
      library,
      'Example: nextjs, my-library, @scope/package'
    );
  }

  return normalized;
}

/**
 * Validate a semantic version string
 *
 * Accepts:
 * - Semantic versioning: 1.2.3, 1.0.0-alpha, 2.0.0-beta.1
 * - Short versions: 1.2, 1
 * - Special keywords: latest, next, canary, beta, alpha
 * - Version prefixes: v1.2.3
 *
 * @param {string} version - Version string to validate
 * @param {string} [fieldName='version'] - Field name for error messages
 * @param {boolean} [allowSpecial=true] - Allow special keywords like 'latest'
 * @returns {string} - Normalized version (without 'v' prefix, trimmed)
 * @throws {ValidationError} - If validation fails
 *
 * @example
 * validateVersion('1.2.3') // Returns '1.2.3'
 * validateVersion('v2.0.0') // Returns '2.0.0'
 * validateVersion('latest') // Returns 'latest'
 * validateVersion('invalid!') // Throws ValidationError
 */
export function validateVersion(version, fieldName = 'version', allowSpecial = true) {
  // Allow undefined/null for optional versions
  if (!version) {
    return null;
  }

  if (typeof version !== 'string') {
    throw new ValidationError(
      'Version must be a string',
      fieldName,
      version,
      'Example: 1.2.3, latest, v2.0.0'
    );
  }

  const normalized = version.trim();

  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length > 50) {
    throw new ValidationError(
      'Version string is too long (max 50 characters)',
      fieldName,
      version
    );
  }

  // Check for special keywords
  const specialKeywords = ['latest', 'next', 'canary', 'beta', 'alpha', 'stable'];
  if (allowSpecial && specialKeywords.includes(normalized.toLowerCase())) {
    return normalized.toLowerCase();
  }

  // Remove 'v' prefix if present
  const versionWithoutPrefix = normalized.startsWith('v') || normalized.startsWith('V')
    ? normalized.slice(1)
    : normalized;

  // Validate semantic version pattern
  // Allows: 1.2.3, 1.2, 1, 1.2.3-alpha, 1.0.0-beta.1, 1.0.0-rc.2+build.123
  const semverPattern = /^(\d+)(\.\d+)?(\.\d+)?(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;

  if (!semverPattern.test(versionWithoutPrefix)) {
    throw new ValidationError(
      'Invalid version format',
      fieldName,
      version,
      'Use semantic versioning (e.g., 1.2.3, 2.0.0-beta, latest)'
    );
  }

  return versionWithoutPrefix;
}

/**
 * Validate a URL
 *
 * Must be:
 * - Valid HTTP or HTTPS URL
 * - Have a valid hostname
 * - Not contain localhost or private IPs (optional check)
 *
 * @param {string} url - URL to validate
 * @param {string} [fieldName='url'] - Field name for error messages
 * @param {Object} [options={}] - Validation options
 * @param {boolean} [options.allowLocalhost=false] - Allow localhost URLs
 * @param {boolean} [options.requireHttps=false] - Require HTTPS protocol
 * @returns {string} - Normalized URL
 * @throws {ValidationError} - If validation fails
 *
 * @example
 * validateUrl('https://example.com/docs') // Returns 'https://example.com/docs'
 * validateUrl('http://localhost') // Throws ValidationError (unless allowLocalhost=true)
 * validateUrl('ftp://example.com') // Throws ValidationError
 */
export function validateUrl(url, fieldName = 'url', options = {}) {
  const {
    allowLocalhost = false,
    requireHttps = false
  } = options;

  if (!url || typeof url !== 'string') {
    throw new ValidationError(
      'URL is required',
      fieldName,
      url,
      'Example: https://example.com/docs'
    );
  }

  const normalized = url.trim();

  if (normalized.length === 0) {
    throw new ValidationError(
      'URL cannot be empty',
      fieldName,
      url,
      'Example: https://example.com/docs'
    );
  }

  if (normalized.length > 2048) {
    throw new ValidationError(
      'URL is too long (max 2048 characters)',
      fieldName,
      url
    );
  }

  // Parse URL
  let urlObj;
  try {
    urlObj = new URL(normalized);
  } catch (error) {
    throw new ValidationError(
      'Invalid URL format',
      fieldName,
      url,
      'URL must include protocol (e.g., https://example.com)'
    );
  }

  // Check protocol
  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    throw new ValidationError(
      'URL must use HTTP or HTTPS protocol',
      fieldName,
      url,
      `Change ${urlObj.protocol} to http: or https:`
    );
  }

  if (requireHttps && urlObj.protocol !== 'https:') {
    throw new ValidationError(
      'URL must use HTTPS protocol',
      fieldName,
      url,
      'Change http: to https:'
    );
  }

  // Check for localhost
  if (!allowLocalhost) {
    const hostname = urlObj.hostname.toLowerCase();
    const localhostPatterns = ['localhost', '127.0.0.1', '0.0.0.0'];

    // Check for IPv6 localhost (with or without brackets, already removed by URL parser)
    const isIPv6Localhost = hostname === '::1' || hostname === '[::1]';

    const isPrivateIP = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(hostname);

    if (localhostPatterns.includes(hostname) || isIPv6Localhost || isPrivateIP) {
      throw new ValidationError(
        'Localhost and private IP URLs are not allowed',
        fieldName,
        url,
        'Use a public URL (e.g., https://example.com)'
      );
    }
  }

  // Check hostname is valid
  if (!urlObj.hostname || urlObj.hostname.length === 0) {
    throw new ValidationError(
      'URL must have a valid hostname',
      fieldName,
      url,
      'Example: https://example.com/docs'
    );
  }

  return normalized;
}

/**
 * Validate a file path
 *
 * @param {string} filePath - File path to validate
 * @param {string} [fieldName='path'] - Field name for error messages
 * @param {Object} [options={}] - Validation options
 * @param {boolean} [options.mustExist=false] - Path must exist
 * @param {boolean} [options.mustBeDirectory=false] - Path must be a directory
 * @param {boolean} [options.mustBeFile=false] - Path must be a file
 * @returns {Promise<string>} - Normalized absolute path
 * @throws {ValidationError} - If validation fails
 *
 * @example
 * await validatePath('./docs') // Returns absolute path
 * await validatePath('/tmp/test', 'output', { mustExist: true }) // Validates existence
 */
export async function validatePath(filePath, fieldName = 'path', options = {}) {
  const {
    mustExist = false,
    mustBeDirectory = false,
    mustBeFile = false
  } = options;

  if (!filePath || typeof filePath !== 'string') {
    throw new ValidationError(
      'Path is required',
      fieldName,
      filePath,
      'Provide a valid file or directory path'
    );
  }

  const normalized = filePath.trim();

  if (normalized.length === 0) {
    throw new ValidationError(
      'Path cannot be empty',
      fieldName,
      filePath
    );
  }

  if (normalized.length > 4096) {
    throw new ValidationError(
      'Path is too long (max 4096 characters)',
      fieldName,
      filePath
    );
  }

  // Check for null bytes (security issue)
  if (normalized.includes('\0')) {
    throw new ValidationError(
      'Path contains invalid null bytes',
      fieldName,
      filePath
    );
  }

  // Convert to absolute path
  const absolutePath = path.resolve(normalized);

  // Check existence if required
  if (mustExist) {
    try {
      const stats = await fs.stat(absolutePath);

      if (mustBeDirectory && !stats.isDirectory()) {
        throw new ValidationError(
          'Path must be a directory',
          fieldName,
          filePath,
          `${absolutePath} is not a directory`
        );
      }

      if (mustBeFile && !stats.isFile()) {
        throw new ValidationError(
          'Path must be a file',
          fieldName,
          filePath,
          `${absolutePath} is not a file`
        );
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        'Path does not exist',
        fieldName,
        filePath,
        `Cannot find: ${absolutePath}`
      );
    }
  }

  return absolutePath;
}

/**
 * Validate a skill template name
 *
 * @param {string} template - Template name to validate
 * @param {string} [fieldName='template'] - Field name for error messages
 * @returns {string} - Validated template name
 * @throws {ValidationError} - If validation fails
 *
 * @example
 * validateTemplate('expert') // Returns 'expert'
 * validateTemplate('invalid') // Throws ValidationError
 */
export function validateTemplate(template, fieldName = 'template') {
  if (!template || typeof template !== 'string') {
    throw new ValidationError(
      'Template name is required',
      fieldName,
      template,
      `Choose from: ${ALLOWED_TEMPLATES.join(', ')}`
    );
  }

  const normalized = template.trim().toLowerCase();

  if (!ALLOWED_TEMPLATES.includes(normalized)) {
    throw new ValidationError(
      'Invalid template name',
      fieldName,
      template,
      `Choose from: ${ALLOWED_TEMPLATES.join(', ')}`
    );
  }

  return normalized;
}

/**
 * Format a validation error for display
 *
 * @param {ValidationError} error - Validation error to format
 * @returns {string} - Formatted error message
 */
export function formatValidationError(error) {
  if (!(error instanceof ValidationError)) {
    return error.message;
  }

  let message = `✗ Validation Error: ${error.message}`;

  if (error.field) {
    message += `\n  Field: ${error.field}`;
  }

  if (error.value !== undefined && error.value !== null) {
    const valueStr = typeof error.value === 'string'
      ? `"${error.value}"`
      : String(error.value);
    message += `\n  Provided: ${valueStr}`;
  }

  if (error.suggestion) {
    message += `\n  Suggestion: ${error.suggestion}`;
  }

  return message;
}

/**
 * Validate multiple fields at once
 * Collects all validation errors before throwing
 *
 * @param {Object} validators - Object mapping field names to validator functions
 * @returns {Promise<Object>} - Object with validated values
 * @throws {Error} - If any validation fails (includes all errors)
 *
 * @example
 * const validated = await validateAll({
 *   library: () => validateLibraryName('nextjs'),
 *   version: () => validateVersion('1.2.3'),
 *   url: () => validateUrl('https://example.com')
 * });
 */
export async function validateAll(validators) {
  const errors = [];
  const results = {};

  for (const [field, validator] of Object.entries(validators)) {
    try {
      results[field] = await validator();
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(formatValidationError(error));
      } else {
        errors.push(`✗ Error validating ${field}: ${error.message}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`\nValidation failed:\n\n${errors.join('\n\n')}\n`);
  }

  return results;
}

export {
  ALLOWED_TEMPLATES
};

export default {
  validateLibraryName,
  validateVersion,
  validateUrl,
  validatePath,
  validateTemplate,
  formatValidationError,
  validateAll,
  ValidationError,
  ALLOWED_TEMPLATES
};
