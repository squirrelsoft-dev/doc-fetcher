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
 */
async function crawlPages(urls, libraryPath, config, robotsChecker) {
  const results = {
    successful: 0,
    failed: 0,
    skipped: 0,
    totalSize: 0,
    pages: []
  };

  const limit = pLimit(5); // Limit concurrent requests

  // Limit number of pages if configured
  const urlsToCrawl = urls.slice(0, config.max_pages_per_fetch);

  if (urls.length > config.max_pages_per_fetch) {
    log(`⚠ Limiting to ${config.max_pages_per_fetch} pages (${urls.length} total found)`, 'warn');
  }

  const progress = new ProgressBar(urlsToCrawl.length);

  // Get crawl delay from robots.txt or use config default
  const crawlDelay = robotsChecker?.getCrawlDelay() || config.crawl_delay_ms;

  const tasks = urlsToCrawl.map((url, index) =>
    limit(async () => {
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
          size: pageInfo.size
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
      const urls = sitemapResult.docUrls;

      log(`Found ${urls.length} documentation pages`, 'info');

      // 3. Crawl pages
      log('\\n[4/7] Crawling documentation pages...', 'info');
      const crawlResults = await crawlPages(urls, path.join(cacheDir, library, version || 'latest'), config, robotsChecker);

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
      size: p.size
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
