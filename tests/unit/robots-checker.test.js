import { describe, it, expect } from '@jest/globals';
import { RobotsChecker } from '../../scripts/robots-checker.js';

describe('RobotsChecker', () => {
  const baseUrl = 'https://example.com';
  const defaultConfig = {
    respect_robots_txt: true,
    user_agent: 'TestBot/1.0',
    timeout_ms: 5000
  };

  describe('Constructor', () => {
    it('should initialize with correct properties', () => {
      const checker = new RobotsChecker(baseUrl, defaultConfig);

      expect(checker.baseUrl).toBe(baseUrl);
      expect(checker.config).toBe(defaultConfig);
      expect(checker.domain).toBe('example.com');
      expect(checker.enabled).toBe(true);
      expect(checker.strictMode).toBe(false);
      expect(checker.warnMode).toBe(false);
    });

    it('should handle disabled robots checking', () => {
      const config = { ...defaultConfig, respect_robots_txt: false };
      const checker = new RobotsChecker(baseUrl, config);

      expect(checker.enabled).toBe(false);
    });

    it('should enable strict mode when configured', () => {
      const config = { ...defaultConfig, respect_robots_txt: 'strict' };
      const checker = new RobotsChecker(baseUrl, config);

      expect(checker.enabled).toBe(true);
      expect(checker.strictMode).toBe(true);
      expect(checker.warnMode).toBe(false);
    });

    it('should enable warn mode when configured', () => {
      const config = { ...defaultConfig, respect_robots_txt: 'warn' };
      const checker = new RobotsChecker(baseUrl, config);

      expect(checker.enabled).toBe(true);
      expect(checker.strictMode).toBe(false);
      expect(checker.warnMode).toBe(true);
    });

    it('should extract domain from various URL formats', () => {
      const urls = [
        { url: 'https://example.com', expected: 'example.com' },
        { url: 'https://docs.example.com', expected: 'docs.example.com' },
        { url: 'https://example.com:8080', expected: 'example.com' },
        { url: 'https://example.com/path/to/page', expected: 'example.com' }
      ];

      for (const { url, expected } of urls) {
        const checker = new RobotsChecker(url, defaultConfig);
        expect(checker.domain).toBe(expected);
      }
    });

    it('should initialize robots as null', () => {
      const checker = new RobotsChecker(baseUrl, defaultConfig);
      expect(checker.robots).toBe(null);
    });
  });

  describe('isAllowed (without init)', () => {
    it('should return true when checking is disabled', () => {
      const config = { ...defaultConfig, respect_robots_txt: false };
      const checker = new RobotsChecker(baseUrl, config);

      expect(checker.isAllowed('https://example.com/any-path')).toBe(true);
    });

    it('should return true when no robots.txt loaded', () => {
      const checker = new RobotsChecker(baseUrl, defaultConfig);
      // Before init() is called, robots is null
      expect(checker.isAllowed('https://example.com/any-path')).toBe(true);
    });
  });

  describe('getCrawlDelay (without init)', () => {
    it('should return null when checking is disabled', () => {
      const config = { ...defaultConfig, respect_robots_txt: false };
      const checker = new RobotsChecker(baseUrl, config);

      expect(checker.getCrawlDelay()).toBe(null);
    });

    it('should return null when no robots.txt loaded', () => {
      const checker = new RobotsChecker(baseUrl, defaultConfig);
      expect(checker.getCrawlDelay()).toBe(null);
    });
  });

  describe('getSitemaps (without init)', () => {
    it('should return empty array when checking is disabled', () => {
      const config = { ...defaultConfig, respect_robots_txt: false };
      const checker = new RobotsChecker(baseUrl, config);

      expect(checker.getSitemaps()).toEqual([]);
    });

    it('should return empty array when no robots.txt loaded', () => {
      const checker = new RobotsChecker(baseUrl, defaultConfig);
      expect(checker.getSitemaps()).toEqual([]);
    });
  });

  describe('Configuration Modes', () => {
    it('should respect boolean true for enabled', () => {
      const config = { ...defaultConfig, respect_robots_txt: true };
      const checker = new RobotsChecker(baseUrl, config);

      expect(checker.enabled).toBe(true);
      expect(checker.strictMode).toBe(false);
      expect(checker.warnMode).toBe(false);
    });

    it('should respect boolean false for disabled', () => {
      const config = { ...defaultConfig, respect_robots_txt: false };
      const checker = new RobotsChecker(baseUrl, config);

      expect(checker.enabled).toBe(false);
    });

    it('should handle string "strict" mode', () => {
      const config = { ...defaultConfig, respect_robots_txt: 'strict' };
      const checker = new RobotsChecker(baseUrl, config);

      expect(checker.enabled).toBe(true);
      expect(checker.strictMode).toBe(true);
    });

    it('should handle string "warn" mode', () => {
      const config = { ...defaultConfig, respect_robots_txt: 'warn' };
      const checker = new RobotsChecker(baseUrl, config);

      expect(checker.enabled).toBe(true);
      expect(checker.warnMode).toBe(true);
    });
  });

  describe('Cache Path Generation', () => {
    it('should generate consistent cache path for domain', () => {
      const checker = new RobotsChecker(baseUrl, defaultConfig);
      const path1 = checker._getCachePath();
      const path2 = checker._getCachePath();

      expect(path1).toBe(path2);
      expect(path1).toContain('example.com.json');
    });

    it('should use domain name in cache filename', () => {
      const checker = new RobotsChecker('https://docs.example.org', defaultConfig);
      const cachePath = checker._getCachePath();

      expect(cachePath).toContain('docs.example.org.json');
    });
  });
});
