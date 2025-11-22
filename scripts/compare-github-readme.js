#!/usr/bin/env node
import axios from 'axios';
import { log } from './utils.js';

/**
 * Compare GitHub README Module
 *
 * Checks if a GitHub repository's README has been updated since
 * the last fetch by comparing repository update timestamps.
 *
 * @module compare-github-readme
 */

/**
 * Extract GitHub owner and repo from a URL
 * @param {string} url - GitHub URL
 * @returns {Object|null} {owner, repo} or null if not a GitHub URL
 */
function parseGitHubUrl(url) {
  if (!url) return null;

  // Match github.com/owner/repo patterns
  const patterns = [
    /github\.com\/([^/]+)\/([^/#?]+)/,
    /^([^/]+)\/([^/]+)$/ // Direct owner/repo format
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, '')
      };
    }
  }

  return null;
}

/**
 * Fetch repository update timestamp from GitHub API
 * @param {string} owner - GitHub owner
 * @param {string} repo - GitHub repository name
 * @param {Object} [options] - Options
 * @param {string} [options.token] - GitHub API token
 * @returns {Promise<Object>} Repository metadata
 */
async function fetchRepoTimestamp(owner, repo, options = {}) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'doc-fetcher/1.0'
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`,
      { timeout: 10000, headers }
    );

    return {
      success: true,
      updatedAt: response.data.updated_at,
      pushedAt: response.data.pushed_at,
      description: response.data.description,
      stars: response.data.stargazers_count
    };
  } catch (error) {
    if (error.response?.status === 403) {
      return {
        success: false,
        error: 'GitHub API rate limited'
      };
    }
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Compare cached GitHub README with remote
 *
 * @param {string} libraryPath - Path to library cache directory
 * @param {string} sourceUrl - Original GitHub URL
 * @param {Object} cachedMetadata - Cached library metadata from index.json
 * @param {Object} [config] - Configuration object
 * @returns {Promise<Object|null>} Comparison results or null if can't compare
 */
export async function compareGithubReadme(libraryPath, sourceUrl, cachedMetadata, config = {}) {
  try {
    // Parse GitHub URL
    const github = parseGitHubUrl(sourceUrl);

    if (!github) {
      log('Could not parse GitHub URL - falling back to full fetch', 'warn');
      return null;
    }

    // Fetch current repository timestamp
    log('[1/2] Checking GitHub repository timestamp...', 'info');
    const repoInfo = await fetchRepoTimestamp(github.owner, github.repo, {
      token: config.github_token
    });

    if (!repoInfo.success) {
      log(`GitHub API error: ${repoInfo.error}`, 'warn');
      return null;
    }

    // Get cached fetch timestamp
    const cachedFetchedAt = cachedMetadata.fetched_at;
    const cachedLastUpdated = cachedMetadata.last_updated;

    if (!cachedFetchedAt) {
      log('No cached fetch timestamp - will do full fetch', 'debug');
      return null;
    }

    // Compare timestamps
    log('[2/2] Comparing with cached version...', 'info');
    const cachedDate = new Date(cachedFetchedAt);
    const repoUpdatedDate = new Date(repoInfo.pushedAt || repoInfo.updatedAt);

    const hasChanges = repoUpdatedDate > cachedDate;

    // Build comparison result compatible with other source types
    const comparison = {
      unchanged: hasChanges ? [] : [{ url: sourceUrl, title: 'README', filename: 'README.md' }],
      modified: hasChanges ? [{ url: sourceUrl, title: 'README' }] : [],
      added: [],
      removed: [],
      stats: {
        total: 1,
        unchanged: hasChanges ? 0 : 1,
        modified: hasChanges ? 1 : 0,
        added: 0,
        removed: 0,
        needsFetch: hasChanges ? 1 : 0,
        percentUnchanged: hasChanges ? 0 : 100
      },
      hasChanges
    };

    // Display result
    if (hasChanges) {
      log(`Repository updated on ${repoUpdatedDate.toISOString()}`, 'info');
      log(`Cached version from ${cachedDate.toISOString()}`, 'info');
      log(`\nWill fetch 1 page (README has been updated)`, 'info');
    } else {
      log(`\nNo changes detected - README is up to date`, 'info');
      log(`Last repo update: ${repoUpdatedDate.toISOString()}`, 'info');
      log(`Cached on: ${cachedDate.toISOString()}`, 'info');
    }

    return {
      comparison,
      github,
      repoInfo,
      libraryPath
    };

  } catch (error) {
    log(`GitHub README comparison failed: ${error.message}`, 'warn');
    return null;
  }
}

/**
 * CLI interface for testing
 */
export async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node compare-github-readme.js <library-path> <github-url>');
    console.log('Example: node compare-github-readme.js .claude/docs/mylib/1.0.0 https://github.com/owner/repo');
    process.exit(1);
  }

  const libraryPath = args[0];
  const sourceUrl = args[1];

  // Load config and metadata
  const { loadConfig } = await import('./utils.js');
  const fs = await import('fs/promises');
  const path = await import('path');

  const config = await loadConfig();

  let cachedMetadata = {};
  try {
    const indexPath = path.join(libraryPath, 'index.json');
    cachedMetadata = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
  } catch {
    console.log('Warning: Could not load cached metadata');
  }

  // Compare
  const result = await compareGithubReadme(libraryPath, sourceUrl, cachedMetadata, config);

  if (result) {
    console.log('\n✓ Comparison complete');
    console.log(`  Has changes: ${result.comparison.hasChanges}`);
  } else {
    console.log('\n✗ Comparison failed');
  }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default compareGithubReadme;
