/**
 * Tests for skill templates
 */

import { describe, it, expect } from '@jest/globals';
import { generateExpertTemplate } from '../scripts/templates/expert.js';
import { generateQuickReferenceTemplate } from '../scripts/templates/quick-reference.js';
import { generateMigrationGuideTemplate } from '../scripts/templates/migration-guide.js';
import { generateTroubleshooterTemplate } from '../scripts/templates/troubleshooter.js';
import { generateBestPracticesTemplate } from '../scripts/templates/best-practices.js';

// Mock analysis data
const mockAnalysis = {
  metadata: {
    library: 'testlib',
    version: '1.2.3',
    page_count: 100
  },
  topics: {
    topics: [
      { level: 1, title: 'Getting Started', source: 'intro.md' },
      { level: 1, title: 'API Reference', source: 'api.md' },
      { level: 2, title: 'Methods', source: 'api.md', parent: 'API Reference' }
    ],
    hierarchy: {
      'Getting Started': {
        title: 'Getting Started',
        level: 1,
        count: 1,
        subtopics: [],
        pages: ['intro.md']
      },
      'API Reference': {
        title: 'API Reference',
        level: 1,
        count: 1,
        subtopics: [
          { title: 'Methods', level: 2, count: 1, pages: ['api.md'] }
        ],
        pages: ['api.md']
      }
    },
    topicCount: 3,
    mainTopics: ['Getting Started', 'API Reference'],
    mainTopicCount: 2,
    subtopicCount: 1
  },
  codeExamples: {
    examples: [
      {
        language: 'javascript',
        category: 'Usage Example',
        title: 'Basic Usage',
        code: 'console.log("hello");',
        sourceFile: 'usage.md'
      }
    ],
    totalCount: 1,
    languages: {
      javascript: {
        count: 1,
        categories: ['Usage Example']
      }
    },
    categories: {
      'Usage Example': {
        count: 1,
        languages: ['javascript'],
        examples: [
          {
            title: 'Basic Usage',
            language: 'javascript',
            preview: 'console.log("hello");'
          }
        ]
      }
    },
    languageCount: 1,
    categoryCount: 1
  },
  apiMethods: {
    methods: [
      { name: 'getData', type: 'code', language: 'javascript', category: 'API Reference' },
      { name: 'useHook', type: 'heading', category: 'Hooks' }
    ],
    totalCount: 2,
    uniqueCount: 2,
    byCategory: {
      hooks: [{ name: 'useHook', context: 'React Hook' }],
      functions: [{ name: 'getData', context: 'API' }],
      classes: [],
      methods: [],
      components: [],
      utilities: [],
      other: []
    },
    byLanguage: {
      javascript: [{ name: 'getData' }]
    },
    categoryCount: 2
  },
  keywords: {
    keywords: [
      { term: 'server', score: 5.2 },
      { term: 'action', score: 4.8 },
      { term: 'component', score: 4.5 }
    ],
    topKeywords: [
      { term: 'server', score: 5.2 },
      { term: 'action', score: 4.8 },
      { term: 'component', score: 4.5 }
    ],
    mostFrequent: [
      { term: 'server', count: 10 },
      { term: 'action', count: 8 },
      { term: 'component', count: 7 }
    ],
    totalDocuments: 10,
    totalTokens: 500,
    uniqueTerms: 50
  },
  hierarchy: {
    tree: {},
    sections: [
      {
        path: 'getting-started',
        title: 'Getting Started',
        depth: 0,
        pageCount: 5,
        directPages: 2,
        hasChildren: true
      }
    ],
    stats: {
      maxDepth: 3,
      totalSections: 15,
      totalPages: 100,
      topLevelSections: 5
    },
    largestSections: [
      { path: 'api', title: 'API', pageCount: 30, depth: 0 }
    ],
    totalPages: 100
  },
  summary: {
    library: 'testlib',
    version: '1.2.3',
    totalPages: 100,
    sourceType: 'sitemap',
    framework: 'docusaurus',
    topicCount: 3,
    mainTopicCount: 2,
    codeExampleCount: 1,
    languageCount: 1,
    apiMethodCount: 2,
    keywordCount: 50,
    hierarchySections: 15,
    maxDepth: 3
  },
  analyzedAt: new Date().toISOString()
};

const templateParams = {
  library: 'testlib',
  version: '1.2.3',
  docsPath: '.claude/docs/testlib/1.2.3',
  analysis: mockAnalysis,
  activationPatterns: ['testlib', 'test library', 'server', 'action']
};

describe('Template Generation', () => {
  describe('Expert Template', () => {
    it('should generate valid expert template content', () => {
      const content = generateExpertTemplate(templateParams);

      // Check frontmatter
      expect(content).toContain('---');
      expect(content).toContain('name: testlib-1-expert');
      expect(content).toContain('description:');
      expect(content).toContain('version: 1.2.3');
      expect(content).toContain('library: testlib');
      expect(content).toContain('template: expert');
      expect(content).toContain('activation_patterns:');

      // Check content sections
      expect(content).toContain('# testlib 1.2.3 Expert');
      expect(content).toContain('Documentation Coverage');
      expect(content).toContain('What I Know');
      expect(content).toContain('Main Topics');
      expect(content).toContain('How I Can Help');
    });

    it('should include analysis statistics', () => {
      const content = generateExpertTemplate(templateParams);

      expect(content).toContain('**Total Pages**: 100');
      expect(content).toContain('**Topics**: 3');
      expect(content).toContain('**Code Examples**: 1');
      expect(content).toContain('**API Methods**: 2');
    });

    it('should include activation patterns', () => {
      const content = generateExpertTemplate(templateParams);

      expect(content).toContain('"testlib"');
      expect(content).toContain('"test library"');
      expect(content).toContain('"server"');
    });
  });

  describe('Quick Reference Template', () => {
    it('should generate valid quick-reference template content', () => {
      const content = generateQuickReferenceTemplate(templateParams);

      expect(content).toContain('name: testlib-1-quick-reference');
      expect(content).toContain('template: quick-reference');
      expect(content).toContain('# testlib Quick Reference');
      expect(content).toContain('Top Features');
      expect(content).toContain('Common API Methods');
    });

    it('should focus on condensed information', () => {
      const content = generateQuickReferenceTemplate(templateParams);

      expect(content).toContain('Fast lookup');
      expect(content).toContain('Quick reference');
      expect(content).toContain('condensed');
      // May reference comprehensive expert skill, but focuses on quick lookups
      expect(content).toContain('top features');
    });
  });

  describe('Migration Guide Template', () => {
    it('should generate valid migration-guide template content', async () => {
      const content = await generateMigrationGuideTemplate(templateParams);

      expect(content).toContain('name: testlib-1-migration-guide');
      expect(content).toContain('template: migration-guide');
      expect(content).toContain('Migration Guide');
      expect(content).toContain('upgrade');
    });

    it('should include version information', async () => {
      const content = await generateMigrationGuideTemplate(templateParams);

      expect(content).toContain('1.2.3');
      expect(content).toContain('Version');
    });

    it('should include upgrade checklist', async () => {
      const content = await generateMigrationGuideTemplate(templateParams);

      expect(content).toContain('Checklist');
      expect(content).toContain('[ ]'); // Checkbox
    });
  });

  describe('Troubleshooter Template', () => {
    it('should generate valid troubleshooter template content', () => {
      const content = generateTroubleshooterTemplate(templateParams);

      expect(content).toContain('name: testlib-1-troubleshooter');
      expect(content).toContain('template: troubleshooter');
      expect(content).toContain('Troubleshooter');
      expect(content).toContain('debug');
    });

    it('should include error-related patterns', () => {
      const content = generateTroubleshooterTemplate(templateParams);

      expect(content).toContain('error');
      expect(content).toContain('debug');
      expect(content).toContain('troubleshoot');
    });

    it('should include debugging guidance', () => {
      const content = generateTroubleshooterTemplate(templateParams);

      expect(content).toContain('Debugging');
      expect(content).toContain('Common Issues');
      expect(content).toContain('diagnosis');
    });
  });

  describe('Best Practices Template', () => {
    it('should generate valid best-practices template content', () => {
      const content = generateBestPracticesTemplate(templateParams);

      expect(content).toContain('name: testlib-1-best-practices');
      expect(content).toContain('template: best-practices');
      expect(content).toContain('Best Practices');
      expect(content).toContain('pattern');
    });

    it('should include best practice sections', () => {
      const content = generateBestPracticesTemplate(templateParams);

      expect(content).toContain('Recommended Patterns');
      expect(content).toContain('Anti-Patterns');
      expect(content).toContain('Performance');
      expect(content).toContain('Security');
    });

    it('should include checklists', () => {
      const content = generateBestPracticesTemplate(templateParams);

      expect(content).toContain('Checklist');
      expect(content).toContain('[ ]'); // Checkbox
    });
  });

  describe('Template Consistency', () => {
    it('all templates should have valid YAML frontmatter', async () => {
      const templates = [
        generateExpertTemplate(templateParams),
        generateQuickReferenceTemplate(templateParams),
        await generateMigrationGuideTemplate(templateParams),
        generateTroubleshooterTemplate(templateParams),
        generateBestPracticesTemplate(templateParams)
      ];

      templates.forEach(content => {
        // Should start with ---
        expect(content.startsWith('---')).toBe(true);

        // Should have closing ---
        const parts = content.split('---');
        expect(parts.length).toBeGreaterThanOrEqual(3);

        // Should have required fields
        expect(content).toContain('name:');
        expect(content).toContain('description:');
        expect(content).toContain('version:');
        expect(content).toContain('library:');
        expect(content).toContain('template:');
      });
    });

    it('all templates should include activation patterns', async () => {
      const templates = [
        generateExpertTemplate(templateParams),
        generateQuickReferenceTemplate(templateParams),
        await generateMigrationGuideTemplate(templateParams),
        generateTroubleshooterTemplate(templateParams),
        generateBestPracticesTemplate(templateParams)
      ];

      templates.forEach(content => {
        expect(content).toContain('activation_patterns:');
      });
    });

    it('all templates should have unique names', async () => {
      const templates = [
        { name: 'expert', content: generateExpertTemplate(templateParams) },
        { name: 'quick-reference', content: generateQuickReferenceTemplate(templateParams) },
        { name: 'migration-guide', content: await generateMigrationGuideTemplate(templateParams) },
        { name: 'troubleshooter', content: generateTroubleshooterTemplate(templateParams) },
        { name: 'best-practices', content: generateBestPracticesTemplate(templateParams) }
      ];

      const names = templates.map(t => {
        const match = t.content.match(/name:\s*(.+)/);
        return match ? match[1].trim() : null;
      });

      // All names should be unique
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(5);

      // Each should match the template type
      templates.forEach((t, i) => {
        expect(names[i]).toContain(t.name);
      });
    });
  });
});
