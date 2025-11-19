# Changelog

All notable changes to the doc-fetcher plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Actual crawling implementation (Phase 2)
- Framework-specific crawlers (Docusaurus, VitePress, Nextra)
- Improved error handling and retry logic
- Remote sync to squirrelsoft.dev
- Embeddings for semantic search within docs
- Auto-update scheduler
- Playwright integration for JavaScript-heavy sites

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
