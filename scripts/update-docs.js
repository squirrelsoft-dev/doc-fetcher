#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fetchDocumentation, { incrementalUpdate } from './fetch-docs.js';
import generateSkill from './generate-skill.js';
import {
  loadConfig,
  getCacheDir,
  getLibraryPath,
  listCachedLibraries,
  log
} from './utils.js';
import { detectDependencies, getSuggestions } from './detect-dependencies.js';
import {
  validateLibraryName,
  validatePath,
  formatValidationError,
  ValidationError
} from './validate.js';
import {
  compareSitemaps,
  loadCachedSitemap,
  formatComparisonSummary
} from './compare-sitemaps.js';
import { parseSitemap } from './parse-sitemap.js';
import { RobotsChecker } from './robots-checker.js';
import {
  detectInterruptedFetch,
  loadCheckpoint,
  formatCheckpointInfo
} from './checkpoint-manager.js';

const program = new Command();

/**
 * Check for incremental updates and return comparison results
 * @param {string} library - Library name
 * @param {Object} existing - Existing cached library metadata
 * @param {Object} config - Configuration object
 * @returns {Promise<Object|null>} Comparison results or null if can't do incremental
 */
async function checkIncrementalUpdate(library, existing, config) {
  try {
    // Load cached sitemap
    const cacheDir = config.cache_directory || getCacheDir();
    const libraryPath = getLibraryPath(cacheDir, library, existing.version);
    const cachedSitemap = await loadCachedSitemap(libraryPath);

    if (!cachedSitemap) {
      log('No cached sitemap found - will do full fetch', 'debug');
      return null;
    }

    // Only sitemap-based documentation supports incremental updates
    if (existing.metadata.source_type !== 'sitemap') {
      log('Source type is not sitemap - will do full fetch', 'debug');
      return null;
    }

    // Fetch new sitemap from source
    log('[1/3] Fetching latest sitemap...', 'info');
    const docUrl = existing.metadata.source_url;

    const robotsChecker = new RobotsChecker(docUrl, config);
    await robotsChecker.init();
    const robotsSitemaps = robotsChecker.getSitemaps();

    const sitemapResult = await parseSitemap(docUrl, config, robotsChecker, robotsSitemaps);

    // Build new sitemap structure from fullEntries
    const newSitemap = {
      pages: sitemapResult.fullEntries.map(entry => ({
        url: entry.loc,
        lastmod: entry.lastmod || null,
        changefreq: entry.changefreq || null,
        priority: entry.priority || null
      }))
    };

    // Compare sitemaps
    log('[2/3] Comparing with cached version...', 'info');
    const comparison = compareSitemaps(cachedSitemap, newSitemap);

    // Display comparison summary
    log(formatComparisonSummary(comparison), 'info');

    return {
      comparison,
      newSitemap,
      sitemapResult,
      robotsChecker,
      libraryPath
    };

  } catch (error) {
    log(`Incremental update check failed: ${error.message}`, 'warn');
    log('Falling back to full fetch', 'info');
    return null;
  }
}

/**
 * Update cached documentation
 */
async function updateDocs(library, options) {
  // Validate inputs
  try {
    if (library) {
      library = validateLibraryName(library);
    }

    if (options.path) {
      options.path = await validatePath(options.path, 'path', { mustExist: true, mustBeDirectory: true });
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new Error(formatValidationError(error));
    }
    throw error;
  }

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

    let result;

    // Check for interrupted update (unless --force is specified)
    const enableCheckpoint = config.enable_checkpoints !== false; // Default true

    if (enableCheckpoint && !options.force) {
      const libraryPath = getLibraryPath(cacheDir, library, existing.version);
      const interruptionCheck = await detectInterruptedFetch(libraryPath);

      if (interruptionCheck.interrupted && interruptionCheck.canResume) {
        log(`\\n🔄 Detected interrupted update!`, 'warn');
        log(formatCheckpointInfo(interruptionCheck.checkpoint), 'info');
        log(`\\n▶️  Resuming from checkpoint...\\n`, 'info');

        // The resume will be handled by fetchDocumentation or incrementalUpdate
        // which will automatically load the checkpoint
      }
    }

    // Try incremental update unless --force is specified
    if (!options.force) {
      const incrementalResult = await checkIncrementalUpdate(library, existing, config);

      if (incrementalResult && incrementalResult.comparison.hasChanges) {
        // Perform incremental update
        result = await incrementalUpdate(
          library,
          existing.version,
          incrementalResult.sitemapResult.fullEntries,
          incrementalResult.comparison,
          incrementalResult.libraryPath,
          config,
          incrementalResult.robotsChecker
        );
      } else if (incrementalResult && !incrementalResult.comparison.hasChanges) {
        // No changes detected
        log(`\\n✓ ${library} is already up to date\\n`, 'info');
        return;
      } else {
        // Incremental update not possible, fall back to full fetch
        log('\\nPerforming full update...', 'info');
        result = await fetchDocumentation(library, null, {
          url: existing.metadata.source_url
        });
      }
    } else {
      // Force full re-fetch
      log('\\n--force flag specified, performing full re-fetch...', 'info');
      result = await fetchDocumentation(library, null, {
        url: existing.metadata.source_url
      });
    }

    // Regenerate skill if it was previously generated
    if (existing.metadata.skill_generated) {
      log('\\nRegenerating skill...', 'info');
      await generateSkill(library, result.version, {});
    }

    log(`\\n✓ ${library} updated successfully\\n`, 'info');

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
