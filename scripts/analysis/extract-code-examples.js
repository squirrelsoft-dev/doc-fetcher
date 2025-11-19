/**
 * Extract and categorize code examples from markdown documentation
 * @module analysis/extract-code-examples
 */

import { remark } from 'remark';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import fs from 'fs/promises';
import path from 'path';

/**
 * Determine the category of a code example based on surrounding context
 * @param {string} precedingText - Text before the code block
 * @param {string} language - Programming language
 * @returns {string} Category name
 */
function categorizeCodeExample(precedingText, language) {
  const text = precedingText.toLowerCase();

  // Common patterns for categorization
  if (text.includes('install') || text.includes('npm') || text.includes('yarn')) {
    return 'Installation';
  }
  if (text.includes('config') || text.includes('setup') || text.includes('initialization')) {
    return 'Configuration';
  }
  if (text.includes('example') || text.includes('usage') || text.includes('how to')) {
    return 'Usage Example';
  }
  if (text.includes('api') || text.includes('method') || text.includes('function')) {
    return 'API Reference';
  }
  if (text.includes('test') || text.includes('spec')) {
    return 'Testing';
  }
  if (text.includes('type') || text.includes('interface') || text.includes('definition')) {
    return 'Type Definitions';
  }
  if (text.includes('error') || text.includes('debug') || text.includes('fix')) {
    return 'Troubleshooting';
  }
  if (text.includes('migrate') || text.includes('upgrade') || text.includes('breaking change')) {
    return 'Migration';
  }

  // Language-specific defaults
  if (language === 'bash' || language === 'sh' || language === 'shell') {
    return 'Command Line';
  }
  if (language === 'json' || language === 'yaml' || language === 'toml') {
    return 'Configuration';
  }

  return 'General Example';
}

/**
 * Extract code examples from a single markdown file
 * @param {string} content - Markdown content
 * @param {string} filename - Original filename
 * @param {string} sourceUrl - Source URL from frontmatter
 * @returns {Promise<Array>} Array of code examples
 */
export async function extractCodeExamplesFromContent(content, filename, sourceUrl = null) {
  const examples = [];
  let lastHeading = '';
  let precedingText = '';

  const tree = remark()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkGfm)
    .parse(content);

  // Extract frontmatter URL if available
  if (!sourceUrl) {
    visit(tree, 'yaml', (node) => {
      const frontmatterText = node.value;
      const urlMatch = frontmatterText.match(/url:\s*(.+)/);
      if (urlMatch) {
        sourceUrl = urlMatch[1].trim();
      }
    });
  }

  // Track context
  visit(tree, (node) => {
    if (node.type === 'heading') {
      const text = node.children
        .filter(child => child.type === 'text')
        .map(child => child.value)
        .join(' ')
        .trim();
      lastHeading = text;
      precedingText = text; // Headings help with categorization
    } else if (node.type === 'paragraph' || node.type === 'text') {
      // Accumulate text for context
      const text = node.children
        ? node.children.filter(c => c.type === 'text').map(c => c.value).join(' ')
        : node.value || '';
      precedingText += ' ' + text;
      // Keep only last 200 chars for context
      if (precedingText.length > 200) {
        precedingText = precedingText.slice(-200);
      }
    } else if (node.type === 'code') {
      const language = node.lang || 'text';
      const code = node.value || '';

      if (code.trim().length === 0) return; // Skip empty code blocks

      const category = categorizeCodeExample(precedingText, language);

      examples.push({
        language,
        category,
        title: lastHeading || filename,
        code,
        sourceUrl: sourceUrl || filename,
        sourceFile: filename,
        lines: code.split('\n').length
      });
    }
  });

  return examples;
}

/**
 * Categorize and count languages used
 * @param {Array} examples - Code examples
 * @returns {Object} Language statistics
 */
function analyzeLanguages(examples) {
  const languages = {};

  examples.forEach(ex => {
    if (!languages[ex.language]) {
      languages[ex.language] = {
        count: 0,
        categories: new Set()
      };
    }
    languages[ex.language].count++;
    languages[ex.language].categories.add(ex.category);
  });

  // Convert Sets to Arrays for serialization
  Object.keys(languages).forEach(lang => {
    languages[lang].categories = Array.from(languages[lang].categories);
  });

  return languages;
}

/**
 * Categorize and count code example categories
 * @param {Array} examples - Code examples
 * @returns {Object} Category statistics
 */
function analyzeCategories(examples) {
  const categories = {};

  examples.forEach(ex => {
    if (!categories[ex.category]) {
      categories[ex.category] = {
        count: 0,
        languages: new Set(),
        examples: []
      };
    }
    categories[ex.category].count++;
    categories[ex.category].languages.add(ex.language);
    // Store first few examples
    if (categories[ex.category].examples.length < 3) {
      categories[ex.category].examples.push({
        title: ex.title,
        language: ex.language,
        preview: ex.code.slice(0, 100) + (ex.code.length > 100 ? '...' : '')
      });
    }
  });

  // Convert Sets to Arrays
  Object.keys(categories).forEach(cat => {
    categories[cat].languages = Array.from(categories[cat].languages);
  });

  return categories;
}

/**
 * Extract all code examples from cached documentation
 * @param {string} docsPath - Path to cached docs directory
 * @returns {Promise<Object>} Code example analysis results
 */
export async function extractCodeExamples(docsPath) {
  const pagesPath = path.join(docsPath, 'pages');

  try {
    await fs.access(pagesPath);
  } catch (error) {
    throw new Error(`Pages directory not found: ${pagesPath}`);
  }

  const files = await fs.readdir(pagesPath);
  const markdownFiles = files.filter(f => f.endsWith('.md'));

  if (markdownFiles.length === 0) {
    return {
      examples: [],
      totalCount: 0,
      languages: {},
      categories: {}
    };
  }

  let allExamples = [];

  // Extract code from each file
  for (const file of markdownFiles) {
    const filePath = path.join(pagesPath, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const examples = await extractCodeExamplesFromContent(content, file);
    allExamples = allExamples.concat(examples);
  }

  const languages = analyzeLanguages(allExamples);
  const categories = analyzeCategories(allExamples);

  return {
    examples: allExamples,
    totalCount: allExamples.length,
    languages,
    categories,
    languageCount: Object.keys(languages).length,
    categoryCount: Object.keys(categories).length
  };
}
