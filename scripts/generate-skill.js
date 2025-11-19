#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import {
  loadConfig,
  getCacheDir,
  getLibraryPath,
  loadMetadata,
  getPluginDir,
  ensureDir,
  log,
  formatRelativeTime
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

  // Generate activation patterns based on analysis
  const activationPatterns = generateActivationPatterns(analysis, library);

  log('[2/3] Generating skill from template...', 'info');

  // Template parameters
  const templateParams = {
    library,
    version: metadata.version,
    docsPath: path.relative(process.cwd(), docsPath),
    cacheDir,
    analysis,
    activationPatterns
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
  const pluginDir = getPluginDir();
  const skillsDir = path.join(pluginDir, 'skills');
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

    if (options.template) {
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

  const template = options.template || 'expert';

  log(`\nGenerating ${template} skill for ${library}${version ? ` v${version}` : ''}...\n`, 'info');

  // Load config
  const config = await loadConfig();
  const cacheDir = config.cache_directory || getCacheDir();

  // Load metadata
  const libraryPath = getLibraryPath(cacheDir, library, version || 'latest');
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

  // Generate skill content with analysis
  const { skillName, content, analysis } = await generateSkillContent(
    library,
    metadata,
    libraryPath,
    cacheDir,
    template
  );

  // Save skill
  log('[3/3] Saving skill...', 'info');
  const skillPath = await saveSkill(skillName, content, template);

  // Update metadata to mark skill as generated
  metadata.skill_generated = true;
  metadata.skill_path = `skills/${skillName}`;
  metadata.skill_template = template;
  metadata.skill_analysis_summary = {
    topics: analysis.summary.topicCount,
    examples: analysis.summary.codeExampleCount,
    methods: analysis.summary.apiMethodCount,
    keywords: analysis.summary.keywordCount
  };

  const metadataPath = path.join(libraryPath, 'index.json');
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  log(`\n✓ Skill generated successfully!\n`, 'info');
  log(`  Name: ${skillName}`, 'info');
  log(`  Template: ${template}`, 'info');
  log(`  Location: ${skillPath}`, 'info');
  log(`  Auto-activation: enabled`, 'info');
  log(`  Analysis: ${analysis.summary.topicCount} topics, ${analysis.summary.codeExampleCount} examples, ${analysis.summary.apiMethodCount} methods\n`, 'info');

  log(`The skill is now active. Ask me anything about ${library} ${metadata.version}!\n`, 'info');

  return {
    skillName,
    skillPath,
    library,
    version: metadata.version,
    template,
    analysis: analysis.summary
  };
}

/**
 * CLI setup
 */
program
  .name('generate-skill')
  .description('Generate a Claude Code skill from cached documentation')
  .argument('<library>', 'Library name (e.g., nextjs, react)')
  .argument('[version]', 'Specific version (defaults to latest)')
  .option('-t, --template <template>', 'Skill template: expert, quick-reference, migration-guide, troubleshooter, best-practices', 'expert')
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

program.parse();

export default generateSkill;
