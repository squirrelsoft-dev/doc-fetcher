/**
 * PyPI Registry API client for documentation URL resolution
 *
 * Queries the PyPI JSON API to extract package metadata including:
 * - project_urls.Documentation (direct docs URL when available)
 * - home_page
 * - project_urls.Homepage
 * - project_urls.Source / Repository
 *
 * PyPI's project_urls often contains a "Documentation" key pointing
 * directly to ReadTheDocs or similar documentation sites.
 */

import axios from 'axios';

const PYPI_API_URL = 'https://pypi.org/pypi';

/**
 * Resolve documentation metadata from PyPI registry
 * @param {string} packageName - Package name (e.g., "requests", "django")
 * @returns {Promise<Object>} Package metadata for documentation resolution
 */
export async function resolvePyPIDocs(packageName) {
  try {
    const response = await axios.get(`${PYPI_API_URL}/${encodeURIComponent(packageName)}/json`, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });

    const data = response.data;
    const info = data.info;
    const projectUrls = info.project_urls || {};

    // Normalize project_urls keys (they can be inconsistent)
    const normalizedUrls = {};
    for (const [key, value] of Object.entries(projectUrls)) {
      normalizedUrls[key.toLowerCase()] = value;
    }

    // Try to find documentation URL from various possible keys
    const docsUrl = normalizedUrls['documentation']
      || normalizedUrls['docs']
      || normalizedUrls['doc']
      || normalizedUrls['api documentation']
      || null;

    // Try to find repository URL
    const repoUrl = normalizedUrls['source']
      || normalizedUrls['source code']
      || normalizedUrls['repository']
      || normalizedUrls['github']
      || normalizedUrls['code']
      || info.project_url  // Sometimes the main project URL is the repo
      || null;

    // Parse GitHub info if available
    const github = parseGitHubUrl(repoUrl) || parseGitHubUrl(info.home_page);

    return {
      success: true,
      packageName,
      // PyPI often has direct documentation URL
      documentation: docsUrl,
      homepage: normalizedUrls['homepage'] || info.home_page || null,
      repository: repoUrl,
      github,
      description: info.summary || null,
      latestVersion: info.version || null,
      projectUrls: projectUrls,  // Include raw URLs for debugging
      author: info.author || null,
      license: info.license || null,
      keywords: info.keywords?.split(',').map(k => k.trim()).filter(Boolean) || []
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return {
        success: false,
        packageName,
        error: `Package "${packageName}" not found on PyPI`,
        errorType: 'NOT_FOUND'
      };
    }

    return {
      success: false,
      packageName,
      error: error.message,
      errorType: 'NETWORK_ERROR'
    };
  }
}

/**
 * Extract GitHub owner/repo from a GitHub URL
 * @param {string} url - GitHub URL
 * @returns {{owner: string, repo: string}|null}
 */
function parseGitHubUrl(url) {
  if (!url) return null;

  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (match) {
    return { owner: match[1], repo: match[2].replace(/\.git$/, '').replace(/\/$/, '') };
  }
  return null;
}

export default resolvePyPIDocs;
