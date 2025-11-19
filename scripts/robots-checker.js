import robotsParser from 'robots-parser';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { extractDomain, log, getRobotsCacheDir } from './utils.js';

/**
 * RobotsChecker class handles robots.txt fetching, caching, and compliance checking
 */
export class RobotsChecker {
  constructor(baseUrl, config) {
    this.baseUrl = baseUrl;
    this.config = config;
    this.domain = extractDomain(baseUrl);
    this.robots = null;
    this.enabled = config.respect_robots_txt !== false;
    this.strictMode = config.respect_robots_txt === 'strict';
    this.warnMode = config.respect_robots_txt === 'warn';
    this.robotsUrl = null;
  }

  /**
   * Initialize the robots.txt checker
   * Fetches and parses robots.txt (from cache or web)
   */
  async init() {
    if (!this.enabled) {
      log('Robots.txt checking disabled', 'debug');
      return;
    }

    if (!this.domain) {
      log('Invalid base URL for robots.txt', 'warn');
      return;
    }

    try {
      this.robotsUrl = new URL('/robots.txt', this.baseUrl).toString();
      const robotsTxt = await this._loadRobotsTxt();

      if (robotsTxt) {
        this.robots = robotsParser(this.robotsUrl, robotsTxt);
        log(`Robots.txt loaded for ${this.domain}`, 'debug');
      } else {
        log(`No robots.txt for ${this.domain}, allowing all`, 'debug');
      }
    } catch (error) {
      log(`Error initializing robots.txt: ${error.message}`, 'warn');
      // Continue without robots.txt (allow all)
    }
  }

  /**
   * Check if a URL is allowed by robots.txt
   * @param {string} url - URL to check
   * @returns {boolean} - true if allowed, false if disallowed
   */
  isAllowed(url) {
    // If checking is disabled or no robots.txt loaded, allow all
    if (!this.enabled || !this.robots) {
      return true;
    }

    try {
      const allowed = this.robots.isAllowed(url, this.config.user_agent);

      if (!allowed) {
        const message = `URL disallowed by robots.txt: ${url}`;

        if (this.strictMode) {
          throw new Error(message);
        } else if (this.warnMode) {
          log(`⚠ ${message} (proceeding anyway in warn mode)`, 'warn');
          return true; // Proceed despite disallow
        } else {
          log(`⚠ ${message} (skipping)`, 'warn');
          return false;
        }
      }

      return true;
    } catch (error) {
      if (this.strictMode) {
        throw error;
      }
      log(`Error checking robots.txt for ${url}: ${error.message}`, 'warn');
      return true; // On error, allow
    }
  }

  /**
   * Get the crawl delay from robots.txt
   * @returns {number|null} - Delay in milliseconds, or null if not specified
   */
  getCrawlDelay() {
    if (!this.enabled || !this.robots) {
      return null;
    }

    try {
      const delaySeconds = this.robots.getCrawlDelay(this.config.user_agent);

      if (delaySeconds !== undefined && delaySeconds !== null) {
        const delayMs = delaySeconds * 1000;
        log(`Using Crawl-delay from robots.txt: ${delaySeconds}s (${delayMs}ms)`, 'debug');
        return delayMs;
      }
    } catch (error) {
      log(`Error getting crawl delay: ${error.message}`, 'warn');
    }

    return null;
  }

  /**
   * Get sitemap URLs from robots.txt
   * @returns {string[]} - Array of sitemap URLs
   */
  getSitemaps() {
    if (!this.enabled || !this.robots) {
      return [];
    }

    try {
      const sitemaps = this.robots.getSitemaps();

      if (sitemaps && sitemaps.length > 0) {
        log(`Found ${sitemaps.length} sitemap(s) in robots.txt`, 'debug');
        return sitemaps;
      }
    } catch (error) {
      log(`Error getting sitemaps from robots.txt: ${error.message}`, 'warn');
    }

    return [];
  }

  /**
   * Load robots.txt (from cache or web)
   * @private
   */
  async _loadRobotsTxt() {
    // Try cache first
    const cached = await this._loadCachedRobotsTxt();
    if (cached) {
      return cached;
    }

    // Fetch from web
    return await this._fetchRobotsTxt();
  }

  /**
   * Fetch robots.txt from the web
   * @private
   */
  async _fetchRobotsTxt() {
    try {
      log(`Fetching robots.txt from ${this.robotsUrl}`, 'debug');

      const response = await axios.get(this.robotsUrl, {
        timeout: this.config.timeout_ms || 30000,
        headers: {
          'User-Agent': this.config.user_agent
        },
        validateStatus: (status) => status === 200 || status === 404
      });

      if (response.status === 404) {
        log(`No robots.txt found (404) for ${this.domain}`, 'debug');
        await this._cacheRobotsTxt(''); // Cache empty to avoid repeated 404s
        return '';
      }

      const content = response.data;
      await this._cacheRobotsTxt(content);
      log(`✓ Fetched robots.txt for ${this.domain}`, 'info');

      return content;
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        log(`Cannot reach ${this.domain} for robots.txt`, 'warn');
      } else {
        log(`Failed to fetch robots.txt: ${error.message}`, 'warn');
      }

      return ''; // On error, allow all
    }
  }

  /**
   * Cache robots.txt content
   * @private
   */
  async _cacheRobotsTxt(content) {
    try {
      const cacheDir = getRobotsCacheDir();
      await fs.mkdir(cacheDir, { recursive: true });

      const cachePath = this._getCachePath();
      const cacheData = {
        content,
        fetchedAt: new Date().toISOString(),
        domain: this.domain,
        url: this.robotsUrl
      };

      await fs.writeFile(cachePath, JSON.stringify(cacheData, null, 2), 'utf-8');
      log(`Cached robots.txt for ${this.domain}`, 'debug');
    } catch (error) {
      log(`Failed to cache robots.txt: ${error.message}`, 'warn');
      // Non-fatal, continue without cache
    }
  }

  /**
   * Load cached robots.txt
   * @private
   */
  async _loadCachedRobotsTxt() {
    try {
      const cachePath = this._getCachePath();
      const data = await fs.readFile(cachePath, 'utf-8');
      const cached = JSON.parse(data);

      // Check if cache is still valid (24 hour TTL)
      const fetchedAt = new Date(cached.fetchedAt);
      const now = new Date();
      const ageHours = (now - fetchedAt) / (1000 * 60 * 60);

      if (ageHours < 24) {
        log(`Using cached robots.txt for ${this.domain} (${ageHours.toFixed(1)}h old)`, 'debug');
        return cached.content;
      } else {
        log(`Cached robots.txt for ${this.domain} expired (${ageHours.toFixed(1)}h old)`, 'debug');
        return null;
      }
    } catch (error) {
      // Cache miss or read error - not a problem
      return null;
    }
  }

  /**
   * Get the cache file path for this domain
   * @private
   */
  _getCachePath() {
    const cacheDir = getRobotsCacheDir();
    const filename = `${this.domain}.json`;
    return path.join(cacheDir, filename);
  }
}

export default RobotsChecker;
