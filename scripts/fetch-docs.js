#!/usr/bin/env node

import { Command } from 'commander';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import pLimit from 'p-limit';
import { RobotsChecker } from './robots-checker.js';
import findAIOptimizedDocs from './find-llms-txt.js';
import parseSitemap from './parse-sitemap.js';
import extractContent from './extract-content.js';
import {
  loadConfig,
  getCacheDir,
  getLibraryPath,
  ensureDir,
  saveMetadata,
  saveSitemap,
  log,
  sleep,
  formatBytes,
  sanitizeFilename,
  getDirSize,
  ProgressBar
} from './utils.js';
import {
  validateLibraryName,
  validateVersion,
  validateUrl,
  formatValidationError,
  ValidationError
} from './validate.js';

const program = new Command();

/**
 * Fetch HTML content from URL
 */
async function fetchHtml(url, config, retryCount = 0) {
  try {
    const response = await axios.get(url, {
      timeout: config.timeout_ms,
      headers: {
        'User-Agent': config.user_agent
      }
    });

    return {
      success: true,
      html: response.data
    };
  } catch (error) {
    if (retryCount < config.max_retries) {
      log(`  Retry ${retryCount + 1}/${config.max_retries} for ${url}`, 'warn');
      await sleep(1000 * (retryCount + 1)); // Exponential backoff
      return fetchHtml(url, config, retryCount + 1);
    }

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Save page content to cache
 */
async function savePage(libraryPath, pageUrl, markdown, metadata) {
  // Create filename from URL
  const urlObj = new URL(pageUrl);
  const pathname = urlObj.pathname;
  const filename = sanitizeFilename(pathname.replace(/^\//, '').replace(/\/$/, '') || 'index') + '.md';

  const pagePath = path.join(libraryPath, 'pages', filename);

  // Ensure directory exists
  await ensureDir(path.dirname(pagePath));

  // Add metadata header
  const content = `---
url: ${pageUrl}
title: ${metadata.title}
extractedAt: ${metadata.extractedAt}
---

${markdown}`;

  await fs.writeFile(pagePath, content, 'utf-8');

  return {
    filename,
    path: pagePath,
    size: content.length
  };
}

/**
 * Crawl documentation pages
 * @param {Array<string|Object>} urlEntries - Array of URLs or URL entry objects with metadata
 * @param {string} libraryPath - Path to save pages
 * @param {Object} config - Configuration object
 * @param {Object} robotsChecker - RobotsChecker instance
 * @param {Object} [options] - Crawl options
 * @param {Set<string>} [options.pageFilter] - Set of URLs to fetch (if provided, only these will be fetched)
 * @returns {Promise<Object>} Crawl results
 */
async function crawlPages(urlEntries, libraryPath, config, robotsChecker, options = {}) {
  const { pageFilter } = options;

  const results = {
    successful: 0,
    failed: 0,
    skipped: 0,
    totalSize: 0,
    pages: []
  };

  const limit = pLimit(5); // Limit concurrent requests

  // Apply page filter if provided
  let entriesToProcess = urlEntries;
  if (pageFilter && pageFilter.size > 0) {
    entriesToProcess = urlEntries.filter(entry => {
      const url = typeof entry === 'string' ? entry : entry.loc;
      return pageFilter.has(url);
    });
  }

  // Limit number of pages if configured
  const entriesToCrawl = entriesToProcess.slice(0, config.max_pages_per_fetch);

  if (entriesToProcess.length > config.max_pages_per_fetch) {
    log(`⚠ Limiting to ${config.max_pages_per_fetch} pages (${entriesToProcess.length} total found)`, 'warn');
  }

  const progress = new ProgressBar(entriesToCrawl.length);

  // Get crawl delay from robots.txt or use config default
  const crawlDelay = robotsChecker?.getCrawlDelay() || config.crawl_delay_ms;

  const tasks = entriesToCrawl.map((entry, index) =>
    limit(async () => {
      // Extract URL and metadata from entry
      const url = typeof entry === 'string' ? entry : entry.loc;
      const urlMetadata = typeof entry === 'object' ? {
        lastmod: entry.lastmod || null,
        changefreq: entry.changefreq || null,
        priority: entry.priority || null
      } : {};

      // Check robots.txt
      if (robotsChecker && !robotsChecker.isAllowed(url)) {
        results.skipped++;
        progress.increment();
        return null;
      }

      // Rate limiting
      await sleep(crawlDelay);

      // Fetch HTML
      const fetchResult = await fetchHtml(url, config);

      if (!fetchResult.success) {
        results.failed++;
        progress.increment();
        return null;
      }

      // Extract content
      const extractResult = extractContent(fetchResult.html, url);

      if (!extractResult.success) {
        results.failed++;
        progress.increment();
        return null;
      }

      // Save page
      try {
        const pageInfo = await savePage(
          libraryPath,
          url,
          extractResult.markdown,
          extractResult.metadata
        );

        results.successful++;
        results.totalSize += pageInfo.size;
        results.pages.push({
          url,
          title: extractResult.metadata.title,
          filename: pageInfo.filename,
          size: pageInfo.size,
          ...urlMetadata  // Include sitemap metadata (lastmod, changefreq, priority)
        });

        progress.increment();
        return pageInfo;
      } catch (error) {
        log(`  ✗ Failed to save page ${url}: ${error.message}`, 'error');
        results.failed++;
        progress.increment();
        return null;
      }
    })
  );

  await Promise.all(tasks);

  return results;
}

/**
 * Main fetch documentation function
 */
async function fetchDocumentation(library, version, options) {
  // Validate inputs
  try {
    library = validateLibraryName(library);
    version = validateVersion(version);

    if (options.url) {
      options.url = validateUrl(options.url);
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new Error(formatValidationError(error));
    }
    throw error;
  }

  log(`\\nFetching documentation for ${library}${version ? ` v${version}` : ''}...\\n`, 'info');

  // Load config
  const config = await loadConfig();
  const cacheDir = config.cache_directory || getCacheDir();

  // Determine documentation URL
  const docUrl = options.url || `https://${library}.dev/docs`;
  log(`Documentation URL: ${docUrl}`, 'info');

  // 0. Initialize robots.txt checker
  log('\\n[1/7] Checking robots.txt...', 'info');
  const robotsChecker = new RobotsChecker(docUrl, config);
  await robotsChecker.init();

  // Check for sitemaps in robots.txt
  const robotsSitemaps = robotsChecker.getSitemaps();
  if (robotsSitemaps.length > 0) {
    log(`Found ${robotsSitemaps.length} sitemap(s) in robots.txt`, 'debug');
  }

  // 1. Check for AI-optimized docs (llms.txt)
  log('\\n[2/7] Checking for AI-optimized documentation...', 'info');
  const aiDocsResult = await findAIOptimizedDocs(docUrl, config, robotsChecker);

  let pages = [];
  let sourceType = null;
  let sourceUrl = null;

  if (aiDocsResult.found) {
    log(`✓ Found ${aiDocsResult.type} (${formatBytes(aiDocsResult.size)})`, 'info');
    log('Using AI-optimized format instead of crawling', 'info');

    // Save llms.txt content directly
    sourceType = 'llms.txt';
    sourceUrl = aiDocsResult.url;
    pages = [{
      url: aiDocsResult.url,
      title: `${library} Documentation`,
      filename: 'index.md',
      size: aiDocsResult.size,
      content: aiDocsResult.content
    }];
  } else {
    // 2. Parse sitemap.xml
    log('\\n[3/7] Parsing sitemap.xml...', 'info');
    try {
      const sitemapResult = await parseSitemap(docUrl, config, robotsChecker, robotsSitemaps);
      sourceType = 'sitemap';
      sourceUrl = sitemapResult.sitemapUrl;
      const urlEntries = sitemapResult.fullEntries; // Use fullEntries to preserve metadata

      log(`Found ${urlEntries.length} documentation pages`, 'info');

      // 3. Crawl pages
      log('\\n[4/7] Crawling documentation pages...', 'info');
      const crawlResults = await crawlPages(urlEntries, path.join(cacheDir, library, version || 'latest'), config, robotsChecker);

      pages = crawlResults.pages;

      log(`\\n✓ Crawled ${crawlResults.successful} pages`, 'info');
      if (crawlResults.skipped > 0) {
        log(`⚠ Skipped ${crawlResults.skipped} pages (disallowed by robots.txt)`, 'warn');
      }
      if (crawlResults.failed > 0) {
        log(`✗ Failed to crawl ${crawlResults.failed} pages`, 'warn');
      }
    } catch (error) {
      log(`✗ Failed to parse sitemap: ${error.message}`, 'error');
      throw new Error('Could not fetch documentation. Please check the URL or provide a custom --url');
    }
  }

  // 4. Create cache directory structure
  log('\\n[5/7] Saving to cache...', 'info');
  const libraryPath = getLibraryPath(cacheDir, library, version || 'latest');
  await ensureDir(libraryPath);
  await ensureDir(path.join(libraryPath, 'pages'));

  // Save llms.txt content if that's what we used
  if (sourceType === 'llms.txt' && pages.length > 0) {
    const pagePath = path.join(libraryPath, 'pages', 'index.md');
    await fs.writeFile(pagePath, pages[0].content, 'utf-8');
  }

  // 5. Save metadata
  log('[6/7] Saving metadata...', 'info');
  const totalSize = await getDirSize(libraryPath);
  const metadata = {
    library,
    version: version || aiDocsResult.version || 'latest',
    source_url: docUrl,
    fetched_at: new Date().toISOString(),
    source_type: sourceType,
    source_file_url: sourceUrl,
    page_count: pages.length,
    total_size_bytes: totalSize,
    framework: sourceType === 'llms.txt' ? 'llms.txt' : 'unknown',
    skill_generated: false,
    skill_path: null
  };

  await saveMetadata(libraryPath, metadata);

  // Save sitemap structure
  const sitemapStructure = {
    pages: pages.map(p => ({
      url: p.url,
      title: p.title,
      filename: p.filename,
      size: p.size,
      lastmod: p.lastmod || null,
      changefreq: p.changefreq || null,
      priority: p.priority || null
    }))
  };
  await saveSitemap(libraryPath, sitemapStructure);

  // 6. Summary
  log('\\n[7/7] Summary', 'info');
  log(`✓ Documentation cached successfully!\\n`, 'info');
  log(`  Location: ${libraryPath}`, 'info');
  log(`  Pages: ${pages.length}`, 'info');
  log(`  Size: ${formatBytes(totalSize)}`, 'info');
  log(`  Source: ${sourceType}\\n`, 'info');

  // Generate skill if auto-enabled
  if (config.auto_generate_skills) {
    log('Auto-generating skill...', 'info');
    log('(Skill generation will be implemented next)\\n', 'info');
  }

  return {
    library,
    version: metadata.version,
    path: libraryPath,
    pages: pages.length,
    size: totalSize,
    metadata
  };
}

/**
 * Perform incremental update - fetch only changed pages and merge with existing cache
 * @param {string} library - Library name
 * @param {string} version - Version
 * @param {Array} urlEntries - Full URL entries from sitemap
 * @param {Object} comparison - Comparison results from compare-sitemaps
 * @param {string} libraryPath - Path to library cache
 * @param {Object} config - Configuration
 * @param {Object} robotsChecker - RobotsChecker instance
 * @returns {Promise<Object>} Update results
 */
export async function incrementalUpdate(library, version, urlEntries, comparison, libraryPath, config, robotsChecker) {
  const { modified, added, unchanged } = comparison;

  // Build set of URLs that need fetching
  const urlsToFetch = new Set([
    ...modified.map(p => p.url),
    ...added.map(p => p.url)
  ]);

  if (urlsToFetch.size === 0) {
    log('\nNo changes detected - documentation is up to date', 'info');
    return {
      library,
      version,
      path: libraryPath,
      pages: unchanged.length,
      updated: false,
      stats: {
        unchanged: unchanged.length,
        modified: 0,
        added: 0
      }
    };
  }

  log(`\n[3/3] Fetching ${urlsToFetch.size} changed/new pages...`, 'info');

  // Crawl only the changed/new pages
  const crawlResults = await crawlPages(
    urlEntries,
    libraryPath,
    config,
    robotsChecker,
    { pageFilter: urlsToFetch }
  );

  // Merge crawled pages with unchanged pages
  const allPages = [
    ...unchanged.map(p => ({
      url: p.url,
      title: p.title,
      filename: p.filename,
      size: p.size,
      lastmod: p.lastmod,
      changefreq: p.changefreq,
      priority: p.priority
    })),
    ...crawlResults.pages
  ];

  // Update metadata
  const totalSize = await getDirSize(libraryPath);
  const metadata = {
    library,
    version: version || 'latest',
    source_url: config.source_url || libraryPath,
    fetched_at: new Date().toISOString(),
    source_type: 'sitemap',
    source_file_url: null,
    page_count: allPages.length,
    total_size_bytes: totalSize,
    framework: 'unknown',
    skill_generated: false,
    skill_path: null,
    last_update_stats: {
      pages_checked: comparison.stats.total,
      pages_unchanged: unchanged.length,
      pages_modified: modified.length,
      pages_added: added.length,
      pages_removed: comparison.removed.length
    }
  };

  await saveMetadata(libraryPath, metadata);

  // Update sitemap structure
  const sitemapStructure = {
    pages: allPages.map(p => ({
      url: p.url,
      title: p.title,
      filename: p.filename,
      size: p.size,
      lastmod: p.lastmod || null,
      changefreq: p.changefreq || null,
      priority: p.priority || null
    }))
  };
  await saveSitemap(libraryPath, sitemapStructure);

  log(`\n✓ Incremental update complete!`, 'info');
  log(`  Updated: ${crawlResults.successful} pages`, 'info');
  log(`  Unchanged: ${unchanged.length} pages`, 'info');
  log(`  Total: ${allPages.length} pages\n`, 'info');

  return {
    library,
    version,
    path: libraryPath,
    pages: allPages.length,
    updated: true,
    stats: {
      unchanged: unchanged.length,
      modified: modified.length,
      added: added.length,
      fetched: crawlResults.successful
    },
    metadata
  };
}

/**
 * CLI setup
 */
program
  .name('fetch-docs')
  .description('Fetch and cache documentation for a library')
  .argument('<library>', 'Library name (e.g., nextjs, react)')
  .argument('[version]', 'Specific version to fetch')
  .option('-u, --url <url>', 'Custom documentation URL')
  .option('--no-skill', 'Skip automatic skill generation')
  .action(async (library, version, options) => {
    try {
      await fetchDocumentation(library, version, options);
      process.exit(0);
    } catch (error) {
      log(`\\n✗ Error: ${error.message}\\n`, 'error');
      process.exit(1);
    }
  });

program.parse();

export default fetchDocumentation;
