/**
 * Detect API methods and function signatures from documentation
 * @module analysis/detect-api-methods
 */

import { remark } from 'remark';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import fs from 'fs/promises';
import path from 'path';

/**
 * Patterns for detecting API methods in different languages
 */
const API_PATTERNS = {
  // JavaScript/TypeScript function declarations
  jsFunction: /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,

  // Arrow functions
  jsArrow: /(?:export\s+)?const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\(/g,

  // Method definitions
  jsMethod: /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*[:{]/g,

  // Python function definitions
  pyFunction: /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,

  // Python async functions
  pyAsync: /async\s+def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,

  // Go function declarations
  goFunction: /func\s+(?:\([^)]*\)\s*)?([A-Z][a-zA-Z0-9_]*)\s*\(/g,

  // Rust function declarations
  rustFunction: /(?:pub\s+)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[(<]/g,

  // Java/C# method declarations
  javaMethod: /(?:public|private|protected)\s+(?:static\s+)?(?:async\s+)?[a-zA-Z<>[\],\s]+\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,

  // Class method in code headings
  methodHeading: /^([a-zA-Z_$][a-zA-Z0-9_$.]*)\s*\(/
};

/**
 * Extract API methods from code blocks
 * @param {string} code - Code content
 * @param {string} language - Programming language
 * @returns {Array} Extracted method names
 */
function extractMethodsFromCode(code, language) {
  const methods = new Set();

  switch (language) {
    case 'javascript':
    case 'js':
    case 'jsx':
    case 'typescript':
    case 'ts':
    case 'tsx':
      // JavaScript/TypeScript patterns
      [API_PATTERNS.jsFunction, API_PATTERNS.jsArrow, API_PATTERNS.jsMethod].forEach(pattern => {
        const matches = code.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) methods.add(match[1]);
        }
      });
      break;

    case 'python':
    case 'py':
      // Python patterns
      [API_PATTERNS.pyFunction, API_PATTERNS.pyAsync].forEach(pattern => {
        const matches = code.matchAll(pattern);
        for (const match of matches) {
          if (match[1] && !match[1].startsWith('_')) { // Skip private methods
            methods.add(match[1]);
          }
        }
      });
      break;

    case 'go':
      // Go patterns
      const goMatches = code.matchAll(API_PATTERNS.goFunction);
      for (const match of goMatches) {
        if (match[1]) methods.add(match[1]);
      }
      break;

    case 'rust':
    case 'rs':
      // Rust patterns
      const rustMatches = code.matchAll(API_PATTERNS.rustFunction);
      for (const match of rustMatches) {
        if (match[1]) methods.add(match[1]);
      }
      break;

    case 'java':
    case 'csharp':
    case 'cs':
    case 'c#':
      // Java/C# patterns
      const javaMatches = code.matchAll(API_PATTERNS.javaMethod);
      for (const match of matches) {
        if (match[1]) methods.add(match[1]);
      }
      break;
  }

  return Array.from(methods);
}

/**
 * Extract API methods from headings (e.g., "useEffect()", "fetch()")
 * @param {string} heading - Heading text
 * @returns {string|null} Method name if detected
 */
function extractMethodFromHeading(heading) {
  const match = heading.match(API_PATTERNS.methodHeading);
  return match ? match[1] : null;
}

/**
 * Detect API methods from a single markdown file
 * @param {string} content - Markdown content
 * @param {string} filename - Original filename
 * @param {string} sourceUrl - Source URL
 * @returns {Promise<Object>} API methods detected
 */
export async function detectAPIMethodsFromContent(content, filename, sourceUrl = null) {
  const apiMethods = [];
  let lastHeading = '';

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

  // Track headings and code blocks
  visit(tree, (node) => {
    if (node.type === 'heading') {
      const text = node.children
        .filter(child => child.type === 'text' || child.type === 'inlineCode')
        .map(child => child.value)
        .join(' ')
        .trim();

      lastHeading = text;

      // Check if heading contains an API method
      const methodName = extractMethodFromHeading(text);
      if (methodName) {
        apiMethods.push({
          name: methodName,
          type: 'heading',
          category: 'API Reference',
          source: sourceUrl || filename,
          sourceFile: filename,
          context: text
        });
      }
    } else if (node.type === 'code') {
      const language = node.lang || 'text';
      const code = node.value || '';

      // Extract methods from code
      const methods = extractMethodsFromCode(code, language);

      methods.forEach(method => {
        // Avoid duplicates
        const exists = apiMethods.find(m => m.name === method);
        if (!exists) {
          apiMethods.push({
            name: method,
            type: 'code',
            language,
            category: lastHeading || 'General',
            source: sourceUrl || filename,
            sourceFile: filename,
            context: lastHeading
          });
        }
      });
    }
  });

  return apiMethods;
}

/**
 * Categorize API methods by type
 * @param {Array} methods - API methods
 * @returns {Object} Categorized methods
 */
function categorizeAPIMethods(methods) {
  const categories = {
    hooks: [],
    functions: [],
    classes: [],
    methods: [],
    components: [],
    utilities: [],
    other: []
  };

  methods.forEach(method => {
    const name = method.name;

    // React hooks
    if (name.startsWith('use') && name.length > 3 && /^use[A-Z]/.test(name)) {
      categories.hooks.push(method);
    }
    // React components (PascalCase)
    else if (/^[A-Z][a-zA-Z0-9]*$/.test(name) && !/^[A-Z_]+$/.test(name)) {
      categories.components.push(method);
    }
    // Classes (PascalCase)
    else if (/^[A-Z]/.test(name) && method.context?.toLowerCase().includes('class')) {
      categories.classes.push(method);
    }
    // Methods (part of a class/object)
    else if (method.name.includes('.') || method.context?.toLowerCase().includes('method')) {
      categories.methods.push(method);
    }
    // Utility functions
    else if (name.length > 0 && /^[a-z_$]/.test(name)) {
      categories.utilities.push(method);
    }
    // Everything else
    else {
      categories.other.push(method);
    }
  });

  return categories;
}

/**
 * Detect all API methods from cached documentation
 * @param {string} docsPath - Path to cached docs directory
 * @returns {Promise<Object>} API method analysis results
 */
export async function detectAPIMethods(docsPath) {
  const pagesPath = path.join(docsPath, 'pages');

  try {
    await fs.access(pagesPath);
  } catch (error) {
    throw new Error(`Pages directory not found: ${pagesPath}`);
  }

  const files = await fs.readdir(pagesPath);
  const markdownFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.txt'));

  if (markdownFiles.length === 0) {
    return {
      methods: [],
      totalCount: 0,
      byCategory: {},
      byLanguage: {},
      uniqueCount: 0
    };
  }

  let allMethods = [];

  // Detect methods from each file
  for (const file of markdownFiles) {
    const filePath = path.join(pagesPath, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const methods = await detectAPIMethodsFromContent(content, file);
    allMethods = allMethods.concat(methods);
  }

  // Deduplicate by name
  const uniqueMethods = [];
  const seen = new Set();
  allMethods.forEach(method => {
    if (!seen.has(method.name)) {
      seen.add(method.name);
      uniqueMethods.push(method);
    }
  });

  // Categorize methods
  const byCategory = categorizeAPIMethods(uniqueMethods);

  // Group by language
  const byLanguage = {};
  uniqueMethods.forEach(method => {
    if (method.language) {
      if (!byLanguage[method.language]) {
        byLanguage[method.language] = [];
      }
      byLanguage[method.language].push(method);
    }
  });

  return {
    methods: uniqueMethods,
    totalCount: allMethods.length,
    uniqueCount: uniqueMethods.length,
    byCategory,
    byLanguage,
    categoryCount: Object.keys(byCategory).filter(k => byCategory[k].length > 0).length
  };
}
