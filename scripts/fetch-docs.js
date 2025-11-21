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
import { verifyDependencies } from './check-dependencies.js';
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
import {
  categorizeError,
  adaptiveBackoff,
  shouldRetry,
  summarizeErrors,
  formatErrorMessage
} from './error-utils.js';
import {
  saveCheckpoint,
  loadCheckpoint,
  deleteCheckpoint,
  updateCheckpointProgress,
  detectInterruptedFetch,
  createInitialCheckpoint,
  formatCheckpointInfo
} from './checkpoint-manager.js';
import { resolveDocsUrl, detectEcosystem, ECOSYSTEMS } from './resolve-docs-url.js';
import { crawlLinks } from './crawl-links.js';
import { fetchGitHubReadme, formatReadmeAsDoc } from './github-readme.js';

const program = new Command();

/**
 * Fetch HTML content from URL with enhanced error handling
 * Supports HTTP status detection, adaptive backoff, and categorized errors
 */
async function fetchHtml(url, config, retryCount = 0) {
  try {
    const response = await axios.get(url, {
      timeout: config.timeout_ms,
      headers: {
        'User-Agent': config.user_agent
      },
      // Don't throw on non-2xx status codes, handle them explicitly
      validateStatus: (status) => status < 600
    });

    // Check for non-success status codes
    if (response.status >= 400) {
      const error = new Error(`HTTP ${response.status}`);
      error.response = response;
      throw error;
    }

    return {
      success: true,
      html: response.data,
      statusCode: response.status
    };
  } catch (error) {
    // Categorize the error
    const categorized = categorizeError(error);

    // Check if we should retry
    if (shouldRetry(categorized, retryCount, config.max_retries)) {
      // Calculate adaptive backoff delay
      const delay = adaptiveBackoff(retryCount, categorized);

      // Log retry attempt with error category
      const retryInfo = categorized.category === 'RATE_LIMIT'
        ? `Rate limited, waiting ${Math.floor(delay / 1000)}s`
        : `${categorized.message}`;

      log(`  Retry ${retryCount + 1}/${config.max_retries} for ${url.substring(0, 60)}... (${retryInfo})`, 'warn');

      await sleep(delay);
      return fetchHtml(url, config, retryCount + 1);
    }

    // Max retries exceeded or permanent error
    return {
      success: false,
      error: categorized.message || error.message,
      errorCategory: categorized.category,
      retryable: categorized.retryable,
      statusCode: categorized.statusCode,
      retryAfter: categorized.retryAfter,
      suggestedAction: categorized.suggestedAction
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
 * @param {boolean} [options.enableCheckpoint] - Enable checkpoint saving for resume capability
 * @param {Object} [options.checkpointData] - Existing checkpoint data to resume from
 * @returns {Promise<Object>} Crawl results
 */
async function crawlPages(urlEntries, libraryPath, config, robotsChecker, options = {}) {
  const { pageFilter, enableCheckpoint = false, checkpointData = null } = options;

  const results = {
    successful: 0,
    failed: 0,
    skipped: 0,
    totalSize: 0,
    pages: [],
    failedPages: [],      // Track failed pages with error details
    rateLimited: false,   // Flag if we hit rate limiting
    rateLimitInfo: null,  // Rate limit details (retry-after, etc.)
    resumed: false        // Flag if this was a resumed crawl
  };

  // Load checkpoint if resuming
  let checkpoint = checkpointData;
  let completedUrls = new Set();

  if (checkpoint) {
    log(`\n🔄 Resuming from checkpoint: ${checkpoint.completedPages}/${checkpoint.totalPages} pages completed`, 'info');
    results.resumed = true;

    // Build set of completed URLs for fast lookup
    completedUrls = new Set(checkpoint.completed.map(p => p.url));

    // Restore previous results
    results.successful = checkpoint.completedPages || 0;
    results.failed = checkpoint.failedPages || 0;
    results.pages = checkpoint.completed || [];
    results.failedPages = checkpoint.failed || [];
  }

  const limit = pLimit(5); // Limit concurrent requests

  // Apply page filter if provided
  let entriesToProcess = urlEntries;
  if (pageFilter && pageFilter.size > 0) {
    entriesToProcess = urlEntries.filter(entry => {
      const url = typeof entry === 'string' ? entry : entry.loc;
      return pageFilter.has(url);
    });
  }

  // Filter out already-completed URLs from checkpoint
  if (completedUrls.size > 0) {
    entriesToProcess = entriesToProcess.filter(entry => {
      const url = typeof entry === 'string' ? entry : entry.loc;
      return !completedUrls.has(url);
    });
    log(`   Skipping ${completedUrls.size} already-completed pages`, 'info');
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
        // Track failed page with error details
        results.failed++;
        results.failedPages.push({
          url,
          error: fetchResult.error,
          errorCategory: fetchResult.errorCategory,
          statusCode: fetchResult.statusCode,
          retryable: fetchResult.retryable,
          suggestedAction: fetchResult.suggestedAction
        });

        // Special handling for rate limit errors
        if (fetchResult.errorCategory === 'RATE_LIMIT') {
          results.rateLimited = true;
          results.rateLimitInfo = {
            retryAfter: fetchResult.retryAfter,
            url: url
          };
          log(`  ⏱️  Rate limit detected on ${url.substring(0, 50)}...`, 'warn');
        }

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
        const pageData = {
          url,
          title: extractResult.metadata.title,
          filename: pageInfo.filename,
          size: pageInfo.size,
          ...urlMetadata  // Include sitemap metadata (lastmod, changefreq, priority)
        };
        results.pages.push(pageData);

        // Save checkpoint periodically if enabled
        if (enableCheckpoint && checkpoint) {
          const totalPages = checkpoint.totalPages || urlEntries.length;
          await updateCheckpointProgress(libraryPath, checkpoint, {
            completedPages: results.successful,
            completed: results.pages,
            failed: results.failedPages,
            pending: [], // Could track pending if needed
            rateLimit: results.rateLimited ? results.rateLimitInfo : null
          });
          checkpoint.completedPages = results.successful; // Update in-memory checkpoint
        }

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

  // Display error summary if there were failures
  if (results.failedPages.length > 0) {
    const summary = summarizeErrors(results.failedPages.map(fp => ({
      url: fp.url,
      error: {
        category: fp.errorCategory,
        message: fp.error,
        statusCode: fp.statusCode,
        retryable: fp.retryable,
        suggestedAction: fp.suggestedAction
      }
    })));

    log('\n📊 Error Summary:', 'warn');
    log(`   Total failures: ${summary.total}`, 'warn');
    if (summary.byCategory.RATE_LIMIT > 0) {
      log(`   Rate limited: ${summary.byCategory.RATE_LIMIT}`, 'warn');
    }
    if (summary.byCategory.PERMANENT > 0) {
      log(`   Permanent errors (404, 403, etc.): ${summary.byCategory.PERMANENT}`, 'warn');
    }
    if (summary.byCategory.RETRYABLE > 0) {
      log(`   Temporary errors (500, network, etc.): ${summary.byCategory.RETRYABLE}`, 'warn');
    }

    // Show details for first few failures
    if (results.failedPages.length <= 5) {
      log('\n   Failed URLs:', 'warn');
      results.failedPages.forEach(fp => {
        log(`   • ${fp.url.substring(0, 60)}${fp.url.length > 60 ? '...' : ''}`, 'warn');
        log(`     ${fp.error} (${fp.errorCategory})`, 'warn');
      });
    }
  }

  // Delete checkpoint if crawl completed successfully
  if (enableCheckpoint && checkpoint) {
    const allPagesProcessed = results.successful + results.failed + results.skipped;
    const totalExpected = checkpoint.totalPages || urlEntries.length;

    // Consider it complete if we processed all expected pages (even if some failed)
    if (allPagesProcessed >= entriesToProcess.length) {
      await deleteCheckpoint(libraryPath);
      log('\n✅ Checkpoint deleted - crawl completed', 'info');
    }
  }

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
  const libraryPath = path.join(cacheDir, library, version || 'latest');

  // Check for interrupted fetch (unless force flag is set)
  let resumeCheckpoint = null;
  const enableCheckpoint = config.enable_checkpoints !== false; // Default true

  if (enableCheckpoint && !options.force) {
    const interruptionCheck = await detectInterruptedFetch(libraryPath);

    if (interruptionCheck.interrupted && interruptionCheck.canResume) {
      log(`\\n🔄 Detected interrupted fetch!`, 'warn');
      log(formatCheckpointInfo(interruptionCheck.checkpoint), 'info');

      // Load checkpoint for resume
      resumeCheckpoint = interruptionCheck.checkpoint || await loadCheckpoint(libraryPath);

      if (resumeCheckpoint) {
        log(`\\n▶️  Resuming from checkpoint...`, 'info');
      } else {
        log(`   Unable to load checkpoint, will start fresh`, 'warn');
      }
    }
  }

  // Determine documentation URL
  let docUrl = options.url || resumeCheckpoint?.metadata?.sourceUrl;

  // If no URL provided, use the resolver to find documentation
  if (!docUrl) {
    log('\\n[0/7] Resolving documentation URL...', 'info');
    const resolved = await resolveDocsUrl(library, {
      ecosystem: options.ecosystem,
      validate: true
    });

    if (resolved.success) {
      docUrl = resolved.url;
      log(`   Resolved from: ${resolved.source}`, 'info');
    } else {
      // Fall back to old behavior as last resort
      docUrl = `https://${library}.dev/docs`;
      log(`   ⚠ Could not resolve URL, using fallback: ${docUrl}`, 'warn');
      if (resolved.suggestions) {
        resolved.suggestions.forEach(s => log(`   → ${s}`, 'info'));
      }
    }
  }

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

    const fetchUrlsFromLlms = config.fetch_llms_urls !== false; // Default true

    if (fetchUrlsFromLlms && aiDocsResult.extractedUrls.length > 0) {
      log(`Found ${aiDocsResult.extractedUrls.length} URLs in ${aiDocsResult.type}`, 'info');
      log('Fetching individual pages...', 'info');

      sourceType = 'llms.txt';
      sourceUrl = aiDocsResult.url;

      // Save the llms.txt file itself as a page
      const llmsPage = {
        url: aiDocsResult.url,
        title: `${library} Documentation`,
        filename: aiDocsResult.type,
        size: aiDocsResult.size,
        content: aiDocsResult.content
      };

      // Ensure library directory exists before creating checkpoint
      await ensureDir(libraryPath);

      // Create initial checkpoint for URL fetching if enabled and not resuming
      if (enableCheckpoint && !resumeCheckpoint) {
        await createInitialCheckpoint(libraryPath, {
          operation: 'fetch',
          library,
          version: version || 'latest',
          totalPages: aiDocsResult.extractedUrls.length,
          urls: aiDocsResult.extractedUrls,
          sourceUrl: docUrl,
          sourceType: 'llms.txt',
          framework: aiDocsResult.type
        });
        resumeCheckpoint = await loadCheckpoint(libraryPath);
      }

      // Crawl all URLs from llms.txt
      const crawlResults = await crawlPages(aiDocsResult.extractedUrls, libraryPath, config, robotsChecker, {
        enableCheckpoint,
        checkpointData: resumeCheckpoint
      });

      // Combine llms.txt file with crawled pages
      pages = [llmsPage, ...crawlResults.pages];

      log(`\n✓ Crawled ${crawlResults.successful} pages from ${aiDocsResult.type}`, 'info');
      if (crawlResults.skipped > 0) {
        log(`⚠ Skipped ${crawlResults.skipped} pages (disallowed by robots.txt)`, 'warn');
      }
      if (crawlResults.failed > 0) {
        log(`✗ Failed to crawl ${crawlResults.failed} pages`, 'warn');
      }
    } else {
      log('Saving AI-optimized file only (not fetching URLs)', 'info');

      // Save llms.txt content only
      sourceType = 'llms.txt';
      sourceUrl = aiDocsResult.url;
      pages = [{
        url: aiDocsResult.url,
        title: `${library} Documentation`,
        filename: aiDocsResult.type,
        size: aiDocsResult.size,
        content: aiDocsResult.content
      }];
    }
  } else {
    // 2. Parse sitemap.xml
    log('\\n[3/7] Parsing sitemap.xml...', 'info');
    try {
      const sitemapResult = await parseSitemap(docUrl, config, robotsChecker, robotsSitemaps);
      sourceType = 'sitemap';
      sourceUrl = sitemapResult.sitemapUrl;
      const urlEntries = sitemapResult.fullEntries; // Use fullEntries to preserve metadata

      log(`Found ${urlEntries.length} documentation pages`, 'info');

      // Create initial checkpoint if enabled and not resuming
      if (enableCheckpoint && !resumeCheckpoint) {
        await createInitialCheckpoint(libraryPath, {
          operation: 'fetch',
          library,
          version: version || 'latest',
          totalPages: urlEntries.length,
          urls: urlEntries.map(e => typeof e === 'string' ? e : e.loc),
          sourceUrl: docUrl,
          framework: null // Will be detected during extraction
        });
        resumeCheckpoint = await loadCheckpoint(libraryPath);
      }

      // 3. Crawl pages
      log('\\n[4/7] Crawling documentation pages...', 'info');
      const crawlResults = await crawlPages(urlEntries, libraryPath, config, robotsChecker, {
        enableCheckpoint,
        checkpointData: resumeCheckpoint
      });

      pages = crawlResults.pages;

      log(`\\n✓ Crawled ${crawlResults.successful} pages`, 'info');
      if (crawlResults.skipped > 0) {
        log(`⚠ Skipped ${crawlResults.skipped} pages (disallowed by robots.txt)`, 'warn');
      }
      if (crawlResults.failed > 0) {
        log(`✗ Failed to crawl ${crawlResults.failed} pages`, 'warn');
      }
    } catch (sitemapError) {
      log(`✗ Sitemap not found: ${sitemapError.message}`, 'warn');

      // Fallback 1: Try link crawling
      log('\\n[3b/7] Trying link crawling fallback...', 'info');
      const linkResult = await crawlLinks(docUrl, config, robotsChecker);

      if (linkResult.success && linkResult.urls.length > 0) {
        log(`✓ Found ${linkResult.urls.length} pages via ${linkResult.framework} navigation`, 'info');
        sourceType = 'link-crawl';
        sourceUrl = docUrl;

        // Create checkpoint for link crawl
        if (enableCheckpoint && !resumeCheckpoint) {
          await ensureDir(libraryPath);
          await createInitialCheckpoint(libraryPath, {
            operation: 'fetch',
            library,
            version: version || 'latest',
            totalPages: linkResult.urls.length,
            urls: linkResult.urls,
            sourceUrl: docUrl,
            sourceType: 'link-crawl',
            framework: linkResult.framework
          });
          resumeCheckpoint = await loadCheckpoint(libraryPath);
        }

        // Crawl discovered pages
        log('\\n[4/7] Crawling discovered pages...', 'info');
        const crawlResults = await crawlPages(linkResult.urls, libraryPath, config, robotsChecker, {
          enableCheckpoint,
          checkpointData: resumeCheckpoint
        });

        pages = crawlResults.pages;

        log(`\\n✓ Crawled ${crawlResults.successful} pages`, 'info');
        if (crawlResults.failed > 0) {
          log(`✗ Failed to crawl ${crawlResults.failed} pages`, 'warn');
        }
      } else {
        // Fallback 2: Try GitHub README
        log('\\n[3c/7] Trying GitHub README fallback...', 'info');

        // Get registry data to find GitHub repo
        const resolved = await resolveDocsUrl(library, { ecosystem: options.ecosystem });
        const github = resolved.registry?.github;

        if (github) {
          const readmeResult = await fetchGitHubReadme(github);

          if (readmeResult.success) {
            log(`✓ Using GitHub README as documentation`, 'info');
            sourceType = 'github-readme';
            sourceUrl = readmeResult.metadata.url;

            // Format README with metadata
            const formattedContent = formatReadmeAsDoc(readmeResult, library);

            // Ensure directory exists
            await ensureDir(libraryPath);
            await ensureDir(path.join(libraryPath, 'pages'));

            // Save README as single page
            const readmePath = path.join(libraryPath, 'pages', 'README.md');
            await fs.writeFile(readmePath, formattedContent, 'utf-8');

            pages = [{
              url: readmeResult.metadata.url,
              title: `${library} - GitHub README`,
              filename: 'README.md',
              size: formattedContent.length
            }];
          } else {
            throw new Error(`Could not fetch documentation from any source. ${readmeResult.error || ''}`);
          }
        } else {
          throw new Error('Could not fetch documentation. No sitemap, navigation links, or GitHub README available.');
        }
      }
    }
  }

  // 4. Create cache directory structure
  log('\\n[5/7] Saving to cache...', 'info');
  // libraryPath already defined earlier
  await ensureDir(libraryPath);
  await ensureDir(path.join(libraryPath, 'pages'));

  // Save llms.txt content if that's what we used
  if (sourceType === 'llms.txt' && pages.length > 0) {
    const pagePath = path.join(libraryPath, 'pages', pages[0].filename);
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
  .option('-e, --ecosystem <ecosystem>', 'Package ecosystem (npm, crates.io, pypi)')
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

// Verify plugin dependencies are installed
await verifyDependencies('fetch-docs');

program.parse();

export default fetchDocumentation;
