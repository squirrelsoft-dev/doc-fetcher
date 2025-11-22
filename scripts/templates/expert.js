/**
 * Expert template - Comprehensive knowledge with full topic coverage
 * @module templates/expert
 */

import {
  generateFrontmatter,
  generateSkillName,
  formatTopicHierarchy,
  formatAPIMethodsByCategory,
  formatCodeExamplesByCategory,
  formatKeywords,
  formatStatistics,
  pluralize,
  formatDocumentationIndex,
  formatFeaturedCodeExamples,
  formatAPIQuickReference,
  formatCompactDocIndex
} from './template-base.js';

/**
 * Generate expert template skill content
 * @param {Object} params - Template parameters
 * @param {string} params.library - Library name
 * @param {string} params.version - Library version
 * @param {string} params.docsPath - Path to cached docs
 * @param {Object} params.analysis - Analysis results
 * @param {Array} params.activationPatterns - Activation patterns
 * @param {Array} params.sitemap - Sitemap pages array
 * @returns {string} Complete skill content
 */
export function generateExpertTemplate(params) {
  const { library, version, docsPath, analysis, activationPatterns, sitemap = [] } = params;

  const skillName = generateSkillName(library, version, 'expert');
  const description = `Comprehensive expert knowledge of ${library} version ${version}`;

  // Generate frontmatter
  const frontmatter = generateFrontmatter({
    name: skillName,
    description,
    version,
    library,
    docsPath,
    template: 'expert',
    activationPatterns,
    autoActivate: true
  });

  // Build content sections
  const content = `
# ${library} ${version} Expert

I am an expert on ${library} version ${version}, with comprehensive knowledge extracted from the official documentation. I have deep understanding of all APIs, patterns, and best practices.

**IMPORTANT**: When I need detailed information about a specific topic, I should read the cached documentation files directly from \`${docsPath}/pages/\`.

## Documentation Coverage

${formatStatistics(analysis)}

## How to Use This Skill

When answering questions about ${library}:

1. **Check the Documentation Index** below to find the relevant doc file
2. **Read the cached file** using the Read tool: \`${docsPath}/pages/[filename]\`
3. **Provide accurate, version-specific answers** based on the documentation

## Documentation Reference Index

This index maps topics to their local cached files. Use this to find and read specific documentation.

${formatCompactDocIndex(sitemap, docsPath, 100)}

## Featured Code Examples

These are key examples extracted from the documentation:

${formatFeaturedCodeExamples(analysis.codeExamples?.examples || [], 12)}

## API Quick Reference

${formatAPIQuickReference(analysis.apiMethods, analysis.codeExamples?.examples || [])}

## Main Topics

I have comprehensive knowledge of the following areas:

${formatTopicHierarchy(analysis.topics?.hierarchy || {}, 15)}

${analysis.keywords && analysis.keywords.topKeywords.length > 0 ? `
## Key Concepts

Important concepts and features I can help with:

${formatKeywords(analysis.keywords.topKeywords, 30)}
` : ''}

## How I Can Help

### Expert Consultation

- **Complete API Reference**: I can explain any function, method, or API in detail
- **Architecture Guidance**: Help design solutions using ${library} best practices
- **Code Review**: Review ${library} code for correctness and optimization
- **Debugging**: Help troubleshoot issues and explain error messages
- **Performance**: Advise on performance optimization techniques

### Implementation Support

- **Code Generation**: Write production-ready code using ${library}
- **Integration**: Help integrate ${library} into your project
- **Configuration**: Guide proper setup and configuration
- **Testing**: Assist with writing tests for ${library} code
- **Migration**: Help migrate from older versions or other libraries

## Usage Guidelines

### When to Use Me

Activate this skill when:

${activationPatterns.slice(0, 10).map(pattern => `- Working with ${pattern}`).join('\n')}
- Implementing features using ${library}
- Debugging ${library}-related issues
- Optimizing ${library} code

### What to Ask

**Good questions:**
- "How do I [specific task] using ${library}?"
- "What's the best way to [use case] with ${library}?"
- "Why is my [feature] not working?"
- "What are the performance implications of [approach]?"

**Code requests:**
- "Show me an example of [feature]"
- "Help me implement [use case]"
- "Review this ${library} code: [code]"

## Documentation Source

This skill is generated from the official ${library} documentation:

- **Version**: ${version}
- **Source Type**: ${analysis.summary.sourceType}
- **Framework**: ${analysis.summary.framework}
- **Total Pages**: ${analysis.summary.totalPages}
- **Last Updated**: ${new Date().toISOString().split('T')[0]}
- **Docs Path**: \`${docsPath}\`

## Limitations

- Knowledge is specific to version ${version} - features from other versions may differ
- Based on official documentation as of the fetch date
- Cannot access external resources or live API endpoints
- Code examples are illustrative and may need adaptation to your specific use case

---

*This skill was automatically generated by the doc-fetcher plugin with comprehensive content analysis.*
`;

  return frontmatter + '\n\n' + content.trim() + '\n';
}
