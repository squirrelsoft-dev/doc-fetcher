/**
 * Migration Guide template - Version upgrade assistance with breaking changes
 * Compares current version with previous cached versions
 * @module templates/migration-guide
 */

import {
  generateFrontmatter,
  generateSkillName,
  formatKeywords,
  formatCodeExample,
  pluralize
} from './template-base.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * Find available versions for comparison
 * @param {string} library - Library name
 * @param {string} currentVersion - Current version
 * @returns {Promise<Array>} Available previous versions
 */
async function findPreviousVersions(library, currentVersion) {
  const docsBaseDir = path.join(process.cwd(), '.claude/docs', library);

  try {
    const versions = await fs.readdir(docsBaseDir);
    return versions
      .filter(v => v !== currentVersion && v !== '.DS_Store')
      .sort((a, b) => {
        // Simple version comparison
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aVal = aParts[i] || 0;
          const bVal = bParts[i] || 0;
          if (aVal !== bVal) return bVal - aVal; // Descending
        }
        return 0;
      });
  } catch (error) {
    return [];
  }
}

/**
 * Compare keywords between versions to find new/changed concepts
 * @param {Object} currentAnalysis - Current version analysis
 * @param {Object} previousAnalysis - Previous version analysis (if available)
 * @returns {Object} Comparison results
 */
function compareVersions(currentAnalysis, previousAnalysis) {
  const comparison = {
    hasComparison: !!previousAnalysis,
    newKeywords: [],
    removedKeywords: [],
    newAPIMethods: [],
    removedAPIMethods: [],
    newTopics: [],
    topicChanges: 0,
    apiChanges: 0
  };

  if (!previousAnalysis) {
    return comparison;
  }

  // Compare keywords
  const currentKeywords = new Set(currentAnalysis.keywords?.topKeywords.map(k => k.term) || []);
  const previousKeywords = new Set(previousAnalysis.keywords?.topKeywords.map(k => k.term) || []);

  comparison.newKeywords = Array.from(currentKeywords).filter(k => !previousKeywords.has(k)).slice(0, 10);
  comparison.removedKeywords = Array.from(previousKeywords).filter(k => !currentKeywords.has(k)).slice(0, 5);

  // Compare API methods
  const currentMethods = new Set(currentAnalysis.apiMethods?.methods.map(m => m.name) || []);
  const previousMethods = new Set(previousAnalysis.apiMethods?.methods.map(m => m.name) || []);

  comparison.newAPIMethods = Array.from(currentMethods).filter(m => !previousMethods.has(m)).slice(0, 15);
  comparison.removedAPIMethods = Array.from(previousMethods).filter(m => !currentMethods.has(m)).slice(0, 10);
  comparison.apiChanges = comparison.newAPIMethods.length + comparison.removedAPIMethods.length;

  // Compare topics
  const currentTopics = new Set(currentAnalysis.topics?.mainTopics || []);
  const previousTopics = new Set(previousAnalysis.topics?.mainTopics || []);

  comparison.newTopics = Array.from(currentTopics).filter(t => !previousTopics.has(t)).slice(0, 10);
  comparison.topicChanges = Array.from(currentTopics).filter(t => !previousTopics.has(t)).length;

  return comparison;
}

/**
 * Generate migration-guide template skill content
 * @param {Object} params - Template parameters
 * @param {string} params.library - Library name
 * @param {string} params.version - Library version
 * @param {string} params.docsPath - Path to cached docs
 * @param {Object} params.analysis - Analysis results
 * @param {Array} params.activationPatterns - Activation patterns
 * @param {Object} params.previousAnalysis - Previous version analysis (optional)
 * @param {string} params.previousVersion - Previous version string (optional)
 * @returns {string} Complete skill content
 */
export async function generateMigrationGuideTemplate(params) {
  const { library, version, docsPath, analysis, activationPatterns, previousAnalysis = null, previousVersion = null } = params;

  const skillName = generateSkillName(library, version, 'migration-guide');
  const description = `Migration guide for upgrading to ${library} v${version}`;

  // Find previous versions if not provided
  const previousVersions = await findPreviousVersions(library, version);
  const fromVersion = previousVersion || previousVersions[0] || 'previous version';

  // Compare versions if we have previous analysis
  const comparison = compareVersions(analysis, previousAnalysis);

  // Generate frontmatter
  const frontmatter = generateFrontmatter({
    name: skillName,
    description,
    version,
    library,
    docsPath,
    template: 'migration-guide',
    activationPatterns: [...activationPatterns, 'upgrade', 'migrate', 'migration', 'breaking changes'],
    autoActivate: true
  });

  const content = `
# ${library} Migration Guide: ${fromVersion} → ${version}

This skill helps you upgrade to ${library} version ${version}${comparison.hasComparison ? ` from ${fromVersion}` : ''}.

${comparison.hasComparison ? `
## 🔄 Version Comparison

Comparing ${fromVersion} → ${version}:

- **API Changes**: ${comparison.apiChanges} method additions/removals
- **New Topics**: ${comparison.newTopics.length} new documentation sections
- **New Keywords**: ${comparison.newKeywords.length} new concepts introduced

## ✨ What's New

### New Features & APIs

${comparison.newAPIMethods.length > 0 ? `
The following ${pluralize(comparison.newAPIMethods.length, 'API', 'APIs')} ${comparison.newAPIMethods.length === 1 ? 'was' : 'were'} added in v${version}:

${comparison.newAPIMethods.map(method => `- \`${method}\``).join('\n')}
` : 'No new APIs detected in documentation comparison.'}

### New Documentation Sections

${comparison.newTopics.length > 0 ? `
${comparison.newTopics.map(topic => `- **${topic}**`).join('\n')}
` : 'Documentation structure remains similar.'}

### New Concepts

${comparison.newKeywords.length > 0 ? `
Key new concepts introduced in ${version}:

${formatKeywords(comparison.newKeywords.map(term => ({ term })), 20)}
` : 'No major new concepts detected.'}

${comparison.removedAPIMethods.length > 0 ? `
## ⚠️ Breaking Changes

### Removed or Deprecated APIs

The following ${pluralize(comparison.removedAPIMethods.length, 'API', 'APIs')} may no longer be available:

${comparison.removedAPIMethods.map(method => `- \`${method}\``).join('\n')}

**Action Required**: Review your code for usage of these APIs and update to the new equivalents.
` : ''}

${comparison.removedKeywords.length > 0 ? `
### Removed Concepts

These concepts appear less prominently or may be deprecated:

${formatKeywords(comparison.removedKeywords.map(term => ({ term })), 10)}
` : ''}
` : `
## 📋 Upgrade Information

${previousVersions.length > 0 ? `
Other cached versions available for comparison:
${previousVersions.slice(0, 5).map(v => `- ${library} ${v}`).join('\n')}

To generate a detailed comparison, fetch the previous version and regenerate this migration guide.
` : `
No previous versions are cached. To enable version comparison:
1. Fetch a previous version: \`/fetch-docs ${library} ${fromVersion}\`
2. Regenerate this skill: \`/generate-doc-skill ${library} --template migration-guide\`
`}
`}

## 📚 Current Version Overview

Version ${version} includes:

- **${analysis.summary?.topicCount || 0}** documented topics
- **${analysis.summary?.codeExampleCount || 0}** code examples
- **${analysis.summary?.apiMethodCount || 0}** API methods

### Main Topics in ${version}

${analysis.topics?.mainTopics ? analysis.topics.mainTopics.slice(0, 12).map(topic =>
  `- ${topic}`
).join('\n') : ''}

## 🔧 Migration Checklist

${comparison.hasComparison ? `
### Step-by-Step Upgrade

1. **Review Breaking Changes**
   - [ ] Check for deprecated APIs in your codebase
   - [ ] Review the ${comparison.removedAPIMethods.length} removed method${comparison.removedAPIMethods.length === 1 ? '' : 's'}
   - [ ] Update import statements if package structure changed

2. **Update Dependencies**
   - [ ] Update package.json to version ${version}
   - [ ] Run installation (\`npm install\` or \`yarn install\`)
   - [ ] Clear caches if needed

3. **Adopt New Features**
   - [ ] Review ${comparison.newAPIMethods.length} new API${comparison.newAPIMethods.length === 1 ? '' : 's'}
   - [ ] Consider migrating to new patterns
   - [ ] Update documentation and comments

4. **Test Thoroughly**
   - [ ] Run existing test suite
   - [ ] Test new features
   - [ ] Check for runtime warnings
   - [ ] Performance regression testing

5. **Update Code**
   - [ ] Refactor deprecated patterns
   - [ ] Adopt new best practices
   - [ ] Update error handling if needed
` : `
### General Upgrade Steps

1. **Backup & Prepare**
   - [ ] Commit all changes
   - [ ] Create a new branch for migration
   - [ ] Document current state

2. **Update Dependencies**
   - [ ] Update to version ${version}
   - [ ] Install new dependencies
   - [ ] Clear caches

3. **Review Documentation**
   - [ ] Read changelog
   - [ ] Review breaking changes
   - [ ] Check migration guides

4. **Test & Validate**
   - [ ] Run test suite
   - [ ] Manual testing
   - [ ] Performance checks

5. **Deploy**
   - [ ] Staged rollout
   - [ ] Monitor for issues
   - [ ] Update documentation
`}

## 💡 How to Use This Skill

Ask me about:

- "What changed in ${version}?"
- "How do I migrate from [feature] to [new feature]?"
- "What are the breaking changes?"
- "Show me examples of new features"
- "Help me update my code for ${version}"

## 📖 Documentation Source

- **Current Version**: ${version}
- **Documentation Pages**: ${analysis.summary?.totalPages || 0}
- **Last Updated**: ${new Date().toISOString().split('T')[0]}
${comparison.hasComparison ? `- **Compared With**: ${fromVersion}` : ''}

---

*Migration guide generated${comparison.hasComparison ? ' with version comparison analysis' : ''}. For more detailed upgrade guidance, consult the official changelog.*
`;

  return frontmatter + '\n\n' + content.trim() + '\n';
}
