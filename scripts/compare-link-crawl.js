#!/usr/bin/env node
import { crawlLinks } from './crawl-links.js';
import { loadCachedSitemap, compareSitemaps, formatComparisonSummary } from './compare-sitemaps.js';
import { log } from './utils.js';

/**
 * Compare Link-Crawl Module
 *
 * Compares cached link-crawl-based documentation with current remote version
 * by re-crawling navigation links to detect changes.
 *
 * Since link-crawl doesn't have per-page lastmod timestamps,
 * changes are detected by comparing URL lists and optionally page sizes.
 *
 * @module compare-link-crawl
 */

/**
 * Build a sitemap-compatible structure from discovered URLs
 * @param {string[]} urls - Array of discovered URLs
 * @returns {Object} Sitemap-like structure for comparison
 */
function buildSitemapFromUrls(urls) {
  return {
    pages: urls.map(url => ({
      url,
      title: null,
      filename: null,
      size: null,
      lastmod: null,
      changefreq: null,
      priority: null
    }))
  };
}

/**
 * Compare cached link-crawl documentation with remote
 *
 * @param {string} libraryPath - Path to library cache directory
 * @param {string} sourceUrl - Original source URL (base URL for crawling)
 * @param {Object} config - Configuration object
 * @param {Object} robotsChecker - Robots.txt checker instance
 * @returns {Promise<Object|null>} Comparison results or null if can't compare
 */
export async function compareLinkCrawl(libraryPath, sourceUrl, config, robotsChecker) {
  try {
    // Load cached sitemap
    const cachedSitemap = await loadCachedSitemap(libraryPath);

    if (!cachedSitemap) {
      log('No cached sitemap found - will do full fetch', 'debug');
      return null;
    }

    // Re-crawl navigation links
    log('[1/3] Re-crawling navigation links...', 'info');
    const crawlResult = await crawlLinks(sourceUrl, config, robotsChecker);

    if (!crawlResult.success) {
      log(`Link crawl failed: ${crawlResult.error}`, 'warn');
      return null;
    }

    const newUrls = crawlResult.urls;
    log(`[2/3] Found ${newUrls.length} URLs from navigation`, 'info');

    // Build sitemap structure from new URLs
    const newSitemap = buildSitemapFromUrls(newUrls);

    // Compare with cached sitemap
    log('[3/3] Comparing with cached version...', 'info');
    const comparison = compareSitemaps(cachedSitemap, newSitemap);

    // Display comparison summary
    log(formatComparisonSummary(comparison), 'info');

    // Build URL entries for crawling (compatible with fetch-docs.js)
    const urlEntries = newUrls.map(url => ({
      loc: url,
      lastmod: null,
      changefreq: null,
      priority: null
    }));

    return {
      comparison,
      crawlResult,
      urlEntries,
      libraryPath
    };

  } catch (error) {
    log(`Link-crawl comparison failed: ${error.message}`, 'warn');
    return null;
  }
}

/**
 * CLI interface for testing
 */
export async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node compare-link-crawl.js <library-path> <source-url>');
    console.log('Example: node compare-link-crawl.js .claude/docs/mylib/1.0.0 https://mylib.dev/docs');
    process.exit(1);
  }

  const libraryPath = args[0];
  const sourceUrl = args[1];

  // Load config
  const { loadConfig } = await import('./utils.js');
  const config = await loadConfig();

  // Compare
  const result = await compareLinkCrawl(libraryPath, sourceUrl, config, null);

  if (result) {
    console.log('\n✓ Comparison complete');
    console.log(`  URLs to fetch: ${result.comparison.stats.needsFetch}`);
    console.log(`  URLs unchanged: ${result.comparison.stats.unchanged}`);
  } else {
    console.log('\n✗ Comparison failed');
  }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default compareLinkCrawl;
