---
description: Fetch and cache documentation for a library with version-specific snapshots
allowed-tools: Bash(npm run fetch:*), Bash(npm run list:*)
argument-hint: <library> [version] [--url <custom-url>]
---

# Fetch Documentation

Fetch and cache documentation for a specified library, creating a local snapshot in the project's `.claude/docs` directory for accurate, version-specific AI context.

## Current Context

- Currently cached docs: !`npm run list`
- Current working directory: !`pwd`

## Your Task

When the user invokes this command, follow these steps:

1. **Parse Arguments**: The user provided: `$ARGUMENTS`
   - First argument is the library name (required)
   - Second argument is optional version (e.g., "15.0.0")
   - Optional `--url` flag for custom documentation URLs
   - If library is missing: prompt for the library name

2. **Run Fetch Command**:
   - Execute: `npm run fetch -- $ARGUMENTS`
   - The script will:
     - Discover documentation format (llms.txt, claude.txt, or sitemap.xml)
     - Detect the documentation framework (Docusaurus, VitePress, Nextra, etc.)
     - Crawl and cache pages to **`.claude/docs/[library]/[version]/`** (in project directory)
     - Respect robots.txt and rate limits
     - Save metadata in `index.json` and structure in `sitemap.json`
   - Monitor progress and show status to the user

3. **Handle Results**:
   - If successful: Report:
     - Number of pages fetched
     - Storage location (`.claude/docs/[library]/[version]/`)
     - Total size
     - Whether a skill was auto-generated
   - Show next steps (how to use the cached docs or generate a skill)

4. **Error Handling**:
   - If URL not found (404): Verify the library name or try `--url` flag with custom URL
   - If network errors: Suggest retrying or checking connection
   - If rate limited: Suggest increasing `crawl_delay_ms` in `doc-fetcher-config.json`
   - If documentation too large (>500 pages): Inform user and ask if they want to continue
   - If framework not detected: Suggest using `--url` with the docs homepage

5. **Skill Generation**: If `auto_generate_skills: true` in config, inform the user that a skill was automatically created and how to use it.

## Important Notes

- The cache directory is configured in `doc-fetcher-config.json` (defaults to `.claude/docs` in the project directory)
- Fetching can take several minutes for large documentation sets
- Use specific versions (e.g., `/fetch-docs nextjs 15.0.0`) to match your project's package.json
- The fetched docs are stored locally and won't be updated automatically (use `/update-docs` for that)
