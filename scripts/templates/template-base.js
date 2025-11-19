/**
 * Shared template utilities and helpers
 * @module templates/template-base
 */

/**
 * Generate YAML frontmatter for a skill
 * @param {Object} params - Frontmatter parameters
 * @returns {string} YAML frontmatter
 */
export function generateFrontmatter(params) {
  const {
    name,
    description,
    version,
    library,
    docsPath,
    template,
    activationPatterns = [],
    autoActivate = true,
    lastUpdated = new Date().toISOString().split('T')[0]
  } = params;

  const yaml = `---
name: ${name}
description: ${description}
version: ${version}
library: ${library}
docs_path: ${docsPath}
template: ${template}
last_updated: ${lastUpdated}
auto_activate: ${autoActivate}
activation_patterns:
${activationPatterns.map(pattern => `  - "${pattern}"`).join('\n')}
---`;

  return yaml;
}

/**
 * Format code example for markdown
 * @param {Object} example - Code example object
 * @param {boolean} includeContext - Include title/context
 * @returns {string} Formatted markdown
 */
export function formatCodeExample(example, includeContext = true) {
  let markdown = '';

  if (includeContext && example.title) {
    markdown += `**${example.title}**\n\n`;
  }

  markdown += `\`\`\`${example.language}\n${example.code}\n\`\`\`\n`;

  return markdown;
}

/**
 * Format a list of topics into markdown
 * @param {Array} topics - Topic list
 * @param {number} maxDepth - Maximum depth to display
 * @returns {string} Formatted markdown
 */
export function formatTopicList(topics, maxDepth = 2) {
  if (!topics || topics.length === 0) {
    return '';
  }

  let markdown = '';

  topics.forEach(topic => {
    if (topic.depth <= maxDepth) {
      const indent = '  '.repeat(topic.depth - 1);
      markdown += `${indent}- ${topic.title}\n`;
    }
  });

  return markdown;
}

/**
 * Format topic hierarchy into markdown
 * @param {Object} hierarchy - Topic hierarchy object
 * @param {number} maxTopics - Maximum main topics to display
 * @returns {string} Formatted markdown
 */
export function formatTopicHierarchy(hierarchy, maxTopics = 10) {
  if (!hierarchy || Object.keys(hierarchy).length === 0) {
    return '';
  }

  let markdown = '';
  const mainTopics = Object.values(hierarchy).slice(0, maxTopics);

  mainTopics.forEach(topic => {
    markdown += `- **${topic.title}**`;

    if (topic.subtopics && topic.subtopics.length > 0) {
      const subtopicNames = topic.subtopics.slice(0, 5).map(st => st.title);
      markdown += ` (${subtopicNames.join(', ')})`;
    }

    markdown += `\n`;
  });

  return markdown;
}

/**
 * Format API methods into markdown list
 * @param {Array} methods - API methods
 * @param {number} maxMethods - Maximum methods to display
 * @returns {string} Formatted markdown
 */
export function formatAPIMethodList(methods, maxMethods = 20) {
  if (!methods || methods.length === 0) {
    return '';
  }

  let markdown = '';
  const methodsToShow = methods.slice(0, maxMethods);

  methodsToShow.forEach(method => {
    markdown += `- \`${method.name}\``;

    if (method.category && method.category !== 'General') {
      markdown += ` - ${method.category}`;
    }

    markdown += `\n`;
  });

  if (methods.length > maxMethods) {
    markdown += `\n*...and ${methods.length - maxMethods} more*\n`;
  }

  return markdown;
}

/**
 * Format API methods by category
 * @param {Object} byCategory - Methods organized by category
 * @param {number} maxPerCategory - Max methods per category
 * @returns {string} Formatted markdown
 */
export function formatAPIMethodsByCategory(byCategory, maxPerCategory = 10) {
  if (!byCategory || Object.keys(byCategory).length === 0) {
    return '';
  }

  let markdown = '';

  Object.entries(byCategory).forEach(([category, methods]) => {
    if (methods.length === 0) return;

    markdown += `**${category}** (${methods.length})\n`;

    methods.slice(0, maxPerCategory).forEach(method => {
      markdown += `- \`${method.name}\`\n`;
    });

    if (methods.length > maxPerCategory) {
      markdown += `  *...and ${methods.length - maxPerCategory} more*\n`;
    }

    markdown += `\n`;
  });

  return markdown;
}

/**
 * Format keywords as tags
 * @param {Array} keywords - Keyword objects with term and score
 * @param {number} maxKeywords - Maximum keywords to display
 * @returns {string} Formatted markdown
 */
export function formatKeywords(keywords, maxKeywords = 20) {
  if (!keywords || keywords.length === 0) {
    return '';
  }

  const terms = keywords
    .slice(0, maxKeywords)
    .map(kw => `\`${kw.term}\``)
    .join(', ');

  return terms;
}

/**
 * Format code examples by category
 * @param {Object} categories - Categories object from analysis
 * @param {number} maxCategories - Max categories to show
 * @param {number} examplesPerCategory - Max examples per category
 * @returns {string} Formatted markdown
 */
export function formatCodeExamplesByCategory(categories, maxCategories = 5, examplesPerCategory = 2) {
  if (!categories || Object.keys(categories).length === 0) {
    return '';
  }

  let markdown = '';

  // Sort categories by count
  const sortedCategories = Object.entries(categories)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, maxCategories);

  sortedCategories.forEach(([category, data]) => {
    markdown += `### ${category}\n\n`;
    markdown += `*${data.count} examples in ${data.languages.join(', ')}*\n\n`;

    data.examples.slice(0, examplesPerCategory).forEach(example => {
      markdown += formatCodeExample(example, true);
      markdown += `\n`;
    });
  });

  return markdown;
}

/**
 * Format hierarchy sections
 * @param {Array} sections - Section array from hierarchy
 * @param {number} maxSections - Maximum sections to show
 * @returns {string} Formatted markdown
 */
export function formatHierarchySections(sections, maxSections = 10) {
  if (!sections || sections.length === 0) {
    return '';
  }

  let markdown = '';

  sections.slice(0, maxSections).forEach(section => {
    markdown += `- **${section.title}** (${section.pageCount} pages)\n`;

    if (section.subsections && section.subsections.length > 0) {
      section.subsections.slice(0, 3).forEach(subsection => {
        markdown += `  - ${subsection.title} (${subsection.pageCount} pages)\n`;
      });

      if (section.subsections.length > 3) {
        markdown += `  - *...and ${section.subsections.length - 3} more*\n`;
      }
    }
  });

  return markdown;
}

/**
 * Create a statistics summary
 * @param {Object} analysis - Analysis results
 * @returns {string} Formatted statistics
 */
export function formatStatistics(analysis) {
  const { summary } = analysis;

  let markdown = '';
  markdown += `- **Total Pages**: ${summary.totalPages}\n`;
  markdown += `- **Topics**: ${summary.topicCount} (${summary.mainTopicCount} main sections)\n`;
  markdown += `- **Code Examples**: ${summary.codeExampleCount} in ${summary.languageCount} languages\n`;
  markdown += `- **API Methods**: ${summary.apiMethodCount} unique methods\n`;
  markdown += `- **Keywords**: ${summary.keywordCount} unique terms\n`;
  markdown += `- **Max Hierarchy Depth**: ${summary.maxDepth} levels\n`;

  return markdown;
}

/**
 * Generate skill name
 * @param {string} library - Library name
 * @param {string} version - Version string
 * @param {string} template - Template name
 * @returns {string} Skill name
 */
export function generateSkillName(library, version, template) {
  const majorVersion = version.split('.')[0];
  return `${library}-${majorVersion}-${template}`;
}

/**
 * Truncate text to maximum length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncate(text, maxLength = 100) {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
}

/**
 * Pluralize a word based on count
 * @param {number} count - Count
 * @param {string} singular - Singular form
 * @param {string} plural - Plural form (optional, defaults to singular + 's')
 * @returns {string} Pluralized string
 */
export function pluralize(count, singular, plural = null) {
  if (count === 1) {
    return `${count} ${singular}`;
  }
  return `${count} ${plural || singular + 's'}`;
}
