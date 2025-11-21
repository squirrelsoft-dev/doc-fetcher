/**
 * GitHub README Fallback
 *
 * Fetches README from GitHub repository as last-resort documentation.
 * Converts to markdown and includes repository metadata.
 */

import axios from 'axios';
import { log } from './utils.js';

/**
 * Common README file names to try
 */
const README_FILES = [
  'README.md',
  'readme.md',
  'Readme.md',
  'README.rst',
  'readme.rst',
  'README.txt',
  'readme.txt',
  'README',
  'readme'
];

/**
 * Fetch README content from GitHub repository
 * @param {Object} github - GitHub repo info {owner, repo}
 * @param {Object} [options] - Options
 * @param {string} [options.token] - GitHub API token for higher rate limits
 * @returns {Promise<Object>} README content and metadata
 */
export async function fetchGitHubReadme(github, options = {}) {
  if (!github?.owner || !github?.repo) {
    return {
      success: false,
      error: 'Invalid GitHub repository info'
    };
  }

  const { owner, repo } = github;
  log(`\n📖 Fetching GitHub README for ${owner}/${repo}...`, 'info');

  const headers = {
    'Accept': 'application/vnd.github.raw',
    'User-Agent': 'doc-fetcher/1.0'
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  try {
    // Try to get README via GitHub API (auto-detects README file)
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
      {
        timeout: 15000,
        headers: {
          ...headers,
          'Accept': 'application/vnd.github.raw' // Get raw content directly
        }
      }
    );

    const content = response.data;

    // Get repository metadata
    let repoMetadata = {};
    try {
      const repoResponse = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}`,
        { timeout: 10000, headers }
      );
      repoMetadata = {
        stars: repoResponse.data.stargazers_count,
        forks: repoResponse.data.forks_count,
        lastUpdated: repoResponse.data.updated_at,
        description: repoResponse.data.description,
        topics: repoResponse.data.topics || [],
        license: repoResponse.data.license?.name
      };
    } catch {
      // Metadata fetch failed, continue with just the README
      log('   Could not fetch repo metadata', 'debug');
    }

    log(`   ✓ README fetched (${content.length} characters)`, 'info');
    if (repoMetadata.stars) {
      log(`   Repository: ⭐ ${repoMetadata.stars} stars`, 'info');
    }

    return {
      success: true,
      content,
      source: 'github-readme',
      metadata: {
        owner,
        repo,
        url: `https://github.com/${owner}/${repo}`,
        readmeUrl: `https://github.com/${owner}/${repo}#readme`,
        ...repoMetadata
      }
    };
  } catch (error) {
    // Try fetching specific README files directly
    if (error.response?.status === 404) {
      log('   README not found via API, trying direct file access...', 'debug');

      for (const filename of README_FILES) {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${filename}`;
          const response = await axios.get(rawUrl, {
            timeout: 10000,
            headers: { 'User-Agent': 'doc-fetcher/1.0' }
          });

          log(`   ✓ Found ${filename}`, 'info');
          return {
            success: true,
            content: response.data,
            source: 'github-readme',
            metadata: {
              owner,
              repo,
              url: `https://github.com/${owner}/${repo}`,
              readmeFile: filename
            }
          };
        } catch {
          // Try next filename
        }
      }

      // Try 'master' branch as fallback
      for (const filename of README_FILES.slice(0, 3)) {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/${filename}`;
          const response = await axios.get(rawUrl, {
            timeout: 10000,
            headers: { 'User-Agent': 'doc-fetcher/1.0' }
          });

          log(`   ✓ Found ${filename} (master branch)`, 'info');
          return {
            success: true,
            content: response.data,
            source: 'github-readme',
            metadata: {
              owner,
              repo,
              url: `https://github.com/${owner}/${repo}`,
              readmeFile: filename,
              branch: 'master'
            }
          };
        } catch {
          // Try next filename
        }
      }
    }

    // Rate limit handling
    if (error.response?.status === 403 && error.response?.headers?.['x-ratelimit-remaining'] === '0') {
      const resetTime = error.response.headers['x-ratelimit-reset'];
      const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : null;
      log(`   ✗ GitHub API rate limited${resetDate ? `, resets at ${resetDate.toISOString()}` : ''}`, 'error');

      return {
        success: false,
        error: 'GitHub API rate limited',
        rateLimitReset: resetDate?.toISOString()
      };
    }

    log(`   ✗ Failed to fetch README: ${error.message}`, 'error');
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Format README content with metadata header
 * @param {Object} readmeResult - Result from fetchGitHubReadme
 * @param {string} libraryName - Library/package name
 * @returns {string} Formatted markdown content
 */
export function formatReadmeAsDoc(readmeResult, libraryName) {
  if (!readmeResult.success) {
    return null;
  }

  const { content, metadata } = readmeResult;

  // Add metadata header
  const header = `---
source: GitHub README
url: ${metadata.url}
${metadata.stars ? `stars: ${metadata.stars}` : ''}
${metadata.lastUpdated ? `lastUpdated: ${metadata.lastUpdated}` : ''}
${metadata.license ? `license: ${metadata.license}` : ''}
fetchedAt: ${new Date().toISOString()}
---

`;

  // Add notice about this being README-based docs
  const notice = `> **Note**: This documentation was extracted from the project's GitHub README.
> For the most up-to-date information, visit [${metadata.url}](${metadata.url}).

`;

  return header + notice + content;
}

export default fetchGitHubReadme;
