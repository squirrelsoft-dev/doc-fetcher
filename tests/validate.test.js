/**
 * Tests for input validation module
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  validateLibraryName,
  validateVersion,
  validateUrl,
  validatePath,
  validateTemplate,
  formatValidationError,
  ValidationError,
  ALLOWED_TEMPLATES
} from '../scripts/validate.js';

describe('validateLibraryName', () => {
  describe('valid library names', () => {
    it('should accept simple lowercase names', () => {
      expect(validateLibraryName('react')).toBe('react');
      expect(validateLibraryName('vue')).toBe('vue');
      expect(validateLibraryName('nextjs')).toBe('nextjs');
    });

    it('should accept names with hyphens', () => {
      expect(validateLibraryName('express-session')).toBe('express-session');
      expect(validateLibraryName('my-library')).toBe('my-library');
    });

    it('should accept names with underscores', () => {
      expect(validateLibraryName('lodash_es')).toBe('lodash_es');
      expect(validateLibraryName('my_package')).toBe('my_package');
    });

    it('should accept names with periods', () => {
      expect(validateLibraryName('jquery.ui')).toBe('jquery.ui');
      expect(validateLibraryName('semver.js')).toBe('semver.js');
    });

    it('should accept scoped package names', () => {
      expect(validateLibraryName('@types/node')).toBe('@types/node');
      expect(validateLibraryName('@babel/core')).toBe('@babel/core');
      expect(validateLibraryName('@company/library')).toBe('@company/library');
    });

    it('should normalize by trimming', () => {
      expect(validateLibraryName('  react  ')).toBe('react');
      expect(validateLibraryName('\tvue\n')).toBe('vue');
    });

    it('should accept mixed case', () => {
      expect(validateLibraryName('React')).toBe('React');
      expect(validateLibraryName('NextJS')).toBe('NextJS');
    });
  });

  describe('invalid library names', () => {
    it('should reject empty names', () => {
      expect(() => validateLibraryName('')).toThrow(ValidationError);
      expect(() => validateLibraryName('   ')).toThrow(ValidationError);
    });

    it('should reject null/undefined', () => {
      expect(() => validateLibraryName(null)).toThrow(ValidationError);
      expect(() => validateLibraryName(undefined)).toThrow(ValidationError);
    });

    it('should reject non-strings', () => {
      expect(() => validateLibraryName(123)).toThrow(ValidationError);
      expect(() => validateLibraryName({})).toThrow(ValidationError);
      expect(() => validateLibraryName([])).toThrow(ValidationError);
    });

    it('should reject path traversal sequences', () => {
      expect(() => validateLibraryName('../malicious')).toThrow(ValidationError);
      expect(() => validateLibraryName('./local')).toThrow(ValidationError);
      expect(() => validateLibraryName('..\\windows')).toThrow(ValidationError);
      expect(() => validateLibraryName('lib/../secret')).toThrow(ValidationError);
    });

    it('should reject names with invalid characters', () => {
      expect(() => validateLibraryName('react!')).toThrow(ValidationError);
      expect(() => validateLibraryName('lib$name')).toThrow(ValidationError);
      expect(() => validateLibraryName('my library')).toThrow(ValidationError);
      expect(() => validateLibraryName('lib/name')).toThrow(ValidationError);
    });

    it('should reject names starting with special chars (except @)', () => {
      expect(() => validateLibraryName('-react')).toThrow(ValidationError);
      expect(() => validateLibraryName('_vue')).toThrow(ValidationError);
      expect(() => validateLibraryName('.hidden')).toThrow(ValidationError);
    });

    it('should reject names ending with special chars', () => {
      expect(() => validateLibraryName('react-')).toThrow(ValidationError);
      expect(() => validateLibraryName('vue_')).toThrow(ValidationError);
      expect(() => validateLibraryName('lib.')).toThrow(ValidationError);
    });

    it('should reject names that are too long', () => {
      const longName = 'a'.repeat(101);
      expect(() => validateLibraryName(longName)).toThrow(ValidationError);
    });
  });

  describe('error messages', () => {
    it('should include field name and value in error', () => {
      try {
        validateLibraryName('', 'package');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.field).toBe('package');
        expect(error.value).toBe('');
      }
    });

    it('should include suggestions', () => {
      try {
        validateLibraryName('../bad');
      } catch (error) {
        expect(error.suggestion).toBeTruthy();
      }
    });
  });
});

describe('validateVersion', () => {
  describe('valid version strings', () => {
    it('should accept semantic versions', () => {
      expect(validateVersion('1.2.3')).toBe('1.2.3');
      expect(validateVersion('0.0.1')).toBe('0.0.1');
      expect(validateVersion('10.20.30')).toBe('10.20.30');
    });

    it('should accept short versions', () => {
      expect(validateVersion('1.2')).toBe('1.2');
      expect(validateVersion('2')).toBe('2');
    });

    it('should accept prerelease versions', () => {
      expect(validateVersion('1.2.3-alpha')).toBe('1.2.3-alpha');
      expect(validateVersion('2.0.0-beta.1')).toBe('2.0.0-beta.1');
      expect(validateVersion('1.0.0-rc.2')).toBe('1.0.0-rc.2');
    });

    it('should accept versions with build metadata', () => {
      expect(validateVersion('1.2.3+build.123')).toBe('1.2.3+build.123');
      expect(validateVersion('1.0.0-alpha+001')).toBe('1.0.0-alpha+001');
    });

    it('should remove "v" prefix', () => {
      expect(validateVersion('v1.2.3')).toBe('1.2.3');
      expect(validateVersion('V2.0.0')).toBe('2.0.0');
    });

    it('should accept special keywords', () => {
      expect(validateVersion('latest')).toBe('latest');
      expect(validateVersion('next')).toBe('next');
      expect(validateVersion('canary')).toBe('canary');
      expect(validateVersion('beta')).toBe('beta');
      expect(validateVersion('alpha')).toBe('alpha');
      expect(validateVersion('stable')).toBe('stable');
    });

    it('should normalize keywords to lowercase', () => {
      expect(validateVersion('LATEST')).toBe('latest');
      expect(validateVersion('Next')).toBe('next');
    });

    it('should allow null/undefined for optional versions', () => {
      expect(validateVersion(null)).toBeNull();
      expect(validateVersion(undefined)).toBeNull();
      expect(validateVersion('')).toBeNull();
    });
  });

  describe('invalid version strings', () => {
    it('should reject non-strings', () => {
      expect(() => validateVersion(123)).toThrow(ValidationError);
      expect(() => validateVersion({})).toThrow(ValidationError);
    });

    it('should reject invalid formats', () => {
      expect(() => validateVersion('abc')).toThrow(ValidationError);
      expect(() => validateVersion('1.2.3.4.5')).toThrow(ValidationError);
      expect(() => validateVersion('v')).toThrow(ValidationError);
    });

    it('should reject versions with invalid characters', () => {
      expect(() => validateVersion('1.2.3!')).toThrow(ValidationError);
      expect(() => validateVersion('1.2.x')).toThrow(ValidationError);
      expect(() => validateVersion('1.2.*')).toThrow(ValidationError);
    });

    it('should reject versions that are too long', () => {
      const longVersion = '1.' + '2'.repeat(50);
      expect(() => validateVersion(longVersion)).toThrow(ValidationError);
    });
  });

  describe('options', () => {
    it('should reject special keywords when allowSpecial=false', () => {
      expect(() => validateVersion('latest', 'version', false)).toThrow(ValidationError);
    });

    it('should allow valid versions when allowSpecial=false', () => {
      expect(validateVersion('1.2.3', 'version', false)).toBe('1.2.3');
    });
  });
});

describe('validateUrl', () => {
  describe('valid URLs', () => {
    it('should accept HTTP URLs', () => {
      expect(validateUrl('http://example.com')).toBe('http://example.com');
      expect(validateUrl('http://example.com/docs')).toBe('http://example.com/docs');
    });

    it('should accept HTTPS URLs', () => {
      expect(validateUrl('https://example.com')).toBe('https://example.com');
      expect(validateUrl('https://docs.example.com/guide')).toBe('https://docs.example.com/guide');
    });

    it('should accept URLs with ports', () => {
      expect(validateUrl('https://example.com:8080')).toBe('https://example.com:8080');
    });

    it('should accept URLs with query parameters', () => {
      expect(validateUrl('https://example.com?page=1')).toBe('https://example.com?page=1');
    });

    it('should accept URLs with fragments', () => {
      expect(validateUrl('https://example.com#section')).toBe('https://example.com#section');
    });

    it('should trim whitespace', () => {
      expect(validateUrl('  https://example.com  ')).toBe('https://example.com');
    });
  });

  describe('invalid URLs', () => {
    it('should reject empty URLs', () => {
      expect(() => validateUrl('')).toThrow(ValidationError);
      expect(() => validateUrl('   ')).toThrow(ValidationError);
    });

    it('should reject null/undefined', () => {
      expect(() => validateUrl(null)).toThrow(ValidationError);
      expect(() => validateUrl(undefined)).toThrow(ValidationError);
    });

    it('should reject non-strings', () => {
      expect(() => validateUrl(123)).toThrow(ValidationError);
    });

    it('should reject URLs without protocol', () => {
      expect(() => validateUrl('example.com')).toThrow(ValidationError);
      expect(() => validateUrl('www.example.com')).toThrow(ValidationError);
    });

    it('should reject non-HTTP protocols', () => {
      expect(() => validateUrl('ftp://example.com')).toThrow(ValidationError);
      expect(() => validateUrl('file:///path/to/file')).toThrow(ValidationError);
      expect(() => validateUrl('javascript:alert(1)')).toThrow(ValidationError);
    });

    it('should reject localhost by default', () => {
      expect(() => validateUrl('http://localhost')).toThrow(ValidationError);
      expect(() => validateUrl('http://127.0.0.1')).toThrow(ValidationError);
      expect(() => validateUrl('http://[::1]')).toThrow(ValidationError);
      expect(() => validateUrl('http://0.0.0.0')).toThrow(ValidationError);
    });

    it('should reject private IP ranges by default', () => {
      expect(() => validateUrl('http://192.168.1.1')).toThrow(ValidationError);
      expect(() => validateUrl('http://10.0.0.1')).toThrow(ValidationError);
      expect(() => validateUrl('http://172.16.0.1')).toThrow(ValidationError);
    });

    it('should reject URLs that are too long', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2048);
      expect(() => validateUrl(longUrl)).toThrow(ValidationError);
    });
  });

  describe('options', () => {
    it('should allow localhost when allowLocalhost=true', () => {
      expect(validateUrl('http://localhost', 'url', { allowLocalhost: true }))
        .toBe('http://localhost');
      expect(validateUrl('http://127.0.0.1:3000', 'url', { allowLocalhost: true }))
        .toBe('http://127.0.0.1:3000');
    });

    it('should require HTTPS when requireHttps=true', () => {
      expect(() => validateUrl('http://example.com', 'url', { requireHttps: true }))
        .toThrow(ValidationError);
      expect(validateUrl('https://example.com', 'url', { requireHttps: true }))
        .toBe('https://example.com');
    });
  });
});

describe('validatePath', () => {
  let tempDir;

  beforeAll(async () => {
    // Create temp directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'validate-test-'));
    await fs.writeFile(path.join(tempDir, 'test.txt'), 'test content');
  });

  afterAll(async () => {
    // Clean up
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('valid paths', () => {
    it('should accept absolute paths', async () => {
      const result = await validatePath('/tmp');
      expect(result).toBe(path.resolve('/tmp'));
    });

    it('should accept relative paths', async () => {
      const result = await validatePath('./test');
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should trim whitespace', async () => {
      const result = await validatePath('  /tmp  ');
      expect(result).toBe(path.resolve('/tmp'));
    });

    it('should resolve to absolute path', async () => {
      const result = await validatePath('.');
      expect(path.isAbsolute(result)).toBe(true);
    });
  });

  describe('invalid paths', () => {
    it('should reject empty paths', async () => {
      await expect(validatePath('')).rejects.toThrow(ValidationError);
      await expect(validatePath('   ')).rejects.toThrow(ValidationError);
    });

    it('should reject null/undefined', async () => {
      await expect(validatePath(null)).rejects.toThrow(ValidationError);
      await expect(validatePath(undefined)).rejects.toThrow(ValidationError);
    });

    it('should reject non-strings', async () => {
      await expect(validatePath(123)).rejects.toThrow(ValidationError);
    });

    it('should reject paths with null bytes', async () => {
      await expect(validatePath('/tmp/test\0.txt')).rejects.toThrow(ValidationError);
    });

    it('should reject paths that are too long', async () => {
      const longPath = '/' + 'a'.repeat(5000);
      await expect(validatePath(longPath)).rejects.toThrow(ValidationError);
    });
  });

  describe('options', () => {
    it('should validate existence when mustExist=true', async () => {
      const existingPath = await validatePath(tempDir, 'path', { mustExist: true });
      expect(existingPath).toBe(path.resolve(tempDir));

      await expect(validatePath('/nonexistent/path/xyz', 'path', { mustExist: true }))
        .rejects.toThrow(ValidationError);
    });

    it('should validate directory when mustBeDirectory=true', async () => {
      await expect(validatePath(tempDir, 'path', { mustExist: true, mustBeDirectory: true }))
        .resolves.toBeTruthy();

      const filePath = path.join(tempDir, 'test.txt');
      await expect(validatePath(filePath, 'path', { mustExist: true, mustBeDirectory: true }))
        .rejects.toThrow(ValidationError);
    });

    it('should validate file when mustBeFile=true', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await expect(validatePath(filePath, 'path', { mustExist: true, mustBeFile: true }))
        .resolves.toBeTruthy();

      await expect(validatePath(tempDir, 'path', { mustExist: true, mustBeFile: true }))
        .rejects.toThrow(ValidationError);
    });
  });
});

describe('validateTemplate', () => {
  describe('valid templates', () => {
    it('should accept allowed templates', () => {
      expect(validateTemplate('expert')).toBe('expert');
      expect(validateTemplate('quick-reference')).toBe('quick-reference');
      expect(validateTemplate('migration-guide')).toBe('migration-guide');
      expect(validateTemplate('troubleshooter')).toBe('troubleshooter');
      expect(validateTemplate('best-practices')).toBe('best-practices');
    });

    it('should normalize to lowercase', () => {
      expect(validateTemplate('EXPERT')).toBe('expert');
      expect(validateTemplate('Quick-Reference')).toBe('quick-reference');
    });

    it('should trim whitespace', () => {
      expect(validateTemplate('  expert  ')).toBe('expert');
    });
  });

  describe('invalid templates', () => {
    it('should reject invalid template names', () => {
      expect(() => validateTemplate('invalid')).toThrow(ValidationError);
      expect(() => validateTemplate('custom')).toThrow(ValidationError);
    });

    it('should reject empty templates', () => {
      expect(() => validateTemplate('')).toThrow(ValidationError);
    });

    it('should reject null/undefined', () => {
      expect(() => validateTemplate(null)).toThrow(ValidationError);
      expect(() => validateTemplate(undefined)).toThrow(ValidationError);
    });

    it('should include list of allowed templates in error', () => {
      try {
        validateTemplate('invalid');
      } catch (error) {
        expect(error.suggestion).toContain('expert');
        expect(error.suggestion).toContain('quick-reference');
      }
    });
  });

  describe('ALLOWED_TEMPLATES constant', () => {
    it('should export allowed templates', () => {
      expect(ALLOWED_TEMPLATES).toBeInstanceOf(Array);
      expect(ALLOWED_TEMPLATES.length).toBeGreaterThan(0);
      expect(ALLOWED_TEMPLATES).toContain('expert');
    });
  });
});

describe('formatValidationError', () => {
  it('should format ValidationError with all fields', () => {
    const error = new ValidationError(
      'Invalid value',
      'testField',
      'badValue',
      'Use goodValue instead'
    );

    const formatted = formatValidationError(error);
    expect(formatted).toContain('Validation Error');
    expect(formatted).toContain('Invalid value');
    expect(formatted).toContain('testField');
    expect(formatted).toContain('badValue');
    expect(formatted).toContain('Use goodValue instead');
  });

  it('should format ValidationError without suggestion', () => {
    const error = new ValidationError('Invalid value', 'field', 'value');
    const formatted = formatValidationError(error);
    expect(formatted).toContain('Validation Error');
    expect(formatted).not.toContain('Suggestion:');
  });

  it('should handle regular errors', () => {
    const error = new Error('Regular error');
    const formatted = formatValidationError(error);
    expect(formatted).toBe('Regular error');
  });
});

describe('ValidationError class', () => {
  it('should create error with all properties', () => {
    const error = new ValidationError('message', 'field', 'value', 'suggestion');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe('message');
    expect(error.field).toBe('field');
    expect(error.value).toBe('value');
    expect(error.suggestion).toBe('suggestion');
    expect(error.name).toBe('ValidationError');
  });

  it('should work without suggestion', () => {
    const error = new ValidationError('message', 'field', 'value');
    expect(error.suggestion).toBeNull();
  });
});
