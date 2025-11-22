/**
 * Best Practices template - Recommended patterns and anti-patterns
 * Focuses on security, performance, and code quality
 * @module templates/best-practices
 */

import {
  generateFrontmatter,
  generateSkillName,
  formatCodeExample,
  formatKeywords,
  pluralize,
  formatCompactDocIndex,
  formatFeaturedCodeExamples
} from './template-base.js';

/**
 * Extract best practices content from analysis
 * @param {Object} analysis - Analysis results
 * @returns {Object} Best practices content
 */
function extractBestPracticesContent(analysis) {
  const practices = {
    performanceTopics: [],
    securityTopics: [],
    testingTopics: [],
    patternTopics: [],
    recommendedExamples: [],
    optimizationExamples: []
  };

  // Look for best practices topics
  if (analysis.topics?.topics) {
    const performanceKeywords = ['performance', 'optimization', 'optimize', 'fast', 'efficient'];
    const securityKeywords = ['security', 'authentication', 'authorization', 'secure', 'safety'];
    const testingKeywords = ['test', 'testing', 'spec', 'jest', 'unit', 'integration'];
    const patternKeywords = ['pattern', 'practice', 'guideline', 'recommendation', 'style'];

    practices.performanceTopics = analysis.topics.topics.filter(topic =>
      performanceKeywords.some(kw => topic.title.toLowerCase().includes(kw))
    );

    practices.securityTopics = analysis.topics.topics.filter(topic =>
      securityKeywords.some(kw => topic.title.toLowerCase().includes(kw))
    );

    practices.testingTopics = analysis.topics.topics.filter(topic =>
      testingKeywords.some(kw => topic.title.toLowerCase().includes(kw))
    );

    practices.patternTopics = analysis.topics.topics.filter(topic =>
      patternKeywords.some(kw => topic.title.toLowerCase().includes(kw))
    );
  }

  // Extract usage examples and best practice code
  if (analysis.codeExamples?.categories) {
    practices.recommendedExamples = analysis.codeExamples.categories['Usage Example']?.examples || [];
    practices.testingExamples = analysis.codeExamples.categories['Testing']?.examples || [];
  }

  return practices;
}

/**
 * Generate best-practices template skill content
 * @param {Object} params - Template parameters
 * @param {string} params.library - Library name
 * @param {string} params.version - Library version
 * @param {string} params.docsPath - Path to cached docs
 * @param {Object} params.analysis - Analysis results
 * @param {Array} params.activationPatterns - Activation patterns
 * @param {Array} params.sitemap - Sitemap pages array
 * @returns {string} Complete skill content
 */
export function generateBestPracticesTemplate(params) {
  const { library, version, docsPath, analysis, activationPatterns, sitemap = [] } = params;

  const skillName = generateSkillName(library, version, 'best-practices');
  const description = `Best practices and recommended patterns for ${library} v${version}`;

  const practices = extractBestPracticesContent(analysis);

  // Generate frontmatter with best-practice specific patterns
  const frontmatter = generateFrontmatter({
    name: skillName,
    description,
    version,
    library,
    docsPath,
    template: 'best-practices',
    activationPatterns: [
      ...activationPatterns.slice(0, 5),
      'best practice',
      'pattern',
      'recommendation',
      'should I',
      'how to properly',
      'correct way'
    ],
    autoActivate: true
  });

  // Get best practice code examples
  const bestPracticeExamples = (analysis.codeExamples?.examples || [])
    .filter(ex => ex.category === 'Usage Example' || ex.category === 'Configuration');

  const content = `
# ${library} Best Practices

I help you write high-quality ${library} code following recommended patterns, performance optimizations, and security guidelines for version ${version}.

**IMPORTANT**: When I need detailed information about a specific topic, I should read the cached documentation files directly from \`${docsPath}/pages/\`.

## How to Use This Skill

When answering best practices questions about ${library}:

1. **Check the Documentation Index** below to find relevant doc files
2. **Read the cached file** using the Read tool: \`${docsPath}/pages/[filename]\`
3. **Provide accurate best practices guidance** based on the documentation

## Documentation Reference

${formatCompactDocIndex(sitemap, docsPath, 40)}

## Featured Code Examples

These examples demonstrate recommended patterns:

${formatFeaturedCodeExamples(bestPracticeExamples, 8)}

## 🎯 Purpose

This skill provides:

- **Recommended Patterns**: Proven approaches for common tasks
- **Anti-Patterns**: What to avoid and why
- **Performance Tips**: Write efficient ${library} code
- **Security Guidelines**: Secure coding practices
- **Code Quality**: Maintainable and scalable code

## 📚 Best Practices Coverage

${practices.performanceTopics.length > 0 ? `
### Performance & Optimization (${practices.performanceTopics.length} topics)

${practices.performanceTopics.slice(0, 8).map(topic =>
  `- **${topic.title}**`
).join('\n')}
` : ''}

${practices.securityTopics.length > 0 ? `
### Security & Safety (${practices.securityTopics.length} topics)

${practices.securityTopics.slice(0, 8).map(topic =>
  `- **${topic.title}**`
).join('\n')}
` : ''}

${practices.testingTopics.length > 0 ? `
### Testing (${practices.testingTopics.length} topics)

${practices.testingTopics.slice(0, 8).map(topic =>
  `- **${topic.title}**`
).join('\n')}
` : ''}

${practices.patternTopics.length > 0 ? `
### Patterns & Guidelines (${practices.patternTopics.length} topics)

${practices.patternTopics.slice(0, 8).map(topic =>
  `- **${topic.title}**`
).join('\n')}
` : ''}

## ✅ Recommended Patterns

${practices.recommendedExamples.length > 0 ? `
### Usage Examples from Documentation

${practices.recommendedExamples.slice(0, 3).map(example =>
  formatCodeExample(example, true)
).join('\n')}
` : `
### General Recommendations

Based on the documentation structure and content, I can guide you on:

${analysis.topics?.mainTopics ? analysis.topics.mainTopics.slice(0, 8).map(topic =>
  `- Best practices for ${topic.toLowerCase()}`
).join('\n') : '- Core ${library} patterns and practices'}
`}

## 🚀 Performance Best Practices

### General Guidelines

When working with ${library} v${version}:

1. **Follow Official Patterns**: The documented approaches are optimized
2. **Leverage Built-in Features**: Don't reinvent what ${library} provides
3. **Monitor Performance**: Profile and measure before optimizing
4. **Cache Wisely**: Use caching strategies appropriate to your use case

${practices.performanceTopics.length > 0 ? `
### Specific Performance Topics

${practices.performanceTopics.slice(0, 5).map(topic =>
  `- **${topic.title}**: Covered in ${topic.source}`
).join('\n')}
` : ''}

### Performance Checklist

- [ ] Use production builds/modes
- [ ] Minimize bundle/payload sizes
- [ ] Implement code splitting where appropriate
- [ ] Optimize data fetching patterns
- [ ] Profile performance bottlenecks
- [ ] Follow ${library}'s optimization guidelines

## 🔒 Security Best Practices

${practices.securityTopics.length > 0 ? `
### Security Coverage

The documentation covers these security-related topics:

${practices.securityTopics.slice(0, 6).map(topic =>
  `- **${topic.title}**`
).join('\n')}
` : `
### General Security Guidelines

- **Validate Input**: Always sanitize user input
- **Follow Authentication Patterns**: Use documented auth methods
- **Secure Configuration**: Don't expose secrets or sensitive data
- **Update Dependencies**: Keep ${library} and dependencies current
- **Review Security Advisories**: Check for known vulnerabilities
`}

### Security Checklist

- [ ] Implement proper authentication/authorization
- [ ] Sanitize and validate all user input
- [ ] Use HTTPS in production
- [ ] Secure sensitive data (credentials, tokens, keys)
- [ ] Follow principle of least privilege
- [ ] Keep ${library} updated to v${version} or later

## 🧪 Testing Best Practices

${practices.testingTopics.length > 0 ? `
### Testing Documentation

${practices.testingTopics.slice(0, 5).map(topic =>
  `- **${topic.title}**`
).join('\n')}
` : `
### Testing Recommendations

- **Unit Tests**: Test individual components/functions
- **Integration Tests**: Test feature interactions
- **E2E Tests**: Test complete user flows
- **Coverage**: Aim for meaningful coverage, not just high percentages
- **CI/CD**: Automate testing in your pipeline
`}

${practices.testingExamples && practices.testingExamples.length > 0 ? `
### Testing Examples

${practices.testingExamples.slice(0, 2).map(example =>
  formatCodeExample(example, true)
).join('\n')}
` : ''}

## ❌ Anti-Patterns to Avoid

### Common Mistakes

Based on ${library} documentation and best practices:

1. **Ignoring Documentation**: Don't guess—read the docs for ${version}
2. **Premature Optimization**: Measure before optimizing
3. **Overengineering**: Use simple solutions when appropriate
4. **Ignoring Warnings**: ${library} warnings indicate real issues
5. **Outdated Patterns**: Some patterns from older versions may be deprecated

### Code Smells

Watch for these indicators of problematic code:

- Repeating code that ${library} provides built-in
- Fighting against ${library}'s design patterns
- Excessive complexity in simple tasks
- Bypassing ${library}'s safety mechanisms
- Ignoring TypeScript types or PropTypes

## 📋 Code Quality Guidelines

### Structure & Organization

- **Clear naming**: Use descriptive, intention-revealing names
- **Separation of concerns**: Keep logic organized
- **DRY principle**: Don't repeat yourself
- **SOLID principles**: Follow OOP best practices where applicable
- **Consistent style**: Follow ${library} conventions

### Documentation & Comments

- **Self-documenting code**: Code should be readable
- **Comments for "why"**: Not "what"
- **API documentation**: Document public interfaces
- **README**: Keep documentation current
- **Examples**: Provide usage examples

### Maintainability

- **Modular design**: Small, focused modules
- **Testable code**: Write code that's easy to test
- **Error handling**: Graceful error handling and recovery
- **Logging**: Appropriate logging for debugging
- **Version control**: Meaningful commit messages

## 💡 How to Use This Skill

### Ask About Best Practices

- "What's the best way to [task] in ${library}?"
- "Should I use [approach A] or [approach B]?"
- "Is there a better pattern for [use case]?"
- "Review this code for best practices"

### Code Review Requests

Share your code and ask:
- "Does this follow ${library} best practices?"
- "How can I improve this code?"
- "Are there any anti-patterns here?"

### Architecture Questions

- "How should I structure my ${library} project?"
- "What's the recommended approach for [feature]?"
- "How do I scale this ${library} application?"

## 📊 Documentation Basis

This best practices guide is informed by:

- **${analysis.summary?.totalPages || 0}** documentation pages
- **${analysis.summary?.codeExampleCount || 0}** code examples
- **${practices.performanceTopics.length}** performance topics
- **${practices.securityTopics.length}** security topics
- **${practices.testingTopics.length}** testing topics
- **${practices.patternTopics.length}** pattern/guideline topics

## 🔗 Related Skills

- **Expert** (\`${generateSkillName(library, version, 'expert')}\`): Comprehensive API knowledge
- **Troubleshooter** (\`${generateSkillName(library, version, 'troubleshooter')}\`): Debug issues
- **Quick Reference** (\`${generateSkillName(library, version, 'quick-reference')}\`): Fast API lookup

---

*Best practices compiled from ${library} v${version} official documentation. Always validate recommendations against your specific use case and requirements.*
`;

  return frontmatter + '\n\n' + content.trim() + '\n';
}
