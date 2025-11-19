/**
 * Troubleshooter template - Error resolution and debugging assistance
 * Focuses on common issues, errors, and debugging strategies
 * @module templates/troubleshooter
 */

import {
  generateFrontmatter,
  generateSkillName,
  formatCodeExample,
  pluralize
} from './template-base.js';

/**
 * Extract troubleshooting-related content from analysis
 * @param {Object} analysis - Analysis results
 * @returns {Object} Troubleshooting content
 */
function extractTroubleshootingContent(analysis) {
  const troubleshooting = {
    errorExamples: [],
    debuggingTopics: [],
    configurationIssues: [],
    commonIssues: []
  };

  // Look for troubleshooting-related topics
  if (analysis.topics?.topics) {
    const errorKeywords = ['error', 'debug', 'troubleshoot', 'issue', 'problem', 'fix', 'warning'];
    troubleshooting.debuggingTopics = analysis.topics.topics.filter(topic =>
      errorKeywords.some(keyword => topic.title.toLowerCase().includes(keyword))
    );
  }

  // Find troubleshooting code examples
  if (analysis.codeExamples?.categories) {
    troubleshooting.errorExamples = analysis.codeExamples.categories['Troubleshooting']?.examples || [];
    troubleshooting.configurationIssues = analysis.codeExamples.categories['Configuration']?.examples || [];
  }

  // Extract error-related keywords
  if (analysis.keywords?.topKeywords) {
    const errorKeywords = analysis.keywords.topKeywords.filter(kw =>
      kw.term.includes('error') || kw.term.includes('warning') || kw.term.includes('debug')
    );
    troubleshooting.errorKeywords = errorKeywords;
  }

  return troubleshooting;
}

/**
 * Generate troubleshooter template skill content
 * @param {Object} params - Template parameters
 * @param {string} params.library - Library name
 * @param {string} params.version - Library version
 * @param {string} params.docsPath - Path to cached docs
 * @param {Object} params.analysis - Analysis results
 * @param {Array} params.activationPatterns - Activation patterns
 * @returns {string} Complete skill content
 */
export function generateTroubleshooterTemplate(params) {
  const { library, version, docsPath, analysis, activationPatterns } = params;

  const skillName = generateSkillName(library, version, 'troubleshooter');
  const description = `Troubleshooting and debugging assistant for ${library} v${version}`;

  const troubleshooting = extractTroubleshootingContent(analysis);

  // Generate frontmatter with debugging-specific patterns
  const frontmatter = generateFrontmatter({
    name: skillName,
    description,
    version,
    library,
    docsPath,
    template: 'troubleshooter',
    activationPatterns: [
      ...activationPatterns.slice(0, 5),
      'error',
      'debug',
      'troubleshoot',
      'not working',
      'bug',
      'issue',
      'fix'
    ],
    autoActivate: true
  });

  const content = `
# ${library} Troubleshooter

I specialize in helping you debug and resolve issues with ${library} version ${version}. I can help diagnose problems, explain error messages, and suggest solutions.

## 🔍 What I Can Help With

### Error Diagnosis
- Interpret error messages and stack traces
- Identify root causes of common issues
- Explain why something isn't working
- Suggest debugging approaches

### Common Problems
- Configuration issues
- Integration problems
- Performance bottlenecks
- Unexpected behavior
- Build/compile errors

### Debugging Strategies
- Step-by-step debugging guidance
- Logging and inspection techniques
- Isolation of problem areas
- Test case creation

## 🐛 Common Issues & Solutions

${troubleshooting.debuggingTopics.length > 0 ? `
### Documentation Coverage

The documentation includes ${pluralize(troubleshooting.debuggingTopics.length, 'troubleshooting topic', 'troubleshooting topics')}:

${troubleshooting.debuggingTopics.slice(0, 10).map(topic =>
  `- **${topic.title}** (${topic.source})`
).join('\n')}
` : ''}

${troubleshooting.errorExamples.length > 0 ? `
### Example Solutions

${troubleshooting.errorExamples.slice(0, 3).map(example =>
  formatCodeExample(example, true)
).join('\n')}
` : ''}

${troubleshooting.configurationIssues.length > 0 ? `
### Configuration Issues

Common configuration problems addressed in the documentation:

${troubleshooting.configurationIssues.slice(0, 3).map(example =>
  formatCodeExample(example, true)
).join('\n')}
` : ''}

## 🔧 Debugging Workflow

### 1. Identify the Problem

When you encounter an issue:
- **Describe the error**: Share the exact error message or unexpected behavior
- **Provide context**: What were you trying to do?
- **Share code**: Relevant code snippets help diagnosis
- **Environment**: ${library} version, runtime environment, dependencies

### 2. Diagnostic Questions I'll Ask

- What is the exact error message?
- When does the error occur?
- What have you tried so far?
- Does it work in a minimal example?
- Are there any warnings in the console?

### 3. Solution Approach

- **Explain** the root cause
- **Provide** step-by-step fix
- **Show** corrected code examples
- **Suggest** preventive measures
- **Link** to relevant documentation

## 💡 How to Get Help

### Effective Problem Descriptions

**Good examples:**
- "I'm getting 'Cannot read property X of undefined' when calling [method]"
- "My ${library} app builds but shows a blank screen"
- "[Feature] works in development but fails in production"
- "Getting a type error: [specific error message]"

**Include this information:**
- Error message (full stack trace if available)
- Your code (minimal reproducible example)
- What you expected vs. what happened
- ${library} version: ${version}

### Common Error Patterns

${analysis.keywords?.topKeywords ? `
Based on documentation analysis, common areas where issues occur:

${analysis.keywords.topKeywords
  .filter(kw => kw.term.length > 4)
  .slice(0, 15)
  .map(kw => `- \`${kw.term}\``)
  .join('\n')}
` : ''}

## 🎯 Quick Fixes

### Performance Issues

${analysis.topics?.topics
  ?.filter(t => t.title.toLowerCase().includes('performance') || t.title.toLowerCase().includes('optimization'))
  .slice(0, 3)
  .map(topic => `- See documentation: **${topic.title}**`)
  .join('\n') || '- Ask me about performance optimization strategies'}

### Type Errors

If you're getting TypeScript/type errors:
- Verify your type definitions are installed
- Check if you're using the correct version
- Ensure imports match the ${library} v${version} API

### Build/Configuration Errors

Common configuration problems:
- Check your configuration file syntax
- Verify all required dependencies are installed
- Ensure version compatibility
- Review environment-specific settings

## 📊 Documentation Resources

This troubleshooter draws from:

- **${analysis.summary?.totalPages || 0}** documentation pages
- **${analysis.summary?.codeExampleCount || 0}** code examples
- **${analysis.summary?.apiMethodCount || 0}** API methods
- **${troubleshooting.debuggingTopics.length}** troubleshooting topics

## 🚀 Escalation

If I can't resolve your issue:

1. **Check official changelog** for known issues in ${version}
2. **Search GitHub issues** for similar problems
3. **Create minimal reproduction** to share with community
4. **Consult expert skill**: \`${generateSkillName(library, version, 'expert')}\` for comprehensive API help

## 📖 Related Skills

- **Expert**: For comprehensive ${library} knowledge
- **Best Practices**: To avoid common mistakes
- **Quick Reference**: For API syntax lookups

---

*Troubleshooter based on ${analysis.summary?.totalPages || 0} pages of documentation. Report your issues with specific error messages for best results.*
`;

  return frontmatter + '\n\n' + content.trim() + '\n';
}
