/**
 * Documentation URL Resolver
 *
 * Resolves documentation URLs for packages using multiple strategies:
 * 0. Query SquirrelSoft API (centralized docs URL cache)
 * 1. Query package registry API (npm, crates.io, PyPI)
 * 2. Check GitHub repository for docs links
 * 3. Web search fallback for packages without registry docs
 * 4. Validate resolved URLs
 * 5. Report correct URLs back to SquirrelSoft API
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { resolveNpmDocs, isGitHubUrl } from './registries/npm.js';
import { resolveCratesIoDocs } from './registries/crates-io.js';
import { resolvePyPIDocs } from './registries/pypi.js';
import { querySquirrelsoft, updateSquirrelsoft } from './registries/squirrelsoft.js';
import { log } from './utils.js';

/**
 * Supported package ecosystems
 */
export const ECOSYSTEMS = {
  NPM: 'npm',
  CRATES_IO: 'crates.io',
  PYPI: 'pypi'
};

/**
 * Detect the package ecosystem from project files in the current directory
 * @param {string} projectDir - Directory to check for project files
 * @returns {Promise<string>} Detected ecosystem or 'npm' as default
 */
export async function detectEcosystem(projectDir = process.cwd()) {
  try {
    // Check for package.json (npm/Node.js)
    try {
      await fs.access(path.join(projectDir, 'package.json'));
      return ECOSYSTEMS.NPM;
    } catch { /* not found */ }

    // Check for Cargo.toml (Rust/crates.io)
    try {
      await fs.access(path.join(projectDir, 'Cargo.toml'));
      return ECOSYSTEMS.CRATES_IO;
    } catch { /* not found */ }

    // Check for Python project files
    const pythonFiles = ['pyproject.toml', 'setup.py', 'requirements.txt', 'Pipfile'];
    for (const file of pythonFiles) {
      try {
        await fs.access(path.join(projectDir, file));
        return ECOSYSTEMS.PYPI;
      } catch { /* not found */ }
    }
  } catch (error) {
    // If we can't access the directory, fall through to default
  }

  // Default to npm as the most common ecosystem
  return ECOSYSTEMS.NPM;
}

/**
 * Query package registry for metadata
 * @param {string} packageName - Package name
 * @param {string} ecosystem - Package ecosystem
 * @returns {Promise<Object>} Registry metadata
 */
async function queryRegistry(packageName, ecosystem) {
  log(`→ Querying ${ecosystem} registry for "${packageName}"...`, 'debug');

  switch (ecosystem) {
    case ECOSYSTEMS.NPM:
      return await resolveNpmDocs(packageName);
    case ECOSYSTEMS.CRATES_IO:
      return await resolveCratesIoDocs(packageName);
    case ECOSYSTEMS.PYPI:
      return await resolvePyPIDocs(packageName);
    default:
      return { success: false, error: `Unknown ecosystem: ${ecosystem}` };
  }
}

/**
 * Check GitHub repository README for documentation links
 * @param {Object} github - GitHub repo info {owner, repo}
 * @returns {Promise<string|null>} Documentation URL or null
 */
async function checkGitHubReadme(github) {
  if (!github?.owner || !github?.repo) return null;

  try {
    log(`→ Checking GitHub README for docs links...`, 'debug');

    // Fetch README from GitHub API
    const response = await axios.get(
      `https://api.github.com/repos/${github.owner}/${github.repo}/readme`,
      {
        timeout: 10000,
        headers: {
          'Accept': 'application/vnd.github.raw',
          'User-Agent': 'doc-fetcher'
        }
      }
    );

    const readme = response.data;

    // Look for common documentation link patterns
    const patterns = [
      // "Documentation: https://..."
      /documentation[:\s]+\[?([^\]\s]+)\]?\(?([^)\s]+)/i,
      // "Docs: https://..."
      /\bdocs[:\s]+\[?([^\]\s]+)\]?\(?([^)\s]+)/i,
      // [Documentation](url) or [Docs](url)
      /\[(?:documentation|docs|api docs|api reference)\]\(([^)]+)\)/gi,
      // Links to common doc hosting services
      /https?:\/\/[^\s)]+(?:readthedocs\.io|gitbook\.io|docs\.rs|docusaurus\.io)[^\s)]*/gi,
      // Links ending in /docs or /documentation
      /https?:\/\/[^\s)]+\/(?:docs|documentation)(?:\/[^\s)]*)?/gi
    ];

    for (const pattern of patterns) {
      const matches = readme.match(pattern);
      if (matches && matches.length > 0) {
        // Extract URL from match
        let url = matches[0];

        // Handle markdown link format [text](url)
        const mdLinkMatch = url.match(/\]\(([^)]+)\)/);
        if (mdLinkMatch) {
          url = mdLinkMatch[1];
        }

        // Clean up the URL
        url = url.replace(/^documentation[:\s]+/i, '')
          .replace(/^docs[:\s]+/i, '')
          .replace(/[)\].,;]+$/, '')
          .trim();

        // Validate it looks like a URL
        if (url.startsWith('http')) {
          log(`  Found docs link in README: ${url}`, 'debug');
          return url;
        }
      }
    }

    return null;
  } catch (error) {
    log(`  Could not check GitHub README: ${error.message}`, 'debug');
    return null;
  }
}

/**
 * Generate common documentation URL patterns to try
 * @param {string} packageName - Package name
 * @param {string} homepage - Homepage URL (if available)
 * @returns {string[]} Array of URL patterns to try
 */
function generateUrlPatterns(packageName, homepage = null) {
  const patterns = [];

  // If we have a homepage, try doc paths on it first
  if (homepage) {
    const baseUrl = homepage.replace(/\/$/, '');
    patterns.push(
      `${baseUrl}/docs`,
      `${baseUrl}/documentation`,
      `${baseUrl}/guide`,
      `${baseUrl}/api`,
      baseUrl
    );
  }

  // Common documentation URL patterns
  patterns.push(
    // Standard TLDs
    `https://${packageName}.dev`,
    `https://${packageName}.dev/docs`,
    `https://${packageName}.io`,
    `https://${packageName}.io/docs`,
    `https://${packageName}.org`,
    `https://${packageName}.org/docs`,
    `https://${packageName}.com`,
    `https://${packageName}.com/docs`,
    // Common suffixes
    `https://${packageName}-http.com`,  // e.g., axios-http.com
    `https://${packageName}-http.com/docs`,
    `https://${packageName}js.org`,
    `https://${packageName}js.org/docs`,
    `https://${packageName}js.com`,
    `https://${packageName}js.com/docs`,
    // No hyphens variants
    `https://${packageName.replace(/-/g, '')}.dev`,
    `https://${packageName.replace(/-/g, '')}.io`,
    `https://${packageName.replace(/-/g, '')}.com`
  );

  // Scoped packages (remove @scope/)
  if (packageName.startsWith('@')) {
    const unscoped = packageName.split('/')[1];
    patterns.push(
      `https://${unscoped}.dev`,
      `https://${unscoped}.io`,
      `https://${unscoped}.org`
    );
  }

  return patterns;
}

/**
 * Search for AI-optimized documentation (llms.txt) for a package
 * @param {string} packageName - Package name
 * @param {string} homepage - Homepage URL (if available)
 * @returns {Promise<string|null>} URL with llms.txt or null
 */
async function searchForLlmsTxt(packageName, homepage) {
  log(`→ Searching for llms.txt for "${packageName}"...`, 'debug');

  const urlsToCheck = [];

  // Check homepage variants first
  if (homepage) {
    const baseUrl = homepage.replace(/\/$/, '');
    urlsToCheck.push(
      `${baseUrl}/llms.txt`,
      `${baseUrl}/llms-full.txt`,
      `${baseUrl}/docs/llms.txt`,
      `${baseUrl}/.well-known/llms.txt`
    );
  }

  // Try common domain patterns
  const domains = [
    `https://${packageName}.dev`,
    `https://${packageName}.io`,
    `https://${packageName}.org`
  ];

  for (const domain of domains) {
    urlsToCheck.push(
      `${domain}/llms.txt`,
      `${domain}/llms-full.txt`,
      `${domain}/docs/llms.txt`
    );
  }

  // Check each URL - use GET and validate content is actually llms.txt
  for (const url of urlsToCheck) {
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        validateStatus: (status) => status === 200,
        maxContentLength: 100 * 1024, // Limit to 100KB for quick check
        headers: {
          'Accept': 'text/plain'
        }
      });

      if (response.status === 200) {
        const contentType = response.headers['content-type'] || '';
        const content = typeof response.data === 'string' ? response.data : '';

        // Validate it's not HTML (soft 404 pages)
        const isHtml = contentType.includes('text/html') ||
                       content.trim().startsWith('<!DOCTYPE') ||
                       content.trim().startsWith('<html') ||
                       content.trim().startsWith('<HTML');

        if (isHtml) {
          log(`  ✗ ${url} returned HTML, not valid llms.txt`, 'debug');
          continue;
        }

        // Validate it looks like a valid llms.txt (should have some text content)
        if (content.length < 50) {
          log(`  ✗ ${url} content too short to be valid llms.txt`, 'debug');
          continue;
        }

        log(`  ✓ Found llms.txt at: ${url}`, 'info');
        // Return the base docs URL, not the llms.txt itself
        return url.replace(/\/llms(-full)?\.txt$/, '') || url.replace(/\/llms\.txt$/, '');
      }
    } catch {
      // Not found, continue
    }
  }

  return null;
}

/**
 * Search the web for documentation URLs
 * Uses pattern matching and validation to find documentation sites.
 * @param {string} packageName - Package name
 * @param {string} ecosystem - Package ecosystem
 * @param {string} [homepage] - Known homepage URL
 * @returns {Promise<string|null>} Documentation URL or null
 */
async function webSearchFallback(packageName, ecosystem, homepage = null) {
  log(`→ Searching for "${packageName}" documentation...`, 'debug');

  // For Rust crates, docs.rs is the standard
  if (ecosystem === ECOSYSTEMS.CRATES_IO) {
    return `https://docs.rs/${packageName}`;
  }

  // First, search for llms.txt files
  const llmsTxtUrl = await searchForLlmsTxt(packageName, homepage);
  if (llmsTxtUrl) {
    return llmsTxtUrl;
  }

  // Generate and try URL patterns
  const urlPatterns = generateUrlPatterns(packageName, homepage);

  // Try each URL pattern
  for (const url of urlPatterns) {
    try {
      const isValid = await validateUrl(url);
      if (isValid) {
        log(`  Found documentation at: ${url}`, 'debug');
        return url;
      }
    } catch {
      // URL doesn't work, try next
    }
  }

  return null;
}

/**
 * Validate that a URL responds successfully and looks like documentation
 * @param {string} url - URL to validate
 * @returns {Promise<boolean>} True if URL is valid and accessible
 */
async function validateUrl(url) {
  try {
    const response = await axios.head(url, {
      timeout: 5000,
      maxRedirects: 5,
      validateStatus: (status) => status < 400
    });
    return true;
  } catch (error) {
    // Try GET if HEAD fails (some servers don't support HEAD)
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
        // Only fetch headers
        headers: { 'Range': 'bytes=0-0' }
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Main documentation URL resolver
 * @param {string} packageName - Package name to resolve
 * @param {Object} options - Resolution options
 * @param {string} [options.ecosystem] - Package ecosystem (auto-detected if not provided)
 * @param {string} [options.version] - Package version for versioned docs
 * @param {boolean} [options.skipSquirrelsoft] - Skip SquirrelSoft API lookup
 * @param {boolean} [options.skipRegistry] - Skip registry lookup
 * @param {boolean} [options.skipGitHub] - Skip GitHub README check
 * @param {boolean} [options.skipWebSearch] - Skip web search fallback
 * @param {boolean} [options.validate] - Validate resolved URL (default: true)
 * @returns {Promise<Object>} Resolution result
 */
export async function resolveDocsUrl(packageName, options = {}) {
  const {
    ecosystem: providedEcosystem,
    version,
    skipSquirrelsoft = false,
    skipRegistry = false,
    skipGitHub = false,
    skipWebSearch = false,
    validate = true
  } = options;

  log(`\n🔍 Resolving documentation URL for "${packageName}"...`, 'info');

  // Step 1: Detect ecosystem if not provided
  const ecosystem = providedEcosystem || await detectEcosystem();
  log(`   Ecosystem: ${ecosystem}`, 'info');

  let resolvedUrl = null;
  let source = null;
  let registryData = null;
  let squirrelsoftData = null;
  let squirrelsoftUrl = null; // Track SquirrelSoft's URL for potential update

  // Step 0: Query SquirrelSoft API first (centralized docs cache)
  if (!skipSquirrelsoft) {
    log(`   Checking SquirrelSoft registry...`, 'info');
    squirrelsoftData = await querySquirrelsoft(packageName, { ecosystem, version });

    if (squirrelsoftData.success && squirrelsoftData.docsUrl) {
      squirrelsoftUrl = squirrelsoftData.docsUrl;

      // Validate the URL before using it
      if (validate) {
        const isValid = await validateUrl(squirrelsoftData.docsUrl);
        if (isValid) {
          resolvedUrl = squirrelsoftData.docsUrl;
          source = 'squirrelsoft';
          log(`   ✓ Found in SquirrelSoft: ${resolvedUrl}`, 'info');
        } else {
          log(`   ⚠ SquirrelSoft URL not accessible: ${squirrelsoftData.docsUrl}`, 'warn');
          // Continue to fallback methods
        }
      } else {
        resolvedUrl = squirrelsoftData.docsUrl;
        source = 'squirrelsoft';
        log(`   Found in SquirrelSoft: ${resolvedUrl}`, 'info');
      }
    } else if (squirrelsoftData.success) {
      log(`   SquirrelSoft has no docs URL for this package`, 'debug');
    } else {
      log(`   SquirrelSoft lookup: ${squirrelsoftData.error || 'not found'}`, 'debug');
    }
  }

  // Step 2: Query package registry (if SquirrelSoft didn't provide a valid URL)
  if (!resolvedUrl && !skipRegistry) {
    registryData = await queryRegistry(packageName, ecosystem);

    if (registryData.success) {
      // Check for direct documentation URL (crates.io, PyPI often have this)
      if (registryData.documentation) {
        resolvedUrl = registryData.documentation;
        source = 'registry';
        log(`   Found docs URL in registry: ${resolvedUrl}`, 'info');
      }
      // Fall back to homepage if it's not GitHub
      else if (registryData.homepage && !isGitHubUrl(registryData.homepage)) {
        resolvedUrl = registryData.homepage;
        source = 'homepage';
        log(`   Using homepage: ${resolvedUrl}`, 'info');
      }
    } else {
      log(`   Registry lookup failed: ${registryData.error}`, 'warn');
    }
  }

  // Step 3: Check GitHub README for docs links
  if (!resolvedUrl && !skipGitHub && registryData?.github) {
    const readmeUrl = await checkGitHubReadme(registryData.github);
    if (readmeUrl) {
      resolvedUrl = readmeUrl;
      source = 'github-readme';
    }
  }

  // Step 4: Web search fallback
  if (!resolvedUrl && !skipWebSearch) {
    const searchUrl = await webSearchFallback(packageName, ecosystem);
    if (searchUrl) {
      resolvedUrl = searchUrl;
      source = 'web-search';
    }
  }

  // Step 5: Validate resolved URL
  if (resolvedUrl && validate && source !== 'squirrelsoft') {
    const isValid = await validateUrl(resolvedUrl);
    if (!isValid) {
      log(`   ⚠ Resolved URL is not accessible: ${resolvedUrl}`, 'warn');
      // Try adding common doc paths
      const docPaths = ['/docs', '/documentation', '/api', '/guide'];
      for (const docPath of docPaths) {
        const urlWithPath = resolvedUrl.replace(/\/$/, '') + docPath;
        if (await validateUrl(urlWithPath)) {
          resolvedUrl = urlWithPath;
          log(`   Found accessible URL: ${resolvedUrl}`, 'info');
          break;
        }
      }
    }
  }

  // Step 6: Report correct URL back to SquirrelSoft if we found a better one
  if (resolvedUrl && source !== 'squirrelsoft' && squirrelsoftUrl !== resolvedUrl) {
    // We found a good URL through fallback methods - update SquirrelSoft
    log(`   Updating SquirrelSoft with discovered URL...`, 'debug');
    const updateResult = await updateSquirrelsoft(packageName, resolvedUrl, { ecosystem, version });
    if (updateResult.success) {
      log(`   ✓ Updated SquirrelSoft registry with correct URL`, 'info');
    }
  }

  // Return result
  if (resolvedUrl) {
    log(`   ✓ Resolved: ${resolvedUrl} (source: ${source})`, 'info');
    return {
      success: true,
      url: resolvedUrl,
      source,
      ecosystem,
      registry: registryData,
      squirrelsoft: squirrelsoftData
    };
  }

  log(`   ✗ Could not resolve documentation URL for "${packageName}"`, 'error');
  return {
    success: false,
    error: `Could not find documentation URL for "${packageName}"`,
    ecosystem,
    registry: registryData,
    squirrelsoft: squirrelsoftData,
    suggestions: [
      `Try providing a custom URL with --url flag`,
      `Check the package's GitHub repository for documentation links`,
      `Search "${packageName} documentation" online`
    ]
  };
}

export default resolveDocsUrl;
