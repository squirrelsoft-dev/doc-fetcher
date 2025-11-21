/**
 * NPM Registry API client for documentation URL resolution
 *
 * Queries the npm registry to extract package metadata including:
 * - homepage URL
 * - repository URL (GitHub, GitLab, etc.)
 * - bugs URL
 *
 * Note: NPM registry does NOT provide a direct "documentation" field,
 * so we must infer docs from homepage or repository.
 */

import axios from 'axios';

const NPM_REGISTRY_URL = 'https://registry.npmjs.org';

/**
 * Parse a git URL to extract the clean repository URL
 * @param {string} gitUrl - Git URL (e.g., "git+https://github.com/user/repo.git")
 * @returns {string|null} Clean HTTPS URL or null
 */
function parseGitUrl(gitUrl) {
  if (!gitUrl) return null;

  // Handle various git URL formats:
  // git+https://github.com/user/repo.git
  // git://github.com/user/repo.git
  // https://github.com/user/repo.git
  // git@github.com:user/repo.git

  let url = gitUrl;

  // Remove git+ prefix
  url = url.replace(/^git\+/, '');

  // Convert git:// to https://
  url = url.replace(/^git:\/\//, 'https://');

  // Convert git@host:path to https://host/path
  url = url.replace(/^git@([^:]+):/, 'https://$1/');

  // Remove .git suffix
  url = url.replace(/\.git$/, '');

  return url;
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
    return { owner: match[1], repo: match[2] };
  }
  return null;
}

/**
 * Resolve documentation metadata from npm registry
 * @param {string} packageName - npm package name (e.g., "axios", "@types/node")
 * @returns {Promise<Object>} Package metadata for documentation resolution
 */
export async function resolveNpmDocs(packageName) {
  try {
    const response = await axios.get(`${NPM_REGISTRY_URL}/${encodeURIComponent(packageName)}`, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });

    const data = response.data;

    // Get latest version metadata
    const latestVersion = data['dist-tags']?.latest;
    const versionData = latestVersion ? data.versions?.[latestVersion] : null;

    // Extract repository URL (may be string or object)
    let repositoryUrl = null;
    const repo = data.repository || versionData?.repository;
    if (typeof repo === 'string') {
      repositoryUrl = parseGitUrl(repo);
    } else if (repo?.url) {
      repositoryUrl = parseGitUrl(repo.url);
    }

    // Parse GitHub info if available
    const github = parseGitHubUrl(repositoryUrl);

    return {
      success: true,
      packageName,
      homepage: data.homepage || versionData?.homepage || null,
      repository: repositoryUrl,
      github,
      bugs: data.bugs?.url || null,
      description: data.description || null,
      latestVersion,
      // NPM doesn't have a direct docs URL field
      documentation: null,
      keywords: data.keywords || []
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return {
        success: false,
        packageName,
        error: `Package "${packageName}" not found on npm`,
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
 * Check if a URL is a GitHub repository URL
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isGitHubUrl(url) {
  return url?.includes('github.com') || false;
}

export default resolveNpmDocs;
