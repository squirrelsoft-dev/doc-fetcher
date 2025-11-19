# Doc Fetcher - Claude Code Plugin

> Fetch, cache, and version documentation from web sources to provide accurate, version-specific context for AI coding agents.

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/squirrelsoft-dev/doc-fetcher)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Plugin-purple.svg)](https://code.claude.ai)

## Problem Solved

AI coding agents frequently struggle with:
- Using outdated documentation (e.g., Next.js 13 patterns when working with Next.js 15)
- Mixing information from multiple library versions
- Losing context when documentation sites restructure
- Inconsistent responses based on training data vs. current docs

**Doc Fetcher solves this** by creating versioned snapshots of documentation that can be cached locally and referenced by Claude Code skills, ensuring accurate, version-specific guidance.

## Features

- **AI-First**: Checks for `llms.txt` and `claude.txt` before web crawling
- **Smart Crawling**: Auto-detects documentation frameworks (Docusaurus, VitePress, Nextra, GitBook, etc.)
- **Robots.txt Compliance**: Respects webmaster preferences, honors crawl delays, prevents IP bans
- **Version Management**: Cache multiple versions, pin to project dependencies
- **Auto-Generated Skills**: Automatically creates Claude Code skills from cached docs
- **Project Integration**: Detects dependencies from `package.json` and suggests fetching relevant docs
- **Incremental Updates**: Only re-fetch changed pages when updating
- **Offline-Ready**: Documentation works without internet once cached

## Recent Updates

### v1.1.0 (2025-01-18)

#### Added
- **Robots.txt Compliance** - Ethical crawling that respects webmaster preferences
  - Automatically checks robots.txt before crawling any documentation site
  - Respects `Disallow` directives (skips blocked URLs)
  - Honors `Crawl-delay` for dynamic rate limiting
  - Discovers sitemap URLs from robots.txt
  - Caches robots.txt with 24-hour TTL for performance
  - Three compliance modes: `true` (skip blocked, default), `false` (disabled), `strict` (error on violation)
  - Graceful degradation when robots.txt unavailable

#### Fixed
- **Doc-Crawler Agent Behavior** - Fixed agent to use existing scripts instead of creating custom code
  - Agent now runs `node scripts/fetch-docs.js` instead of generating custom `crawler.js` files
  - Added `type: agent` to frontmatter (was missing, causing ambiguous behavior)
  - Rewrote instructions from tutorial-style (617 lines) to operational directives (335 lines)
  - Removed file creation permissions to prevent custom code generation
  - Added clear prohibitions against writing crawling logic
  - Agent now leverages all existing infrastructure including robots.txt compliance

## Installation

### Via Claude Code Marketplace

```bash
/plugin install squirrelsoft-dev/doc-fetcher
```

### Manual Installation

1. Clone this repository:
```bash
git clone https://github.com/squirrelsoft-dev/doc-fetcher
cd doc-fetcher
```

2. Link to your Claude Code plugins directory:
```bash
ln -s $(pwd) ~/.claude/plugins/doc-fetcher
```

3. Restart Claude Code

## Quick Start

### 1. Fetch Documentation

```bash
# Fetch latest Next.js documentation
/fetch-docs nextjs

# Fetch specific version
/fetch-docs nextjs 15.0.3

# Fetch from custom URL
/fetch-docs my-lib --url https://docs.mylib.com
```

### 2. List Cached Documentation

```bash
# List all cached docs
/list-docs

# List docs for current project
/list-docs --project
```

### 3. Update Documentation

```bash
# Update specific library
/update-docs nextjs

# Update all cached docs
/update-docs --all

# Update docs matching package.json
/update-docs --project
```

### 4. Generate Skills

```bash
# Generate expert skill from cached docs
/generate-doc-skill nextjs

# Use specific template
/generate-doc-skill nextjs --template quick-reference
```

## Usage Examples

### New Project Setup

```bash
# Starting a new Next.js + Supabase project

# Fetch documentation for your stack
/fetch-docs nextjs 15.0.3
/fetch-docs react 18.2.0
/fetch-docs supabase 2.39.0

# Or automatically detect and fetch from package.json
/fetch-docs --project

# Claude now has accurate context for your entire stack
```

### Version Upgrade

```bash
# Upgrading Next.js from 14 to 15

# Fetch new version docs
/fetch-docs nextjs 15.0.0

# Generate migration guide skill
/generate-doc-skill nextjs --template migration-guide

# Ask Claude: "What are the breaking changes in Next.js 15?"
```

### Weekly Maintenance

```bash
# Keep documentation current

# Check what needs updating
/list-docs --project

# Update all project docs
/update-docs --project
```

## Commands

### `/fetch-docs <library> [version] [options]`

Fetch and cache documentation for a library.

**Options:**
- `--url <url>` - Custom documentation URL
- `--sync` - Sync to remote repository (if configured)

**Examples:**
```bash
/fetch-docs nextjs
/fetch-docs nextjs 15.0.3
/fetch-docs my-internal-lib --url https://docs.company.com
```

### `/update-docs [library] [options]`

Update cached documentation to latest version.

**Options:**
- `--all` - Update all cached documentation
- `--project` - Update docs matching package.json
- `--force` - Force re-fetch even if recently updated

**Examples:**
```bash
/update-docs nextjs
/update-docs --all
/update-docs --project
```

### `/list-docs [options]`

List cached documentation with metadata.

**Options:**
- `--all` - Show all available docs (local + remote)
- `--local` - Show only locally cached (default)
- `--project` - Show docs relevant to current project
- `--verbose` - Show detailed information

**Examples:**
```bash
/list-docs
/list-docs --project
/list-docs --verbose
```

### `/generate-doc-skill <library> [options]`

Generate a Claude Code skill from cached documentation.

**Options:**
- `--template <name>` - Skill template (expert, quick-reference, migration-guide, troubleshooter, best-practices)
- `--output <path>` - Custom output path

**Examples:**
```bash
/generate-doc-skill nextjs
/generate-doc-skill nextjs --template quick-reference
/generate-doc-skill supabase --template best-practices
```

## Skills

### `llms-txt-finder`

Detects and fetches AI-optimized documentation formats (`llms.txt`, `claude.txt`).

**What it does:**
- Checks for AI-friendly doc formats before web crawling
- 40x faster than crawling hundreds of pages
- Pre-optimized for AI consumption

### `doc-indexer`

Main crawling and indexing logic for documentation sites.

**What it does:**
- Auto-detects documentation frameworks
- Intelligently crawls and extracts content
- Handles rate limiting and errors
- Creates searchable index

**Supported frameworks:**
- Docusaurus
- VitePress
- Nextra
- GitBook
- Mintlify
- ReadTheDocs
- Custom/Static sites

### `doc-skill-generator`

Generates Claude Code skills from cached documentation.

**Templates:**
- **Expert** - Comprehensive library coverage
- **Quick Reference** - Condensed cheat sheet
- **Migration Guide** - Version upgrade assistance
- **Troubleshooter** - Debugging focused
- **Best Practices** - Code quality guidance

### `dependency-detector`

Detects project dependencies and suggests fetching relevant docs.

**Features:**
- Auto-detects dependencies from package.json
- Compares with cached documentation
- Suggests missing or outdated docs
- Prioritizes critical frameworks

**Supported project types:**
- JavaScript/TypeScript (npm, yarn, pnpm, bun)
- Python (pip, poetry, pipenv)
- Go (go modules)
- Rust (cargo)

## Agents

### `doc-crawler`

Advanced documentation crawler for complex or non-standard sites.

**Use cases:**
- Custom/non-standard documentation frameworks
- JavaScript-heavy sites requiring rendering
- Authenticated documentation
- Multi-source documentation
- Failed standard crawls

## Configuration

Create or edit `doc-fetcher-config.json` in your plugin directory:

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
    "claude.txt",
    "sitemap.xml",
    "docusaurus",
    "vitepress",
    "nextra"
  ],
  "user_agent": "Claude Code Doc Fetcher/1.0",
  "respect_robots_txt": true,
  "max_retries": 3,
  "timeout_ms": 30000
}
```

## Storage Structure

Documentation is stored locally in `.claude/docs/`:

```
.claude/docs/
├── nextjs/
│   ├── 15.0.3/
│   │   ├── index.json          # Metadata
│   │   ├── sitemap.json        # Page hierarchy
│   │   └── pages/
│   │       ├── getting-started.md
│   │       ├── routing/
│   │       └── api-reference/
│   └── 15.0.0/                 # Previous version
├── supabase/
│   └── 2.39.0/
└── react/
    └── 18.2.0/
```

## How It Works

### 1. Documentation Fetching Flow

```
User: /fetch-docs nextjs

1. llms-txt-finder skill
   ↓ Checks for AI-optimized docs
   ✓ Found llms.txt (fast path)
   OR
   ✗ Not found (proceed to crawling)

2. doc-indexer skill
   ↓ Detects framework (Nextra)
   ↓ Parses sitemap.xml
   ↓ Crawls all pages with rate limiting
   ↓ Extracts clean content
   ↓ Saves to .claude/docs/nextjs/15.0.3/

3. doc-skill-generator skill
   ↓ Analyzes cached documentation
   ↓ Generates expert skill
   ✓ Creates skills/nextjs-15-expert/SKILL.md

4. Result
   ✓ Documentation cached
   ✓ Skill generated and active
   → Claude now has accurate Next.js 15 knowledge
```

### 2. Project Integration Flow

```
User opens project with package.json

1. dependency-detector skill (auto-activates)
   ↓ Reads package.json
   ↓ Extracts dependencies:
     - next@15.0.3
     - react@18.2.0
     - @supabase/supabase-js@2.39.0

2. Check cached documentation
   ✓ next@15.0.3 - Cached, current
   ✗ react@18.2.0 - Not cached
   ⚠ supabase@2.39.0 - Cached 2.38.0 (outdated)

3. Suggest actions
   → /fetch-docs react 18.2.0
   → /update-docs supabase

4. User runs suggestions
   ✓ All project dependencies documented
   → Claude has accurate context for entire stack
```

## Use Cases

### 1. Accurate Version-Specific Guidance

**Problem:** Claude suggests deprecated Next.js 13 patterns for a Next.js 15 project

**Solution:**
```bash
/fetch-docs nextjs 15.0.3
# Claude now references Next.js 15 docs exclusively
```

**Result:** Correct App Router patterns, Server Actions syntax, etc.

### 2. Internal/Private Documentation

**Problem:** Need help with company's internal component library

**Solution:**
```bash
/fetch-docs acme-ui --url https://docs.acme.com/ui
# Claude can now assist with proprietary systems
```

**Result:** Accurate guidance for internal tools

### 3. Offline Development

**Problem:** Working on a plane without internet

**Solution:**
```bash
# Before trip: fetch all docs
/fetch-docs --project
```

**Result:** Full documentation access offline

### 4. Team Consistency

**Problem:** Team members get different Claude responses due to version confusion

**Solution:**
```bash
# Share cached docs or use remote sync
/fetch-docs nextjs --sync
# All team members use same documentation version
```

**Result:** Consistent AI assistance across team

## Performance

### Speed Comparison

| Method | Pages | Time | Requests |
|--------|-------|------|----------|
| **llms.txt** | 1 file | 5 sec | 1 |
| **Standard crawl** | 234 pages | 4 min | 234 |
| **Update (incremental)** | 12 changed | 30 sec | 12 |

### Storage

| Library | Version | Pages | Size |
|---------|---------|-------|------|
| Next.js | 15.0.3 | 234 | 5.2 MB |
| React | 18.2.0 | 89 | 1.8 MB |
| Supabase | 2.39.0 | 156 | 3.1 MB |
| Tailwind | 3.4.0 | 178 | 2.9 MB |

## Roadmap

### Phase 1 (MVP) ✅
- [x] `/fetch-docs` command with basic crawling
- [x] llms.txt detection
- [x] Sitemap.xml parsing
- [x] Local storage
- [x] Basic skill generation

### Phase 2 (Current)
- [ ] Framework-specific crawlers (Docusaurus, VitePress)
- [ ] Dependency detection
- [ ] `/update-docs` command
- [ ] Improved content extraction

### Phase 3 (Future)
- [ ] Remote sync to squirrelsoft.dev
- [ ] Team sharing
- [ ] Auto-update scheduler
- [ ] Advanced skill templates
- [ ] Embeddings for semantic search
- [ ] Diff detection and change alerts

## Troubleshooting

### "Documentation not found"

**Cause:** Library name doesn't match documentation URL

**Solution:**
```bash
# Provide explicit URL
/fetch-docs my-lib --url https://docs.example.com
```

### "Crawl failed: Rate limited"

**Cause:** Server rate limiting

**Solution:**
```json
// Increase delay in doc-fetcher-config.json
{
  "crawl_delay_ms": 2000  // Increase from 1000 to 2000
}
```

### "Skill not auto-activating"

**Cause:** Activation patterns don't match project

**Solution:**
- Edit generated SKILL.md activation patterns
- Or manually activate: "Use nextjs-15-expert skill"

### "Outdated responses from Claude"

**Cause:** Cached documentation is old

**Solution:**
```bash
/update-docs <library>
/generate-doc-skill <library>
```

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Adding Library Mappings

Help us map more libraries by editing `skills/dependency-detector/SKILL.md`:

```javascript
const libraryMappings = {
  "@your/package": "your-docs-name",
  // ... add your mappings
};
```

### Testing Documentation Sites

Test doc-fetcher with various documentation sites:

1. Next.js (Nextra) - https://nextjs.org/docs
2. Supabase (Mintlify) - https://supabase.com/docs
3. React (Custom) - https://react.dev
4. Tailwind (Custom) - https://tailwindcss.com/docs

Report issues or incompatibilities.

## Support

- **Issues**: [GitHub Issues](https://github.com/squirrelsoft-dev/doc-fetcher/issues)
- **Discussions**: [GitHub Discussions](https://github.com/squirrelsoft-dev/doc-fetcher/discussions)
- **Discord**: [Squirrelsoft Dev Discord](https://discord.gg/squirrelsoft-dev)

## License

MIT © Squirrelsoft Dev Tools

## Acknowledgments

- Inspired by the `llms.txt` initiative for AI-friendly documentation
- Built for the Claude Code ecosystem
- Thanks to all contributors and testers

## Related Projects

- [Claude Code](https://code.claude.ai) - Official Claude Code CLI
- [llms.txt](https://llmstxt.org) - AI-friendly documentation standard
- [Squirrelsoft Marketplace](https://github.com/squirrelsoft-dev/squirrelsoft-marketplace) - Plugin marketplace

---

**Made with ❤️ by Squirrelsoft Dev Tools**

*Accurate documentation for accurate AI assistance*
