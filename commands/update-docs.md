---
description: Update cached documentation to the latest version or refresh existing docs
allowed-tools: Bash(node:*)
argument-hint: [library] [--all] [--project] [--force]
---

# Update Documentation

Check for and update outdated documentation in the current project's `.claude/docs` directory.

## Current Context

- Current working directory: !`pwd`

## Your Task

When the user invokes this command, follow these steps:

1. **Parse Arguments**: The user provided: `$ARGUMENTS`
   - If no arguments: prompt user to specify a library, use `--all`, or use `--project`
   - Valid flags: `--all` (update all cached docs), `--project` (update project dependencies), `--force` (force re-fetch)

2. **Run Update Command**:
   - Execute: `node ~/.claude/plugins/cache/doc-fetcher/scripts/update-docs.js $ARGUMENTS --path "$(pwd)"`
   - The `--path` argument tells the script to operate on the **current project directory**
   - The script will check the project's `.claude/docs` directory for cached documentation
   - Wait for completion and capture the output

3. **Handle Results**:
   - If successful: Report what was updated (libraries, versions, page counts)
   - If no updates needed: Inform the user their docs are current
   - If errors occur: Show the error and suggest next steps

4. **Error Handling**:
   - If documentation not found: Suggest using `/fetch-docs` first
   - If network errors: Suggest retrying or checking connection
   - If rate limited: Suggest waiting or increasing `crawl_delay_ms` in config
   - If script not found: Verify the doc-fetcher plugin is installed

5. **Next Steps**: If updates were made and skills exist, remind the user that associated skills have been automatically regenerated.

## Important Notes

- The script runs from the plugin directory: `~/.claude/plugins/cache/doc-fetcher/`
- The `--path` parameter tells it which project to operate on (current directory)
- The cache directory is configured in `doc-fetcher-config.json` and defaults to `.claude/docs` in the project
- Updates check for newer versions and re-fetch if available
- Use `--force` to re-fetch even if recently updated
- The `--project` flag reads the project's `package.json` dependencies and updates matching docs
