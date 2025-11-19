/**
 * Unit tests for checkpoint-manager module
 * Tests checkpoint save/load/delete, interruption detection, and recovery
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  saveCheckpoint,
  loadCheckpoint,
  deleteCheckpoint,
  detectInterruptedFetch,
  buildRecoveryManifest,
  createInitialCheckpoint,
  updateCheckpointProgress,
  formatCheckpointInfo,
  CHECKPOINT_FILENAME
} from '../../scripts/checkpoint-manager.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('checkpoint-manager', () => {
  let testDir;

  beforeEach(async () => {
    // Create temporary directory for tests
    testDir = path.join(os.tmpdir(), `doc-fetcher-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('saveCheckpoint', () => {
    it('should save a checkpoint file', async () => {
      const checkpointData = {
        operation: 'fetch',
        library: 'nextjs',
        version: '13.0.0',
        totalPages: 100,
        completedPages: 50,
        completed: [{ url: 'https://example.com/page1', filename: 'page1.md' }],
        failed: [],
        pending: []
      };

      await saveCheckpoint(testDir, checkpointData);

      const checkpointPath = path.join(testDir, CHECKPOINT_FILENAME);
      const exists = await fs.access(checkpointPath).then(() => true).catch(() => false);

      expect(exists).toBe(true);
    });

    it('should save checkpoint with correct structure', async () => {
      const checkpointData = {
        operation: 'update',
        library: 'react',
        version: '18.0.0',
        totalPages: 50,
        completedPages: 25,
        completed: [],
        failed: [],
        pending: ['https://example.com/pending']
      };

      await saveCheckpoint(testDir, checkpointData);

      const checkpoint = await loadCheckpoint(testDir);

      expect(checkpoint.operation).toBe('update');
      expect(checkpoint.library).toBe('react');
      expect(checkpoint.version).toBe('18.0.0');
      expect(checkpoint.totalPages).toBe(50);
      expect(checkpoint.completedPages).toBe(25);
      expect(checkpoint.checkpointVersion).toBe('1.0');
      expect(checkpoint.startedAt).toBeDefined();
      expect(checkpoint.lastCheckpointAt).toBeDefined();
    });

    it('should handle missing optional fields', async () => {
      const checkpointData = {
        library: 'vue',
        totalPages: 30,
        completedPages: 10
      };

      await saveCheckpoint(testDir, checkpointData);

      const checkpoint = await loadCheckpoint(testDir);

      expect(checkpoint.operation).toBe('fetch'); // Default value
      expect(checkpoint.completed).toEqual([]);
      expect(checkpoint.failed).toEqual([]);
      expect(checkpoint.pending).toEqual([]);
    });
  });

  describe('loadCheckpoint', () => {
    it('should load existing checkpoint', async () => {
      const checkpointData = {
        library: 'nextjs',
        totalPages: 100,
        completedPages: 50
      };

      await saveCheckpoint(testDir, checkpointData);
      const loaded = await loadCheckpoint(testDir);

      expect(loaded).not.toBeNull();
      expect(loaded.library).toBe('nextjs');
      expect(loaded.totalPages).toBe(100);
      expect(loaded.completedPages).toBe(50);
    });

    it('should return null if checkpoint does not exist', async () => {
      const loaded = await loadCheckpoint(testDir);

      expect(loaded).toBeNull();
    });

    it('should return null for stale checkpoint (older than 7 days)', async () => {
      const checkpointData = {
        library: 'react',
        totalPages: 50,
        completedPages: 25,
        startedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() // 8 days ago
      };

      await saveCheckpoint(testDir, checkpointData);

      // Manually modify the lastCheckpointAt to 8 days ago
      const checkpointPath = path.join(testDir, CHECKPOINT_FILENAME);
      const content = await fs.readFile(checkpointPath, 'utf8');
      const checkpoint = JSON.parse(content);
      checkpoint.lastCheckpointAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      await fs.writeFile(checkpointPath, JSON.stringify(checkpoint));

      const loaded = await loadCheckpoint(testDir);

      expect(loaded).toBeNull();
    });

    it('should accept fresh checkpoint (less than 7 days)', async () => {
      const checkpointData = {
        library: 'vue',
        totalPages: 30,
        completedPages: 15
      };

      await saveCheckpoint(testDir, checkpointData);

      const loaded = await loadCheckpoint(testDir);

      expect(loaded).not.toBeNull();
    });

    it('should handle corrupted checkpoint file', async () => {
      const checkpointPath = path.join(testDir, CHECKPOINT_FILENAME);
      await fs.writeFile(checkpointPath, 'invalid json {{{');

      const loaded = await loadCheckpoint(testDir);

      expect(loaded).toBeNull();
    });
  });

  describe('deleteCheckpoint', () => {
    it('should delete existing checkpoint', async () => {
      const checkpointData = {
        library: 'nextjs',
        totalPages: 100,
        completedPages: 50
      };

      await saveCheckpoint(testDir, checkpointData);

      const deleted = await deleteCheckpoint(testDir);

      expect(deleted).toBe(true);

      const exists = await fs.access(path.join(testDir, CHECKPOINT_FILENAME))
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(false);
    });

    it('should return false if checkpoint does not exist', async () => {
      const deleted = await deleteCheckpoint(testDir);

      expect(deleted).toBe(false);
    });
  });

  describe('detectInterruptedFetch', () => {
    it('should detect active checkpoint', async () => {
      const checkpointData = {
        library: 'react',
        totalPages: 100,
        completedPages: 50
      };

      await saveCheckpoint(testDir, checkpointData);

      const result = await detectInterruptedFetch(testDir);

      expect(result.interrupted).toBe(true);
      expect(result.checkpoint).not.toBeNull();
      expect(result.reason).toBe('Active checkpoint found');
      expect(result.canResume).toBe(true);
    });

    it('should detect pages directory without index.json', async () => {
      const pagesDir = path.join(testDir, 'pages');
      await fs.mkdir(pagesDir);
      await fs.writeFile(path.join(pagesDir, 'page1.md'), '# Page 1');

      const result = await detectInterruptedFetch(testDir);

      expect(result.interrupted).toBe(true);
      expect(result.reason).toBe('Pages directory exists but no index.json');
      expect(result.canResume).toBe(true);
    });

    it('should detect sitemap mismatch', async () => {
      const pagesDir = path.join(testDir, 'pages');
      await fs.mkdir(pagesDir);
      await fs.writeFile(path.join(pagesDir, 'page1.md'), '# Page 1');

      // Add index.json so it checks sitemap instead of returning early
      const indexPath = path.join(testDir, 'index.json');
      await fs.writeFile(indexPath, JSON.stringify({ library: 'react' }));

      const sitemapPath = path.join(testDir, 'sitemap.json');
      const sitemap = {
        pages: [
          { url: 'https://example.com/page1' },
          { url: 'https://example.com/page2' },
          { url: 'https://example.com/page3' }
        ]
      };
      await fs.writeFile(sitemapPath, JSON.stringify(sitemap));

      const result = await detectInterruptedFetch(testDir);

      expect(result.interrupted).toBe(true);
      expect(result.reason).toContain('Sitemap has 3 pages but only 1 files found');
      expect(result.canResume).toBe(true);
    });

    it('should return not interrupted for empty directory', async () => {
      const result = await detectInterruptedFetch(testDir);

      expect(result.interrupted).toBe(false);
      expect(result.checkpoint).toBeNull();
      expect(result.canResume).toBe(false);
    });

    it('should return not interrupted for complete fetch', async () => {
      // Create complete structure
      const pagesDir = path.join(testDir, 'pages');
      await fs.mkdir(pagesDir);
      await fs.writeFile(path.join(pagesDir, 'page1.md'), '# Page 1');

      const indexPath = path.join(testDir, 'index.json');
      await fs.writeFile(indexPath, JSON.stringify({ library: 'react' }));

      const sitemapPath = path.join(testDir, 'sitemap.json');
      await fs.writeFile(sitemapPath, JSON.stringify({
        pages: [{ url: 'https://example.com/page1' }]
      }));

      const result = await detectInterruptedFetch(testDir);

      expect(result.interrupted).toBe(false);
    });
  });

  describe('buildRecoveryManifest', () => {
    it('should build recovery manifest from existing pages', async () => {
      const pagesDir = path.join(testDir, 'pages');
      await fs.mkdir(pagesDir);

      // Create page files with frontmatter
      await fs.writeFile(path.join(pagesDir, 'page1.md'), `---
url: https://example.com/page1
title: Page 1
---
Content`);

      await fs.writeFile(path.join(pagesDir, 'page2.md'), `---
url: https://example.com/page2
title: Page 2
---
Content`);

      const sitemapUrls = [
        'https://example.com/page1',
        'https://example.com/page2',
        'https://example.com/page3',
        'https://example.com/page4'
      ];

      const manifest = await buildRecoveryManifest(testDir, sitemapUrls);

      expect(manifest.completed.length).toBe(2);
      expect(manifest.pending.length).toBe(2);
      expect(manifest.completedUrls).toContain('https://example.com/page1');
      expect(manifest.completedUrls).toContain('https://example.com/page2');
      expect(manifest.pending).toContain('https://example.com/page3');
      expect(manifest.pending).toContain('https://example.com/page4');
      expect(manifest.recoveryStats.percentComplete).toBe(50);
    });

    it('should handle empty pages directory', async () => {
      const pagesDir = path.join(testDir, 'pages');
      await fs.mkdir(pagesDir);

      const sitemapUrls = [
        'https://example.com/page1',
        'https://example.com/page2'
      ];

      const manifest = await buildRecoveryManifest(testDir, sitemapUrls);

      expect(manifest.completed.length).toBe(0);
      expect(manifest.pending.length).toBe(2);
      expect(manifest.recoveryStats.percentComplete).toBe(0);
    });

    it('should handle non-existent pages directory', async () => {
      const sitemapUrls = [
        'https://example.com/page1',
        'https://example.com/page2'
      ];

      const manifest = await buildRecoveryManifest(testDir, sitemapUrls);

      expect(manifest.completed.length).toBe(0);
      expect(manifest.pending.length).toBe(2);
      expect(manifest.completedUrls).toEqual([]);
    });

    it('should calculate recovery stats correctly', async () => {
      const pagesDir = path.join(testDir, 'pages');
      await fs.mkdir(pagesDir);

      await fs.writeFile(path.join(pagesDir, 'page1.md'), `---
url: https://example.com/page1
---
Content`);

      const sitemapUrls = [
        'https://example.com/page1',
        'https://example.com/page2',
        'https://example.com/page3',
        'https://example.com/page4',
        'https://example.com/page5'
      ];

      const manifest = await buildRecoveryManifest(testDir, sitemapUrls);

      expect(manifest.recoveryStats.total).toBe(5);
      expect(manifest.recoveryStats.completed).toBe(1);
      expect(manifest.recoveryStats.pending).toBe(4);
      expect(manifest.recoveryStats.percentComplete).toBe(20);
    });
  });

  describe('createInitialCheckpoint', () => {
    it('should create initial checkpoint', async () => {
      const fetchInfo = {
        operation: 'fetch',
        library: 'nextjs',
        version: '13.0.0',
        totalPages: 100,
        urls: ['https://example.com/page1', 'https://example.com/page2'],
        sourceUrl: 'https://example.com',
        framework: 'Docusaurus'
      };

      await createInitialCheckpoint(testDir, fetchInfo);

      const checkpoint = await loadCheckpoint(testDir);

      expect(checkpoint).not.toBeNull();
      expect(checkpoint.library).toBe('nextjs');
      expect(checkpoint.version).toBe('13.0.0');
      expect(checkpoint.totalPages).toBe(100);
      expect(checkpoint.completedPages).toBe(0);
      expect(checkpoint.completed).toEqual([]);
      expect(checkpoint.metadata.sourceUrl).toBe('https://example.com');
      expect(checkpoint.metadata.framework).toBe('Docusaurus');
    });
  });

  describe('updateCheckpointProgress', () => {
    it('should update checkpoint when save interval reached', async () => {
      const existingCheckpoint = {
        library: 'react',
        totalPages: 100,
        completedPages: 0,
        completed: [],
        failed: [],
        pending: []
      };

      const progressData = {
        completedPages: 15, // >= 10 from last save (0)
        completed: [{ url: 'https://example.com/page1' }]
      };

      const saved = await updateCheckpointProgress(testDir, existingCheckpoint, progressData);

      expect(saved).toBe(true);

      const checkpoint = await loadCheckpoint(testDir);
      expect(checkpoint.completedPages).toBe(15);
    });

    it('should not update checkpoint if save interval not reached', async () => {
      const existingCheckpoint = {
        library: 'react',
        totalPages: 100,
        completedPages: 10,
        completed: [],
        failed: [],
        pending: []
      };

      const progressData = {
        completedPages: 15, // Only 5 from last save (< 10 interval)
        completed: []
      };

      const saved = await updateCheckpointProgress(testDir, existingCheckpoint, progressData);

      expect(saved).toBe(false);
    });

    it('should force save when force flag is true', async () => {
      const existingCheckpoint = {
        library: 'react',
        totalPages: 100,
        completedPages: 10,
        completed: [],
        failed: [],
        pending: []
      };

      const progressData = {
        completedPages: 12, // < 10 interval
        force: true
      };

      const saved = await updateCheckpointProgress(testDir, existingCheckpoint, progressData);

      expect(saved).toBe(true);
    });
  });

  describe('formatCheckpointInfo', () => {
    it('should format checkpoint info correctly', () => {
      const checkpoint = {
        operation: 'fetch',
        library: 'nextjs',
        version: '13.0.0',
        totalPages: 100,
        completedPages: 50,
        failedPages: 5,
        startedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        lastCheckpointAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 min ago
      };

      const formatted = formatCheckpointInfo(checkpoint);

      expect(formatted).toContain('nextjs');
      expect(formatted).toContain('v13.0.0');
      expect(formatted).toContain('50/100');
      expect(formatted).toContain('50%');
      expect(formatted).toContain('Failed: 5');
    });

    it('should handle null checkpoint', () => {
      const formatted = formatCheckpointInfo(null);

      expect(formatted).toBe('No checkpoint found');
    });

    it('should format age in days correctly', () => {
      const checkpoint = {
        operation: 'fetch',
        library: 'react',
        totalPages: 100,
        completedPages: 25,
        failedPages: 0,
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        lastCheckpointAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
      };

      const formatted = formatCheckpointInfo(checkpoint);

      expect(formatted).toContain('2 days ago');
    });

    it('should format age in hours correctly', () => {
      const checkpoint = {
        operation: 'fetch',
        library: 'vue',
        totalPages: 50,
        completedPages: 10,
        failedPages: 0,
        startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        lastCheckpointAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // 3 hours ago
      };

      const formatted = formatCheckpointInfo(checkpoint);

      expect(formatted).toContain('3 hours ago');
    });
  });
});
