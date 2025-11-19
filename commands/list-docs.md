---
description: List all cached documentation with versions, sizes, and metadata
allowed-tools: Bash(npm run list:*)
argument-hint: [--project] [--verbose]
---

# List Documentation

Display all cached documentation from the project's `.claude/docs` directory including versions, sizes, update times, and associated skills.

## Current Context

- Current working directory: !`pwd`
- Cache directory location: !`cat doc-fetcher-config.json | grep cache_directory`

## Your Task

When the user invokes this command, follow these steps:

1. **Parse Arguments**: The user provided: `$ARGUMENTS`
   - `--project`: Show only docs relevant to current project's package.json dependencies
   - `--verbose`: Show detailed information including page counts, sources, and full metadata
   - If no arguments: show default view (all cached docs)

2. **Run List Command**:
   - Execute: `npm run list -- $ARGUMENTS`
   - The script will scan the **`.claude/docs` directory** (in the project) and display:
     - Library names and versions
     - Number of pages cached
     - Storage sizes
     - Last update times
     - Associated skills (if any)
   - Capture and display the output

3. **Present Results**:
   - Show the formatted output from the list command
   - If using `--project` flag:
     - Highlight which dependencies are cached and current
     - Identify missing or outdated documentation
     - Suggest fetch/update commands for missing/outdated docs
   - If using `--verbose` flag:
     - Show detailed metadata (source URLs, frameworks, page counts, local paths)

4. **Provide Suggestions**:
   - If docs are outdated: Suggest `/update-docs [library]`
   - If docs are missing for project dependencies: Suggest `/fetch-docs [library]`
   - If old versions exist: Mention cleanup options

5. **Error Handling**:
   - If cache directory doesn't exist: Inform user no docs are cached yet, suggest fetching docs
   - If cache directory is empty: Suggest using `/fetch-docs` to start caching documentation
   - If package.json not found (when using `--project`): Inform user and fall back to showing all cached docs

## Important Notes

- The list command is fast (reads index files only, doesn't scan page content)
- The cache directory is configured in `doc-fetcher-config.json` (defaults to `.claude/docs` in project directory)
- Use `--project` to see which of your project's dependencies have cached documentation
- Use `--verbose` for complete details including source URLs and local paths
