import axios from 'axios';
import { parseString } from 'xml2js';
import { log, normalizeUrl } from './utils.js';

/**
 * Common sitemap locations
 */
const SITEMAP_LOCATIONS = [
  '/sitemap.xml',
  '/sitemap_index.xml',
  '/docs/sitemap.xml',
  '/documentation/sitemap.xml'
];

/**
 * Fetch and parse XML
 */
async function fetchXml(url, config, robotsChecker) {
  // Check robots.txt if available
  if (robotsChecker && !robotsChecker.isAllowed(url)) {
    throw new Error(`Sitemap URL disallowed by robots.txt: ${url}`);
  }

  try {
    const response = await axios.get(url, {
      timeout: config.timeout_ms,
      headers: {
        'User-Agent': config.user_agent
      }
    });

    return new Promise((resolve, reject) => {
      parseString(response.data, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  } catch (error) {
    throw new Error(`Failed to fetch sitemap from ${url}: ${error.message}`);
  }
}

/**
 * Extract URLs from sitemap
 */
function extractUrls(sitemapData) {
  const urls = [];

  // Handle regular sitemap
  if (sitemapData.urlset && sitemapData.urlset.url) {
    for (const urlEntry of sitemapData.urlset.url) {
      if (urlEntry.loc && urlEntry.loc[0]) {
        urls.push({
          loc: urlEntry.loc[0],
          lastmod: urlEntry.lastmod ? urlEntry.lastmod[0] : null,
          changefreq: urlEntry.changefreq ? urlEntry.changefreq[0] : null,
          priority: urlEntry.priority ? parseFloat(urlEntry.priority[0]) : null
        });
      }
    }
  }

  // Handle sitemap index (contains links to other sitemaps)
  if (sitemapData.sitemapindex && sitemapData.sitemapindex.sitemap) {
    for (const sitemapEntry of sitemapData.sitemapindex.sitemap) {
      if (sitemapEntry.loc && sitemapEntry.loc[0]) {
        urls.push({
          loc: sitemapEntry.loc[0],
          isSitemapIndex: true,
          lastmod: sitemapEntry.lastmod ? sitemapEntry.lastmod[0] : null
        });
      }
    }
  }

  return urls;
}

/**
 * Filter URLs to documentation pages only
 */
function filterDocUrls(urls, baseUrl, docPattern = /\/(docs?|documentation|guide|reference|api)\//i) {
  return urls.filter(urlEntry => {
    const url = urlEntry.loc;

    // Must be from the same domain
    try {
      const urlObj = new URL(url);
      const baseObj = new URL(baseUrl);

      if (urlObj.hostname !== baseObj.hostname) {
        return false;
      }
    } catch {
      return false;
    }

    // Match documentation pattern
    return docPattern.test(url);
  });
}

/**
 * Recursively fetch all sitemaps if sitemap index is found
 */
async function fetchAllSitemaps(initialUrls, config, robotsChecker) {
  const allUrls = [];
  const sitemapsToFetch = [];

  for (const urlEntry of initialUrls) {
    if (urlEntry.isSitemapIndex) {
      sitemapsToFetch.push(urlEntry.loc);
    } else {
      allUrls.push(urlEntry);
    }
  }

  // Fetch additional sitemaps
  for (const sitemapUrl of sitemapsToFetch) {
    try {
      log(`  Fetching nested sitemap: ${sitemapUrl}`, 'debug');
      const sitemapData = await fetchXml(sitemapUrl, config, robotsChecker);
      const urls = extractUrls(sitemapData);
      allUrls.push(...urls);
    } catch (error) {
      log(`  ⚠ Failed to fetch nested sitemap: ${error.message}`, 'warn');
    }
  }

  return allUrls;
}

/**
 * Parse sitemap from a base URL
 */
export async function parseSitemap(baseUrl, config, robotsChecker, robotsSitemaps, docPattern) {
  const normalizedBase = normalizeUrl(baseUrl);
  log(`Looking for sitemap at ${normalizedBase}...`, 'debug');

  let sitemapUrl = null;
  let sitemapData = null;

  // Try sitemaps from robots.txt first
  if (robotsSitemaps && robotsSitemaps.length > 0) {
    log(`Trying ${robotsSitemaps.length} sitemap(s) from robots.txt...`, 'debug');

    for (const robotsSitemapUrl of robotsSitemaps) {
      try {
        log(`  Checking ${robotsSitemapUrl}...`, 'debug');
        sitemapData = await fetchXml(robotsSitemapUrl, config, robotsChecker);
        sitemapUrl = robotsSitemapUrl;
        log(`  ✓ Found sitemap at ${robotsSitemapUrl}`, 'info');
        break;
      } catch (error) {
        log(`  ⚠ Failed to fetch sitemap from robots.txt: ${error.message}`, 'warn');
        // Continue to next sitemap
      }
    }
  }

  // If robots.txt sitemaps didn't work, try common locations
  if (!sitemapData) {
    for (const location of SITEMAP_LOCATIONS) {
      const testUrl = normalizedBase + location;
      log(`  Checking ${testUrl}...`, 'debug');

      try {
        sitemapData = await fetchXml(testUrl, config, robotsChecker);
        sitemapUrl = testUrl;
        log(`  ✓ Found sitemap at ${testUrl}`, 'info');
        break;
      } catch (error) {
        // Continue to next location
      }
    }
  }

  if (!sitemapData) {
    throw new Error('No sitemap.xml found at standard locations or in robots.txt');
  }

  // Extract URLs
  let urls = extractUrls(sitemapData);

  // Recursively fetch if sitemap index
  urls = await fetchAllSitemaps(urls, config, robotsChecker);

  // Filter to documentation URLs
  const docUrls = filterDocUrls(urls, baseUrl, docPattern);

  log(`  Found ${urls.length} total URLs, ${docUrls.length} documentation URLs`, 'info');

  return {
    sitemapUrl,
    totalUrls: urls.length,
    docUrls: docUrls.map(entry => entry.loc),
    fullEntries: docUrls
  };
}

/**
 * CLI interface
 */
export async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node parse-sitemap.js <base-url> [doc-pattern]');
    console.log('Example: node parse-sitemap.js https://nextjs.org');
    console.log('         node parse-sitemap.js https://example.com "/docs/"');
    process.exit(1);
  }

  const baseUrl = args[0];
  const docPattern = args[1] ? new RegExp(args[1], 'i') : undefined;

  // Load config
  const { loadConfig } = await import('./utils.js');
  const config = await loadConfig();

  try {
    // Parse sitemap
    const result = await parseSitemap(baseUrl, config, null, [], docPattern);

    console.log('\n✓ Sitemap parsed successfully!\n');
    console.log(`Sitemap URL: ${result.sitemapUrl}`);
    console.log(`Total URLs: ${result.totalUrls}`);
    console.log(`Documentation URLs: ${result.docUrls.length}`);

    if (result.docUrls.length > 0) {
      console.log('\nSample documentation URLs:');
      result.docUrls.slice(0, 10).forEach(url => {
        console.log(`  - ${url}`);
      });

      if (result.docUrls.length > 10) {
        console.log(`  ... and ${result.docUrls.length - 10} more`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error(`\n✗ Error: ${error.message}\n`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default parseSitemap;
