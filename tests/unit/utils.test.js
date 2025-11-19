import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  formatBytes,
  formatRelativeTime,
  sanitizeFilename,
  extractDomain,
  normalizeUrl,
  isAbsoluteUrl,
  resolveUrl,
  prettyJson,
  ProgressBar,
  getCacheDir,
  getRobotsCacheDir,
  getLibraryPath
} from '../../scripts/utils.js';
import os from 'os';
import path from 'path';

describe('Utils - Formatting Functions', () => {
  describe('formatBytes', () => {
    it('should format 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('should format bytes correctly', () => {
      expect(formatBytes(500)).toBe('500 B');
    });

    it('should format kilobytes correctly', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(2048)).toBe('2 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.5 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "just now" for recent timestamps', () => {
      const now = new Date().toISOString();
      expect(formatRelativeTime(now)).toBe('just now');
    });

    it('should format minutes correctly', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
    });

    it('should format singular minute correctly', () => {
      const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000).toISOString();
      expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
    });

    it('should format hours correctly', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');
    });

    it('should format days correctly', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(threeDaysAgo)).toBe('3 days ago');
    });

    it('should format weeks correctly', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoWeeksAgo)).toBe('2 weeks ago');
    });
  });

  describe('prettyJson', () => {
    it('should format JSON with 2-space indentation', () => {
      const obj = { name: 'test', version: '1.0.0' };
      const expected = JSON.stringify(obj, null, 2);
      expect(prettyJson(obj)).toBe(expected);
    });

    it('should handle nested objects', () => {
      const obj = {
        library: {
          name: 'react',
          version: '18.0.0',
          metadata: {
            pages: 100
          }
        }
      };
      expect(prettyJson(obj)).toContain('"library"');
      expect(prettyJson(obj)).toContain('"metadata"');
    });
  });
});

describe('Utils - Filename Functions', () => {
  describe('sanitizeFilename', () => {
    it('should convert to lowercase', () => {
      expect(sanitizeFilename('MyFile.txt')).toBe('myfile.txt');
    });

    it('should replace spaces with hyphens', () => {
      expect(sanitizeFilename('my file name')).toBe('my-file-name');
    });

    it('should replace invalid characters', () => {
      expect(sanitizeFilename('file<>:"|?*.txt')).toBe('file-------.txt');
    });

    it('should replace slashes with hyphens', () => {
      expect(sanitizeFilename('path/to/file')).toBe('path-to-file');
      expect(sanitizeFilename('path\\to\\file')).toBe('path-to-file');
    });

    it('should handle multiple spaces', () => {
      expect(sanitizeFilename('multiple   spaces')).toBe('multiple-spaces');
    });

    it('should handle combination of issues', () => {
      expect(sanitizeFilename('My File: Version 2.0 (New)')).toBe('my-file--version-2.0-(new)');
    });
  });
});

describe('Utils - URL Functions', () => {
  describe('extractDomain', () => {
    it('should extract domain from URL', () => {
      expect(extractDomain('https://example.com/path')).toBe('example.com');
    });

    it('should extract domain with subdomain', () => {
      expect(extractDomain('https://docs.example.com')).toBe('docs.example.com');
    });

    it('should handle URL with port', () => {
      expect(extractDomain('https://example.com:8080/path')).toBe('example.com');
    });

    it('should return null for invalid URLs', () => {
      expect(extractDomain('not a url')).toBe(null);
      expect(extractDomain('')).toBe(null);
    });
  });

  describe('normalizeUrl', () => {
    it('should remove trailing slash', () => {
      expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path');
    });

    it('should remove hash fragments', () => {
      expect(normalizeUrl('https://example.com/path#section')).toBe('https://example.com/path');
    });

    it('should keep URL without trailing slash', () => {
      expect(normalizeUrl('https://example.com/path')).toBe('https://example.com/path');
    });

    it('should handle both trailing slash and hash', () => {
      expect(normalizeUrl('https://example.com/path/#section')).toBe('https://example.com/path');
    });

    it('should return input for invalid URLs', () => {
      expect(normalizeUrl('not a url')).toBe('not a url');
    });
  });

  describe('isAbsoluteUrl', () => {
    it('should return true for absolute HTTP URLs', () => {
      expect(isAbsoluteUrl('http://example.com')).toBe(true);
      expect(isAbsoluteUrl('https://example.com')).toBe(true);
    });

    it('should return true for other protocols', () => {
      expect(isAbsoluteUrl('ftp://example.com')).toBe(true);
      expect(isAbsoluteUrl('file:///path/to/file')).toBe(true);
    });

    it('should return false for relative URLs', () => {
      expect(isAbsoluteUrl('/path/to/page')).toBe(false);
      expect(isAbsoluteUrl('relative/path')).toBe(false);
      expect(isAbsoluteUrl('../parent')).toBe(false);
    });

    it('should return false for invalid URLs', () => {
      expect(isAbsoluteUrl('not a url')).toBe(false);
      expect(isAbsoluteUrl('')).toBe(false);
    });
  });

  describe('resolveUrl', () => {
    it('should resolve relative URL against base', () => {
      expect(resolveUrl('https://example.com/docs/', 'page.html'))
        .toBe('https://example.com/docs/page.html');
    });

    it('should resolve parent directory references', () => {
      expect(resolveUrl('https://example.com/docs/api/', '../guide.html'))
        .toBe('https://example.com/docs/guide.html');
    });

    it('should handle absolute paths', () => {
      expect(resolveUrl('https://example.com/docs/', '/absolute/path'))
        .toBe('https://example.com/absolute/path');
    });

    it('should handle already absolute URLs', () => {
      expect(resolveUrl('https://example.com/', 'https://other.com/page'))
        .toBe('https://other.com/page');
    });

    it('should return null for invalid inputs', () => {
      expect(resolveUrl('not a url', 'page')).toBe(null);
    });
  });
});

describe('Utils - Path Functions', () => {
  describe('getCacheDir', () => {
    it('should return path in home directory', () => {
      const homeDir = os.homedir();
      const expected = path.join(homeDir, '.claude', 'docs');
      expect(getCacheDir()).toBe(expected);
    });
  });

  describe('getRobotsCacheDir', () => {
    it('should return robots cache path', () => {
      const homeDir = os.homedir();
      const expected = path.join(homeDir, '.claude', 'docs', '.robots-cache');
      expect(getRobotsCacheDir()).toBe(expected);
    });
  });

  describe('getLibraryPath', () => {
    it('should construct correct library path', () => {
      const cacheDir = '/cache';
      const library = 'react';
      const version = '18.0.0';
      const expected = path.join('/cache', 'react', '18.0.0');
      expect(getLibraryPath(cacheDir, library, version)).toBe(expected);
    });

    it('should handle paths with special characters', () => {
      const cacheDir = '/cache';
      const library = '@types/node';
      const version = '1.0.0';
      const expected = path.join('/cache', '@types/node', '1.0.0');
      expect(getLibraryPath(cacheDir, library, version)).toBe(expected);
    });
  });
});

describe('Utils - ProgressBar', () => {
  let originalStdoutWrite;

  beforeEach(() => {
    // Mock stdout.write to prevent actual console output during tests
    originalStdoutWrite = process.stdout.write;
    process.stdout.write = () => {};
  });

  afterEach(() => {
    // Restore stdout.write
    process.stdout.write = originalStdoutWrite;
  });

  it('should initialize with correct values', () => {
    const bar = new ProgressBar(100);
    expect(bar.total).toBe(100);
    expect(bar.current).toBe(0);
    expect(bar.width).toBe(20);
  });

  it('should accept custom width', () => {
    const bar = new ProgressBar(100, 40);
    expect(bar.width).toBe(40);
  });

  it('should update current value', () => {
    const bar = new ProgressBar(100);
    bar.update(50);
    expect(bar.current).toBe(50);
  });

  it('should increment current value', () => {
    const bar = new ProgressBar(100);
    bar.increment();
    expect(bar.current).toBe(1);
    bar.increment();
    expect(bar.current).toBe(2);
  });

  it('should track progress to completion', () => {
    const bar = new ProgressBar(10);
    for (let i = 0; i < 10; i++) {
      bar.increment();
    }
    expect(bar.current).toBe(10);
    expect(bar.current).toBe(bar.total);
  });
});
