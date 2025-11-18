import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { log } from './utils.js';

/**
 * Common selectors to remove (navigation, ads, etc.)
 */
const REMOVE_SELECTORS = [
  'nav',
  'header',
  'footer',
  '.header',
  '.footer',
  '.navigation',
  '.nav',
  '.navbar',
  '.sidebar',
  '.toc',
  '.table-of-contents',
  '.breadcrumbs',
  '.breadcrumb',
  '.edit-page',
  '.edit-link',
  '.feedback',
  '.cookie-notice',
  '.advertisement',
  '.ad',
  '.social-share',
  '.comments',
  'script',
  'style',
  'noscript',
  'iframe'
];

/**
 * Framework-specific content selectors
 */
const CONTENT_SELECTORS = {
  // Docusaurus
  docusaurus: [
    'article.markdown',
    '.markdown',
    'article',
    'main article',
    '.docMainContainer article'
  ],

  // VitePress
  vitepress: [
    '.vp-doc',
    '.content',
    'main .content',
    'article'
  ],

  // Nextra (Next.js docs)
  nextra: [
    'article',
    'main article',
    '.nextra-content',
    'main'
  ],

  // GitBook
  gitbook: [
    '.page-inner',
    'article',
    '.markdown-section'
  ],

  // Mintlify
  mintlify: [
    '.docs-content',
    'main article',
    'article'
  ],

  // ReadTheDocs
  readthedocs: [
    'div.document',
    'div.body',
    'section[role="main"]',
    '.rst-content'
  ],

  // Generic fallback
  generic: [
    'article',
    'main',
    '.content',
    '.main-content',
    '#content',
    '#main',
    '[role="main"]'
  ]
};

/**
 * Detect documentation framework from HTML
 */
function detectFramework(html) {
  const $ = cheerio.load(html);

  // Check meta tags
  const generator = $('meta[name="generator"]').attr('content');
  if (generator) {
    if (/docusaurus/i.test(generator)) return 'docusaurus';
    if (/vitepress/i.test(generator)) return 'vitepress';
    if (/gitbook/i.test(generator)) return 'gitbook';
    if (/sphinx/i.test(generator)) return 'readthedocs';
  }

  // Check for framework-specific classes/IDs
  if ($('.docusaurus').length > 0 || $('#__docusaurus').length > 0) return 'docusaurus';
  if ($('.vp-doc').length > 0 || $('.vitepress').length > 0) return 'vitepress';
  if ($('.nextra-content').length > 0 || $('#__next').length > 0) return 'nextra';
  if ($('.page-inner').length > 0 || $('.gitbook').length > 0) return 'gitbook';
  if ($('.mintlify').length > 0 || $('.docs-content').length > 0) return 'mintlify';
  if ($('.rst-content').length > 0 || $('[data-theme="sphinx"]').length > 0) return 'readthedocs';

  return 'generic';
}

/**
 * Extract main content from HTML based on detected framework
 */
function extractMainContent($, framework) {
  const selectors = CONTENT_SELECTORS[framework] || CONTENT_SELECTORS.generic;

  for (const selector of selectors) {
    const content = $(selector).first();
    if (content.length > 0 && content.text().trim().length > 100) {
      return content;
    }
  }

  // Fallback: try to find the largest text block
  let largestContent = null;
  let largestSize = 0;

  $('div, article, section, main').each((i, elem) => {
    const text = $(elem).text().trim();
    if (text.length > largestSize) {
      largestSize = text.length;
      largestContent = $(elem);
    }
  });

  return largestContent;
}

/**
 * Clean HTML before conversion
 */
function cleanHtml($, content) {
  // Remove unwanted elements
  REMOVE_SELECTORS.forEach(selector => {
    content.find(selector).remove();
  });

  // Remove empty paragraphs
  content.find('p:empty').remove();

  // Remove elements with display:none or visibility:hidden
  content.find('[style*="display: none"]').remove();
  content.find('[style*="display:none"]').remove();
  content.find('[style*="visibility: hidden"]').remove();
  content.find('[style*="visibility:hidden"]').remove();

  // Clean up code blocks - preserve language
  content.find('pre code').each((i, elem) => {
    const $code = $(elem);
    const classes = $code.attr('class') || '';
    const langMatch = classes.match(/language-(\w+)/);
    if (langMatch) {
      $code.attr('data-lang', langMatch[1]);
    }
  });

  return content;
}

/**
 * Configure Turndown for better markdown conversion
 */
function createTurndownService() {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    fence: '```',
    emDelimiter: '_',
    bulletListMarker: '-'
  });

  // Preserve code block languages
  turndown.addRule('fencedCodeBlock', {
    filter: function (node, options) {
      return (
        node.nodeName === 'PRE' &&
        node.firstChild &&
        node.firstChild.nodeName === 'CODE'
      );
    },
    replacement: function (content, node, options) {
      const code = node.firstChild;
      const lang = code.getAttribute('data-lang') ||
                   code.getAttribute('class')?.match(/language-(\w+)/)?.[1] ||
                   '';
      const codeContent = code.textContent || '';

      return '\\n```' + lang + '\\n' + codeContent + '\\n```\\n';
    }
  });

  return turndown;
}

/**
 * Extract and convert HTML to Markdown
 */
export function extractContent(html, url) {
  try {
    const $ = cheerio.load(html);

    // Detect framework
    const framework = detectFramework(html);
    log(`  Detected framework: ${framework}`, 'debug');

    // Extract main content
    let content = extractMainContent($, framework);

    if (!content || content.length === 0) {
      throw new Error('Could not find main content in HTML');
    }

    // Clean HTML
    content = cleanHtml($, content);

    // Convert to markdown
    const turndown = createTurndownService();
    let markdown = turndown.turndown(content.html());

    // Post-processing cleanup
    markdown = markdown
      // Remove excessive newlines
      .replace(/\n{4,}/g, '\\n\\n\\n')
      // Clean up list formatting
      .replace(/\n\s*\n\s*-/g, '\\n-')
      // Remove trailing whitespace
      .split('\\n')
      .map(line => line.trimEnd())
      .join('\\n')
      .trim();

    // Extract metadata
    const title = $('h1').first().text().trim() ||
                  $('title').text().trim() ||
                  'Untitled';

    const description = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content') ||
                       '';

    return {
      success: true,
      markdown,
      metadata: {
        title,
        description,
        framework,
        url,
        extractedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      markdown: null,
      metadata: null
    };
  }
}

/**
 * CLI interface
 */
export async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node extract-content.js <html-file> [output-file]');
    console.log('Example: node extract-content.js page.html page.md');
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1];

  try {
    const fs = await import('fs/promises');
    const html = await fs.readFile(inputFile, 'utf-8');

    console.log('Extracting content...');
    const result = extractContent(html, inputFile);

    if (result.success) {
      console.log('\\n✓ Content extracted successfully!\\n');
      console.log(`Title: ${result.metadata.title}`);
      console.log(`Framework: ${result.metadata.framework}`);
      console.log(`Length: ${result.markdown.length} characters`);

      if (outputFile) {
        await fs.writeFile(outputFile, result.markdown, 'utf-8');
        console.log(`\\nSaved to: ${outputFile}`);
      } else {
        console.log('\\n--- Markdown Output ---\\n');
        console.log(result.markdown.substring(0, 500));
        if (result.markdown.length > 500) {
          console.log('\\n... (truncated)');
        }
      }

      process.exit(0);
    } else {
      console.error(`\\n✗ Extraction failed: ${result.error}\\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\\n✗ Error: ${error.message}\\n`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default extractContent;
