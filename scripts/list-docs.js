#!/usr/bin/env node

import { Command } from 'commander';
import { verifyDependencies } from './check-dependencies.js';
import {
  loadConfig,
  getCacheDir,
  listCachedLibraries,
  formatBytes,
  formatRelativeTime,
  log
} from './utils.js';
import { detectDependencies, getSuggestions } from './detect-dependencies.js';
import {
  validatePath,
  formatValidationError,
  ValidationError
} from './validate.js';

const program = new Command();

/**
 * List all cached documentation
 */
async function listDocs(options) {
  // Load config
  const config = await loadConfig();
  const cacheDir = config.cache_directory || getCacheDir();

  // Get all cached libraries
  const libraries = await listCachedLibraries(cacheDir);

  if (libraries.length === 0) {
    console.log('\\nNo cached documentation found.\\n');
    console.log('Fetch documentation with: /fetch-docs <library>\\n');
    return;
  }

  // Display header
  console.log('\\nCached Documentation:\\n');

  // Display each library
  for (const lib of libraries) {
    const { metadata } = lib;

    const skillStatus = metadata.skill_generated ? '✓' : '✗';
    const skillText = metadata.skill_generated
      ? metadata.skill_path || 'generated'
      : 'None';

    console.log(`├── ${lib.name} (v${lib.version})`);
    console.log(`│   ${metadata.page_count} pages · ${formatBytes(metadata.total_size_bytes)} · Updated ${formatRelativeTime(metadata.fetched_at)}`);
    console.log(`│   Skill: ${skillText} ${skillStatus}`);
    console.log(`│`);
  }

  // Summary
  const totalPages = libraries.reduce((sum, lib) => sum + lib.metadata.page_count, 0);
  const totalSize = libraries.reduce((sum, lib) => sum + lib.metadata.total_size_bytes, 0);

  console.log(`Total: ${libraries.length} ${libraries.length === 1 ? 'library' : 'libraries'} · ${totalPages} pages · ${formatBytes(totalSize)} local\\n`);
}

/**
 * List documentation for current project
 */
async function listProjectDocs(projectPath = process.cwd()) {
  // Validate project path
  try {
    projectPath = await validatePath(projectPath, 'project path', { mustExist: true, mustBeDirectory: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new Error(formatValidationError(error));
    }
    throw error;
  }

  console.log('\\nProject Documentation Analysis:\\n');

  // Detect dependencies
  const detection = await detectDependencies(projectPath);

  if (!detection.ecosystem) {
    console.log('No supported dependency files found in project.\\n');
    console.log('Looking for:');
    console.log('  - package.json (JavaScript/TypeScript)');
    console.log('  - requirements.txt or pyproject.toml (Python)');
    console.log('  - go.mod (Go)');
    console.log('  - Cargo.toml (Rust)\\n');
    return;
  }

  console.log(`Project type: ${detection.ecosystem}`);
  console.log(`Dependencies: ${detection.dependencies.length}\\n`);

  const suggestions = getSuggestions(detection);

  // Show cached and current
  if (suggestions.current.length > 0) {
    console.log('✓ Cached and Current:\\n');
    for (const item of suggestions.current) {
      const dep = detection.dependencies.find(d => d.normalizedName === item.library);
      console.log(`  ├── ${item.library} v${item.version}`);
      console.log(`  │   Cached: v${dep.cachedVersion}`);
      console.log(`  │   Status: Up to date ✓`);
      console.log(`  │`);
    }
  }

  // Show outdated
  if (suggestions.toUpdate.length > 0) {
    console.log('⚠ Cached but Outdated:\\n');
    for (const item of suggestions.toUpdate) {
      console.log(`  ├── ${item.library}`);
      console.log(`  │   Required: v${item.required}`);
      console.log(`  │   Cached: v${item.cached}`);
      console.log(`  │   → ${item.command}`);
      console.log(`  │`);
    }
  }

  // Show missing
  if (suggestions.toFetch.length > 0) {
    console.log('✗ Not Cached:\\n');
    for (const item of suggestions.toFetch) {
      console.log(`  ├── ${item.library} v${item.version}`);
      console.log(`  │   → ${item.command}`);
      console.log(`  │`);
    }
  }

  // Summary
  console.log('Summary:');
  console.log(`  ✓ Current: ${suggestions.current.length}`);
  console.log(`  ⚠ Outdated: ${suggestions.toUpdate.length}`);
  console.log(`  ✗ Missing: ${suggestions.toFetch.length}\\n`);

  // Quick fix suggestions
  if (suggestions.toFetch.length > 0 || suggestions.toUpdate.length > 0) {
    console.log('Quick Actions:\\n');
    if (suggestions.toFetch.length > 0) {
      console.log('  Fetch all missing:');
      console.log('  → /fetch-docs --project\\n');
    }
    if (suggestions.toUpdate.length > 0) {
      console.log('  Update all outdated:');
      console.log('  → /update-docs --project\\n');
    }
  }
}

/**
 * CLI setup
 */
program
  .name('list-docs')
  .description('List all cached documentation')
  .option('--verbose', 'Show detailed information')
  .option('--project', 'Show documentation for current project dependencies')
  .option('--path <path>', 'Project path (for --project flag)', process.cwd())
  .action(async (options) => {
    try {
      if (options.project) {
        await listProjectDocs(options.path);
      } else {
        await listDocs(options);
      }
      process.exit(0);
    } catch (error) {
      log(`\\n✗ Error: ${error.message}\\n`, 'error');
      process.exit(1);
    }
  });

// Verify plugin dependencies are installed
await verifyDependencies('list-docs');

program.parse();

export default listDocs;
