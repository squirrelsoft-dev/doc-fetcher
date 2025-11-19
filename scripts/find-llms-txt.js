import axios from 'axios';
import { log, normalizeUrl } from './utils.js';

/**
 * Locations to check for AI-optimized documentation
 */
const AI_DOC_LOCATIONS = [
  '/llms-full.txt',
  '/llms.txt',
  '/claude.txt',
  '/.well-known/llms.txt',
  '/docs/llms.txt',
  '/documentation/llms.txt'
];

/**
 * Check if a URL exists and is accessible
 */
async function checkUrl(url, config, robotsChecker) {
  // Check robots.txt if available
  if (robotsChecker && !robotsChecker.isAllowed(url)) {
    return { exists: false, disallowed: true };
  }

  try {
    const response = await axios.head(url, {
      timeout: config.timeout_ms,
      headers: {
        'User-Agent': config.user_agent
      },
      validateStatus: status => status === 200
    });

    return {
      exists: true,
      contentType: response.headers['content-type'],
      contentLength: parseInt(response.headers['content-length'] || '0'),
      lastModified: response.headers['last-modified']
    };
  } catch (error) {
    return { exists: false };
  }
}

/**
 * Fetch content from URL
 */
async function fetchContent(url, config, robotsChecker) {
  // Check robots.txt if available
  if (robotsChecker && !robotsChecker.isAllowed(url)) {
    return {
      success: false,
      error: 'URL disallowed by robots.txt'
    };
  }

  try {
    const response = await axios.get(url, {
      timeout: config.timeout_ms,
      headers: {
        'User-Agent': config.user_agent
      },
      responseType: 'text'
    });

    const contentType = response.headers['content-type'] || '';

    // Check if Content-Type indicates HTML (likely a 404 page)
    if (contentType.includes('text/html')) {
      return {
        success: false,
        error: 'Server returned HTML instead of plain text (likely a 404 or error page)'
      };
    }

    return {
      success: true,
      content: response.data,
      contentType: contentType,
      size: response.data.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validate AI-optimized documentation content
 */
function validateContent(content) {
  // Check for HTML content (llms.txt should be plain text/markdown, not HTML)
  const htmlPatterns = [
    /<!DOCTYPE\s+html/i,
    /<html[\s>]/i,
    /<head[\s>]/i,
    /<body[\s>]/i,
    /<meta[\s>]/i
  ];

  const isHTML = htmlPatterns.some(pattern => pattern.test(content));

  if (isHTML) {
    return {
      valid: false,
      reason: 'Content is HTML, not plain text documentation (likely a 404 or error page)'
    };
  }

  // Check for common 404 page patterns
  const notFoundPatterns = [
    /404.*not found/i,
    /page not found/i,
    /not found.*404/i,
    /the page you.*looking for.*doesn't exist/i,
    /the page you.*looking for.*could not be found/i,
    /this page could not be found/i,
    /error 404/i,
    /http.*404/i
  ];

  const is404Page = notFoundPatterns.some(pattern => pattern.test(content));

  if (is404Page) {
    return {
      valid: false,
      reason: 'Content appears to be a 404 error page'
    };
  }

  // Minimum content length (500 bytes)
  if (content.length < 500) {
    return {
      valid: false,
      reason: 'Content too small (< 500 bytes), likely incomplete'
    };
  }

  // Maximum reasonable size (50MB)
  if (content.length > 50 * 1024 * 1024) {
    return {
      valid: false,
      reason: 'Content too large (> 50MB), likely not documentation'
    };
  }

  // Check for markdown-like content
  const hasMarkdown = content.includes('#') || content.includes('##') || content.includes('```');

  if (!hasMarkdown) {
    return {
      valid: false,
      reason: 'Content does not appear to be markdown documentation'
    };
  }

  // Check for common documentation sections
  const commonSections = [
    /installation/i,
    /getting started/i,
    /quick start/i,
    /introduction/i,
    /overview/i,
    /api/i,
    /usage/i,
    /examples/i
  ];

  const hasSections = commonSections.some(pattern => pattern.test(content));

  if (!hasSections) {
    return {
      valid: true,
      reason: 'Content appears valid but missing common sections',
      warning: true
    };
  }

  return {
    valid: true,
    reason: 'Content appears to be valid documentation'
  };
}

/**
 * Extract version information from content if available
 */
function extractVersion(content) {
  const versionPatterns = [
    /Version:\s*([0-9]+\.[0-9]+\.[0-9]+)/i,
    /v([0-9]+\.[0-9]+\.[0-9]+)/,
    /@version\s*([0-9]+\.[0-9]+\.[0-9]+)/i
  ];

  for (const pattern of versionPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Find AI-optimized documentation (llms.txt, claude.txt) for a base URL
 */
export async function findAIOptimizedDocs(baseUrl, config, robotsChecker) {
  const normalizedBase = normalizeUrl(baseUrl);
  log(`Checking for AI-optimized documentation at ${normalizedBase}...`, 'debug');

  const results = {
    found: false,
    type: null,
    url: null,
    size: 0,
    version: null,
    content: null,
    validation: null,
    checkedUrls: []
  };

  // Try each location
  for (const location of AI_DOC_LOCATIONS) {
    const testUrl = normalizedBase + location;
    results.checkedUrls.push(testUrl);

    log(`  Checking ${testUrl}...`, 'debug');

    const check = await checkUrl(testUrl, config, robotsChecker);

    if (check.disallowed) {
      log(`  ⚠ Disallowed by robots.txt`, 'warn');
      continue;
    }

    if (check.exists) {
      log(`  ✓ Found at ${testUrl}`, 'info');

      // Fetch content
      const fetchResult = await fetchContent(testUrl, config, robotsChecker);

      if (fetchResult.success) {
        // Validate content
        const validation = validateContent(fetchResult.content);

        if (validation.valid) {
          results.found = true;
          results.type = location.split('/').pop();
          results.url = testUrl;
          results.size = fetchResult.size;
          results.content = fetchResult.content;
          results.version = extractVersion(fetchResult.content);
          results.validation = validation;

          log(`  ✓ Validation passed`, 'info');

          if (validation.warning) {
            log(`  ⚠ ${validation.reason}`, 'warn');
          }

          return results;
        } else {
          log(`  ✗ Validation failed: ${validation.reason}`, 'warn');
        }
      } else {
        log(`  ✗ Failed to fetch: ${fetchResult.error}`, 'warn');
      }
    }
  }

  log(`  ✗ No AI-optimized documentation found`, 'info');
  return results;
}

/**
 * CLI interface
 */
export async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node find-llms-txt.js <base-url>');
    console.log('Example: node find-llms-txt.js https://nextjs.org/docs');
    process.exit(1);
  }

  const baseUrl = args[0];

  // Load config
  const { loadConfig } = await import('./utils.js');
  const config = await loadConfig();

  // Find AI-optimized docs
  const result = await findAIOptimizedDocs(baseUrl, config, null);

  // Output result
  if (result.found) {
    console.log('\n✓ AI-optimized documentation found!\n');
    console.log(`Type: ${result.type}`);
    console.log(`URL: ${result.url}`);
    console.log(`Size: ${(result.size / 1024).toFixed(2)} KB`);
    if (result.version) {
      console.log(`Version: ${result.version}`);
    }
    console.log(`Validation: ${result.validation.reason}`);
    console.log('\nRecommendation: Use this file instead of web crawling');
    console.log(`Benefits: Single file download vs multiple page crawls`);
    process.exit(0);
  } else {
    console.log('\n✗ No AI-optimized documentation found\n');
    console.log('Checked URLs:');
    result.checkedUrls.forEach(url => console.log(`  - ${url}`));
    console.log('\nFalling back to sitemap.xml or web crawling');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default findAIOptimizedDocs;
