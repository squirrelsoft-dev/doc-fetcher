#!/usr/bin/env node
import { extractUrlsFromContent, findAIOptimizedDocs } from './find-llms-txt.js';
import { loadCachedSitemap, compareSitemaps, formatComparisonSummary } from './compare-sitemaps.js';
import { log, normalizeUrl } from './utils.js';

/**
 * Compare LLMS.txt Module
 *
 * Compares cached LLMS.txt-based documentation with current remote version
 * to determine which pages have changed, been added, or been removed.
 *
 * Since LLMS.txt files don't contain per-page lastmod timestamps,
 * changes are detected by comparing URL lists and optionally page sizes.
 *
 * @module compare-llms-txt
 */

/**
 * Build a sitemap-compatible structure from extracted URLs
 * @param {string[]} urls - Array of extracted URLs
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
 * Compare cached LLMS.txt documentation with remote
 *
 * @param {string} libraryPath - Path to library cache directory
 * @param {string} sourceUrl - Original source URL (base URL for finding llms.txt)
 * @param {Object} config - Configuration object
 * @param {Object} robotsChecker - Robots.txt checker instance
 * @returns {Promise<Object|null>} Comparison results or null if can't compare
 */
export async function compareLlmsTxt(libraryPath, sourceUrl, config, robotsChecker) {
  try {
    // Load cached sitemap
    const cachedSitemap = await loadCachedSitemap(libraryPath);

    if (!cachedSitemap) {
      log('No cached sitemap found - will do full fetch', 'debug');
      return null;
    }

    // Fetch new llms.txt file
    log('[1/3] Fetching latest llms.txt...', 'info');
    const llmsTxtResult = await findAIOptimizedDocs(sourceUrl, config, robotsChecker);

    if (!llmsTxtResult.found) {
      log('Could not fetch llms.txt file - falling back to full fetch', 'warn');
      return null;
    }

    // Extract URLs from new llms.txt
    const newUrls = llmsTxtResult.extractedUrls;
    log(`[2/3] Extracted ${newUrls.length} URLs from llms.txt`, 'info');

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
      llmsTxtResult,
      urlEntries,
      libraryPath
    };

  } catch (error) {
    log(`LLMS.txt comparison failed: ${error.message}`, 'warn');
    return null;
  }
}

/**
 * CLI interface for testing
 */
export async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node compare-llms-txt.js <library-path> <source-url>');
    console.log('Example: node compare-llms-txt.js .claude/docs/nextjs/14.0.0 https://nextjs.org');
    process.exit(1);
  }

  const libraryPath = args[0];
  const sourceUrl = args[1];

  // Load config
  const { loadConfig } = await import('./utils.js');
  const config = await loadConfig();

  // Compare
  const result = await compareLlmsTxt(libraryPath, sourceUrl, config, null);

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

export default compareLlmsTxt;
