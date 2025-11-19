import { describe, it, expect, beforeAll } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Library name mappings (copied from detect-dependencies.js for testing)
 */
const LIBRARY_MAPPINGS = {
  'next': 'nextjs',
  '@supabase/supabase-js': 'supabase',
  'tailwindcss': 'tailwind',
  '@tanstack/react-query': 'react-query',
  'react': 'react',
  'django': 'django',
  'flask': 'flask',
  'pandas': 'pandas'
};

/**
 * Normalize library name
 */
function normalizeLibraryName(packageName) {
  return LIBRARY_MAPPINGS[packageName] || packageName;
}

/**
 * Parse JavaScript/TypeScript dependencies from package.json
 */
async function parseJavaScriptDeps(projectPath) {
  const packageJsonPath = path.join(projectPath, 'package.json');

  try {
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content);

    const dependencies = [];
    const depTypes = ['dependencies', 'devDependencies', 'peerDependencies'];

    for (const depType of depTypes) {
      if (!packageJson[depType]) continue;

      for (const [name, versionSpec] of Object.entries(packageJson[depType])) {
        dependencies.push({
          name,
          normalizedName: normalizeLibraryName(name),
          versionSpec,
          version: versionSpec.replace(/^[\^~]/, ''),
          type: depType,
          ecosystem: 'javascript'
        });
      }
    }

    return dependencies;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Parse Python dependencies from requirements.txt
 */
async function parsePythonDeps(projectPath) {
  const requirementsPath = path.join(projectPath, 'requirements.txt');

  try {
    const content = await fs.readFile(requirementsPath, 'utf-8');
    const dependencies = [];

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Parse package==version or package>=version format
      const match = trimmed.match(/^([a-zA-Z0-9_-]+)([=<>!]+)([0-9.]+)/);
      if (match) {
        const [, name, operator, version] = match;
        dependencies.push({
          name,
          normalizedName: normalizeLibraryName(name),
          versionSpec: operator + version,
          version,
          type: 'dependencies',
          ecosystem: 'python'
        });
      }
    }

    return dependencies.length > 0 ? dependencies : null;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

describe('Dependency Detection', () => {
  const fixturesPath = path.join(__dirname, '..', 'fixtures');

  describe('normalizeLibraryName', () => {
    it('should map Next.js package name', () => {
      expect(normalizeLibraryName('next')).toBe('nextjs');
    });

    it('should map Tailwind CSS package name', () => {
      expect(normalizeLibraryName('tailwindcss')).toBe('tailwind');
    });

    it('should map scoped package names', () => {
      expect(normalizeLibraryName('@supabase/supabase-js')).toBe('supabase');
      expect(normalizeLibraryName('@tanstack/react-query')).toBe('react-query');
    });

    it('should return original name if no mapping exists', () => {
      expect(normalizeLibraryName('unknown-package')).toBe('unknown-package');
      expect(normalizeLibraryName('@custom/package')).toBe('@custom/package');
    });

    it('should handle Python library names', () => {
      expect(normalizeLibraryName('django')).toBe('django');
      expect(normalizeLibraryName('flask')).toBe('flask');
      expect(normalizeLibraryName('pandas')).toBe('pandas');
    });
  });

  describe('parseJavaScriptDeps', () => {
    it('should parse package.json dependencies', async () => {
      const deps = await parseJavaScriptDeps(fixturesPath);

      expect(deps).toBeDefined();
      expect(Array.isArray(deps)).toBe(true);
      expect(deps.length).toBeGreaterThan(0);
    });

    it('should extract dependency names and versions', async () => {
      const deps = await parseJavaScriptDeps(fixturesPath);

      const nextDep = deps.find(d => d.name === 'next');
      expect(nextDep).toBeDefined();
      expect(nextDep.normalizedName).toBe('nextjs');
      expect(nextDep.versionSpec).toBe('^14.0.0');
      expect(nextDep.version).toBe('14.0.0');
      expect(nextDep.ecosystem).toBe('javascript');
    });

    it('should handle different dependency types', async () => {
      const deps = await parseJavaScriptDeps(fixturesPath);

      const hasDependencies = deps.some(d => d.type === 'dependencies');
      const hasDevDependencies = deps.some(d => d.type === 'devDependencies');

      expect(hasDependencies).toBe(true);
      expect(hasDevDependencies).toBe(true);
    });

    it('should normalize library names', async () => {
      const deps = await parseJavaScriptDeps(fixturesPath);

      const tailwindDep = deps.find(d => d.name === 'tailwindcss');
      expect(tailwindDep).toBeDefined();
      expect(tailwindDep.normalizedName).toBe('tailwind');
    });

    it('should remove version prefixes (^ and ~)', async () => {
      const deps = await parseJavaScriptDeps(fixturesPath);

      const reactDep = deps.find(d => d.name === 'react');
      expect(reactDep).toBeDefined();
      expect(reactDep.versionSpec).toBe('^18.2.0');
      expect(reactDep.version).toBe('18.2.0'); // Should remove ^
    });

    it('should return null for non-existent package.json', async () => {
      const deps = await parseJavaScriptDeps('/non/existent/path');
      expect(deps).toBe(null);
    });
  });

  describe('parsePythonDeps', () => {
    it('should parse requirements.txt dependencies', async () => {
      const deps = await parsePythonDeps(fixturesPath);

      expect(deps).toBeDefined();
      expect(Array.isArray(deps)).toBe(true);
      expect(deps.length).toBeGreaterThan(0);
    });

    it('should extract dependency names and versions', async () => {
      const deps = await parsePythonDeps(fixturesPath);

      const djangoDep = deps.find(d => d.name === 'django');
      expect(djangoDep).toBeDefined();
      expect(djangoDep.normalizedName).toBe('django');
      expect(djangoDep.versionSpec).toBe('==4.2.0');
      expect(djangoDep.version).toBe('4.2.0');
      expect(djangoDep.ecosystem).toBe('python');
    });

    it('should handle different version operators', async () => {
      const deps = await parsePythonDeps(fixturesPath);

      const djangoDep = deps.find(d => d.name === 'django');
      const flaskDep = deps.find(d => d.name === 'flask');

      expect(djangoDep.versionSpec).toBe('==4.2.0');
      expect(flaskDep.versionSpec).toBe('>=2.3.0');
    });

    it('should skip comment lines', async () => {
      const deps = await parsePythonDeps(fixturesPath);

      // Should not have any entries for comment lines
      const commentDep = deps.find(d => d.name === 'Comment');
      expect(commentDep).toBeUndefined();
    });

    it('should skip empty lines', async () => {
      const deps = await parsePythonDeps(fixturesPath);

      // All dependencies should have proper names
      const allHaveNames = deps.every(d => d.name && d.name.length > 0);
      expect(allHaveNames).toBe(true);
    });

    it('should return null for non-existent requirements.txt', async () => {
      const deps = await parsePythonDeps('/non/existent/path');
      expect(deps).toBe(null);
    });
  });

  describe('Dependency Structure', () => {
    it('should have consistent structure across ecosystems', async () => {
      const jsDeps = await parseJavaScriptDeps(fixturesPath);
      const pyDeps = await parsePythonDeps(fixturesPath);

      // Check JavaScript dependency structure
      const jsDep = jsDeps[0];
      expect(jsDep).toHaveProperty('name');
      expect(jsDep).toHaveProperty('normalizedName');
      expect(jsDep).toHaveProperty('versionSpec');
      expect(jsDep).toHaveProperty('version');
      expect(jsDep).toHaveProperty('type');
      expect(jsDep).toHaveProperty('ecosystem');

      // Check Python dependency structure
      const pyDep = pyDeps[0];
      expect(pyDep).toHaveProperty('name');
      expect(pyDep).toHaveProperty('normalizedName');
      expect(pyDep).toHaveProperty('versionSpec');
      expect(pyDep).toHaveProperty('version');
      expect(pyDep).toHaveProperty('type');
      expect(pyDep).toHaveProperty('ecosystem');
    });

    it('should have correct ecosystem labels', async () => {
      const jsDeps = await parseJavaScriptDeps(fixturesPath);
      const pyDeps = await parsePythonDeps(fixturesPath);

      expect(jsDeps.every(d => d.ecosystem === 'javascript')).toBe(true);
      expect(pyDeps.every(d => d.ecosystem === 'python')).toBe(true);
    });
  });

  describe('Version Parsing', () => {
    it('should handle semver with caret (^)', async () => {
      const deps = await parseJavaScriptDeps(fixturesPath);
      const dep = deps.find(d => d.versionSpec.startsWith('^'));

      expect(dep).toBeDefined();
      expect(dep.version).not.toContain('^');
    });

    it('should handle exact versions (==)', async () => {
      const deps = await parsePythonDeps(fixturesPath);
      const dep = deps.find(d => d.versionSpec.includes('=='));

      expect(dep).toBeDefined();
      expect(dep.version).not.toContain('==');
    });

    it('should handle minimum versions (>=)', async () => {
      const deps = await parsePythonDeps(fixturesPath);
      const dep = deps.find(d => d.versionSpec.includes('>='));

      expect(dep).toBeDefined();
      expect(dep.version).not.toContain('>=');
    });
  });
});
