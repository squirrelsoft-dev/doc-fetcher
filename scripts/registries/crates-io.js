/**
 * Crates.io Registry API client for documentation URL resolution
 *
 * Queries the crates.io registry to extract crate metadata including:
 * - documentation URL (direct field - most reliable!)
 * - homepage URL
 * - repository URL
 *
 * Crates.io is unique in providing a direct "documentation" field,
 * which typically points to docs.rs for Rust crates.
 */

import axios from 'axios';

const CRATES_IO_API_URL = 'https://crates.io/api/v1';

/**
 * Resolve documentation metadata from crates.io registry
 * @param {string} crateName - Crate name (e.g., "serde", "tokio")
 * @returns {Promise<Object>} Crate metadata for documentation resolution
 */
export async function resolveCratesIoDocs(crateName) {
  try {
    const response = await axios.get(`${CRATES_IO_API_URL}/crates/${encodeURIComponent(crateName)}`, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        // Crates.io requires a user agent
        'User-Agent': 'doc-fetcher (https://github.com/anthropics/claude-code)'
      }
    });

    const data = response.data;
    const crate = data.crate;

    // Parse GitHub info if available
    const github = parseGitHubUrl(crate.repository);

    return {
      success: true,
      crateName,
      // Crates.io provides direct documentation URL!
      documentation: crate.documentation || `https://docs.rs/${crateName}`,
      homepage: crate.homepage || null,
      repository: crate.repository || null,
      github,
      description: crate.description || null,
      latestVersion: crate.max_version || crate.newest_version || null,
      categories: data.categories?.map(c => c.category) || [],
      keywords: crate.keywords || []
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return {
        success: false,
        crateName,
        error: `Crate "${crateName}" not found on crates.io`,
        errorType: 'NOT_FOUND'
      };
    }

    return {
      success: false,
      crateName,
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
    return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
  }
  return null;
}

export default resolveCratesIoDocs;
