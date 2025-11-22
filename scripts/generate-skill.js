#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { verifyDependencies } from './check-dependencies.js';
import {
  loadConfig,
  getCacheDir,
  getLibraryPath,
  loadMetadata,
  getPluginDir,
  ensureDir,
  log,
  formatRelativeTime,
  listCachedLibraries
} from './utils.js';
import {
  validateLibraryName,
  validateVersion,
  validateTemplate,
  validatePath,
  formatValidationError,
  ValidationError
} from './validate.js';
import { analyzeDocumentation, generateActivationPatterns } from './analyze-docs.js';
import { generateExpertTemplate } from './templates/expert.js';
import { generateQuickReferenceTemplate } from './templates/quick-reference.js';
import { generateMigrationGuideTemplate } from './templates/migration-guide.js';
import { generateTroubleshooterTemplate } from './templates/troubleshooter.js';
import { generateBestPracticesTemplate } from './templates/best-practices.js';

const program = new Command();

// All available templates
const ALL_TEMPLATES = ['expert', 'quick-reference', 'migration-guide', 'troubleshooter', 'best-practices'];

/**
 * Load sitemap from cached docs
 */
async function loadSitemap(docsPath) {
  const sitemapPath = path.join(docsPath, 'sitemap.json');
  try {
    const content = await fs.readFile(sitemapPath, 'utf-8');
    const sitemap = JSON.parse(content);
    return sitemap.pages || [];
  } catch (error) {
    return [];
  }
}

/**
 * Generate skill content using analysis and templates
 */
async function generateSkillContent(library, metadata, docsPath, cacheDir, template = 'expert') {
  log('[1/3] Analyzing documentation...', 'info');

  // Run comprehensive analysis
  const analysis = await analyzeDocumentation(docsPath, {
    includeTopics: true,
    includeCodeExamples: true,
    includeAPIMethods: true,
    includeKeywords: true,
    includeHierarchy: true,
    topKeywords: 50,
    verbose: false
  });

  log(`  ✓ Analyzed ${analysis.summary.totalPages} pages`, 'info');
  log(`  ✓ Found ${analysis.summary.topicCount} topics, ${analysis.summary.codeExampleCount} examples`, 'info');

  // Load sitemap for documentation index
  const sitemap = await loadSitemap(docsPath);
  log(`  ✓ Loaded sitemap with ${sitemap.length} pages`, 'info');

  // Generate activation patterns based on analysis
  const activationPatterns = generateActivationPatterns(analysis, library);

  log('[2/3] Generating skill from template...', 'info');

  // Template parameters
  const templateParams = {
    library,
    version: metadata.version,
    docsPath: docsPath,  // Use absolute path since docs are in user's home directory
    cacheDir,
    analysis,
    activationPatterns,
    sitemap  // Add sitemap for documentation index
  };

  // Generate content based on template type
  let content;

  switch (template) {
    case 'expert':
      content = generateExpertTemplate(templateParams);
      break;

    case 'quick-reference':
      content = generateQuickReferenceTemplate(templateParams);
      break;

    case 'migration-guide':
      content = await generateMigrationGuideTemplate(templateParams);
      break;

    case 'troubleshooter':
      content = generateTroubleshooterTemplate(templateParams);
      break;

    case 'best-practices':
      content = generateBestPracticesTemplate(templateParams);
      break;

    default:
      throw new Error(`Unknown template: ${template}`);
  }

  const majorVersion = metadata.version.split('.')[0];
  const skillName = `${library}-${majorVersion}-${template}`;

  log(`  ✓ Generated ${template} template`, 'info');

  return {
    skillName,
    content,
    analysis
  };
}

/**
 * Save skill to file
 */
async function saveSkill(skillName, content, template) {
  const home = os.homedir();
  const skillsDir = path.join(home, '.claude', 'skills');
  const skillDir = path.join(skillsDir, skillName);

  await ensureDir(skillDir);

  const skillPath = path.join(skillDir, 'SKILL.md');
  await fs.writeFile(skillPath, content, 'utf-8');

  // Create metadata file
  const metadataPath = path.join(skillDir, '.doc-reference.json');
  const metadata = {
    generated_at: new Date().toISOString(),
    auto_generated: true,
    template_used: template
  };
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  return skillPath;
}

/**
 * Generate skill from cached documentation
 */
async function generateSkill(library, version, options) {
  // Validate inputs
  try {
    library = validateLibraryName(library);
    version = validateVersion(version);

    if (options.template && options.template !== 'all') {
      options.template = validateTemplate(options.template);
    }

    if (options.output) {
      options.output = await validatePath(options.output, 'output path');
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new Error(formatValidationError(error));
    }
    throw error;
  }

  // Determine which templates to generate
  const templatesToGenerate = (!options.template || options.template === 'all')
    ? ALL_TEMPLATES
    : [options.template];

  const generateAll = templatesToGenerate.length > 1;

  if (generateAll) {
    log(`\nGenerating all ${templatesToGenerate.length} skill templates for ${library}${version ? ` v${version}` : ''}...\n`, 'info');
  } else {
    log(`\nGenerating ${templatesToGenerate[0]} skill for ${library}${version ? ` v${version}` : ''}...\n`, 'info');
  }

  // Load config
  const config = await loadConfig();
  const cacheDir = config.cache_directory || getCacheDir();

  // Resolve version if not specified
  let actualVersion = version;
  if (!actualVersion) {
    const libraries = await listCachedLibraries(cacheDir);
    const cachedVersions = libraries.filter(lib => lib.name === library);

    if (cachedVersions.length === 0) {
      throw new Error(`No cached documentation found for ${library}. Run /fetch-docs ${library} first.`);
    }

    actualVersion = cachedVersions[0].version;
    log(`Using cached version: ${actualVersion}`, 'info');
  }

  // Load metadata
  const libraryPath = getLibraryPath(cacheDir, library, actualVersion);
  const metadata = await loadMetadata(libraryPath);

  if (!metadata) {
    throw new Error(`No cached documentation found for ${library}. Run /fetch-docs ${library} first.`);
  }

  // Check if pages directory exists
  const pagesPath = path.join(libraryPath, 'pages');
  try {
    await fs.access(pagesPath);
  } catch (error) {
    throw new Error(`No documentation pages found at ${pagesPath}. The documentation may not have been fetched correctly.`);
  }

  // Store results for all generated skills
  const results = [];
  let sharedAnalysis = null;

  // Generate each template
  for (let i = 0; i < templatesToGenerate.length; i++) {
    const template = templatesToGenerate[i];

    if (generateAll) {
      log(`\n[${i + 1}/${templatesToGenerate.length}] Generating ${template} template...`, 'info');
    }

    // Generate skill content with analysis (reuse analysis for subsequent templates)
    const { skillName, content, analysis } = await generateSkillContent(
      library,
      metadata,
      libraryPath,
      cacheDir,
      template
    );

    // Store analysis for reuse and metadata update
    if (!sharedAnalysis) {
      sharedAnalysis = analysis;
    }

    // Save skill
    if (!generateAll) {
      log('[3/3] Saving skill...', 'info');
    }
    const skillPath = await saveSkill(skillName, content, template);

    results.push({
      skillName,
      skillPath,
      template
    });

    if (generateAll) {
      log(`  ✓ ${skillName}`, 'info');
    }
  }

  // Update metadata to mark skills as generated
  metadata.skill_generated = true;
  metadata.skill_templates = templatesToGenerate;
  metadata.skill_paths = results.map(r => `skills/${r.skillName}`);
  metadata.skill_analysis_summary = {
    topics: sharedAnalysis.summary.topicCount,
    examples: sharedAnalysis.summary.codeExampleCount,
    methods: sharedAnalysis.summary.apiMethodCount,
    keywords: sharedAnalysis.summary.keywordCount
  };

  const metadataPath = path.join(libraryPath, 'index.json');
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  if (generateAll) {
    log(`\n✓ All ${results.length} skills generated successfully!\n`, 'info');
    results.forEach(r => {
      log(`  - ${r.skillName}: ${r.skillPath}`, 'info');
    });
    log(`\n  Analysis: ${sharedAnalysis.summary.topicCount} topics, ${sharedAnalysis.summary.codeExampleCount} examples, ${sharedAnalysis.summary.apiMethodCount} methods\n`, 'info');
    log(`The skills are now active. Ask me anything about ${library} ${metadata.version}!\n`, 'info');
  } else {
    const result = results[0];
    log(`\n✓ Skill generated successfully!\n`, 'info');
    log(`  Name: ${result.skillName}`, 'info');
    log(`  Template: ${result.template}`, 'info');
    log(`  Location: ${result.skillPath}`, 'info');
    log(`  Auto-activation: enabled`, 'info');
    log(`  Analysis: ${sharedAnalysis.summary.topicCount} topics, ${sharedAnalysis.summary.codeExampleCount} examples, ${sharedAnalysis.summary.apiMethodCount} methods\n`, 'info');
    log(`The skill is now active. Ask me anything about ${library} ${metadata.version}!\n`, 'info');
  }

  return generateAll ? results : results[0];
}

/**
 * CLI setup
 */
program
  .name('generate-skill')
  .description('Generate a Claude Code skill from cached documentation')
  .argument('<library>', 'Library name (e.g., nextjs, react)')
  .argument('[version]', 'Specific version (defaults to latest)')
  .option('-t, --template <template>', 'Skill template: expert, quick-reference, migration-guide, troubleshooter, best-practices, or "all" to generate all templates (default: all)')
  .option('-o, --output <path>', 'Custom output path')
  .action(async (library, version, options) => {
    try {
      await generateSkill(library, version, options);
      process.exit(0);
    } catch (error) {
      log(`\n✗ Error: ${error.message}\n`, 'error');
      if (process.env.DEBUG) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Only run CLI if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  // Verify plugin dependencies are installed
  await verifyDependencies('generate-skill');
  program.parse();
}

export default generateSkill;
