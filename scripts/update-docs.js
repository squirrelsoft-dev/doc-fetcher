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
import { detectDependencies, getSuggestions } from './detect-dependencies.js';

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

  } else if (options.project) {
    // Update project dependencies
    await updateProjectDocs(options.path || process.cwd(), config);
  } else {
    throw new Error('Please specify a library name, use --all, or use --project');
  }
}

/**
 * Update documentation for project dependencies
 */
async function updateProjectDocs(projectPath, config) {
  log(`\\nDetecting project dependencies...\\n`, 'info');

  const detection = await detectDependencies(projectPath);

  if (!detection.ecosystem) {
    console.log('No supported dependency files found in project.\\n');
    return;
  }

  const suggestions = getSuggestions(detection);

  // Count what needs updating/fetching
  const needsAction = suggestions.toUpdate.length + suggestions.toFetch.length;

  if (needsAction === 0) {
    log('✓ All project dependencies are cached and current!\\n', 'info');
    return;
  }

  log(`Found ${needsAction} ${needsAction === 1 ? 'library' : 'libraries'} that need attention:\\n`, 'info');

  // Show what will be done
  if (suggestions.toFetch.length > 0) {
    console.log(`Will fetch (${suggestions.toFetch.length}):`);
    suggestions.toFetch.forEach(item => {
      console.log(`  - ${item.library} v${item.version}`);
    });
    console.log('');
  }

  if (suggestions.toUpdate.length > 0) {
    console.log(`Will update (${suggestions.toUpdate.length}):`);
    suggestions.toUpdate.forEach(item => {
      console.log(`  - ${item.library} (${item.cached} → ${item.required})`);
    });
    console.log('');
  }

  // Fetch missing documentation
  for (const item of suggestions.toFetch) {
    try {
      log(`\\n--- Fetching ${item.library} v${item.version} ---`, 'info');

      const dep = detection.dependencies.find(
        d => d.normalizedName === item.library
      );

      // Try to construct a documentation URL
      const docUrl = guessDocUrl(item.library);

      await fetchDocumentation(item.library, item.version, {
        url: docUrl
      });

      // Generate skill if auto-enabled
      if (config.auto_generate_skills) {
        await generateSkill(item.library, item.version, {});
      }

      log(`✓ ${item.library} fetched successfully`, 'info');
    } catch (error) {
      log(`✗ Failed to fetch ${item.library}: ${error.message}`, 'error');
      log(`  Try manually: /fetch-docs ${item.library} --url <docs-url>`, 'info');
    }
  }

  // Update outdated documentation
  for (const item of suggestions.toUpdate) {
    try {
      log(`\\n--- Updating ${item.library} ---`, 'info');

      const cached = detection.cachedLibraries.find(
        lib => lib.name === item.library
      );

      if (cached) {
        await fetchDocumentation(item.library, item.required, {
          url: cached.metadata.source_url
        });

        if (cached.metadata.skill_generated) {
          await generateSkill(item.library, item.required, {});
        }

        log(`✓ ${item.library} updated`, 'info');
      }
    } catch (error) {
      log(`✗ Failed to update ${item.library}: ${error.message}`, 'error');
    }
  }

  log(`\\n✓ Project documentation update complete\\n`, 'info');
}

/**
 * Guess documentation URL from library name
 */
function guessDocUrl(library) {
  const commonUrls = {
    'nextjs': 'https://nextjs.org/docs',
    'react': 'https://react.dev',
    'vue': 'https://vuejs.org/guide',
    'supabase': 'https://supabase.com/docs',
    'tailwind': 'https://tailwindcss.com/docs',
    'django': 'https://docs.djangoproject.com',
    'flask': 'https://flask.palletsprojects.com',
    'fastapi': 'https://fastapi.tiangolo.com'
  };

  return commonUrls[library] || `https://${library}.dev/docs`;
}

/**
 * CLI setup
 */
program
  .name('update-docs')
  .description('Update cached documentation to latest version')
  .argument('[library]', 'Library name to update (e.g., nextjs)')
  .option('-a, --all', 'Update all cached documentation')
  .option('-p, --project', 'Update documentation for current project dependencies')
  .option('--path <path>', 'Project path (for --project flag)', process.cwd())
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
