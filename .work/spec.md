# Doc Fetcher - Claude Code Plugin Specification

## Overview

A Claude Code plugin that fetches, caches, and versions documentation from web sources to provide accurate, version-specific context for AI coding agents. Solves the problem of AI agents using outdated or mixed-version documentation.

## Problem Statement

AI coding agents frequently struggle with:
- Using outdated documentation (e.g., Next.js 13 patterns when working with Next.js 15)
- Mixing information from multiple library versions
- Losing context when documentation sites restructure
- Inconsistent responses based on training data vs. current docs

## Solution

Doc Fetcher creates versioned snapshots of documentation that can be:
1. Cached locally or remotely (squirrelsoft.dev)
2. Referenced by Claude Code skills
3. Updated on demand
4. Version-pinned to match project dependencies

## Core Features

### 1. Documentation Discovery
- Check for `llms.txt` or `claude.txt` first (AI-friendly doc format)
- Fall back to `sitemap.xml` parsing
- Intelligent crawling of common documentation frameworks:
  - Docusaurus
  - VitePress
  - GitBook
  - Nextra
  - Mintlify
  - ReadTheDocs

### 2. Documentation Fetching
- Crawl and download documentation pages
- Extract main content (strip navigation, footers, etc.)
- Preserve code examples separately
- Handle pagination and navigation structures
- Respect robots.txt and rate limits

### 3. Storage & Versioning
- Store locally in `.claude/docs/[library]/[version]/`
- Optionally sync to squirrelsoft.dev/docs/ for sharing
- Maintain version history
- Track fetch timestamps and source URLs

### 4. Skill Generation
- Auto-generate Claude Code skills that reference cached docs
- Create version-specific skills (e.g., `nextjs-15-expert`)
- Update existing skills when docs are refreshed

### 5. Project Integration
- Detect project dependencies from package.json
- Suggest fetching docs for detected libraries
- Auto-activate relevant doc skills based on project

## Plugin Structure

```
doc-fetcher/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── doc-indexer/          # Main crawling and indexing logic
│   ├── llms-txt-finder/      # Check for AI-optimized doc files
│   ├── doc-skill-generator/  # Generate skills from cached docs
│   └── dependency-detector/  # Detect project dependencies
├── commands/
│   ├── fetch-docs.md         # /fetch-docs [library] [version]
│   ├── update-docs.md        # /update-docs [library]
│   ├── list-docs.md          # /list-docs [--all|--local|--project]
│   └── generate-skill.md     # /generate-doc-skill [library]
└── agents/
    └── doc-crawler.md        # Smart documentation crawler agent
```

## Commands

### /fetch-docs [library] [version?] [--url]
Fetch and cache documentation for a library.

**Examples:**
```bash
# Fetch latest version
/fetch-docs nextjs

# Fetch specific version
/fetch-docs nextjs 15.0.0

# Fetch from custom URL
/fetch-docs my-internal-lib --url https://docs.company.com/my-lib
```

**Behavior:**
1. Check if library already cached
2. Look for llms.txt or sitemap.xml
3. Crawl documentation
4. Save to `.claude/docs/[library]/[version]/`
5. Optionally generate skill
6. Confirm success with file count and size

### /update-docs [library]
Update cached documentation to latest version.

**Examples:**
```bash
# Update specific library
/update-docs supabase

# Update all cached docs
/update-docs --all

# Update docs matching project dependencies
/update-docs --project
```

### /list-docs [--all|--local|--project]
List cached documentation.

**Examples:**
```bash
# List all cached docs
/list-docs

# List only local cache
/list-docs --local

# List docs relevant to current project
/list-docs --project
```

**Output format:**
```
Cached Documentation:
├── nextjs (v15.0.0) - 234 pages - Updated 2 days ago
├── supabase (v2.39.0) - 156 pages - Updated 1 week ago
└── react (v18.2.0) - 89 pages - Updated 3 weeks ago

Storage: 12.4 MB local
```

### /generate-doc-skill [library]
Generate a Claude Code skill from cached documentation.

**Examples:**
```bash
/generate-doc-skill nextjs
```

**Creates:**
```
skills/nextjs-15-expert/
├── SKILL.md              # Main skill file
└── docs/                 # Symlink or reference to cached docs
```

## Skill Examples

### Generated Skill Structure

**`skills/nextjs-15-expert/SKILL.md`:**
```markdown
---
name: nextjs-15-expert
description: Expert knowledge of Next.js 15.0.0 based on official documentation
version: 15.0.0
library: nextjs
docs_path: .claude/docs/nextjs/15.0.0
last_updated: 2025-01-15
---

# Next.js 15 Expert

This skill provides accurate, version-specific guidance for Next.js 15.0.0.

## What I Know

I have access to the complete Next.js 15.0.0 documentation including:
- App Router patterns
- Server Components
- Server Actions
- Metadata API
- Route Handlers
- Middleware
- And all other features

## Documentation Source

Cached from: https://nextjs.org/docs
Fetched: January 15, 2025
Version: 15.0.0
Pages: 234

## Usage

I automatically activate when you're working on Next.js projects. Ask me about:
- Routing patterns
- Data fetching
- Server vs Client Components
- Deployment
- Performance optimization

I will always reference Next.js 15.0.0 patterns, not older versions.
```

## Storage Structure

### Local Cache
```
.claude/docs/
├── nextjs/
│   ├── 15.0.0/
│   │   ├── index.json          # Metadata
│   │   ├── sitemap.json        # Page structure
│   │   └── pages/
│   │       ├── app-router.md
│   │       ├── server-actions.md
│   │       └── ...
│   └── 14.2.0/                 # Old version kept
├── supabase/
│   └── 2.39.0/
└── react/
    └── 18.2.0/
```

### Metadata Format (index.json)
```json
{
  "library": "nextjs",
  "version": "15.0.0",
  "source_url": "https://nextjs.org/docs",
  "fetched_at": "2025-01-15T10:30:00Z",
  "llms_txt_url": null,
  "sitemap_url": "https://nextjs.org/sitemap.xml",
  "page_count": 234,
  "total_size_bytes": 5242880,
  "framework": "nextra",
  "skill_generated": true,
  "skill_path": "skills/nextjs-15-expert"
}
```

## Intelligent Crawling

### Framework Detection

The doc-crawler agent should detect documentation frameworks and adapt:

**Docusaurus:**
- Look for `docusaurus.config.js` patterns
- Parse sidebar structure
- Handle versioned docs

**VitePress:**
- Parse `.vitepress/config.js`
- Follow sidebar navigation
- Handle markdown frontmatter

**GitBook:**
- Use SUMMARY.md for structure
- Follow chapter hierarchy

**Nextra (Next.js docs):**
- Parse `_meta.json` files
- Follow Next.js file structure

### Content Extraction

For each page:
1. Extract main content (remove nav, footer, ads)
2. Preserve code blocks with language tags
3. Maintain heading hierarchy
4. Extract metadata (title, description, tags)
5. Save as clean markdown

### Rate Limiting & Politeness
- Respect robots.txt
- Delay between requests (default: 1 second)
- User-agent: "Claude Code Doc Fetcher/1.0"
- Option to pause/resume long crawls

## Project Integration

### Dependency Detection

When activated in a project:
```javascript
// Detect from package.json
const dependencies = {
  "next": "^15.0.0",
  "react": "^18.2.0",
  "@supabase/supabase-js": "^2.39.0"
};

// Suggest fetching
"I noticed you're using Next.js 15.0.0. Would you like me to fetch and cache the documentation? This will help me provide accurate, version-specific guidance."
```

### Auto-Activation

Skills auto-activate based on:
- Detected dependencies in package.json
- File patterns (e.g., `app/` directory → Next.js App Router)
- Imports in open files

## Remote Sync (Optional - Future)

### Sync to squirrelsoft.dev

```bash
/fetch-docs nextjs --sync
```

**Behavior:**
1. Fetch and cache locally
2. Upload to squirrelsoft.dev/api/docs
3. Make available to other users
4. Faster subsequent fetches (download from squirrelsoft.dev)

**Benefits:**
- Share cached docs across team
- Faster fetches for popular libraries
- Centralized version management

## Configuration

### `.claude/doc-fetcher-config.json`
```json
{
  "cache_directory": ".claude/docs",
  "auto_generate_skills": true,
  "auto_detect_dependencies": true,
  "remote_sync": false,
  "remote_sync_url": "https://squirrelsoft.dev/api/docs",
  "crawl_delay_ms": 1000,
  "max_pages_per_fetch": 500,
  "frameworks_priority": [
    "llms.txt",
    "sitemap.xml",
    "docusaurus",
    "vitepress",
    "nextra"
  ]
}
```

## Error Handling

- **404s:** Skip and log, continue crawl
- **Rate limits:** Exponential backoff
- **Timeouts:** Retry with longer timeout
- **Network errors:** Pause and offer to resume
- **Large docs:** Warn if >1000 pages, offer to limit

## Success Metrics

After implementing, success looks like:
1. "Create a Next.js 15 server action" → Uses correct syntax, not outdated
2. "Implement Supabase RLS" → References current API, not deprecated methods
3. "Use React 18 hooks" → Doesn't suggest removed features
4. Documentation stays current without manual intervention

## Use Cases

### 1. New Project Setup
```bash
# Starting new Next.js project
/fetch-docs nextjs 15.0.0
/fetch-docs supabase
/fetch-docs react 18

# Claude now has accurate context for all three
"Set up Supabase auth with Next.js 15 Server Actions"
→ Uses correct patterns for all libraries
```

### 2. Version Upgrade
```bash
# Upgrading from Next.js 14 to 15
/fetch-docs nextjs 15.0.0
/generate-doc-skill nextjs

# Now Claude knows what changed
"What's new in Next.js 15?"
"Update my data fetching to use new patterns"
```

### 3. Internal Documentation
```bash
# Company's internal component library
/fetch-docs acme-ui --url https://docs.acme.com/ui

# Now Claude can help with proprietary systems
"Use the AcmeButton component correctly"
```

## Future Enhancements

- **Embeddings:** Semantic search within docs
- **Diff detection:** Alert when docs change significantly
- **Auto-update:** Cron job to refresh docs weekly
- **Team sharing:** Push to squirrelsoft.dev automatically
- **Smart summarization:** Create concise skill prompts from large docs
- **API docs:** Special handling for OpenAPI/Swagger specs
- **Video transcripts:** Fetch from YouTube tutorials

## Implementation Priority

**Phase 1 (MVP):**
1. /fetch-docs command with basic crawling
2. llms.txt detection
3. Sitemap.xml parsing
4. Local storage
5. Basic skill generation

**Phase 2:**
1. Framework-specific crawlers (Docusaurus, VitePress)
2. Dependency detection
3. /update-docs command
4. Improved content extraction

**Phase 3:**
1. Remote sync to squirrelsoft.dev
2. Team sharing
3. Auto-update scheduler
4. Advanced skill templates

## Technical Stack

- **Crawler:** Cheerio or Playwright for scraping
- **HTTP:** node-fetch or axios
- **File system:** Node.js fs/promises
- **Markdown:** Remark for parsing/processing
- **Config:** JSON files in .claude directory

## Testing Approach

Test with these documentation sites:
1. Next.js (Nextra) - https://nextjs.org/docs
2. Supabase (Mintlify) - https://supabase.com/docs
3. React (Custom) - https://react.dev
4. Tailwind (Custom) - https://tailwindcss.com/docs
5. Vercel (VitePress) - Various SDK docs

Each represents different doc frameworks and structures.

---

## Summary

Doc Fetcher solves a critical problem: AI coding agents need accurate, version-specific documentation context. By caching and versioning docs, we ensure Claude Code always has the right information for the libraries you're actually using.

The plugin should be:
- **Intelligent** - Auto-detect what docs are needed
- **Unobtrusive** - Work in the background
- **Accurate** - Always use correct versions
- **Shareable** - Team can benefit from cached docs
- **Maintainable** - Easy to update and refresh

This creates a foundation for more reliable AI-assisted development.
