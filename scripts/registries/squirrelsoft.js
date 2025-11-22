/**
 * SquirrelSoft Registry API client for documentation URL resolution
 *
 * Queries the SquirrelSoft package documentation API to get pre-discovered
 * documentation URLs, llms.txt locations, sitemaps, and other metadata.
 *
 * This API acts as a caching proxy - it discovers and stores documentation
 * URLs for packages across multiple registries (npm, pypi, crates, etc.)
 *
 * @see https://squirrelsoft.dev/api/docs
 */

import axios from 'axios';

const SQUIRRELSOFT_API_URL = 'https://squirrelsoft.dev/api/docs';

/**
 * Map internal ecosystem names to SquirrelSoft registry names
 */
const ECOSYSTEM_TO_REGISTRY = {
  'npm': 'npm',
  'crates.io': 'crates',
  'pypi': 'pypi',
  'nuget': 'nuget',
  'packagist': 'packagist',
  'rubygems': 'rubygems',
  'go': 'go',
  'maven': 'maven'
};

/**
 * Query the SquirrelSoft API for package documentation metadata
 * @param {string} packageName - Package name (e.g., "react", "@tanstack/react-query")
 * @param {Object} options - Query options
 * @param {string} [options.ecosystem] - Ecosystem name (npm, crates.io, pypi, etc.)
 * @param {string} [options.version] - Specific version for versioned documentation
 * @param {boolean} [options.refresh] - Force re-discovery even if cached
 * @returns {Promise<Object>} Package documentation metadata
 */
export async function querySquirrelsoft(packageName, options = {}) {
  const { ecosystem = 'npm', version, refresh } = options;

  // Map ecosystem to registry name
  const registry = ECOSYSTEM_TO_REGISTRY[ecosystem] || 'npm';

  try {
    // Build URL with encoded package name
    const encodedPackage = encodeURIComponent(packageName);
    let url = `${SQUIRRELSOFT_API_URL}/${registry}/${encodedPackage}`;

    // Add query parameters
    const params = new URLSearchParams();
    if (version) params.set('version', version);
    if (refresh) params.set('refresh', 'true');

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    console.log(`   Querying SquirrelSoft API: ${url}`);

    const response = await axios.get(url, {
      timeout: 15000, // Discovery can take 2-10 seconds
      headers: {
        'Accept': 'application/json'
      }
    });

    const { data: pkgData, cached, stale, discovered, refreshed } = response.data;

    return {
      success: true,
      packageName,
      registry,
      cached,
      stale,
      discovered,
      refreshed,
      // Documentation URLs
      docsUrl: pkgData.docsUrl || null,
      apiReferenceUrl: pkgData.apiReferenceUrl || null,
      quickstartUrl: pkgData.quickstartUrl || null,
      changelogUrl: pkgData.changelogUrl || null,
      examplesUrl: pkgData.examplesUrl || null,
      // AI-optimized documentation
      llmsTxtUrl: pkgData.llmsTxtUrl || null,
      llmsFullTxtUrl: pkgData.llmsFullTxtUrl || null,
      aiDocsSizeBytes: pkgData.aiDocsSizeBytes || null,
      // Repository and homepage
      githubRepo: pkgData.githubRepo || null,
      homepageUrl: pkgData.homepageUrl || null,
      // Version info
      version: pkgData.version || null,
      latestVersion: pkgData.latestVersion || null,
      versionUrlPattern: pkgData.versionUrlPattern || null,
      // Sitemap and framework
      sitemapUrl: pkgData.sitemapUrl || null,
      docFramework: pkgData.docFramework || null,
      // Metadata
      verified: pkgData.verified || false,
      discoverySource: pkgData.discoverySource || null,
      discoveredAt: pkgData.discoveredAt || null,
      lastVerifiedAt: pkgData.lastVerifiedAt || null
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return {
        success: false,
        packageName,
        registry,
        error: `Package "${packageName}" not found on SquirrelSoft registry`,
        errorType: 'NOT_FOUND'
      };
    }

    if (error.response?.status === 400) {
      return {
        success: false,
        packageName,
        registry,
        error: error.response.data?.message || 'Invalid request',
        errorType: 'INVALID_REQUEST'
      };
    }

    return {
      success: false,
      packageName,
      registry,
      error: error.message,
      errorType: 'NETWORK_ERROR'
    };
  }
}

/**
 * Update the SquirrelSoft API with a known good documentation URL
 * This helps improve the API's data when we discover a better URL
 * @param {string} packageName - Package name
 * @param {string} docsUrl - The known good documentation URL
 * @param {Object} options - Update options
 * @param {string} [options.ecosystem] - Ecosystem name (npm, crates.io, pypi, etc.)
 * @param {string} [options.version] - Specific version
 * @returns {Promise<Object>} Update result
 */
export async function updateSquirrelsoft(packageName, docsUrl, options = {}) {
  const { ecosystem = 'npm', version } = options;

  // Map ecosystem to registry name
  const registry = ECOSYSTEM_TO_REGISTRY[ecosystem] || 'npm';

  try {
    const encodedPackage = encodeURIComponent(packageName);
    let url = `${SQUIRRELSOFT_API_URL}/${registry}/${encodedPackage}`;

    // Add query parameters - url and refresh=true to update the record
    const params = new URLSearchParams();
    params.set('url', docsUrl);
    params.set('refresh', 'true');
    if (version) params.set('version', version);

    url += `?${params.toString()}`;

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'Accept': 'application/json'
      }
    });

    return {
      success: true,
      packageName,
      registry,
      updated: true,
      refreshed: response.data.refreshed || false,
      docsUrl: response.data.data?.docsUrl || docsUrl
    };
  } catch (error) {
    return {
      success: false,
      packageName,
      registry,
      error: error.message,
      errorType: 'UPDATE_FAILED'
    };
  }
}

/**
 * Get the registry name for a given ecosystem
 * @param {string} ecosystem - Ecosystem name
 * @returns {string} Registry name for SquirrelSoft API
 */
export function getRegistryName(ecosystem) {
  return ECOSYSTEM_TO_REGISTRY[ecosystem] || 'npm';
}

/**
 * Check if an ecosystem is supported by SquirrelSoft
 * @param {string} ecosystem - Ecosystem name
 * @returns {boolean}
 */
export function isEcosystemSupported(ecosystem) {
  return ecosystem in ECOSYSTEM_TO_REGISTRY;
}

export default querySquirrelsoft;
