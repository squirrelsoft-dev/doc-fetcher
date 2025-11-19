# Doc Fetcher - Claude Code Plugin

> Fetch, cache, and version documentation from web sources to provide accurate, version-specific context for AI coding agents.

[![Version](https://img.shields.io/badge/version-1.6.0-blue.svg)](https://github.com/squirrelsoft-dev/doc-fetcher)
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
- **Enhanced Error Recovery**: Automatic checkpoint/resume for interrupted crawls, intelligent retry with adaptive backoff
- **Version Management**: Cache multiple versions, pin to project dependencies
- **Auto-Generated Skills**: Automatically creates Claude Code skills from cached docs
- **Project Integration**: Detects dependencies from `package.json` and suggests fetching relevant docs
- **Incremental Updates**: Only re-fetch changed pages when updating
- **Offline-Ready**: Documentation works without internet once cached

## Architecture

Doc Fetcher uses a **global cache architecture** - documentation and skills are stored in your home directory and shared across all projects:

```
~/.claude/
├── docs/              # Cached documentation (shared across all projects)
│   ├── nextjs/
│   │   ├── 14.2.3/   # Multiple versions supported
│   │   └── 15.0.3/
│   ├── react/
│   │   └── 18.2.0/
│   └── supabase/
│       └── 2.39.0/
└── skills/            # Generated skills (available globally)
    ├── nextjs-15-expert/
    ├── react-18-expert/
    └── supabase-2-expert/
```

**Benefits:**
- Documentation is cached once and reused across all projects
- No duplicate downloads - saves bandwidth and disk space
- Skills work everywhere - generate once, use in any project
- Project directories stay clean - no large `.claude/docs` folders

## Recent Updates

### v1.6.0 (2025-01-18)

#### Added
- **Enhanced Error Recovery** - Robust error handling with automatic recovery
  - **Checkpoint/Resume System**: Auto-saves progress every 10 pages, resume from interruptions
  - **Intelligent Error Categorization**: Distinguishes rate limits (429), retryable (5xx, network), and permanent errors (404, 403)
  - **Adaptive Backoff**: Exponential backoff with jitter (1s → 30s max), respects `Retry-After` headers
  - **Automatic Interruption Detection**: Detects partial fetches and offers to resume on next run
  - **Detailed Error Reporting**: Error summaries by category with suggested actions
  - **Rate Limit Handling**: Graceful 429 response handling prevents IP bans
  - **Configuration Options**: `enable_checkpoints`, `checkpoint_interval`, `checkpoint_max_age_days`
  - **75 New Tests**: Comprehensive unit tests for error-utils (48) and checkpoint-manager (27)
  - **Total: 274 tests** (all passing)

#### Impact
- **Data Loss Prevention**: Never lose progress on interrupted crawls (500+ pages)
- **Better Reliability**: Automatic recovery from network failures and timeouts
- **Professional Crawling**: Proper rate limit handling with server-specified retry delays

### v1.5.0 (2025-01-18)

#### Added
- **Incremental Updates** - Massive performance improvement for documentation updates
  - Only fetches changed/new pages instead of re-downloading all documentation
  - Compares sitemaps using `lastmod` timestamps to detect changes
  - Typically saves 95%+ bandwidth and is 10-100x faster
  - Automatic fallback to full fetch if incremental not possible
  - `--force` flag to bypass incremental logic when needed
  - New `compare-sitemaps.js` module with comprehensive change detection
  - Enhanced sitemap storage with metadata (lastmod, changefreq, priority)
  - Update statistics tracking in metadata (pages_checked, pages_unchanged, pages_modified, etc.)
  - 16 new unit tests for sitemap comparison (199 total tests, all passing)

### v1.3.0 (2025-01-18)

#### Added
- **Comprehensive Input Validation** - Prevents common errors and security issues
  - Validates library names (with scoped package support)
  - Validates version strings (semantic versioning + special keywords)
  - Validates URLs (blocks localhost/private IPs by default)
  - Validates file paths (with existence and type checking)
  - Validates template names (must be one of 5 allowed templates)
  - Contextual error messages with field name, value, and suggestions
  - Security features: path traversal prevention, null byte detection
  - 72 comprehensive unit tests with 100% pass rate

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

**Features:**
- **Incremental Updates** (v1.5.0+): Only fetches changed pages, saving 95%+ bandwidth
- **Smart Detection**: Compares sitemaps to identify modified/added/removed pages
- **Automatic Fallback**: Falls back to full fetch if incremental update not possible
- **Progress Reporting**: Shows detailed change summary before fetching

**Options:**
- `--all` - Update all cached documentation
- `--project` - Update docs matching package.json
- `--force` - Force full re-fetch (bypass incremental updates)

**Examples:**
```bash
# Incremental update (only fetches changed pages)
/update-docs nextjs

# Update all cached libraries incrementally
/update-docs --all

# Update project dependencies incrementally
/update-docs --project

# Force full re-fetch (bypass incremental logic)
/update-docs nextjs --force
```

**Incremental Update Output:**
```
Updating nextjs...

[1/3] Fetching latest sitemap...
[2/3] Comparing with cached version...
Found 234 pages in new sitemap
  ✓ 222 pages unchanged (95%)
  ! 12 pages modified

Will fetch 12 pages (saving 95% bandwidth)

[3/3] Fetching 12 changed/new pages...
[████████████████████] 100%

✓ Incremental update complete!
  Updated: 12 pages
  Unchanged: 222 pages
  Total: 234 pages

✓ nextjs updated successfully
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

## Input Validation

All commands include comprehensive input validation to prevent common errors and security issues.

### Validated Inputs

**Library Names:**
- Must be 1-100 characters
- Alphanumeric with hyphens, underscores, periods
- Supports scoped packages (e.g., `@types/node`)
- No path traversal sequences (`../`, `./`, `\\`)
- Clear error messages with examples

**Version Strings:**
- Semantic versioning (e.g., `1.2.3`, `2.0.0-beta`)
- Short versions (e.g., `1.2`, `1`)
- Special keywords: `latest`, `next`, `canary`, `beta`, `alpha`
- Removes `v` prefix automatically

**URLs:**
- Must be valid HTTP/HTTPS URLs
- Blocks localhost and private IPs by default
- Maximum 2048 characters
- Protocol required

**File Paths:**
- Validates existence when required
- Checks for directories vs. files
- Prevents null byte injection
- Resolves to absolute paths

**Template Names:**
- Must be one of: `expert`, `quick-reference`, `migration-guide`, `troubleshooter`, `best-practices`
- Case-insensitive

### Error Messages

Validation errors include:
- Clear explanation of the problem
- The field that failed validation
- The invalid value provided
- Suggested fix or valid examples

**Example:**
```
✗ Validation Error: Library name contains invalid characters
  Field: library
  Provided: "my lib!"
  Suggestion: Use only letters, numbers, hyphens, underscores, periods, and @ for scoped packages (e.g., @org/package)
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

## Skill Templates

Generated skills use intelligent content analysis to provide context-aware assistance. Each template is optimized for specific use cases.

### Expert Template (`expert`)

**Comprehensive knowledge with full topic coverage**

- Complete API reference with all methods and functions
- Topic hierarchy with main sections and subtopics
- Code examples organized by category
- Keyword-based concept identification
- Best for in-depth questions and complex implementations

**Example:**
```bash
/generate-doc-skill nextjs --template expert
```

### Quick Reference Template (`quick-reference`)

**Condensed cheat-sheet style focusing on top 20% features**

- Most frequently used APIs and methods
- Common code patterns and snippets
- Quick syntax lookups
- Essential concepts at a glance
- Best for fast lookups and common tasks

**Example:**
```bash
/generate-doc-skill react --template quick-reference
```

### Migration Guide Template (`migration-guide`)

**Version upgrade assistance with breaking changes detection**

- Compares cached versions to identify changes
- New features and APIs introduced
- Removed or deprecated functionality
- Step-by-step upgrade checklist
- Before/after code examples
- Best for upgrading between versions

**Example:**
```bash
# Fetch both versions first
/fetch-docs nextjs 14.0.0
/fetch-docs nextjs 15.0.0

# Generate migration guide
/generate-doc-skill nextjs --template migration-guide
```

### Troubleshooter Template (`troubleshooter`)

**Error resolution and debugging assistance**

- Common errors and solutions
- Debugging strategies and workflows
- Configuration troubleshooting
- Error message interpretation
- Issue diagnosis guidance
- Best for debugging and fixing issues

**Example:**
```bash
/generate-doc-skill supabase --template troubleshooter
```

### Best Practices Template (`best-practices`)

**Recommended patterns, security, and performance**

- Recommended code patterns
- Anti-patterns to avoid
- Performance optimization tips
- Security best practices
- Code quality guidelines
- Testing recommendations
- Best for code review and architecture

**Example:**
```bash
/generate-doc-skill typescript --template best-practices
```

### Content Analysis

All templates use advanced analysis to extract:

- **Topics**: Hierarchical structure from headings and sitemap
- **Code Examples**: Categorized by language and use case
- **API Methods**: Detected from code and documentation
- **Keywords**: TF-IDF based relevance ranking
- **Activation Patterns**: Smart patterns based on content

This ensures skills contain actual, relevant information from the cached documentation rather than generic templates.

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
  "timeout_ms": 30000,
  "enable_checkpoints": true,
  "checkpoint_interval": 10,
  "checkpoint_max_age_days": 7
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
