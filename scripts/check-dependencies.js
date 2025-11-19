/**
 * Check if plugin dependencies are installed
 * @module check-dependencies
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Check if node_modules exists in the plugin directory
 * @returns {Promise<{installed: boolean, pluginDir: string, nodeModulesPath: string}>}
 */
export async function checkDependencies() {
  const pluginDir = path.dirname(__dirname);
  const nodeModulesPath = path.join(pluginDir, 'node_modules');

  try {
    await fs.access(nodeModulesPath);
    return {
      installed: true,
      pluginDir,
      nodeModulesPath
    };
  } catch {
    return {
      installed: false,
      pluginDir,
      nodeModulesPath
    };
  }
}

/**
 * Verify dependencies are installed, exit with error if not
 * @param {string} scriptName - Name of the script being run
 */
export async function verifyDependencies(scriptName = 'this script') {
  const result = await checkDependencies();

  if (!result.installed) {
    console.error('\n✗ Error: Plugin dependencies not installed\n');
    console.error(`The doc-fetcher plugin requires dependencies to be installed before ${scriptName} can run.\n`);
    console.error('To install dependencies, run:\n');
    console.error(`  cd ${result.pluginDir}`);
    console.error('  npm install\n');
    console.error('Then try running the command again.\n');
    process.exit(1);
  }
}

export default { checkDependencies, verifyDependencies };
