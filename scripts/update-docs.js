#!/usr/bin/env node

import { Command } from 'commander';
import fetchDocumentation from './fetch-docs.js';
import generateSkill from './generate-skill.js';
import {
  loadConfig,
  getCacheDir,
  listCachedLibraries,
  log
} from './utils.js';

const program = new Command();

/**
 * Update cached documentation
 */
async function updateDocs(library, options) {
  // Load config
  const config = await loadConfig();
  const cacheDir = config.cache_directory || getCacheDir();

  if (library) {
    // Update specific library
    log(`\\nUpdating ${library}...\\n`, 'info');

    // Find cached version
    const libraries = await listCachedLibraries(cacheDir);
    const existing = libraries.find(lib => lib.name === library);

    if (!existing) {
      throw new Error(`No cached documentation found for ${library}. Use /fetch-docs ${library} instead.`);
    }

    // Re-fetch documentation
    const result = await fetchDocumentation(library, null, {
      url: existing.metadata.source_url
    });

    // Regenerate skill if it was previously generated
    if (existing.metadata.skill_generated) {
      log('\\nRegenerating skill...', 'info');
      await generateSkill(library, result.version, {});
    }

    log(`\\n✓ ${library} updated to latest version\\n`, 'info');

  } else if (options.all) {
    // Update all cached libraries
    const libraries = await listCachedLibraries(cacheDir);

    if (libraries.length === 0) {
      console.log('\\nNo cached documentation to update.\\n');
      return;
    }

    log(`\\nUpdating ${libraries.length} ${libraries.length === 1 ? 'library' : 'libraries'}...\\n`, 'info');

    for (const lib of libraries) {
      try {
        log(`\\n--- Updating ${lib.name} ---`, 'info');
        const result = await fetchDocumentation(lib.name, null, {
          url: lib.metadata.source_url
        });

        if (lib.metadata.skill_generated) {
          await generateSkill(lib.name, result.version, {});
        }

        log(`✓ ${lib.name} updated`, 'info');
      } catch (error) {
        log(`✗ Failed to update ${lib.name}: ${error.message}`, 'error');
      }
    }

    log(`\\n✓ Update complete\\n`, 'info');

  } else {
    throw new Error('Please specify a library name or use --all to update everything');
  }
}

/**
 * CLI setup
 */
program
  .name('update-docs')
  .description('Update cached documentation to latest version')
  .argument('[library]', 'Library name to update (e.g., nextjs)')
  .option('-a, --all', 'Update all cached documentation')
  .option('--force', 'Force re-fetch even if recently updated')
  .action(async (library, options) => {
    try {
      await updateDocs(library, options);
      process.exit(0);
    } catch (error) {
      log(`\\n✗ Error: ${error.message}\\n`, 'error');
      process.exit(1);
    }
  });

program.parse();

export default updateDocs;
