#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import {
  loadConfig,
  getCacheDir,
  listCachedLibraries,
  log
} from './utils.js';

const program = new Command();

/**
 * Library name mappings (package name → documentation name)
 */
const LIBRARY_MAPPINGS = {
  // JavaScript/TypeScript
  'next': 'nextjs',
  '@supabase/supabase-js': 'supabase',
  '@supabase/auth-helpers-nextjs': 'supabase-auth',
  '@supabase/auth-helpers-react': 'supabase-auth',
  'tailwindcss': 'tailwind',
  '@tanstack/react-query': 'react-query',
  '@mui/material': 'mui',
  '@chakra-ui/react': 'chakra-ui',
  'react': 'react',
  'vue': 'vue',
  'svelte': 'svelte',
  'angular': 'angular',
  '@angular/core': 'angular',

  // Python
  'django': 'django',
  'flask': 'flask',
  'fastapi': 'fastapi',
  'pandas': 'pandas',
  'numpy': 'numpy',
  'tensorflow': 'tensorflow',
  'pytorch': 'pytorch',
  'torch': 'pytorch',

  // Go
  'github.com/gin-gonic/gin': 'gin',
  'github.com/gorilla/mux': 'gorilla-mux',
  'gorm.io/gorm': 'gorm',

  // Rust
  'actix-web': 'actix-web',
  'rocket': 'rocket',
  'axum': 'axum',
  'tokio': 'tokio',
  'serde': 'serde'
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

    // Parse dependencies
    const depTypes = ['dependencies', 'devDependencies', 'peerDependencies'];

    for (const depType of depTypes) {
      if (!packageJson[depType]) continue;

      for (const [name, versionSpec] of Object.entries(packageJson[depType])) {
        dependencies.push({
          name,
          normalizedName: normalizeLibraryName(name),
          versionSpec,
          version: versionSpec.replace(/^[\^~]/, ''), // Remove ^ or ~
          type: depType,
          ecosystem: 'javascript'
        });
      }
    }

    // Try to get exact versions from lock files
    await enrichWithLockFile(projectPath, dependencies);

    return dependencies;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // No package.json found
    }
    throw error;
  }
}

/**
 * Enrich dependencies with exact versions from lock files
 */
async function enrichWithLockFile(projectPath, dependencies) {
  // Try package-lock.json (npm)
  try {
    const lockPath = path.join(projectPath, 'package-lock.json');
    const content = await fs.readFile(lockPath, 'utf-8');
    const lockData = JSON.parse(content);

    if (lockData.packages) {
      for (const dep of dependencies) {
        const packageKey = `node_modules/${dep.name}`;
        if (lockData.packages[packageKey]) {
          dep.version = lockData.packages[packageKey].version;
          dep.resolved = lockData.packages[packageKey].resolved;
        }
      }
    }
    return;
  } catch {}

  // Try yarn.lock
  try {
    const lockPath = path.join(projectPath, 'yarn.lock');
    const content = await fs.readFile(lockPath, 'utf-8');
    // Simple parsing - look for version lines
    for (const dep of dependencies) {
      const pattern = new RegExp(`${dep.name}@.*:\\n  version "([^"]+)"`, 'm');
      const match = content.match(pattern);
      if (match) {
        dep.version = match[1];
      }
    }
    return;
  } catch {}

  // Try pnpm-lock.yaml
  try {
    const lockPath = path.join(projectPath, 'pnpm-lock.yaml');
    const content = await fs.readFile(lockPath, 'utf-8');
    // Simple YAML parsing for versions
    for (const dep of dependencies) {
      const pattern = new RegExp(`${dep.name}:\\s+([0-9]+\\.[0-9]+\\.[0-9]+)`, 'm');
      const match = content.match(pattern);
      if (match) {
        dep.version = match[1];
      }
    }
  } catch {}
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
      // Try pyproject.toml
      return await parsePyprojectToml(projectPath);
    }
    throw error;
  }
}

/**
 * Parse Python dependencies from pyproject.toml
 */
async function parsePyprojectToml(projectPath) {
  const tomlPath = path.join(projectPath, 'pyproject.toml');

  try {
    const content = await fs.readFile(tomlPath, 'utf-8');
    const dependencies = [];

    // Simple TOML parsing for dependencies section
    const depsMatch = content.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)\n\[/);
    if (depsMatch) {
      const depsSection = depsMatch[1];
      const depLines = depsSection.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/gm);

      if (depLines) {
        for (const line of depLines) {
          const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
          if (match) {
            const [, name, versionSpec] = match;
            if (name === 'python') continue; // Skip python version

            dependencies.push({
              name,
              normalizedName: normalizeLibraryName(name),
              versionSpec,
              version: versionSpec.replace(/^[\^~]/, ''),
              type: 'dependencies',
              ecosystem: 'python'
            });
          }
        }
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

/**
 * Parse Go dependencies from go.mod
 */
async function parseGoDeps(projectPath) {
  const goModPath = path.join(projectPath, 'go.mod');

  try {
    const content = await fs.readFile(goModPath, 'utf-8');
    const dependencies = [];

    // Parse require blocks
    const requireMatch = content.match(/require \(([\s\S]*?)\)/);
    if (requireMatch) {
      const requireLines = requireMatch[1].split('\n');

      for (const line of requireLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const match = trimmed.match(/^([\w./-]+)\s+v?([0-9.]+)/);
        if (match) {
          const [, name, version] = match;
          dependencies.push({
            name,
            normalizedName: normalizeLibraryName(name),
            versionSpec: version,
            version,
            type: 'dependencies',
            ecosystem: 'go'
          });
        }
      }
    }

    // Also parse single-line requires
    const singleRequires = content.match(/^require\s+([\w./-]+)\s+v?([0-9.]+)/gm);
    if (singleRequires) {
      for (const line of singleRequires) {
        const match = line.match(/^require\s+([\w./-]+)\s+v?([0-9.]+)/);
        if (match) {
          const [, name, version] = match;
          if (!dependencies.find(d => d.name === name)) {
            dependencies.push({
              name,
              normalizedName: normalizeLibraryName(name),
              versionSpec: version,
              version,
              type: 'dependencies',
              ecosystem: 'go'
            });
          }
        }
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

/**
 * Parse Rust dependencies from Cargo.toml
 */
async function parseRustDeps(projectPath) {
  const cargoTomlPath = path.join(projectPath, 'Cargo.toml');

  try {
    const content = await fs.readFile(cargoTomlPath, 'utf-8');
    const dependencies = [];

    // Parse dependencies section
    const depsMatch = content.match(/\[dependencies\]([\s\S]*?)(?:\n\[|$)/);
    if (depsMatch) {
      const depsSection = depsMatch[1];
      const depLines = depsSection.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/gm);

      if (depLines) {
        for (const line of depLines) {
          const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
          if (match) {
            const [, name, version] = match;
            dependencies.push({
              name,
              normalizedName: normalizeLibraryName(name),
              versionSpec: version,
              version: version.replace(/^[\^~]/, ''),
              type: 'dependencies',
              ecosystem: 'rust'
            });
          }
        }
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

/**
 * Detect all dependencies in a project
 */
export async function detectDependencies(projectPath = process.cwd()) {
  const results = {
    projectPath,
    ecosystem: null,
    dependencies: [],
    cachedLibraries: []
  };

  // Try each ecosystem
  const jsDeps = await parseJavaScriptDeps(projectPath);
  const pyDeps = await parsePythonDeps(projectPath);
  const goDeps = await parseGoDeps(projectPath);
  const rustDeps = await parseRustDeps(projectPath);

  // Determine primary ecosystem and combine dependencies
  if (jsDeps) {
    results.ecosystem = 'javascript';
    results.dependencies = jsDeps;
  } else if (pyDeps) {
    results.ecosystem = 'python';
    results.dependencies = pyDeps;
  } else if (goDeps) {
    results.ecosystem = 'go';
    results.dependencies = goDeps;
  } else if (rustDeps) {
    results.ecosystem = 'rust';
    results.dependencies = rustDeps;
  }

  if (results.dependencies.length === 0) {
    return results;
  }

  // Load cached libraries
  const config = await loadConfig();
  const cacheDir = config.cache_directory || getCacheDir();
  results.cachedLibraries = await listCachedLibraries(cacheDir);

  // Compare with cache
  for (const dep of results.dependencies) {
    const cached = results.cachedLibraries.find(
      lib => lib.name === dep.normalizedName || lib.name === dep.name
    );

    if (cached) {
      dep.cached = true;
      dep.cachedVersion = cached.metadata.version;
      dep.cacheMatch = compareVersions(dep.version, cached.metadata.version);
    } else {
      dep.cached = false;
      dep.cacheMatch = 'missing';
    }
  }

  return results;
}

/**
 * Compare two versions
 */
function compareVersions(required, cached) {
  if (!required || !cached) return 'unknown';

  const reqParts = required.split('.').map(Number);
  const cacheParts = cached.split('.').map(Number);

  // Major version must match
  if (reqParts[0] !== cacheParts[0]) return 'mismatch';

  // Minor version
  if (reqParts[1] === cacheParts[1]) {
    // Patch version
    if (reqParts[2] === cacheParts[2]) return 'exact';
    if (Math.abs(reqParts[2] - cacheParts[2]) <= 2) return 'close';
    return 'outdated';
  }

  if (Math.abs(reqParts[1] - cacheParts[1]) === 1) return 'close';
  return 'outdated';
}

/**
 * Get suggestions for missing/outdated docs
 */
export function getSuggestions(detectionResult) {
  const suggestions = {
    toFetch: [],
    toUpdate: [],
    current: []
  };

  for (const dep of detectionResult.dependencies) {
    if (dep.cacheMatch === 'missing') {
      suggestions.toFetch.push({
        library: dep.normalizedName,
        version: dep.version,
        command: `/fetch-docs ${dep.normalizedName} ${dep.version}`
      });
    } else if (dep.cacheMatch === 'mismatch' || dep.cacheMatch === 'outdated') {
      suggestions.toUpdate.push({
        library: dep.normalizedName,
        required: dep.version,
        cached: dep.cachedVersion,
        command: `/update-docs ${dep.normalizedName}`
      });
    } else if (dep.cacheMatch === 'exact' || dep.cacheMatch === 'close') {
      suggestions.current.push({
        library: dep.normalizedName,
        version: dep.version
      });
    }
  }

  return suggestions;
}

/**
 * CLI interface
 */
program
  .name('detect-dependencies')
  .description('Detect project dependencies and compare with cached documentation')
  .argument('[project-path]', 'Path to project directory', process.cwd())
  .action(async (projectPath) => {
    try {
      log(`\nDetecting dependencies in ${projectPath}...\n`, 'info');

      const result = await detectDependencies(projectPath);

      if (!result.ecosystem) {
        console.log('No supported dependency files found.\n');
        console.log('Supported files:');
        console.log('  - package.json (JavaScript/TypeScript)');
        console.log('  - requirements.txt or pyproject.toml (Python)');
        console.log('  - go.mod (Go)');
        console.log('  - Cargo.toml (Rust)\n');
        process.exit(1);
      }

      console.log(`Ecosystem: ${result.ecosystem}`);
      console.log(`Dependencies found: ${result.dependencies.length}\n`);

      const suggestions = getSuggestions(result);

      if (suggestions.current.length > 0) {
        console.log('✓ Cached and current:');
        for (const item of suggestions.current) {
          console.log(`  - ${item.library} v${item.version}`);
        }
        console.log('');
      }

      if (suggestions.toUpdate.length > 0) {
        console.log('⚠ Cached but outdated:');
        for (const item of suggestions.toUpdate) {
          console.log(`  - ${item.library} (required: ${item.required}, cached: ${item.cached})`);
          console.log(`    → ${item.command}`);
        }
        console.log('');
      }

      if (suggestions.toFetch.length > 0) {
        console.log('✗ Not cached:');
        for (const item of suggestions.toFetch) {
          console.log(`  - ${item.library} v${item.version}`);
          console.log(`    → ${item.command}`);
        }
        console.log('');
      }

      // Summary
      console.log('Summary:');
      console.log(`  Current: ${suggestions.current.length}`);
      console.log(`  Outdated: ${suggestions.toUpdate.length}`);
      console.log(`  Missing: ${suggestions.toFetch.length}\n`);

      if (suggestions.toFetch.length > 0 || suggestions.toUpdate.length > 0) {
        console.log('Quick fix:');
        if (suggestions.toFetch.length > 0) {
          console.log(`  /fetch-docs --project`);
        }
        if (suggestions.toUpdate.length > 0) {
          console.log(`  /update-docs --project`);
        }
        console.log('');
      }

      process.exit(0);
    } catch (error) {
      log(`\n✗ Error: ${error.message}\n`, 'error');
      console.error(error.stack);
      process.exit(1);
    }
  });

program.parse();

export default detectDependencies;
