import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the cache directory path
 * Defaults to ~/.claude/docs or uses config setting
 */
export function getCacheDir() {
  const homeDir = os.homedir();
  return path.join(homeDir, '.claude', 'docs');
}

/**
 * Get the plugin root directory
 */
export function getPluginDir() {
  return path.dirname(__dirname);
}

/**
 * Load configuration from doc-fetcher-config.json
 */
export async function loadConfig() {
  const configPath = path.join(getPluginDir(), 'doc-fetcher-config.json');

  try {
    const data = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Return default config if file doesn't exist
    return {
      cache_directory: getCacheDir(),
      auto_generate_skills: true,
      auto_detect_dependencies: true,
      remote_sync: false,
      crawl_delay_ms: 1000,
      max_pages_per_fetch: 500,
      frameworks_priority: [
        'llms.txt',
        'claude.txt',
        'sitemap.xml',
        'docusaurus',
        'vitepress',
        'nextra'
      ],
      user_agent: 'Claude Code Doc Fetcher/1.0',
      respect_robots_txt: true,
      max_retries: 3,
      timeout_ms: 30000
    };
  }
}

/**
 * Ensure a directory exists, create if not
 */
export async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Get the path for a library's cached documentation
 */
export function getLibraryPath(cacheDir, library, version) {
  return path.join(cacheDir, library, version);
}

/**
 * Save metadata index.json for a library
 */
export async function saveMetadata(libraryPath, metadata) {
  const indexPath = path.join(libraryPath, 'index.json');
  await fs.writeFile(indexPath, JSON.stringify(metadata, null, 2), 'utf-8');
}

/**
 * Load metadata index.json for a library
 */
export async function loadMetadata(libraryPath) {
  const indexPath = path.join(libraryPath, 'index.json');

  try {
    const data = await fs.readFile(indexPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Save sitemap structure
 */
export async function saveSitemap(libraryPath, sitemap) {
  const sitemapPath = path.join(libraryPath, 'sitemap.json');
  await fs.writeFile(sitemapPath, JSON.stringify(sitemap, null, 2), 'utf-8');
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format timestamp to relative time
 */
export function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sanitize filename to be filesystem-safe
 */
export function sanitizeFilename(filename) {
  return filename
    .replace(/[<>:"|?*]/g, '-')
    .replace(/\//g, '-')
    .replace(/\\/g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

/**
 * Extract domain from URL
 */
export function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Normalize URL (remove trailing slashes, fragments)
 */
export function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    urlObj.hash = '';
    let normalized = urlObj.toString();
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return url;
  }
}

/**
 * Check if URL is absolute
 */
export function isAbsoluteUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve relative URL against base
 */
export function resolveUrl(base, relative) {
  try {
    return new URL(relative, base).toString();
  } catch {
    return null;
  }
}

/**
 * Get file size
 */
export async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * Get directory size recursively
 */
export async function getDirSize(dirPath) {
  let totalSize = 0;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        totalSize += await getDirSize(fullPath);
      } else {
        totalSize += await getFileSize(fullPath);
      }
    }
  } catch {
    // Ignore errors
  }

  return totalSize;
}

/**
 * List all cached libraries
 */
export async function listCachedLibraries(cacheDir) {
  const libraries = [];

  try {
    await ensureDir(cacheDir);
    const libraryDirs = await fs.readdir(cacheDir, { withFileTypes: true });

    for (const libDir of libraryDirs) {
      if (!libDir.isDirectory()) continue;

      const libraryName = libDir.name;
      const libraryPath = path.join(cacheDir, libraryName);
      const versions = await fs.readdir(libraryPath, { withFileTypes: true });

      for (const verDir of versions) {
        if (!verDir.isDirectory()) continue;

        const version = verDir.name;
        const versionPath = path.join(libraryPath, version);
        const metadata = await loadMetadata(versionPath);

        if (metadata) {
          libraries.push({
            name: libraryName,
            version,
            path: versionPath,
            metadata
          });
        }
      }
    }
  } catch (error) {
    // Return empty array if cache doesn't exist
  }

  return libraries;
}

/**
 * Pretty print JSON
 */
export function prettyJson(obj) {
  return JSON.stringify(obj, null, 2);
}

/**
 * Log with timestamp
 */
export function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '✓',
    warn: '⚠',
    error: '✗',
    debug: '→'
  }[level] || '•';

  console.log(`${prefix} ${message}`);
}

/**
 * Progress bar helper
 */
export class ProgressBar {
  constructor(total, width = 20) {
    this.total = total;
    this.current = 0;
    this.width = width;
  }

  update(current) {
    this.current = current;
    this.render();
  }

  increment() {
    this.current++;
    this.render();
  }

  render() {
    const percentage = Math.floor((this.current / this.total) * 100);
    const filled = Math.floor((this.current / this.total) * this.width);
    const empty = this.width - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    process.stdout.write(`\r[${bar}] ${this.current}/${this.total} (${percentage}%)`);

    if (this.current === this.total) {
      process.stdout.write('\n');
    }
  }
}

export default {
  getCacheDir,
  getPluginDir,
  loadConfig,
  ensureDir,
  getLibraryPath,
  saveMetadata,
  loadMetadata,
  saveSitemap,
  formatBytes,
  formatRelativeTime,
  sleep,
  sanitizeFilename,
  extractDomain,
  normalizeUrl,
  isAbsoluteUrl,
  resolveUrl,
  getFileSize,
  getDirSize,
  listCachedLibraries,
  prettyJson,
  log,
  ProgressBar
};
