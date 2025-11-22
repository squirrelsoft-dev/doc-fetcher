---
description: View and modify doc-fetcher configuration settings
allowed-tools: Bash(node:*), Bash(ls:*), Bash(cp:*), Read, AskUserQuestion
argument-hint: [--show] [--set <key> <value>] [--reset] [--restore]
---

# Doc-Fetcher Configuration

View and modify doc-fetcher plugin configuration settings.

## Current Context

- Current working directory: !`pwd`

## Your Task

When the user invokes this command, follow these steps:

1. **Parse Arguments**: The user provided: `$ARGUMENTS`
   - `--show` or no arguments: Display current configuration with explanations
   - `--set <key> <value>`: Update a specific configuration value
   - `--reset`: Reset configuration to defaults
   - `--path`: Show the config file path
   - `--restore`: Restore configuration from a backup (see step 6)

1.5. **INSTALL DEPENDENCIES**: If ~/.claude/plugins/cache/doc-fetcher/node_modules doesn't exist then execute `cd ~/.claude/plugins/cache/doc-fetcher && npm install` after installation change the directory back to the project workspace root.

2. **Run Config Command**:
   - Execute: `node ~/.claude/plugins/cache/doc-fetcher/scripts/config.js $ARGUMENTS`
   - The script handles:
     - Displaying current configuration with descriptions
     - Validating and updating configuration values
     - Resetting to default values
     - Showing config file location

3. **Handle Results**:
   - For `--show`: Display a formatted table of all settings with current values and descriptions
   - For `--set`: Confirm the change was made and show the new value
   - For `--reset`: Confirm defaults were restored
   - For `--path`: Show the full path to the config file

4. **Available Settings**:

   | Setting | Type | Description |
   |---------|------|-------------|
   | `crawl_delay_ms` | number | Delay between page fetches (ms). Increase if rate limited. |
   | `max_pages_per_fetch` | number | Maximum pages to fetch per library. |
   | `auto_generate_skills` | boolean | Automatically generate skills after fetching docs. |
   | `timeout_ms` | number | Request timeout in milliseconds. |
   | `max_retries` | number | Number of retry attempts on network failure. |
   | `enable_checkpoints` | boolean | Enable resume for interrupted fetches. |
   | `checkpoint_interval` | number | Pages between checkpoint saves. |
   | `respect_robots_txt` | boolean | Honor robots.txt crawl rules. |
   | `fetch_llms_urls` | boolean | Fetch individual pages from llms.txt files. |
   | `user_agent` | string | User agent string for HTTP requests. |

5. **Error Handling**:
   - If invalid key: Show list of valid configuration keys
   - If invalid value type: Show expected type and example
   - If config file missing: Will be created with defaults
   - If permission error: Suggest checking file permissions

6. **Handle --restore** (DO NOT run the node script for this):
   - List backup files: `ls -la ~/.claude/doc-fetcher/`
   - If no backups exist, inform the user and exit
   - Display the backups as a numbered list with timestamps (parse from filename format: `doc-fetcher-config.YYYY-MM-DDTHH-MM-SS-MMMZ.json`)
   - Use AskUserQuestion to ask the user which backup to restore (show numbers 1, 2, 3, etc.)
   - After user selection, copy the selected backup:
     `cp ~/.claude/doc-fetcher/<selected-backup-file> ~/.claude/plugins/cache/doc-fetcher/doc-fetcher-config.json`
   - Confirm the restore was successful

## Examples

```bash
# Show all current settings
/doc-fetcher:config

# Show config with full details
/doc-fetcher:config --show

# Increase crawl delay to avoid rate limiting
/doc-fetcher:config --set crawl_delay_ms 2000

# Disable automatic skill generation
/doc-fetcher:config --set auto_generate_skills false

# Reset all settings to defaults
/doc-fetcher:config --reset

# Show config file location
/doc-fetcher:config --path

# Restore from a previous backup
/doc-fetcher:config --restore
```

## Important Notes

- Configuration is stored in `~/.claude/plugins/cache/doc-fetcher/doc-fetcher-config.json`
- **Automatic backups**: Every config change creates a timestamped backup in `~/.claude/doc-fetcher/`
- Use `--restore` to restore from any previous backup
- Changes take effect immediately for new commands
- Boolean values: use `true` or `false`
- Number values: integers only (no quotes needed)
- String values: can include spaces if quoted
