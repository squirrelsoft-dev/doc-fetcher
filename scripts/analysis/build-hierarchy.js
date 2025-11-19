/**
 * Build topic hierarchy from sitemap URLs
 * @module analysis/build-hierarchy
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Parse URL path into segments
 * @param {string} url - Full URL or path
 * @returns {Array} Path segments
 */
function parseURLPath(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.split('/').filter(segment => segment.length > 0);
  } catch (error) {
    // Not a valid URL, treat as path
    return url.split('/').filter(segment => segment.length > 0);
  }
}

/**
 * Convert URL segment to readable title
 * @param {string} segment - URL segment
 * @returns {string} Readable title
 */
function segmentToTitle(segment) {
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Insert page into hierarchy tree
 * @param {Object} tree - Hierarchy tree
 * @param {Array} segments - URL path segments
 * @param {Object} page - Page data
 * @param {number} depth - Current depth
 */
function insertIntoTree(tree, segments, page, depth = 0) {
  if (segments.length === 0) return;

  const segment = segments[0];
  const title = segmentToTitle(segment);

  if (!tree[segment]) {
    tree[segment] = {
      segment,
      title,
      depth,
      pages: [],
      children: {},
      pageCount: 0
    };
  }

  if (segments.length === 1) {
    // Leaf node - this is a page
    tree[segment].pages.push(page);
    tree[segment].pageCount++;
  } else {
    // Branch node - recurse
    insertIntoTree(tree[segment].children, segments.slice(1), page, depth + 1);
    tree[segment].pageCount++;
  }
}

/**
 * Convert tree to array format
 * @param {Object} tree - Tree object
 * @param {string} parentPath - Parent path
 * @returns {Array} Array of sections
 */
function treeToArray(tree, parentPath = '') {
  const sections = [];

  Object.values(tree).forEach(node => {
    const fullPath = parentPath ? `${parentPath}/${node.segment}` : node.segment;

    const section = {
      path: fullPath,
      segment: node.segment,
      title: node.title,
      depth: node.depth,
      pageCount: node.pageCount,
      directPages: node.pages.length,
      pages: node.pages,
      hasChildren: Object.keys(node.children).length > 0
    };

    if (section.hasChildren) {
      section.subsections = treeToArray(node.children, fullPath);
    }

    sections.push(section);
  });

  // Sort by page count (descending) and then alphabetically
  sections.sort((a, b) => {
    if (b.pageCount !== a.pageCount) {
      return b.pageCount - a.pageCount;
    }
    return a.title.localeCompare(b.title);
  });

  return sections;
}

/**
 * Calculate hierarchy statistics
 * @param {Array} sections - Section array
 * @returns {Object} Statistics
 */
function calculateStats(sections) {
  let maxDepth = 0;
  let totalSections = 0;
  let totalPages = 0;

  function traverse(secs, depth = 0) {
    secs.forEach(section => {
      maxDepth = Math.max(maxDepth, depth);
      totalSections++;
      totalPages += section.directPages;

      if (section.subsections) {
        traverse(section.subsections, depth + 1);
      }
    });
  }

  traverse(sections);

  return {
    maxDepth,
    totalSections,
    totalPages,
    topLevelSections: sections.length
  };
}

/**
 * Find largest sections
 * @param {Array} sections - All sections
 * @param {number} topN - Number of top sections to return
 * @returns {Array} Largest sections
 */
function findLargestSections(sections, topN = 10) {
  const allSections = [];

  function collect(secs) {
    secs.forEach(section => {
      allSections.push({
        path: section.path,
        title: section.title,
        pageCount: section.pageCount,
        depth: section.depth
      });

      if (section.subsections) {
        collect(section.subsections);
      }
    });
  }

  collect(sections);

  return allSections
    .sort((a, b) => b.pageCount - a.pageCount)
    .slice(0, topN);
}

/**
 * Build documentation hierarchy from sitemap
 * @param {string} docsPath - Path to cached docs directory
 * @returns {Promise<Object>} Hierarchy analysis results
 */
export async function buildHierarchy(docsPath) {
  const sitemapPath = path.join(docsPath, 'sitemap.json');

  try {
    await fs.access(sitemapPath);
  } catch (error) {
    throw new Error(`Sitemap not found: ${sitemapPath}`);
  }

  const sitemapContent = await fs.readFile(sitemapPath, 'utf-8');
  const sitemap = JSON.parse(sitemapContent);

  if (!sitemap.pages || sitemap.pages.length === 0) {
    return {
      tree: {},
      sections: [],
      stats: {
        maxDepth: 0,
        totalSections: 0,
        totalPages: 0,
        topLevelSections: 0
      },
      largestSections: []
    };
  }

  // Build tree
  const tree = {};

  sitemap.pages.forEach(page => {
    const segments = parseURLPath(page.url);

    // Filter out common base paths like 'docs', 'documentation', etc.
    const filteredSegments = segments.filter(seg => {
      return !['docs', 'documentation', 'guide', 'manual', 'api-reference'].includes(seg.toLowerCase());
    });

    if (filteredSegments.length > 0) {
      insertIntoTree(tree, filteredSegments, page);
    } else {
      // Root level page
      const segment = page.filename || 'index';
      if (!tree[segment]) {
        tree[segment] = {
          segment,
          title: page.title || segmentToTitle(segment),
          depth: 0,
          pages: [],
          children: {},
          pageCount: 0
        };
      }
      tree[segment].pages.push(page);
      tree[segment].pageCount++;
    }
  });

  // Convert to array format
  const sections = treeToArray(tree);

  // Calculate statistics
  const stats = calculateStats(sections);

  // Find largest sections
  const largestSections = findLargestSections(sections);

  return {
    tree,
    sections,
    stats,
    largestSections,
    totalPages: sitemap.pages.length
  };
}

/**
 * Get breadcrumb path for a URL
 * @param {string} url - Page URL
 * @param {Object} hierarchy - Hierarchy data
 * @returns {Array} Breadcrumb segments
 */
export function getBreadcrumb(url, hierarchy) {
  const segments = parseURLPath(url);
  const breadcrumb = [];

  segments.forEach(segment => {
    breadcrumb.push(segmentToTitle(segment));
  });

  return breadcrumb;
}
