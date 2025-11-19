/**
 * Checkpoint management for doc-fetcher
 * Provides resume capability for interrupted documentation fetches
 * @module checkpoint-manager
 */

import fs from 'fs/promises';
import path from 'path';
import { log } from './utils.js';

export const CHECKPOINT_FILENAME = '.checkpoint.json';
export const CHECKPOINT_VERSION = '1.0';
const CHECKPOINT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Saves a checkpoint file with current crawl progress
 * @param {string} libraryPath - Path to library directory
 * @param {Object} checkpointData - Checkpoint data to save
 * @param {string} checkpointData.operation - Operation type ('fetch' or 'update')
 * @param {string} checkpointData.library - Library name
 * @param {string} checkpointData.version - Library version
 * @param {number} checkpointData.totalPages - Total pages to fetch
 * @param {number} checkpointData.completedPages - Number of pages completed
 * @param {Array<Object>} checkpointData.completed - Array of completed page info
 * @param {Array<Object>} checkpointData.failed - Array of failed page info
 * @param {Array<string>} checkpointData.pending - Array of pending URLs
 * @param {Object} [checkpointData.rateLimit] - Rate limit state
 * @returns {Promise<void>}
 */
export async function saveCheckpoint(libraryPath, checkpointData) {
  const checkpointPath = path.join(libraryPath, CHECKPOINT_FILENAME);

  const checkpoint = {
    checkpointVersion: CHECKPOINT_VERSION,
    operation: checkpointData.operation || 'fetch',
    library: checkpointData.library,
    version: checkpointData.version || null,
    startedAt: checkpointData.startedAt || new Date().toISOString(),
    lastCheckpointAt: new Date().toISOString(),
    totalPages: checkpointData.totalPages,
    completedPages: checkpointData.completedPages,
    failedPages: checkpointData.failed?.length || 0,
    completed: checkpointData.completed || [],
    failed: checkpointData.failed || [],
    pending: checkpointData.pending || [],
    rateLimit: checkpointData.rateLimit || null,
    metadata: checkpointData.metadata || {}
  };

  try {
    await fs.writeFile(
      checkpointPath,
      JSON.stringify(checkpoint, null, 2),
      'utf8'
    );
  } catch (error) {
    log(`  ⚠️  Failed to save checkpoint: ${error.message}`, 'warn');
  }
}

/**
 * Loads a checkpoint file if it exists
 * @param {string} libraryPath - Path to library directory
 * @returns {Promise<Object|null>} Checkpoint data or null if not found
 */
export async function loadCheckpoint(libraryPath) {
  const checkpointPath = path.join(libraryPath, CHECKPOINT_FILENAME);

  try {
    const content = await fs.readFile(checkpointPath, 'utf8');
    const checkpoint = JSON.parse(content);

    // Validate checkpoint version
    if (checkpoint.checkpointVersion !== CHECKPOINT_VERSION) {
      log(`  ⚠️  Checkpoint version mismatch (found: ${checkpoint.checkpointVersion}, expected: ${CHECKPOINT_VERSION})`, 'warn');
      return null;
    }

    // Check if checkpoint is stale (older than 7 days)
    const age = Date.now() - new Date(checkpoint.lastCheckpointAt).getTime();
    if (age > CHECKPOINT_MAX_AGE_MS) {
      log(`  ⚠️  Checkpoint is stale (${Math.floor(age / (24 * 60 * 60 * 1000))} days old)`, 'warn');
      return null;
    }

    return checkpoint;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // Checkpoint doesn't exist
    }
    log(`  ⚠️  Failed to load checkpoint: ${error.message}`, 'warn');
    return null;
  }
}

/**
 * Deletes a checkpoint file
 * @param {string} libraryPath - Path to library directory
 * @returns {Promise<boolean>} True if deleted, false if not found or error
 */
export async function deleteCheckpoint(libraryPath) {
  const checkpointPath = path.join(libraryPath, CHECKPOINT_FILENAME);

  try {
    await fs.unlink(checkpointPath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false; // Checkpoint doesn't exist
    }
    log(`  ⚠️  Failed to delete checkpoint: ${error.message}`, 'warn');
    return false;
  }
}

/**
 * Detects if a fetch was interrupted based on directory state
 * Checks for:
 * 1. Existing checkpoint file
 * 2. Pages directory without complete metadata files
 * 3. Sitemap with mismatched page count
 *
 * @param {string} libraryPath - Path to library directory
 * @returns {Promise<Object>} Detection result with { interrupted: boolean, checkpoint, reason }
 */
export async function detectInterruptedFetch(libraryPath) {
  // Check for checkpoint file
  const checkpoint = await loadCheckpoint(libraryPath);

  if (checkpoint) {
    return {
      interrupted: true,
      checkpoint,
      reason: 'Active checkpoint found',
      canResume: true
    };
  }

  // Check for incomplete directory structure
  try {
    const pagesDir = path.join(libraryPath, 'pages');
    const indexPath = path.join(libraryPath, 'index.json');
    const sitemapPath = path.join(libraryPath, 'sitemap.json');

    // Check if pages directory exists
    let pagesExist = false;
    try {
      await fs.access(pagesDir);
      pagesExist = true;
    } catch {
      // Pages directory doesn't exist
    }

    // Check if index.json exists
    let indexExists = false;
    try {
      await fs.access(indexPath);
      indexExists = true;
    } catch {
      // Index doesn't exist
    }

    // If pages exist but no index, it's incomplete
    if (pagesExist && !indexExists) {
      return {
        interrupted: true,
        checkpoint: null,
        reason: 'Pages directory exists but no index.json',
        canResume: true
      };
    }

    // Check sitemap consistency
    if (pagesExist) {
      let sitemapExists = false;
      try {
        await fs.access(sitemapPath);
        sitemapExists = true;
      } catch {
        // Sitemap doesn't exist
      }

      if (sitemapExists) {
        const sitemapContent = await fs.readFile(sitemapPath, 'utf8');
        const sitemap = JSON.parse(sitemapContent);

        const pageFiles = await fs.readdir(pagesDir);
        const mdFiles = pageFiles.filter(f => f.endsWith('.md'));

        if (sitemap.pages && sitemap.pages.length !== mdFiles.length) {
          return {
            interrupted: true,
            checkpoint: null,
            reason: `Sitemap has ${sitemap.pages.length} pages but only ${mdFiles.length} files found`,
            canResume: true
          };
        }
      }
    }

    // No interruption detected
    return {
      interrupted: false,
      checkpoint: null,
      reason: null,
      canResume: false
    };
  } catch (error) {
    log(`  ⚠️  Error detecting interrupted fetch: ${error.message}`, 'warn');
    return {
      interrupted: false,
      checkpoint: null,
      reason: null,
      canResume: false
    };
  }
}

/**
 * Builds a recovery manifest by scanning existing pages directory
 * Returns URLs that still need to be fetched
 *
 * @param {string} libraryPath - Path to library directory
 * @param {Array<string>} sitemapUrls - All URLs from sitemap
 * @returns {Promise<Object>} Recovery manifest with completed and pending URLs
 */
export async function buildRecoveryManifest(libraryPath, sitemapUrls) {
  const pagesDir = path.join(libraryPath, 'pages');
  const completed = [];
  const pending = [...sitemapUrls];

  try {
    const pageFiles = await fs.readdir(pagesDir);
    const mdFiles = pageFiles.filter(f => f.endsWith('.md'));

    // Extract URLs from existing page files
    for (const filename of mdFiles) {
      const filePath = path.join(pagesDir, filename);
      const content = await fs.readFile(filePath, 'utf8');

      // Extract URL from frontmatter
      const urlMatch = content.match(/^url:\s*(.+)$/m);
      if (urlMatch) {
        const url = urlMatch[1].trim();
        completed.push({
          url,
          filename,
          timestamp: (await fs.stat(filePath)).mtime.toISOString()
        });

        // Remove from pending
        const pendingIndex = pending.indexOf(url);
        if (pendingIndex !== -1) {
          pending.splice(pendingIndex, 1);
        }
      }
    }

    return {
      completedUrls: completed.map(c => c.url),
      completed,
      pending,
      recoveryStats: {
        total: sitemapUrls.length,
        completed: completed.length,
        pending: pending.length,
        percentComplete: Math.round((completed.length / sitemapUrls.length) * 100)
      }
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Pages directory doesn't exist, nothing completed
      return {
        completedUrls: [],
        completed: [],
        pending: sitemapUrls,
        recoveryStats: {
          total: sitemapUrls.length,
          completed: 0,
          pending: sitemapUrls.length,
          percentComplete: 0
        }
      };
    }

    throw error;
  }
}

/**
 * Creates an initial checkpoint before starting a fetch
 * @param {string} libraryPath - Path to library directory
 * @param {Object} fetchInfo - Fetch information
 * @returns {Promise<void>}
 */
export async function createInitialCheckpoint(libraryPath, fetchInfo) {
  await saveCheckpoint(libraryPath, {
    operation: fetchInfo.operation || 'fetch',
    library: fetchInfo.library,
    version: fetchInfo.version,
    totalPages: fetchInfo.totalPages,
    completedPages: 0,
    completed: [],
    failed: [],
    pending: fetchInfo.urls || [],
    startedAt: new Date().toISOString(),
    metadata: {
      sourceUrl: fetchInfo.sourceUrl,
      framework: fetchInfo.framework
    }
  });
}

/**
 * Updates checkpoint with incremental progress
 * Only saves if significant progress has been made
 *
 * @param {string} libraryPath - Path to library directory
 * @param {Object} existingCheckpoint - Existing checkpoint data
 * @param {Object} progressData - New progress data
 * @returns {Promise<boolean>} True if checkpoint was saved
 */
export async function updateCheckpointProgress(libraryPath, existingCheckpoint, progressData) {
  // Only save checkpoint every N pages to avoid excessive I/O
  const saveInterval = 10;
  const newCompleted = progressData.completedPages || 0;
  const lastSaved = existingCheckpoint.completedPages || 0;

  if (newCompleted - lastSaved >= saveInterval || progressData.force) {
    await saveCheckpoint(libraryPath, {
      ...existingCheckpoint,
      completedPages: newCompleted,
      completed: progressData.completed || existingCheckpoint.completed,
      failed: progressData.failed || existingCheckpoint.failed,
      pending: progressData.pending || existingCheckpoint.pending,
      rateLimit: progressData.rateLimit || existingCheckpoint.rateLimit
    });
    return true;
  }

  return false;
}

/**
 * Formats checkpoint information for display
 * @param {Object} checkpoint - Checkpoint data
 * @returns {string} Formatted checkpoint info
 */
export function formatCheckpointInfo(checkpoint) {
  if (!checkpoint) {
    return 'No checkpoint found';
  }

  const age = Date.now() - new Date(checkpoint.lastCheckpointAt).getTime();
  const ageMinutes = Math.floor(age / (60 * 1000));
  const ageHours = Math.floor(age / (60 * 60 * 1000));
  const ageDays = Math.floor(age / (24 * 60 * 60 * 1000));

  let ageStr;
  if (ageDays > 0) {
    ageStr = `${ageDays} day${ageDays > 1 ? 's' : ''} ago`;
  } else if (ageHours > 0) {
    ageStr = `${ageHours} hour${ageHours > 1 ? 's' : ''} ago`;
  } else {
    ageStr = `${ageMinutes} minute${ageMinutes > 1 ? 's' : ''} ago`;
  }

  const percentComplete = checkpoint.totalPages > 0
    ? Math.round((checkpoint.completedPages / checkpoint.totalPages) * 100)
    : 0;

  return `
📋 Checkpoint Info:
   Operation: ${checkpoint.operation}
   Library: ${checkpoint.library}${checkpoint.version ? ` v${checkpoint.version}` : ''}
   Progress: ${checkpoint.completedPages}/${checkpoint.totalPages} pages (${percentComplete}%)
   Failed: ${checkpoint.failedPages}
   Last updated: ${ageStr}
   Started: ${new Date(checkpoint.startedAt).toLocaleString()}
  `.trim();
}

export default {
  saveCheckpoint,
  loadCheckpoint,
  deleteCheckpoint,
  detectInterruptedFetch,
  buildRecoveryManifest,
  createInitialCheckpoint,
  updateCheckpointProgress,
  formatCheckpointInfo
};
