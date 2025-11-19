/**
 * Extract keywords from documentation using TF-IDF and frequency analysis
 * @module analysis/extract-keywords
 */

import { remark } from 'remark';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import natural from 'natural';
import fs from 'fs/promises';
import path from 'path';

const { TfIdf, WordTokenizer } = natural;

/**
 * Common stopwords to filter out
 */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
  'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's',
  't', 'just', 'now', 'also', 'here', 'there', 'then', 'them', 'their',
  'our', 'your', 'its', 'let', 'get', 'using', 'use', 'used', 'like',
  'one', 'two', 'first', 'second', 'way', 'time', 'need', 'want', 'make',
  'see', 'take', 'know', 'think', 'come', 'go', 'look', 'see', 'give',
  'find', 'tell', 'ask', 'work', 'seem', 'feel', 'try', 'leave', 'call'
]);

/**
 * Additional technical stopwords
 */
const TECH_STOPWORDS = new Set([
  'code', 'example', 'following', 'above', 'below', 'file', 'function',
  'method', 'class', 'object', 'value', 'type', 'property', 'parameter',
  'return', 'returns', 'import', 'export', 'default', 'const', 'let',
  'var', 'async', 'await', 'true', 'false', 'null', 'undefined', 'new',
  'syntax', 'usage', 'note', 'important', 'warning', 'tip', 'example'
]);

/**
 * Extract text content from markdown
 * @param {string} content - Markdown content
 * @param {boolean} includeHeadings - Whether to weight headings higher
 * @returns {Object} Extracted text with weights
 */
function extractTextContent(content, includeHeadings = true) {
  const textParts = {
    headings: [],
    body: []
  };

  const tree = remark()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkGfm)
    .parse(content);

  visit(tree, (node) => {
    if (node.type === 'heading') {
      const text = node.children
        .filter(child => child.type === 'text' || child.type === 'inlineCode')
        .map(child => child.value)
        .join(' ');
      textParts.headings.push(text);
    } else if (node.type === 'paragraph' || node.type === 'text') {
      const text = node.children
        ? node.children.filter(c => c.type === 'text').map(c => c.value).join(' ')
        : node.value || '';
      textParts.body.push(text);
    } else if (node.type === 'listItem') {
      // Extract text from list items
      visit(node, 'text', (textNode) => {
        textParts.body.push(textNode.value);
      });
    }
  });

  return textParts;
}

/**
 * Tokenize and clean text
 * @param {string} text - Text to tokenize
 * @returns {Array} Cleaned tokens
 */
function tokenizeAndClean(text) {
  const tokenizer = new WordTokenizer();
  const tokens = tokenizer.tokenize(text.toLowerCase());

  return tokens.filter(token => {
    // Filter out stopwords, short tokens, and non-alphabetic tokens
    return (
      token.length > 2 &&
      !STOPWORDS.has(token) &&
      !TECH_STOPWORDS.has(token) &&
      /^[a-z][a-z0-9-]*$/.test(token) &&
      !token.match(/^[\d-]+$/) // Remove pure numbers
    );
  });
}

/**
 * Extract keywords from single document using TF-IDF
 * @param {string} content - Markdown content
 * @param {string} filename - Filename for reference
 * @returns {Object} Keyword data
 */
export function extractKeywordsFromContent(content, filename) {
  const textParts = extractTextContent(content);

  // Combine text, weighting headings more heavily
  const headingText = textParts.headings.join(' ');
  const bodyText = textParts.body.join(' ');

  // Tokenize
  const headingTokens = tokenizeAndClean(headingText);
  const bodyTokens = tokenizeAndClean(bodyText);

  // Count frequencies
  const frequency = {};

  // Headings get 3x weight
  headingTokens.forEach(token => {
    frequency[token] = (frequency[token] || 0) + 3;
  });

  // Body text gets 1x weight
  bodyTokens.forEach(token => {
    frequency[token] = (frequency[token] || 0) + 1;
  });

  return {
    filename,
    tokens: [...headingTokens, ...bodyTokens],
    frequency,
    headingTokens: headingTokens.length,
    bodyTokens: bodyTokens.length
  };
}

/**
 * Extract keywords from all documents using TF-IDF
 * @param {string} docsPath - Path to cached docs directory
 * @param {number} topN - Number of top keywords to return
 * @returns {Promise<Object>} Keyword analysis results
 */
export async function extractKeywords(docsPath, topN = 50) {
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
      keywords: [],
      topKeywords: [],
      totalDocuments: 0,
      totalTokens: 0
    };
  }

  // Create TF-IDF instance
  const tfidf = new TfIdf();
  const documentData = [];

  // Process each document
  for (const file of markdownFiles) {
    const filePath = path.join(pagesPath, file);
    const content = await fs.readFile(filePath, 'utf-8');

    const keywordData = extractKeywordsFromContent(content, file);
    documentData.push(keywordData);

    // Add document to TF-IDF
    tfidf.addDocument(keywordData.tokens.join(' '));
  }

  // Calculate TF-IDF scores across all documents
  const termScores = {};

  tfidf.listTerms(0 /* document index */).forEach((item) => {
    if (!termScores[item.term]) {
      termScores[item.term] = 0;
    }
    termScores[item.term] += item.tfidf;
  });

  // Aggregate scores across all documents
  for (let i = 1; i < documentData.length; i++) {
    tfidf.listTerms(i).forEach((item) => {
      if (!termScores[item.term]) {
        termScores[item.term] = 0;
      }
      termScores[item.term] += item.tfidf;
    });
  }

  // Sort by score
  const sortedKeywords = Object.entries(termScores)
    .map(([term, score]) => ({ term, score }))
    .sort((a, b) => b.score - a.score);

  // Get top N keywords
  const topKeywords = sortedKeywords.slice(0, topN);

  // Calculate total tokens
  const totalTokens = documentData.reduce((sum, doc) => {
    return sum + doc.headingTokens + doc.bodyTokens;
  }, 0);

  // Calculate frequency distribution
  const frequencyDistribution = {};
  documentData.forEach(doc => {
    Object.entries(doc.frequency).forEach(([term, count]) => {
      if (!frequencyDistribution[term]) {
        frequencyDistribution[term] = 0;
      }
      frequencyDistribution[term] += count;
    });
  });

  // Get most frequent terms (not by TF-IDF, by raw frequency)
  const mostFrequent = Object.entries(frequencyDistribution)
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);

  return {
    keywords: sortedKeywords,
    topKeywords,
    mostFrequent,
    totalDocuments: documentData.length,
    totalTokens,
    uniqueTerms: Object.keys(termScores).length,
    documentData
  };
}
