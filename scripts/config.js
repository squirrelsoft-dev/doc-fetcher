#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { loadConfig, getPluginDir, log } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

/**
 * Configuration schema with descriptions and validation
 */
const CONFIG_SCHEMA = {
  crawl_delay_ms: {
    type: 'number',
    default: 1000,
    description: 'Delay between page fetches (ms). Increase if rate limited.'
  },
  max_pages_per_fetch: {
    type: 'number',
    default: 500,
    description: 'Maximum pages to fetch per library.'
  },
  auto_generate_skills: {
    type: 'boolean',
    default: true,
    description: 'Automatically generate skills after fetching docs.'
  },
  auto_detect_dependencies: {
    type: 'boolean',
    default: true,
    description: 'Auto-detect project dependencies for smart suggestions.'
  },
  fetch_llms_urls: {
    type: 'boolean',
    default: true,
    description: 'Fetch individual pages from llms.txt files.'
  },
  timeout_ms: {
    type: 'number',
    default: 30000,
    description: 'Request timeout in milliseconds.'
  },
  max_retries: {
    type: 'number',
    default: 3,
    description: 'Number of retry attempts on network failure.'
  },
  enable_checkpoints: {
    type: 'boolean',
    default: true,
    description: 'Enable resume for interrupted fetches.'
  },
  checkpoint_interval: {
    type: 'number',
    default: 10,
    description: 'Pages between checkpoint saves.'
  },
  checkpoint_max_age_days: {
    type: 'number',
    default: 7,
    description: 'Days before checkpoints expire.'
  },
  respect_robots_txt: {
    type: 'boolean',
    default: true,
    description: 'Honor robots.txt crawl rules.'
  },
  user_agent: {
    type: 'string',
    default: 'Claude Code Doc Fetcher/1.0',
    description: 'User agent string for HTTP requests.'
  },
  cache_directory: {
    type: 'string',
    default: 'docs',
    description: 'Cache directory (relative to ~/.claude or absolute).'
  },
  remote_sync: {
    type: 'boolean',
    default: false,
    description: 'Sync cache with remote server.'
  },
  remote_sync_url: {
    type: 'string',
    default: 'https://squirrelsoft.dev/api/docs',
    description: 'Remote sync endpoint URL.'
  }
};

/**
 * Get the config file path
 */
function getConfigPath() {
  return path.join(getPluginDir(), 'doc-fetcher-config.json');
}

/**
 * Get the backup directory path
 */
function getBackupDir() {
  return path.join(os.homedir(), '.claude', 'doc-fetcher');
}

/**
 * Create a backup of the current config
 */
async function createBackup() {
  const configPath = getConfigPath();
  const backupDir = getBackupDir();

  // Ensure backup directory exists
  await fs.mkdir(backupDir, { recursive: true });

  // Check if config exists
  try {
    await fs.access(configPath);
  } catch {
    // No config to backup
    return null;
  }

  // Create timestamped backup filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `doc-fetcher-config.${timestamp}.json`;
  const backupPath = path.join(backupDir, backupFilename);

  // Copy config to backup
  await fs.copyFile(configPath, backupPath);

  return backupPath;
}

/**
 * Load raw config from file
 */
async function loadRawConfig() {
  const configPath = getConfigPath();
  try {
    const data = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

/**
 * Save config to file (with automatic backup)
 */
async function saveConfig(config) {
  // Create backup before saving
  const backupPath = await createBackup();
  if (backupPath) {
    console.log(`  💾 Backup saved: ${path.basename(backupPath)}`);
  }

  const configPath = getConfigPath();
  await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

/**
 * Get default configuration
 */
function getDefaults() {
  const defaults = {};
  for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
    defaults[key] = schema.default;
  }
  // Add frameworks_priority which has a complex default
  defaults.frameworks_priority = [
    'llms.txt',
    'claude.txt',
    'sitemap.xml',
    'docusaurus',
    'vitepress',
    'nextra'
  ];
  return defaults;
}

/**
 * Parse a value according to the expected type
 */
function parseValue(key, value) {
  const schema = CONFIG_SCHEMA[key];
  if (!schema) {
    throw new Error(`Unknown configuration key: ${key}`);
  }

  switch (schema.type) {
    case 'boolean':
      if (value === 'true') return true;
      if (value === 'false') return false;
      throw new Error(`Invalid boolean value for ${key}: "${value}". Use "true" or "false".`);

    case 'number':
      const num = parseInt(value, 10);
      if (isNaN(num)) {
        throw new Error(`Invalid number value for ${key}: "${value}". Must be an integer.`);
      }
      return num;

    case 'string':
      return value;

    default:
      return value;
  }
}

/**
 * Show current configuration
 */
async function showConfig(options) {
  const config = await loadRawConfig();
  const defaults = getDefaults();

  console.log('\n📋 Doc-Fetcher Configuration\n');
  console.log(`Config file: ${getConfigPath()}\n`);
  console.log('─'.repeat(80));

  // Group settings by category
  const categories = {
    'Fetching': ['crawl_delay_ms', 'max_pages_per_fetch', 'timeout_ms', 'max_retries', 'user_agent'],
    'Behavior': ['auto_generate_skills', 'auto_detect_dependencies', 'fetch_llms_urls', 'respect_robots_txt'],
    'Checkpoints': ['enable_checkpoints', 'checkpoint_interval', 'checkpoint_max_age_days'],
    'Storage': ['cache_directory', 'remote_sync', 'remote_sync_url']
  };

  for (const [category, keys] of Object.entries(categories)) {
    console.log(`\n${category}:`);
    console.log('─'.repeat(40));

    for (const key of keys) {
      const schema = CONFIG_SCHEMA[key];
      if (!schema) continue;

      const currentValue = config[key] !== undefined ? config[key] : defaults[key];
      const isDefault = config[key] === undefined;
      const defaultMarker = isDefault ? ' (default)' : '';

      // Format value for display
      let displayValue = currentValue;
      if (typeof currentValue === 'boolean') {
        displayValue = currentValue ? '✓ true' : '✗ false';
      } else if (typeof currentValue === 'number') {
        displayValue = currentValue.toLocaleString();
      }

      console.log(`  ${key}:`);
      console.log(`    Value: ${displayValue}${defaultMarker}`);
      if (options.verbose) {
        console.log(`    ${schema.description}`);
      }
    }
  }

  if (!options.verbose) {
    console.log('\n💡 Use --show --verbose for descriptions');
  }
  console.log('\n💡 Use --set <key> <value> to change a setting');
  console.log('💡 Use --reset to restore defaults\n');
}

/**
 * Set a configuration value
 */
async function setConfig(key, value) {
  // Validate key
  if (!CONFIG_SCHEMA[key]) {
    console.log(`\n✗ Unknown configuration key: "${key}"\n`);
    console.log('Valid keys:');
    for (const k of Object.keys(CONFIG_SCHEMA)) {
      console.log(`  - ${k}`);
    }
    console.log('');
    process.exit(1);
  }

  // Parse and validate value
  let parsedValue;
  try {
    parsedValue = parseValue(key, value);
  } catch (error) {
    console.log(`\n✗ ${error.message}\n`);
    process.exit(1);
  }

  // Load current config, update, and save
  const config = await loadRawConfig();
  const oldValue = config[key];
  config[key] = parsedValue;
  await saveConfig(config);

  console.log(`\n✓ Updated ${key}`);
  if (oldValue !== undefined) {
    console.log(`  Old value: ${oldValue}`);
  }
  console.log(`  New value: ${parsedValue}\n`);
}

/**
 * Reset configuration to defaults
 */
async function resetConfig() {
  const defaults = getDefaults();
  await saveConfig(defaults);

  console.log('\n✓ Configuration reset to defaults\n');
  console.log('Default values restored:');
  for (const [key, value] of Object.entries(defaults)) {
    if (Array.isArray(value)) {
      console.log(`  ${key}: [${value.join(', ')}]`);
    } else {
      console.log(`  ${key}: ${value}`);
    }
  }
  console.log('');
}

/**
 * Show config file path
 */
function showPath() {
  console.log(`\n📁 Config file location:\n   ${getConfigPath()}\n`);
}

/**
 * CLI setup
 */
program
  .name('config')
  .description('View and modify doc-fetcher configuration')
  .option('-s, --show', 'Show current configuration')
  .option('-v, --verbose', 'Show detailed descriptions')
  .option('-p, --path', 'Show config file path')
  .option('-r, --reset', 'Reset to default configuration')
  .option('--set <key> <value>', 'Set a configuration value')
  .action(async (options, command) => {
    try {
      // Handle --set with two arguments
      const args = command.args;
      if (options.set) {
        // --set was used, options.set has the key, first arg has the value
        const value = args[0];
        if (!value) {
          console.log('\n✗ Missing value. Usage: --set <key> <value>\n');
          process.exit(1);
        }
        await setConfig(options.set, value);
      } else if (options.reset) {
        await resetConfig();
      } else if (options.path) {
        showPath();
      } else {
        // Default: show config
        await showConfig({ verbose: options.verbose });
      }
      process.exit(0);
    } catch (error) {
      console.log(`\n✗ Error: ${error.message}\n`);
      process.exit(1);
    }
  });

// Only run CLI if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { showConfig, setConfig, resetConfig, getConfigPath, CONFIG_SCHEMA };
