/**
 * Tests for analysis modules
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractTopicsFromContent, buildTopicHierarchy } from '../scripts/analysis/extract-topics.js';
import { extractCodeExamplesFromContent } from '../scripts/analysis/extract-code-examples.js';
import { detectAPIMethodsFromContent } from '../scripts/analysis/detect-api-methods.js';
import { extractKeywordsFromContent } from '../scripts/analysis/extract-keywords.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Analysis Modules', () => {
  describe('extractTopicsFromContent', () => {
    it('should extract topics from markdown headings', async () => {
      const markdown = `---
url: https://example.com/doc
title: Test Doc
---

# Main Topic

This is some content.

## Subtopic One

More content here.

### Detail Level

Even more content.

## Subtopic Two

Final content.
`;

      const topics = await extractTopicsFromContent(markdown, 'test.md');

      expect(topics).toHaveLength(4);
      expect(topics[0].title).toBe('Main Topic');
      expect(topics[0].level).toBe(1);
      expect(topics[1].title).toBe('Subtopic One');
      expect(topics[1].level).toBe(2);
      expect(topics[2].title).toBe('Detail Level');
      expect(topics[2].level).toBe(3);
    });

    it('should build topic hierarchy correctly', () => {
      const topics = [
        { level: 1, title: 'Getting Started', source: 'intro.md' },
        { level: 2, title: 'Installation', source: 'intro.md', parent: 'Getting Started' },
        { level: 2, title: 'Configuration', source: 'intro.md', parent: 'Getting Started' },
        { level: 1, title: 'API Reference', source: 'api.md' }
      ];

      const hierarchy = buildTopicHierarchy(topics);

      expect(hierarchy['Getting Started']).toBeDefined();
      expect(hierarchy['Getting Started'].subtopics).toHaveLength(2);
      expect(hierarchy['API Reference']).toBeDefined();
    });
  });

  describe('extractCodeExamplesFromContent', () => {
    it('should extract code blocks with language', async () => {
      const markdown = `
# Installation

Install the package:

\`\`\`bash
npm install example-library
\`\`\`

## Usage

Here's a basic example:

\`\`\`javascript
import { hello } from 'example-library';

hello('world');
\`\`\`
`;

      const examples = await extractCodeExamplesFromContent(markdown, 'test.md');

      expect(examples).toHaveLength(2);
      expect(examples[0].language).toBe('bash');
      expect(examples[0].code).toContain('npm install');
      expect(examples[0].category).toBe('Installation');
      expect(examples[1].language).toBe('javascript');
      expect(examples[1].code).toContain('import');
    });

    it('should categorize code examples correctly', async () => {
      const markdown = `
# Configuration

Configure your app:

\`\`\`json
{
  "option": "value"
}
\`\`\`

# Testing

Write tests:

\`\`\`javascript
test('example', () => {
  expect(true).toBe(true);
});
\`\`\`
`;

      const examples = await extractCodeExamplesFromContent(markdown, 'test.md');

      expect(examples).toHaveLength(2);
      expect(examples[0].category).toBe('Configuration');
      expect(examples[1].category).toBe('Testing');
    });
  });

  describe('detectAPIMethodsFromContent', () => {
    it('should detect JavaScript function declarations', async () => {
      const markdown = `
# API Reference

## Functions

\`\`\`javascript
export function getData(id) {
  return fetch(\`/api/data/\${id}\`);
}

export async function saveData(data) {
  return await fetch('/api/data', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
\`\`\`
`;

      const methods = await detectAPIMethodsFromContent(markdown, 'api.md');

      expect(methods.length).toBeGreaterThan(0);
      const methodNames = methods.map(m => m.name);
      expect(methodNames).toContain('getData');
      expect(methodNames).toContain('saveData');
    });

    it('should detect methods from headings', async () => {
      const markdown = `
# useEffect()

Hook for side effects.

# useState()

Hook for state management.
`;

      const methods = await detectAPIMethodsFromContent(markdown, 'hooks.md');

      expect(methods.length).toBeGreaterThan(0);
      const methodNames = methods.map(m => m.name);
      expect(methodNames).toContain('useEffect');
      expect(methodNames).toContain('useState');
    });
  });

  describe('extractKeywordsFromContent', () => {
    it('should extract and tokenize keywords', () => {
      const markdown = `
# Server Actions

Server actions allow you to perform server-side operations directly from your components.

## Creating Server Actions

To create a server action, use the "use server" directive.
`;

      const result = extractKeywordsFromContent(markdown, 'test.md');

      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.frequency).toBeDefined();
      expect(result.headingTokens).toBeGreaterThan(0);
      expect(result.bodyTokens).toBeGreaterThan(0);
    });

    it('should filter out stopwords', () => {
      const markdown = `
# Important Feature

This is a very important feature that you should use.
`;

      const result = extractKeywordsFromContent(markdown, 'test.md');

      // Stopwords like 'the', 'a', 'is', 'that', 'you' should be filtered
      expect(result.tokens).not.toContain('the');
      expect(result.tokens).not.toContain('is');
      expect(result.tokens).not.toContain('that');
      expect(result.tokens).not.toContain('you');
    });
  });
});
