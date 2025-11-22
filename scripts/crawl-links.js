/**
 * Link Crawling Module
 *
 * Extracts documentation page URLs by crawling navigation elements
 * from the documentation homepage HTML. Uses framework-specific
 * selectors to identify navigation patterns.
 */

import * as cheerio from 'cheerio';
import axios from 'axios';
import { detectFramework } from './extract-content.js';
import { log, normalizeUrl, resolveUrl } from './utils.js';

/**
 * Framework-specific navigation selectors
 * Ordered by specificity - more specific selectors first
 */
const NAV_SELECTORS = {
  docusaurus: [
    '.menu__list a[href]',
    '.navbar__items a[href]',
    '.sidebar_re4s a[href]',
    'nav.menu a[href]',
    '.theme-doc-sidebar-menu a[href]'
  ],
  vitepress: [
    '.VPSidebar a[href]',
    '.vp-sidebar a[href]',
    '#VPSidebarNav a[href]',
    '.VPNavBar a[href]',
    'aside a[href]'
  ],
  nextra: [
    '.nextra-sidebar a[href]',
    '.nextra-nav a[href]',
    'nav.nextra-sidebar a[href]',
    'aside a[href]'
  ],
  gitbook: [
    '.book-summary a[href]',
    '.summary a[href]',
    'nav.book-nav a[href]',
    '.page-toc a[href]'
  ],
  readthedocs: [
    '.wy-menu a[href]',
    '.toctree-l1 a[href]',
    '.wy-nav-side a[href]',
    '#sphinxsidebar a[href]',
    'nav.wy-nav-side a[href]'
  ],
  mintlify: [
    '.docs-sidebar a[href]',
    'nav.docs-nav a[href]',
    '[class*="sidebar"] a[href]'
  ],
  generic: [
    'nav a[href]',
    '[role="navigation"] a[href]',
    '.sidebar a[href]',
    '.side-nav a[href]',
    '.sidenav a[href]',
    '.menu a[href]',
    '.toc a[href]',
    'aside a[href]',
    '[class*="sidebar"] a[href]',
    '[class*="nav"] a[href]'
  ]
};

/**
 * Patterns for documentation paths to include
 */
const DOC_PATH_PATTERNS = [
  /\/docs?\//i,
  /\/documentation\//i,
  /\/guide\//i,
  /\/guides\//i,
  /\/api\//i,
  /\/reference\//i,
  /\/tutorial\//i,
  /\/tutorials\//i,
  /\/learn\//i,
  /\/getting-started/i,
  /\/quickstart/i,
  /\/intro/i,
  /\/overview/i,
  /\/concepts?\//i,
  /\/examples?\//i,
  /\/usage/i,
  /\/manual\//i,
  /\/handbook\//i
];

/**
 * Patterns to exclude (non-doc pages)
 */
const EXCLUDE_PATTERNS = [
  /^mailto:/i,
  /^javascript:/i,
  /^#/,
  /\.(png|jpg|jpeg|gif|svg|pdf|zip|tar|gz)$/i,
  /\/blog\//i,
  /\/changelog/i,
  /\/releases/i,
  /\/download/i,
  /\/pricing/i,
  /\/login/i,
  /\/signup/i,
  /\/auth/i,
  /github\.com/i,
  /twitter\.com/i,
  /discord\.(com|gg)/i,
  /linkedin\.com/i
];

/**
 * Extract navigation links from HTML
 * @param {string} html - HTML content
 * @param {string} baseUrl - Base URL for resolving relative links
 * @param {string} [framework] - Detected framework (optional, will auto-detect)
 * @returns {Object} Extracted links and metadata
 */
export function extractNavigationLinks(html, baseUrl, framework = null) {
  const $ = cheerio.load(html);

  // Detect framework if not provided
  const detectedFramework = framework || detectFramework(html);
  log(`   Detected framework: ${detectedFramework}`, 'debug');

  // Get framework-specific selectors, with generic as fallback
  const frameworkSelectors = NAV_SELECTORS[detectedFramework] || [];
  const allSelectors = [...frameworkSelectors, ...NAV_SELECTORS.generic];

  // Dedupe selectors
  const uniqueSelectors = [...new Set(allSelectors)];

  const links = new Set();
  const linkDetails = [];

  // Parse base URL for same-domain filtering
  const baseUrlObj = new URL(baseUrl);
  const baseDomain = baseUrlObj.hostname;

  // Extract links from navigation selectors
  for (const selector of uniqueSelectors) {
    $(selector).each((i, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().trim();

      if (!href) return;

      // Skip excluded patterns
      if (EXCLUDE_PATTERNS.some(pattern => pattern.test(href))) {
        return;
      }

      // Resolve relative URLs
      let absoluteUrl;
      try {
        absoluteUrl = new URL(href, baseUrl).href;
      } catch {
        return; // Invalid URL
      }

      // Only include same-domain links
      try {
        const linkDomain = new URL(absoluteUrl).hostname;
        if (linkDomain !== baseDomain) {
          return;
        }
      } catch {
        return;
      }

      // Normalize URL (remove fragments, trailing slashes)
      const normalizedUrl = normalizeUrl(absoluteUrl);

      if (!links.has(normalizedUrl)) {
        links.add(normalizedUrl);
        linkDetails.push({
          url: normalizedUrl,
          text: text.substring(0, 100),
          selector,
          isDocPath: DOC_PATH_PATTERNS.some(p => p.test(normalizedUrl))
        });
      }
    });
  }

  // If we found very few links with nav selectors, try extracting ALL doc-path links
  if (linkDetails.length < 5) {
    $('a[href]').each((i, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().trim();

      if (!href) return;

      // Skip excluded patterns
      if (EXCLUDE_PATTERNS.some(pattern => pattern.test(href))) {
        return;
      }

      // Resolve relative URLs
      let absoluteUrl;
      try {
        absoluteUrl = new URL(href, baseUrl).href;
      } catch {
        return;
      }

      // Only include same-domain links
      try {
        const linkDomain = new URL(absoluteUrl).hostname;
        if (linkDomain !== baseDomain) {
          return;
        }
      } catch {
        return;
      }

      // Only include if it looks like a doc path
      if (!DOC_PATH_PATTERNS.some(p => p.test(absoluteUrl))) {
        return;
      }

      const normalizedUrl = normalizeUrl(absoluteUrl);

      if (!links.has(normalizedUrl)) {
        links.add(normalizedUrl);
        linkDetails.push({
          url: normalizedUrl,
          text: text.substring(0, 100),
          selector: 'a[href] (doc-path)',
          isDocPath: true
        });
      }
    });
  }

  // Sort: prioritize doc paths
  linkDetails.sort((a, b) => {
    if (a.isDocPath && !b.isDocPath) return -1;
    if (!a.isDocPath && b.isDocPath) return 1;
    return 0;
  });

  return {
    framework: detectedFramework,
    totalLinks: linkDetails.length,
    docLinks: linkDetails.filter(l => l.isDocPath).length,
    links: linkDetails
  };
}

/**
 * Common documentation entry point paths to try
 */
const DOC_ENTRY_PATHS = [
  '/docs',
  '/docs/intro',
  '/docs/getting-started',
  '/documentation',
  '/guide',
  '/api',
  '/reference'
];

/**
 * Crawl links from a documentation homepage
 * @param {string} baseUrl - Documentation homepage URL
 * @param {Object} config - Configuration object
 * @param {Object} [robotsChecker] - RobotsChecker instance (optional)
 * @returns {Promise<Object>} Crawl results with discovered URLs
 */
export async function crawlLinks(baseUrl, config, robotsChecker = null) {
  log(`\n📄 Crawling links from ${baseUrl}...`, 'info');

  try {
    // Fetch the homepage
    const response = await axios.get(baseUrl, {
      timeout: config.timeout_ms || 30000,
      headers: {
        'User-Agent': config.user_agent || 'doc-fetcher/1.0'
      },
      maxRedirects: 5
    });

    const html = response.data;

    // Extract navigation links from homepage
    let extracted = extractNavigationLinks(html, baseUrl);

    log(`   Found ${extracted.totalLinks} navigation links (${extracted.docLinks} doc paths)`, 'info');
    log(`   Framework: ${extracted.framework}`, 'info');

    // If homepage has few links, try common doc entry points
    if (extracted.totalLinks < 5) {
      log(`   Few links found, trying common doc entry points...`, 'info');

      const baseUrlClean = baseUrl.replace(/\/$/, '');

      for (const entryPath of DOC_ENTRY_PATHS) {
        const entryUrl = `${baseUrlClean}${entryPath}`;
        try {
          const entryResponse = await axios.get(entryUrl, {
            timeout: config.timeout_ms || 30000,
            headers: {
              'User-Agent': config.user_agent || 'doc-fetcher/1.0'
            },
            maxRedirects: 5,
            validateStatus: (status) => status === 200
          });

          const entryExtracted = extractNavigationLinks(entryResponse.data, entryUrl);

          if (entryExtracted.totalLinks > extracted.totalLinks) {
            log(`   ✓ Found ${entryExtracted.totalLinks} links at ${entryPath}`, 'info');
            extracted = entryExtracted;
            break; // Use the first entry point that has more links
          }
        } catch {
          // Entry point doesn't exist, try next
        }
      }
    }

    // Filter for allowed URLs (robots.txt)
    let urls = extracted.links.map(l => l.url);

    if (robotsChecker) {
      const beforeCount = urls.length;
      urls = urls.filter(url => robotsChecker.isAllowed(url));
      const filtered = beforeCount - urls.length;
      if (filtered > 0) {
        log(`   Filtered ${filtered} URLs by robots.txt`, 'debug');
      }
    }

    // Apply max links limit
    const maxLinks = config.fallback_strategies?.link_crawl?.max_links || 200;
    if (urls.length > maxLinks) {
      log(`   Limiting to ${maxLinks} links (found ${urls.length})`, 'warn');
      urls = urls.slice(0, maxLinks);
    }

    // Always use recursive crawl to discover all pages under the docs path
    // Start with the base URL plus any initially discovered URLs
    const seedUrls = [baseUrl, ...urls].filter((v, i, a) => a.indexOf(v) === i); // dedupe
    log(`   Starting recursive discovery with ${seedUrls.length} seed URLs...`, 'info');
    urls = await recursiveCrawl(seedUrls, baseUrl, config, robotsChecker);

    if (urls.length === 0) {
      return {
        success: false,
        error: 'No documentation links found in navigation',
        framework: extracted.framework,
        urls: []
      };
    }

    return {
      success: true,
      framework: extracted.framework,
      urls,
      source: 'link-crawl',
      stats: {
        totalFound: extracted.totalLinks,
        docPaths: extracted.docLinks,
        afterFiltering: urls.length
      }
    };
  } catch (error) {
    log(`   ✗ Link crawl failed: ${error.message}`, 'error');
    return {
      success: false,
      error: error.message,
      urls: []
    };
  }
}

/**
 * Perform recursive BFS crawl to discover all documentation pages
 * @param {string[]} seedUrls - Initial URLs to start crawling from
 * @param {string} baseUrl - Original base URL (used to determine path prefix)
 * @param {Object} config - Configuration
 * @param {Object} [robotsChecker] - RobotsChecker instance (optional)
 * @returns {Promise<string[]>} All discovered URLs
 */
async function recursiveCrawl(seedUrls, baseUrl, config, robotsChecker = null) {
  const baseUrlObj = new URL(baseUrl);
  const basePath = baseUrlObj.pathname.replace(/\/$/, '') || '';

  // Track all discovered URLs
  const discovered = new Set(seedUrls);
  // Queue for BFS
  const queue = [...seedUrls];
  // Track visited URLs (fetched and extracted links from)
  const visited = new Set();

  // Config limits
  const maxLinks = config.fallback_strategies?.link_crawl?.max_links || 200;
  const maxDepth = config.fallback_strategies?.link_crawl?.max_depth || 10;
  const crawlDelay = config.crawl_delay_ms || 100;

  let depth = 0;
  let depthBoundary = queue.length; // Track when we move to next depth level
  let processedInDepth = 0;

  log(`   Starting recursive crawl from ${seedUrls.length} seed URLs`, 'info');
  log(`   Path prefix: ${basePath || '/'}, max links: ${maxLinks}, max depth: ${maxDepth}`, 'debug');

  while (queue.length > 0 && discovered.size < maxLinks && depth < maxDepth) {
    const url = queue.shift();

    // Track depth
    processedInDepth++;
    if (processedInDepth > depthBoundary) {
      depth++;
      depthBoundary = queue.length;
      processedInDepth = 0;
      log(`   Depth ${depth}: ${discovered.size} URLs discovered, ${queue.length} in queue`, 'debug');
    }

    // Skip if already visited
    if (visited.has(url)) continue;
    visited.add(url);

    // Check robots.txt
    if (robotsChecker && !robotsChecker.isAllowed(url)) {
      continue;
    }

    // Rate limiting
    if (visited.size > 1) {
      await new Promise(resolve => setTimeout(resolve, crawlDelay));
    }

    try {
      const response = await axios.get(url, {
        timeout: config.timeout_ms || 30000,
        headers: {
          'User-Agent': config.user_agent || 'doc-fetcher/1.0'
        },
        maxRedirects: 5,
        validateStatus: (status) => status === 200
      });

      // Extract all links from this page
      const extracted = extractAllLinks(response.data, url, baseUrlObj.hostname, basePath);

      // Add new links to discovered set and queue
      for (const link of extracted) {
        if (!discovered.has(link) && discovered.size < maxLinks) {
          discovered.add(link);
          queue.push(link);
        }
      }

      // Progress update every 10 pages
      if (visited.size % 10 === 0) {
        log(`   Crawled ${visited.size} pages, discovered ${discovered.size} URLs...`, 'info');
      }
    } catch {
      // Failed to fetch, continue with other URLs
    }
  }

  log(`   Recursive crawl complete: ${discovered.size} URLs from ${visited.size} pages (depth ${depth})`, 'info');

  return Array.from(discovered);
}

/**
 * Extract ALL links from a page that match the path prefix
 * Unlike extractNavigationLinks, this extracts from the entire page body
 * @param {string} html - HTML content
 * @param {string} pageUrl - URL of the current page
 * @param {string} hostname - Hostname to filter for same-domain
 * @param {string} pathPrefix - Path prefix to filter (e.g., '/docs')
 * @returns {string[]} Array of discovered URLs
 */
function extractAllLinks(html, pageUrl, hostname, pathPrefix) {
  const $ = cheerio.load(html);
  const links = new Set();

  $('a[href]').each((i, elem) => {
    const href = $(elem).attr('href');
    if (!href) return;

    // Skip excluded patterns
    if (EXCLUDE_PATTERNS.some(pattern => pattern.test(href))) {
      return;
    }

    // Resolve relative URLs
    let absoluteUrl;
    try {
      absoluteUrl = new URL(href, pageUrl).href;
    } catch {
      return;
    }

    // Parse the absolute URL
    let linkUrlObj;
    try {
      linkUrlObj = new URL(absoluteUrl);
    } catch {
      return;
    }

    // Only include same-domain links
    if (linkUrlObj.hostname !== hostname) {
      return;
    }

    // Only include links that start with the path prefix
    // This ensures we stay within the docs section
    if (pathPrefix && !linkUrlObj.pathname.startsWith(pathPrefix)) {
      return;
    }

    // Normalize URL (remove fragments, trailing slashes)
    const normalizedUrl = normalizeUrl(absoluteUrl);
    links.add(normalizedUrl);
  });

  return Array.from(links);
}

/**
 * Check if a URL looks like a documentation page
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isDocumentationUrl(url) {
  return DOC_PATH_PATTERNS.some(pattern => pattern.test(url));
}

export default crawlLinks;
