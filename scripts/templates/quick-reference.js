/**
 * Quick Reference template - Condensed cheat-sheet style documentation
 * Focuses on top 20% most-used features for fast lookups
 * @module templates/quick-reference
 */

import {
  generateFrontmatter,
  generateSkillName,
  formatAPIMethodList,
  formatCodeExample,
  formatKeywords,
  pluralize
} from './template-base.js';

/**
 * Generate quick-reference template skill content
 * @param {Object} params - Template parameters
 * @param {string} params.library - Library name
 * @param {string} params.version - Library version
 * @param {string} params.docsPath - Path to cached docs
 * @param {Object} params.analysis - Analysis results
 * @param {Array} params.activationPatterns - Activation patterns
 * @returns {string} Complete skill content
 */
export function generateQuickReferenceTemplate(params) {
  const { library, version, docsPath, analysis, activationPatterns } = params;

  const skillName = generateSkillName(library, version, 'quick-reference');
  const description = `Quick reference guide for ${library} v${version} - top features and common patterns`;

  // Generate frontmatter
  const frontmatter = generateFrontmatter({
    name: skillName,
    description,
    version,
    library,
    docsPath,
    template: 'quick-reference',
    activationPatterns,
    autoActivate: true
  });

  // Extract top categories
  const topCodeCategories = analysis.codeExamples?.categories
    ? Object.entries(analysis.codeExamples.categories)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 8)
    : [];

  // Get most common API methods
  const topAPIMethods = [];
  if (analysis.apiMethods?.byCategory) {
    Object.values(analysis.apiMethods.byCategory).forEach(methods => {
      topAPIMethods.push(...methods);
    });
  }
  topAPIMethods.sort((a, b) => (b.count || 0) - (a.count || 0));

  const content = `
# ${library} Quick Reference

Fast lookup guide for ${library} v${version}. This skill provides condensed information about the most commonly used features.

## 🎯 Top Features

${analysis.keywords?.mostFrequent ? analysis.keywords.mostFrequent.slice(0, 15).map(kw =>
  `- **${kw.term}** (${kw.count} mentions)`
).join('\n') : 'Analyzing top features...'}

## ⚡ Common API Methods

${analysis.apiMethods && analysis.apiMethods.byCategory ? `
${Object.entries(analysis.apiMethods.byCategory)
  .filter(([_, methods]) => methods.length > 0)
  .map(([category, methods]) => {
    if (methods.length === 0) return '';
    const topMethods = methods.slice(0, 5);
    return `### ${category}\n\n${formatAPIMethodList(topMethods, 5)}\n`;
  })
  .join('\n')}
` : 'No API methods detected'}

## 📝 Common Code Patterns

${topCodeCategories.length > 0 ? topCodeCategories.map(([category, data]) => {
  const examples = data.examples.slice(0, 1); // Just one example per category
  return `
### ${category}

*${data.count} examples available*

${examples.map(ex => formatCodeExample(ex, false)).join('\n')}
`;
}).join('\n') : 'No code examples available'}

## 🔑 Essential Concepts

Quick overview of key concepts:

${analysis.topics?.mainTopics ? analysis.topics.mainTopics.slice(0, 10).map(topic =>
  `- **${topic}**`
).join('\n') : 'Loading topics...'}

## 💡 When to Use This Skill

This quick reference is optimized for:

- **Fast lookups** - Get syntax and examples quickly
- **Common tasks** - Focus on frequently used features
- **Code snippets** - Ready-to-use code patterns
- **API reminders** - Quick method signatures

For comprehensive coverage, use the \`${generateSkillName(library, version, 'expert')}\` skill instead.

## 🎨 Use Cases

${topCodeCategories.slice(0, 5).map(([category]) =>
  `- ${category}`
).join('\n')}

## 📚 Documentation Stats

- **Version**: ${version}
- **Total Pages**: ${analysis.summary?.totalPages || 0}
- **Code Examples**: ${analysis.summary?.codeExampleCount || 0}
- **API Methods**: ${analysis.summary?.apiMethodCount || 0}

---

*Quick reference generated from ${analysis.summary?.totalPages || 0} pages of documentation. For detailed explanations, ask follow-up questions.*
`;

  return frontmatter + '\n\n' + content.trim() + '\n';
}
