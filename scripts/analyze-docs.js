/**
 * Main documentation analysis orchestrator
 * Coordinates all analysis modules to extract comprehensive insights from cached documentation
 * @module analyze-docs
 */

import { extractTopics } from './analysis/extract-topics.js';
import { extractCodeExamples } from './analysis/extract-code-examples.js';
import { detectAPIMethods } from './analysis/detect-api-methods.js';
import { extractKeywords } from './analysis/extract-keywords.js';
import { buildHierarchy } from './analysis/build-hierarchy.js';
import { loadMetadata } from './utils.js';
import path from 'path';

/**
 * Analyze all aspects of cached documentation
 * @param {string} docsPath - Path to cached docs directory (e.g., .claude/docs/nextjs/15.0.3)
 * @param {Object} options - Analysis options
 * @param {boolean} options.includeTopics - Extract topics from headings (default: true)
 * @param {boolean} options.includeCodeExamples - Extract code examples (default: true)
 * @param {boolean} options.includeAPIMethods - Detect API methods (default: true)
 * @param {boolean} options.includeKeywords - Extract keywords (default: true)
 * @param {boolean} options.includeHierarchy - Build hierarchy from sitemap (default: true)
 * @param {number} options.topKeywords - Number of top keywords to extract (default: 50)
 * @param {boolean} options.verbose - Log progress (default: false)
 * @returns {Promise<Object>} Comprehensive analysis results
 */
export async function analyzeDocumentation(docsPath, options = {}) {
  const {
    includeTopics = true,
    includeCodeExamples = true,
    includeAPIMethods = true,
    includeKeywords = true,
    includeHierarchy = true,
    topKeywords = 50,
    verbose = false
  } = options;

  const log = verbose ? console.log : () => {};

  log('Starting documentation analysis...');
  log(`  Path: ${docsPath}`);

  const results = {
    metadata: null,
    topics: null,
    codeExamples: null,
    apiMethods: null,
    keywords: null,
    hierarchy: null,
    summary: {},
    analyzedAt: new Date().toISOString()
  };

  try {
    // Load metadata
    log('Loading metadata...');
    const metadata = await loadMetadata(docsPath);
    results.metadata = metadata;
    log(`  ✓ Library: ${metadata.library} v${metadata.version}`);
    log(`  ✓ Pages: ${metadata.page_count}`);

    // Extract topics
    if (includeTopics) {
      log('Extracting topics...');
      const topics = await extractTopics(docsPath);
      results.topics = topics;
      log(`  ✓ Found ${topics.topicCount} topics across ${topics.mainTopicCount} main sections`);
    }

    // Extract code examples
    if (includeCodeExamples) {
      log('Extracting code examples...');
      const codeExamples = await extractCodeExamples(docsPath);
      results.codeExamples = codeExamples;
      log(`  ✓ Found ${codeExamples.totalCount} code examples in ${codeExamples.languageCount} languages`);
    }

    // Detect API methods
    if (includeAPIMethods) {
      log('Detecting API methods...');
      const apiMethods = await detectAPIMethods(docsPath);
      results.apiMethods = apiMethods;
      log(`  ✓ Detected ${apiMethods.uniqueCount} unique API methods`);
    }

    // Extract keywords
    if (includeKeywords) {
      log('Extracting keywords...');
      const keywords = await extractKeywords(docsPath, topKeywords);
      results.keywords = keywords;
      log(`  ✓ Extracted ${keywords.uniqueTerms} unique terms (top ${keywords.topKeywords.length} selected)`);
    }

    // Build hierarchy
    if (includeHierarchy) {
      log('Building hierarchy...');
      const hierarchy = await buildHierarchy(docsPath);
      results.hierarchy = hierarchy;
      log(`  ✓ Built hierarchy with ${hierarchy.stats.totalSections} sections (max depth: ${hierarchy.stats.maxDepth})`);
    }

    // Generate summary
    results.summary = {
      library: metadata.library,
      version: metadata.version,
      totalPages: metadata.page_count,
      sourceType: metadata.source_type,
      framework: metadata.framework,
      topicCount: results.topics?.topicCount || 0,
      mainTopicCount: results.topics?.mainTopicCount || 0,
      codeExampleCount: results.codeExamples?.totalCount || 0,
      languageCount: results.codeExamples?.languageCount || 0,
      apiMethodCount: results.apiMethods?.uniqueCount || 0,
      keywordCount: results.keywords?.uniqueTerms || 0,
      hierarchySections: results.hierarchy?.stats.totalSections || 0,
      maxDepth: results.hierarchy?.stats.maxDepth || 0
    };

    log('\n✓ Analysis complete!');
    log(`  Summary: ${results.summary.topicCount} topics, ${results.summary.codeExampleCount} examples, ${results.summary.apiMethodCount} methods`);

    return results;

  } catch (error) {
    throw new Error(`Documentation analysis failed: ${error.message}`);
  }
}

/**
 * Get activation patterns based on analysis
 * @param {Object} analysis - Analysis results
 * @param {string} libraryName - Library name
 * @returns {Array} Activation patterns
 */
export function generateActivationPatterns(analysis, libraryName) {
  const patterns = [];

  // Core library pattern
  patterns.push(`${libraryName}`);

  // Add top keywords as patterns
  if (analysis.keywords && analysis.keywords.topKeywords) {
    analysis.keywords.topKeywords.slice(0, 10).forEach(kw => {
      if (kw.term.length > 3 && kw.score > 1.0) {
        patterns.push(kw.term);
      }
    });
  }

  // Add main topic names
  if (analysis.topics && analysis.topics.mainTopics) {
    analysis.topics.mainTopics.slice(0, 5).forEach(topic => {
      const cleaned = topic.toLowerCase().replace(/\s+/g, ' ');
      if (cleaned.length > 3 && !patterns.includes(cleaned)) {
        patterns.push(cleaned);
      }
    });
  }

  // Add popular API methods (if they're hooks or well-known functions)
  if (analysis.apiMethods && analysis.apiMethods.byCategory) {
    const hooks = analysis.apiMethods.byCategory.hooks || [];
    hooks.slice(0, 5).forEach(hook => {
      if (!patterns.includes(hook.name)) {
        patterns.push(hook.name);
      }
    });
  }

  return patterns;
}

/**
 * Create a summary description from analysis
 * @param {Object} analysis - Analysis results
 * @returns {string} Summary description
 */
export function generateSummaryDescription(analysis) {
  const parts = [];

  if (analysis.summary.topicCount > 0) {
    parts.push(`${analysis.summary.topicCount} topics`);
  }

  if (analysis.summary.codeExampleCount > 0) {
    parts.push(`${analysis.summary.codeExampleCount} code examples`);
  }

  if (analysis.summary.apiMethodCount > 0) {
    parts.push(`${analysis.summary.apiMethodCount} API methods`);
  }

  if (analysis.topics && analysis.topics.mainTopics && analysis.topics.mainTopics.length > 0) {
    const topTopics = analysis.topics.mainTopics.slice(0, 3);
    parts.push(`covering ${topTopics.join(', ')}`);
  }

  return parts.join(', ');
}

/**
 * Get most relevant code examples for a category
 * @param {Object} analysis - Analysis results
 * @param {string} category - Category name
 * @param {number} limit - Max examples to return
 * @returns {Array} Code examples
 */
export function getExamplesByCategory(analysis, category, limit = 5) {
  if (!analysis.codeExamples || !analysis.codeExamples.categories) {
    return [];
  }

  const categoryData = analysis.codeExamples.categories[category];
  if (!categoryData) {
    return [];
  }

  return categoryData.examples.slice(0, limit);
}

/**
 * Get most used languages from analysis
 * @param {Object} analysis - Analysis results
 * @param {number} limit - Max languages to return
 * @returns {Array} Language names sorted by usage
 */
export function getMostUsedLanguages(analysis, limit = 5) {
  if (!analysis.codeExamples || !analysis.codeExamples.languages) {
    return [];
  }

  return Object.entries(analysis.codeExamples.languages)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([lang]) => lang);
}

/**
 * Get largest documentation sections
 * @param {Object} analysis - Analysis results
 * @param {number} limit - Max sections to return
 * @returns {Array} Largest sections
 */
export function getLargestSections(analysis, limit = 10) {
  if (!analysis.hierarchy || !analysis.hierarchy.largestSections) {
    return [];
  }

  return analysis.hierarchy.largestSections.slice(0, limit);
}
