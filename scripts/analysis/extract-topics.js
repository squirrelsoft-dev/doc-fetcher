/**
 * Extract topics and headings from markdown documentation
 * @module analysis/extract-topics
 */

import { remark } from 'remark';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import fs from 'fs/promises';
import path from 'path';

/**
 * Extract topics from a single markdown file
 * @param {string} content - Markdown content
 * @param {string} filename - Original filename for reference
 * @returns {Promise<Array>} Array of topics with hierarchy
 */
export async function extractTopicsFromContent(content, filename) {
  const topics = [];

  const tree = remark()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkGfm)
    .parse(content);

  let currentH1 = null;
  let currentH2 = null;

  visit(tree, 'heading', (node) => {
    const text = node.children
      .filter(child => child.type === 'text')
      .map(child => child.value)
      .join(' ')
      .trim();

    if (!text) return;

    const topic = {
      level: node.depth,
      title: text,
      source: filename
    };

    topics.push(topic);

    // Track hierarchy for nested topics
    if (node.depth === 1) {
      currentH1 = text;
      currentH2 = null;
    } else if (node.depth === 2) {
      currentH2 = text;
      if (currentH1) {
        topic.parent = currentH1;
      }
    } else if (node.depth === 3) {
      if (currentH2) {
        topic.parent = currentH2;
      } else if (currentH1) {
        topic.parent = currentH1;
      }
    }
  });

  return topics;
}

/**
 * Build topic hierarchy from flat topic list
 * @param {Array} topics - Flat array of topics
 * @returns {Object} Hierarchical topic structure with counts
 */
export function buildTopicHierarchy(topics) {
  const hierarchy = {};

  // Count topics by level
  const h1Topics = topics.filter(t => t.level === 1);
  const h2Topics = topics.filter(t => t.level === 2);
  const h3Topics = topics.filter(t => t.level === 3);

  // Build main topics (H1)
  h1Topics.forEach(topic => {
    if (!hierarchy[topic.title]) {
      hierarchy[topic.title] = {
        title: topic.title,
        level: 1,
        count: 1,
        subtopics: [],
        pages: [topic.source]
      };
    } else {
      hierarchy[topic.title].count++;
      if (!hierarchy[topic.title].pages.includes(topic.source)) {
        hierarchy[topic.title].pages.push(topic.source);
      }
    }
  });

  // Add subtopics (H2)
  h2Topics.forEach(topic => {
    if (topic.parent && hierarchy[topic.parent]) {
      const existing = hierarchy[topic.parent].subtopics.find(st => st.title === topic.title);
      if (!existing) {
        hierarchy[topic.parent].subtopics.push({
          title: topic.title,
          level: 2,
          count: 1,
          pages: [topic.source]
        });
      } else {
        existing.count++;
        if (!existing.pages.includes(topic.source)) {
          existing.pages.push(topic.source);
        }
      }
    }
  });

  return hierarchy;
}

/**
 * Extract all topics from cached documentation
 * @param {string} docsPath - Path to cached docs directory (e.g., .claude/docs/nextjs/15.0.3)
 * @returns {Promise<Object>} Topic analysis results
 */
export async function extractTopics(docsPath) {
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
      topics: [],
      hierarchy: {},
      topicCount: 0,
      mainTopics: [],
      subtopicCount: 0
    };
  }

  let allTopics = [];

  // Extract topics from each file
  for (const file of markdownFiles) {
    const filePath = path.join(pagesPath, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const topics = await extractTopicsFromContent(content, file);
    allTopics = allTopics.concat(topics);
  }

  // Build hierarchy
  const hierarchy = buildTopicHierarchy(allTopics);

  // Calculate statistics
  const mainTopics = Object.keys(hierarchy);
  const subtopicCount = mainTopics.reduce((sum, key) => {
    return sum + hierarchy[key].subtopics.length;
  }, 0);

  return {
    topics: allTopics,
    hierarchy,
    topicCount: allTopics.length,
    mainTopics,
    mainTopicCount: mainTopics.length,
    subtopicCount
  };
}
