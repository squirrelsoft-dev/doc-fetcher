# Changelog

All notable changes to the doc-fetcher plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Enhanced error recovery (pause/resume for crawls)
- JavaScript rendering (Playwright/Puppeteer integration)
- Authentication support for private docs
- Remote sync to squirrelsoft.dev
- Embeddings for semantic search within docs
- Auto-update scheduler

## [1.5.0] - 2025-01-18

### Added - Incremental Updates 🚀

- **Sitemap Comparison Module** 📊
  - New `compare-sitemaps.js` module for detecting documentation changes
  - Compares old and new sitemaps using `lastmod` timestamps
  - Categorizes pages as unchanged, modified, added, or removed
  - Smart URL normalization (handles trailing slashes, fragments)
  - Fallback to size and title comparison when timestamps unavailable
  - `formatComparisonSummary()` for user-friendly change reports

- **Selective Page Filtering** 🎯
  - Modified `crawlPages()` to accept `pageFilter` option
  - Only fetches URLs specified in filter set
  - Preserves sitemap metadata (lastmod, changefreq, priority)
  - Full URL entry support (objects with metadata, not just strings)

- **Incremental Update Function** ⚡
  - New exported `incrementalUpdate()` function in `fetch-docs.js`
  - Fetches only changed/added pages instead of entire documentation
  - Merges updated pages with existing unchanged pages
  - Updates metadata with comprehensive update statistics
  - Preserves existing cached files for unchanged pages

- **Smart Update Logic** 🧠
  - Modified `update-docs.js` to use incremental updates by default
  - Automatic fallback to full fetch if incremental update not possible
  - `--force` flag to bypass incremental logic and force full re-fetch
  - Displays change summary before fetching (e.g., "✓ 222 pages unchanged, ! 12 modified")
  - Bandwidth optimization reporting (e.g., "saving 95% bandwidth")

- **Enhanced Sitemap Storage** 💾
  - Modified `fetch-docs.js` to save `lastmod`, `changefreq`, `priority` in sitemap.json
  - Changed from storing just URLs to storing full URL entries with metadata
  - Enables accurate change detection on subsequent updates
  - Backward compatible with existing caches (graceful degradation)

- **Update Statistics Tracking** 📈
  - New `last_update_stats` field in metadata
  - Tracks: pages_checked, pages_unchanged, pages_modified, pages_added, pages_removed
  - Provides visibility into update efficiency
  - Useful for monitoring documentation change frequency

- **Comprehensive Testing** ✅
  - 16 new unit tests for sitemap comparison logic
  - Tests cover: unchanged detection, modifications, additions, removals
  - URL normalization tests (trailing slashes, fragments)
  - Multi-change scenario tests
  - Edge case handling (empty sitemaps, invalid input)
  - Total test count: 199 tests (all passing)

### Changed

- **Update Behavior** 🔄
  - `/update-docs` now performs incremental updates by default
  - Only re-fetches changed pages (typically 95%+ bandwidth savings)
  - 10-100x faster for documentation with few changes
  - Falls back to full fetch for llms.txt sources or missing sitemaps

- **Sitemap Data Structure** 📝
  - `sitemap.json` now includes metadata fields: lastmod, changefreq, priority
  - Enables timestamp-based change detection
  - Previous structure still supported (graceful degradation)

### Improved

- **Performance** ⚡
  - Massive speed improvement for documentation updates
  - Typical update: 12 changed pages vs 234 total (95% faster)
  - Reduced network bandwidth usage
  - Lower risk of rate limiting from documentation sites

- **User Experience** 💫
  - Clear progress reporting: "[1/3] Fetching latest sitemap..."
  - Change summary: "Found 234 pages, ✓ 222 unchanged, ! 12 modified"
  - Bandwidth savings display: "Will fetch 12 pages (saving 95% bandwidth)"
  - Skip update entirely if no changes detected

- **Reliability** 🛡️
  - Graceful fallback to full fetch if incremental update fails
  - Better error handling during sitemap comparison
  - Preserves existing cache on partial update failures
  - Compatible with all existing documentation sources

### Technical Details

**New Files:**
- `scripts/compare-sitemaps.js` (300+ lines) - Sitemap comparison engine
- `tests/unit/compare-sitemaps.test.js` (400+ lines) - Comprehensive test suite

**Modified Files:**
- `scripts/fetch-docs.js` - Added `incrementalUpdate()`, modified `crawlPages()`, enhanced sitemap storage
- `scripts/update-docs.js` - Added `checkIncrementalUpdate()`, integrated incremental logic
- `scripts/utils.js` - No changes needed (already had saveSitemap/saveMetadata)

**Dependencies:**
- No new dependencies required (uses existing libraries)

### Migration Notes

- Existing caches will continue to work (backward compatible)
- First update after upgrading will be a full fetch (to populate lastmod data)
- Subsequent updates will benefit from incremental logic
- Use `--force` flag to bypass incremental updates if needed

## [1.4.0] - 2025-01-18

### Added - Skill Generation Quality (Complete Implementation) ✨

- **Advanced Content Analysis** 🔍
  - New `analyze-docs.js` orchestrator module
  - `extract-topics.js` - Parse headings into hierarchical topics with parent relationships
  - `extract-code-examples.js` - Extract and categorize code blocks by language and context
  - `detect-api-methods.js` - Detect API methods from code and headings (JS/TS/Python/Go/Rust/Java)
  - `extract-keywords.js` - TF-IDF based keyword extraction with stopword filtering
  - `build-hierarchy.js` - Build topic trees from sitemap URL structure
  - Comprehensive analysis of topics, code examples, API methods, keywords, and hierarchy

- **All 5 Skill Templates** 📚
  - **Expert Template** (enhanced) - Comprehensive knowledge with full topic coverage
  - **Quick Reference Template** (new) - Condensed cheat-sheet style for top 20% features
  - **Migration Guide Template** (new) - Version comparison with breaking changes detection
  - **Troubleshooter Template** (new) - Error resolution and debugging assistance
  - **Best Practices Template** (new) - Recommended patterns, security, and performance

- **Template System Infrastructure**
  - `template-base.js` - Shared utilities for all templates using JavaScript template literals
  - Smart activation pattern generation based on content analysis
  - Template-specific content filtering and formatting
  - YAML frontmatter generation with proper escaping

- **Enhanced Skill Generation** 🎯
  - Skills now contain actual content from documentation analysis
  - Real topics, code examples, API methods extracted from cached docs
  - Intelligent activation patterns based on keywords and topics
  - Template selection via `--template` flag
  - Analysis summary stored in metadata for tracking

- **Testing** ✅
  - 25 new tests (13 analysis + 12 template tests)
  - Total test count: 183 tests (158 validation + 25 new)
  - Template consistency validation across all 5 templates
  - Analysis module unit tests with real markdown parsing

- **New Dependencies**
  - `remark` - Markdown processor
  - `remark-parse` - Markdown to AST parser
  - `remark-frontmatter` - YAML frontmatter support
  - `remark-gfm` - GitHub Flavored Markdown support
  - `unist-util-visit` - AST traversal
  - `unist-util-visit-parents` - AST traversal with parent tracking
  - `natural` - NLP and keyword extraction

### Changed

- **Skill Generation Completely Rewritten** 🔧
  - `generate-skill.js` now runs comprehensive analysis before generation
  - Progress reporting for 3-phase generation (analysis → template → save)
  - Metadata now includes analysis summary (topics, examples, methods, keywords)
  - Skill names include template type: `{library}-{version}-{template}`
  - Generates rich, context-aware skills instead of generic templates

### Improved

- **Documentation Quality** 📖
  - Generated skills reference actual topics from documentation
  - Code example counts and language breakdowns
  - API method categorization (hooks, functions, classes, etc.)
  - Keyword-based concept identification
  - Hierarchy visualization for large documentation sets

### Migration Notes

- Existing skills generated with older versions are still valid but basic
- Regenerate skills to take advantage of new templates and analysis:
  ```bash
  /generate-doc-skill nextjs --template expert
  /generate-doc-skill nextjs --template quick-reference
  /generate-doc-skill nextjs --template migration-guide
  ```
- Template names are now validated (expert, quick-reference, migration-guide, troubleshooter, best-practices)

### Performance

- Analysis runs once during skill generation
- Keyword extraction uses TF-IDF for relevance
- Markdown parsing optimized with AST-based approach
- Hierarchical topic extraction from both headings and sitemap

### Statistics

- **New Files**: 12 (6 analysis modules, 5 templates, 1 template base)
- **Lines Added**: ~2,500 lines of production code
- **Test Coverage**: 25 new tests, 100% pass rate
- **Templates Implemented**: 5/5 (100%)
- **Analysis Features**: Topics, Code Examples, API Methods, Keywords, Hierarchy

## [1.3.0] - 2025-01-18

### Added
- **Comprehensive Input Validation** 🛡️
  - New `validate.js` module with 6 validation functions
  - `validateLibraryName()` - Validates library names with scoped package support
  - `validateVersion()` - Validates semantic versions and special keywords
  - `validateUrl()` - Validates HTTP/HTTPS URLs with security checks
  - `validatePath()` - Validates file paths with existence and type checking
  - `validateTemplate()` - Validates skill template names
  - `ValidationError` class with contextual error information
  - Comprehensive JSDoc annotations for all functions
- **Security Features**
  - Path traversal prevention (blocks `../`, `./`, `\\`)
  - Null byte injection prevention
  - Localhost and private IP blocking by default
  - Scoped package validation for npm packages
  - Input length limits (prevents DoS attacks)
- **Error Messages**
  - `formatValidationError()` - Formats errors with field, value, and suggestions
  - Clear, actionable error messages with examples
  - Contextual suggestions for common mistakes
- **Test Coverage**
  - 72 comprehensive unit tests for validation module
  - 100% test pass rate
  - Tests for valid inputs, invalid inputs, edge cases, and options
  - Temporary file fixtures for path validation tests

### Changed
- **All Commands Now Validate Inputs**
  - `fetch-docs.js` - Validates library, version, URL
  - `update-docs.js` - Validates library, project path
  - `list-docs.js` - Validates project path
  - `generate-skill.js` - Validates library, version, template, output path
- **Updated Documentation**
  - Added "Input Validation" section to README.md
  - Documented all validation rules and constraints
  - Included error message examples
  - Updated version badge to v1.3.0

### Security
- Path traversal attack prevention
- Null byte injection prevention
- URL validation with localhost/private IP blocking
- Input sanitization and normalization

## [1.2.0] - 2025-01-18

### Added
- **Testing Infrastructure** 🎉
  - Jest testing framework with ES module support
  - 86 unit tests covering core functionality
  - Test coverage reporting with configurable thresholds
  - Test fixtures for common scenarios
  - Comprehensive test documentation (tests/README.md)
- **Test Coverage**
  - utils.js: ~53% coverage (formatting, URL helpers, file operations)
  - robots-checker.js: ~16% coverage (constructor, configuration modes)
  - Dependency detection: Full coverage of parsing logic
- **NPM Scripts**
  - `npm test` - Run all tests
  - `npm run test:watch` - Watch mode for development
  - `npm run test:coverage` - Coverage reports

### Changed
- Updated package.json with Jest configuration for ES modules
- Added @jest/globals and jest as devDependencies
- Set initial coverage thresholds (10% statements, 20% functions)

### Documentation
- Added tests/README.md with testing guidelines
- Documented test structure and organization
- Added examples for writing new tests
- Outlined future test expansion plans

## [1.1.0] - 2025-01-18

### Added
- **Robots.txt Compliance** ✅
  - RobotsChecker class with caching (24-hour TTL)
  - Respects Disallow directives (skip blocked URLs)
  - Honors Crawl-delay for dynamic rate limiting
  - Discovers sitemap URLs from robots.txt
  - Three modes: true (skip), false (disabled), strict (error)
  - Graceful degradation on failures
  - Integrated into all HTTP-fetching scripts

### Changed
- Updated fetch-docs.js to check robots.txt before crawling
- Updated parse-sitemap.js to respect robots.txt rules
- Updated find-llms-txt.js to use robots.txt compliance
- Added robots-parser dependency to package.json

### Fixed
- Ethical crawling compliance
- Prevention of IP bans from aggressive crawling
- Professional credibility with documentation providers

## [1.0.0] - 2025-01-17

### Added
- Initial plugin structure and manifest
- Command documentation:
  - `/fetch-docs` - Fetch and cache documentation
  - `/update-docs` - Update cached documentation
  - `/list-docs` - List cached documentation
  - `/generate-doc-skill` - Generate skills from docs
- Skill specifications:
  - `llms-txt-finder` - AI-optimized doc detection
  - `doc-indexer` - Main crawling and indexing logic
  - `doc-skill-generator` - Skill generation with templates
  - `dependency-detector` - Project dependency detection
- Agent specification:
  - `doc-crawler` - Advanced crawler for complex sites
- Configuration system with `doc-fetcher-config.json`
- Comprehensive README with usage examples
- MIT License
- Contributing guidelines
- GitHub issue templates (bug report, feature request, library support)
- Pull request template
- This CHANGELOG

### Documentation Framework Support (Specified)
- Docusaurus
- VitePress
- Nextra
- GitBook
- Mintlify
- ReadTheDocs
- Custom/Static sites

### Features
- AI-first documentation detection (llms.txt, claude.txt)
- Version management and caching
- Multiple skill templates (expert, quick-reference, migration-guide, troubleshooter, best-practices)
- Auto-activation based on project dependencies
- Smart prioritization of framework dependencies
- Incremental update support
- Rate limiting and robots.txt compliance
- Multi-source documentation merging

### Project Types Supported
- JavaScript/TypeScript (npm, yarn, pnpm, bun)
- Python (pip, poetry, pipenv)
- Go (go modules)
- Rust (cargo)

## Release Notes

### Version 1.0.0 - Initial Release

This is the initial specification release of doc-fetcher. The plugin provides a complete documentation system for:

**Problem Solved:**
AI coding agents often use outdated or mixed-version documentation. Doc-fetcher solves this by caching version-specific documentation locally, ensuring Claude Code always has accurate context.

**Core Capabilities:**
- Fetch and cache documentation from any web source
- Auto-detect and use AI-optimized formats (llms.txt)
- Generate Claude Code skills automatically
- Detect project dependencies and suggest relevant docs
- Support for all major documentation frameworks
- Version management with incremental updates

**Note:** This release contains comprehensive specifications and documentation. Phase 2 will implement the actual crawling and caching functionality.

**Installation:**
```bash
/plugin install squirrelsoft-dev/doc-fetcher
```

**Quick Start:**
```bash
/fetch-docs nextjs
/list-docs --project
/update-docs --all
```

---

## Version Schema

- **Major version** (X.0.0): Breaking changes
- **Minor version** (0.X.0): New features, backwards compatible
- **Patch version** (0.0.X): Bug fixes, backwards compatible

## Categories

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Features that will be removed
- **Removed**: Features that have been removed
- **Fixed**: Bug fixes
- **Security**: Security fixes

[Unreleased]: https://github.com/squirrelsoft-dev/doc-fetcher/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/squirrelsoft-dev/doc-fetcher/releases/tag/v1.0.0
