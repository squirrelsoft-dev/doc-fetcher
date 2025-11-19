/**
 * Tests for compare-sitemaps.js
 */

import { compareSitemaps, formatComparisonSummary } from '../../scripts/compare-sitemaps.js';

describe('compare-sitemaps', () => {
  describe('compareSitemaps', () => {
    test('should detect unchanged pages', () => {
      const oldSitemap = {
        pages: [
          {
            url: 'https://example.com/page1',
            title: 'Page 1',
            filename: 'page1.md',
            size: 1000,
            lastmod: '2024-01-01T00:00:00Z'
          }
        ]
      };

      const newSitemap = {
        pages: [
          {
            url: 'https://example.com/page1',
            title: 'Page 1',
            lastmod: '2024-01-01T00:00:00Z'
          }
        ]
      };

      const result = compareSitemaps(oldSitemap, newSitemap);

      expect(result.unchanged).toHaveLength(1);
      expect(result.modified).toHaveLength(0);
      expect(result.added).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
      expect(result.hasChanges).toBe(false);
      expect(result.stats.unchanged).toBe(1);
    });

    test('should detect modified pages by lastmod timestamp', () => {
      const oldSitemap = {
        pages: [
          {
            url: 'https://example.com/page1',
            title: 'Page 1',
            filename: 'page1.md',
            size: 1000,
            lastmod: '2024-01-01T00:00:00Z'
          }
        ]
      };

      const newSitemap = {
        pages: [
          {
            url: 'https://example.com/page1',
            title: 'Page 1',
            lastmod: '2024-01-02T00:00:00Z'  // Newer timestamp
          }
        ]
      };

      const result = compareSitemaps(oldSitemap, newSitemap);

      expect(result.unchanged).toHaveLength(0);
      expect(result.modified).toHaveLength(1);
      expect(result.modified[0].url).toBe('https://example.com/page1');
      expect(result.modified[0].lastmod).toBe('2024-01-02T00:00:00Z');
      expect(result.hasChanges).toBe(true);
    });

    test('should detect added pages', () => {
      const oldSitemap = {
        pages: [
          {
            url: 'https://example.com/page1',
            title: 'Page 1',
            filename: 'page1.md',
            size: 1000
          }
        ]
      };

      const newSitemap = {
        pages: [
          {
            url: 'https://example.com/page1',
            title: 'Page 1'
          },
          {
            url: 'https://example.com/page2',
            title: 'Page 2'
          }
        ]
      };

      const result = compareSitemaps(oldSitemap, newSitemap);

      expect(result.unchanged).toHaveLength(1);
      expect(result.added).toHaveLength(1);
      expect(result.added[0].url).toBe('https://example.com/page2');
      expect(result.hasChanges).toBe(true);
    });

    test('should detect removed pages', () => {
      const oldSitemap = {
        pages: [
          {
            url: 'https://example.com/page1',
            title: 'Page 1',
            filename: 'page1.md'
          },
          {
            url: 'https://example.com/page2',
            title: 'Page 2',
            filename: 'page2.md'
          }
        ]
      };

      const newSitemap = {
        pages: [
          {
            url: 'https://example.com/page1',
            title: 'Page 1'
          }
        ]
      };

      const result = compareSitemaps(oldSitemap, newSitemap);

      expect(result.unchanged).toHaveLength(1);
      expect(result.removed).toHaveLength(1);
      expect(result.removed[0].url).toBe('https://example.com/page2');
      expect(result.hasChanges).toBe(true);
    });

    test('should handle URLs with trailing slashes', () => {
      const oldSitemap = {
        pages: [
          {
            url: 'https://example.com/page1/',
            title: 'Page 1',
            filename: 'page1.md'
          }
        ]
      };

      const newSitemap = {
        pages: [
          {
            url: 'https://example.com/page1',  // No trailing slash
            title: 'Page 1'
          }
        ]
      };

      const result = compareSitemaps(oldSitemap, newSitemap);

      expect(result.unchanged).toHaveLength(1);
      expect(result.modified).toHaveLength(0);
      expect(result.added).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
    });

    test('should detect changes by title', () => {
      const oldSitemap = {
        pages: [
          {
            url: 'https://example.com/page1',
            title: 'Old Title',
            filename: 'page1.md',
            size: 1000
          }
        ]
      };

      const newSitemap = {
        pages: [
          {
            url: 'https://example.com/page1',
            title: 'New Title'
          }
        ]
      };

      const result = compareSitemaps(oldSitemap, newSitemap);

      expect(result.modified).toHaveLength(1);
      expect(result.modified[0].title).toBe('New Title');
      expect(result.modified[0].oldTitle).toBe('Old Title');
    });

    test('should detect changes by size', () => {
      const oldSitemap = {
        pages: [
          {
            url: 'https://example.com/page1',
            title: 'Page 1',
            filename: 'page1.md',
            size: 1000
          }
        ]
      };

      const newSitemap = {
        pages: [
          {
            url: 'https://example.com/page1',
            title: 'Page 1',
            size: 2000  // Different size
          }
        ]
      };

      const result = compareSitemaps(oldSitemap, newSitemap);

      expect(result.modified).toHaveLength(1);
    });

    test('should calculate correct statistics', () => {
      const oldSitemap = {
        pages: [
          { url: 'https://example.com/page1', title: 'Page 1', filename: 'page1.md' },
          { url: 'https://example.com/page2', title: 'Page 2', filename: 'page2.md', lastmod: '2024-01-01' },
          { url: 'https://example.com/page3', title: 'Page 3', filename: 'page3.md' }
        ]
      };

      const newSitemap = {
        pages: [
          { url: 'https://example.com/page1', title: 'Page 1' },  // unchanged
          { url: 'https://example.com/page2', title: 'Page 2', lastmod: '2024-01-02' },  // modified
          { url: 'https://example.com/page4', title: 'Page 4' }   // added
          // page3 removed
        ]
      };

      const result = compareSitemaps(oldSitemap, newSitemap);

      expect(result.stats.total).toBe(3);
      expect(result.stats.unchanged).toBe(1);
      expect(result.stats.modified).toBe(1);
      expect(result.stats.added).toBe(1);
      expect(result.stats.removed).toBe(1);
      expect(result.stats.needsFetch).toBe(2);  // modified + added
      expect(result.stats.percentUnchanged).toBe(33);  // 1/3 = 33%
    });

    test('should throw error for invalid old sitemap', () => {
      const invalidOld = { invalid: 'structure' };
      const validNew = { pages: [] };

      expect(() => compareSitemaps(invalidOld, validNew))
        .toThrow('Invalid old sitemap: must have pages array');
    });

    test('should throw error for invalid new sitemap', () => {
      const validOld = { pages: [] };
      const invalidNew = { invalid: 'structure' };

      expect(() => compareSitemaps(validOld, invalidNew))
        .toThrow('Invalid new sitemap: must have pages array');
    });

    test('should handle empty sitemaps', () => {
      const oldSitemap = { pages: [] };
      const newSitemap = { pages: [] };

      const result = compareSitemaps(oldSitemap, newSitemap);

      expect(result.unchanged).toHaveLength(0);
      expect(result.modified).toHaveLength(0);
      expect(result.added).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
      expect(result.hasChanges).toBe(false);
    });

    test('should preserve metadata fields in comparison results', () => {
      const oldSitemap = {
        pages: [
          {
            url: 'https://example.com/page1',
            title: 'Page 1',
            filename: 'page1.md',
            size: 1000,
            lastmod: '2024-01-01'
          }
        ]
      };

      const newSitemap = {
        pages: [
          {
            url: 'https://example.com/page1',
            title: 'Page 1',
            lastmod: '2024-01-01',
            changefreq: 'weekly',
            priority: 0.8
          }
        ]
      };

      const result = compareSitemaps(oldSitemap, newSitemap);

      expect(result.unchanged[0].filename).toBe('page1.md');
      expect(result.unchanged[0].size).toBe(1000);
      expect(result.unchanged[0].lastmod).toBe('2024-01-01');
    });

    test('should handle complex multi-page scenario', () => {
      const oldSitemap = {
        pages: [
          { url: 'https://example.com/page1', title: 'Page 1', filename: 'page1.md', lastmod: '2024-01-01' },
          { url: 'https://example.com/page2', title: 'Page 2', filename: 'page2.md', lastmod: '2024-01-01' },
          { url: 'https://example.com/page3', title: 'Page 3', filename: 'page3.md' },
          { url: 'https://example.com/page4', title: 'Page 4', filename: 'page4.md' },
          { url: 'https://example.com/page5', title: 'Page 5', filename: 'page5.md' }
        ]
      };

      const newSitemap = {
        pages: [
          { url: 'https://example.com/page1', title: 'Page 1', lastmod: '2024-01-01' },  // unchanged
          { url: 'https://example.com/page2', title: 'Page 2 Updated', lastmod: '2024-01-05' },  // modified
          { url: 'https://example.com/page3', title: 'Page 3' },  // unchanged
          { url: 'https://example.com/page6', title: 'Page 6' },  // added
          { url: 'https://example.com/page7', title: 'Page 7' }   // added
          // page4 and page5 removed
        ]
      };

      const result = compareSitemaps(oldSitemap, newSitemap);

      expect(result.unchanged).toHaveLength(2);  // page1, page3
      expect(result.modified).toHaveLength(1);   // page2
      expect(result.added).toHaveLength(2);      // page6, page7
      expect(result.removed).toHaveLength(2);    // page4, page5
      expect(result.stats.needsFetch).toBe(3);   // 1 modified + 2 added
      expect(result.hasChanges).toBe(true);
    });
  });

  describe('formatComparisonSummary', () => {
    test('should format summary with all change types', () => {
      const comparison = {
        stats: {
          total: 10,
          unchanged: 5,
          modified: 2,
          added: 3,
          removed: 0,
          needsFetch: 5,
          percentUnchanged: 50
        }
      };

      const summary = formatComparisonSummary(comparison);

      expect(summary).toContain('Found 10 pages');
      expect(summary).toContain('5 pages unchanged (50%)');
      expect(summary).toContain('2 pages modified');
      expect(summary).toContain('3 pages added');
      expect(summary).toContain('Will fetch 5 pages');
      expect(summary).toContain('saving 50% bandwidth');
    });

    test('should format summary with no changes', () => {
      const comparison = {
        stats: {
          total: 10,
          unchanged: 10,
          modified: 0,
          added: 0,
          removed: 0,
          needsFetch: 0,
          percentUnchanged: 100
        }
      };

      const summary = formatComparisonSummary(comparison);

      expect(summary).toContain('No changes detected');
      expect(summary).toContain('documentation is up to date');
    });

    test('should format summary with only additions', () => {
      const comparison = {
        stats: {
          total: 5,
          unchanged: 0,
          modified: 0,
          added: 5,
          removed: 0,
          needsFetch: 5,
          percentUnchanged: 0
        }
      };

      const summary = formatComparisonSummary(comparison);

      expect(summary).toContain('5 pages added');
      expect(summary).toContain('Will fetch 5 pages');
      expect(summary).not.toContain('unchanged');
      expect(summary).not.toContain('modified');
    });
  });
});
