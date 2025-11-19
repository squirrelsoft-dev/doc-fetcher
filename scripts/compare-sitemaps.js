#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

/**
 * Compare Sitemaps Module
 *
 * Compares old (cached) and new (fetched) sitemaps to determine which pages
 * have changed, been added, or been removed. This enables incremental updates
 * that only fetch modified content rather than re-downloading all documentation.
 *
 * @module compare-sitemaps
 */

/**
 * Normalize a URL for comparison by removing trailing slashes and fragments
 * @param {string} url - The URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(url) {
  if (!url) return '';

  try {
    const urlObj = new URL(url);
    // Remove trailing slash and fragments
    let normalized = urlObj.origin + urlObj.pathname.replace(/\/$/, '');
    if (urlObj.search) normalized += urlObj.search;
    return normalized;
  } catch {
    // If not a valid URL, just remove trailing slash
    return url.replace(/\/$/, '');
  }
}

/**
 * Parse lastmod timestamp to Date object
 * @param {string|null} lastmod - ISO date string or null
 * @returns {Date|null} Parsed date or null
 */
function parseLastmod(lastmod) {
  if (!lastmod) return null;
  try {
    const date = new Date(lastmod);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Compare two sitemap entries to determine if content has changed
 * @param {Object} oldEntry - Entry from cached sitemap
 * @param {Object} newEntry - Entry from new sitemap
 * @returns {boolean} True if content appears to have changed
 */
function hasChanged(oldEntry, newEntry) {
  // If we have lastmod timestamps, use them for comparison
  const oldDate = parseLastmod(oldEntry.lastmod);
  const newDate = parseLastmod(newEntry.lastmod);

  if (oldDate && newDate) {
    return newDate > oldDate;
  }

  // If no lastmod available, consider it changed if size differs
  if (oldEntry.size && newEntry.size && oldEntry.size !== newEntry.size) {
    return true;
  }

  // If title changed, content likely changed
  if (oldEntry.title && newEntry.title && oldEntry.title !== newEntry.title) {
    return true;
  }

  // If we can't determine, assume unchanged to avoid unnecessary fetching
  // (conservative approach - better to miss a change than waste bandwidth)
  return false;
}

/**
 * Compare old and new sitemaps to detect changes
 *
 * @param {Object} oldSitemap - Cached sitemap structure from sitemap.json
 * @param {Object} newSitemap - Newly fetched sitemap structure
 * @param {Object} [options] - Comparison options
 * @param {boolean} [options.strict=false] - If true, treat missing lastmod as changed
 * @returns {Object} Comparison results with categorized pages
 */
export function compareSitemaps(oldSitemap, newSitemap, options = {}) {
  const { strict = false } = options;

  // Validate input
  if (!oldSitemap || !Array.isArray(oldSitemap.pages)) {
    throw new Error('Invalid old sitemap: must have pages array');
  }
  if (!newSitemap || !Array.isArray(newSitemap.pages)) {
    throw new Error('Invalid new sitemap: must have pages array');
  }

  // Build URL maps for quick lookup
  const oldMap = new Map();
  for (const page of oldSitemap.pages) {
    const normalizedUrl = normalizeUrl(page.url);
    oldMap.set(normalizedUrl, page);
  }

  const newMap = new Map();
  for (const page of newSitemap.pages) {
    const normalizedUrl = normalizeUrl(page.url);
    newMap.set(normalizedUrl, page);
  }

  // Categorize changes
  const unchanged = [];
  const modified = [];
  const added = [];
  const removed = [];

  // Check each new page
  for (const [url, newEntry] of newMap) {
    const oldEntry = oldMap.get(url);

    if (!oldEntry) {
      // New page that didn't exist before
      added.push({
        url: newEntry.url,
        title: newEntry.title,
        lastmod: newEntry.lastmod,
        changefreq: newEntry.changefreq,
        priority: newEntry.priority
      });
    } else if (hasChanged(oldEntry, newEntry)) {
      // Page exists but content has changed
      modified.push({
        url: newEntry.url,
        title: newEntry.title,
        lastmod: newEntry.lastmod,
        changefreq: newEntry.changefreq,
        priority: newEntry.priority,
        oldLastmod: oldEntry.lastmod,
        oldTitle: oldEntry.title
      });
    } else {
      // Page unchanged
      unchanged.push({
        url: newEntry.url,
        title: oldEntry.title,
        filename: oldEntry.filename,
        size: oldEntry.size,
        lastmod: oldEntry.lastmod
      });
    }
  }

  // Check for removed pages
  for (const [url, oldEntry] of oldMap) {
    if (!newMap.has(url)) {
      removed.push({
        url: oldEntry.url,
        title: oldEntry.title,
        filename: oldEntry.filename
      });
    }
  }

  // Calculate statistics
  const stats = {
    total: newSitemap.pages.length,
    unchanged: unchanged.length,
    modified: modified.length,
    added: added.length,
    removed: removed.length,
    needsFetch: modified.length + added.length,
    percentUnchanged: oldSitemap.pages.length > 0
      ? Math.round((unchanged.length / oldSitemap.pages.length) * 100)
      : 0
  };

  return {
    unchanged,
    modified,
    added,
    removed,
    stats,
    hasChanges: modified.length > 0 || added.length > 0 || removed.length > 0
  };
}

/**
 * Load sitemap from cache directory
 * @param {string} libraryPath - Path to library cache directory
 * @returns {Promise<Object|null>} Sitemap object or null if not found
 */
export async function loadCachedSitemap(libraryPath) {
  const sitemapPath = path.join(libraryPath, 'sitemap.json');

  try {
    await fs.access(sitemapPath);
    const content = await fs.readFile(sitemapPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // File doesn't exist (first fetch)
    }
    throw new Error(`Failed to load cached sitemap: ${error.message}`);
  }
}

/**
 * Format comparison results for display
 * @param {Object} comparison - Results from compareSitemaps()
 * @returns {string} Formatted summary text
 */
export function formatComparisonSummary(comparison) {
  const { stats } = comparison;
  const lines = [];

  lines.push(`Found ${stats.total} pages in new sitemap`);

  if (stats.unchanged > 0) {
    lines.push(`  ✓ ${stats.unchanged} pages unchanged (${stats.percentUnchanged}%)`);
  }
  if (stats.modified > 0) {
    lines.push(`  ! ${stats.modified} pages modified`);
  }
  if (stats.added > 0) {
    lines.push(`  + ${stats.added} pages added`);
  }
  if (stats.removed > 0) {
    lines.push(`  - ${stats.removed} pages removed`);
  }

  if (stats.needsFetch > 0) {
    const saved = stats.total - stats.needsFetch;
    const savedPercent = Math.round((saved / stats.total) * 100);
    lines.push(`\nWill fetch ${stats.needsFetch} pages (saving ${savedPercent}% bandwidth)`);
  } else {
    lines.push('\nNo changes detected - documentation is up to date');
  }

  return lines.join('\n');
}

/**
 * CLI interface for testing
 */
export async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node compare-sitemaps.js <old-sitemap.json> <new-sitemap.json>');
    console.log('Example: node compare-sitemaps.js .claude/docs/nextjs/14.0.0/sitemap.json new-sitemap.json');
    process.exit(1);
  }

  const oldPath = args[0];
  const newPath = args[1];

  try {
    // Load sitemaps
    const oldSitemap = JSON.parse(await fs.readFile(oldPath, 'utf-8'));
    const newSitemap = JSON.parse(await fs.readFile(newPath, 'utf-8'));

    // Compare
    const comparison = compareSitemaps(oldSitemap, newSitemap);

    // Display results
    console.log('\n' + formatComparisonSummary(comparison));

    if (comparison.modified.length > 0 && comparison.modified.length <= 10) {
      console.log('\nModified pages:');
      for (const page of comparison.modified) {
        console.log(`  - ${page.title || page.url}`);
      }
    }

    if (comparison.added.length > 0 && comparison.added.length <= 10) {
      console.log('\nAdded pages:');
      for (const page of comparison.added) {
        console.log(`  + ${page.title || page.url}`);
      }
    }

    if (comparison.removed.length > 0 && comparison.removed.length <= 10) {
      console.log('\nRemoved pages:');
      for (const page of comparison.removed) {
        console.log(`  - ${page.title || page.url}`);
      }
    }

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
