#!/usr/bin/env node

import { Command } from 'commander';
import {
  loadConfig,
  getCacheDir,
  listCachedLibraries,
  formatBytes,
  formatRelativeTime,
  log
} from './utils.js';

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
 * CLI setup
 */
program
  .name('list-docs')
  .description('List all cached documentation')
  .option('--verbose', 'Show detailed information')
  .action(async (options) => {
    try {
      await listDocs(options);
      process.exit(0);
    } catch (error) {
      log(`\\n✗ Error: ${error.message}\\n`, 'error');
      process.exit(1);
    }
  });

program.parse();

export default listDocs;
