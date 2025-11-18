# Contributing to Doc Fetcher

Thank you for your interest in contributing to Doc Fetcher! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions.

## How to Contribute

### Reporting Bugs

**Before submitting a bug report:**
- Check existing issues to avoid duplicates
- Verify you're using the latest version
- Test with a minimal reproduction case

**Bug Report Template:**
```markdown
**Description**
Clear description of the bug

**Steps to Reproduce**
1. Run command: /fetch-docs library
2. Observe error: ...

**Expected Behavior**
What should have happened

**Actual Behavior**
What actually happened

**Environment**
- Claude Code version:
- Plugin version: 1.0.0
- OS: macOS/Linux/Windows
- Library being fetched:

**Additional Context**
Logs, screenshots, etc.
```

### Suggesting Enhancements

**Enhancement Request Template:**
```markdown
**Feature Description**
What feature would you like to see?

**Use Case**
Why is this feature needed? What problem does it solve?

**Proposed Implementation**
How might this work? (optional)

**Alternatives Considered**
Other solutions you've thought about
```

### Adding Library Support

Help us support more libraries and documentation frameworks!

**To add a new library mapping:**

1. Edit `skills/dependency-detector/SKILL.md`
2. Add mapping to `libraryMappings`:
```javascript
const libraryMappings = {
  "@your/package": "your-docs-name",
  // ...existing mappings
};
```
3. Test the mapping works
4. Submit a PR

**To add a new documentation framework:**

1. Edit `skills/doc-indexer/SKILL.md`
2. Add framework detection logic
3. Add content extraction strategy
4. Test with a real documentation site
5. Submit a PR with test site URL

### Pull Request Process

1. **Fork the repository**
```bash
# Fork on GitHub, then clone
git clone https://github.com/YOUR-USERNAME/doc-fetcher
cd doc-fetcher
git remote add upstream https://github.com/squirrelsoft-dev/doc-fetcher
```

2. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

3. **Make your changes**
- Follow existing code style
- Update documentation if needed
- Add tests if applicable

4. **Test your changes**
```bash
# Install locally
ln -s $(pwd) ~/.claude/plugins/doc-fetcher

# Restart Claude Code and test
/fetch-docs test-library
```

5. **Commit your changes**
```bash
git add .
git commit -m "Add support for XYZ framework

- Implement framework detection
- Add content extraction logic
- Update documentation
- Tested with https://example.com/docs"
```

6. **Push and create PR**
```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear title describing the change
- Description of what changed and why
- Reference any related issues
- Screenshots/examples if applicable

### PR Review Process

- Maintainers will review within 1-7 days
- Address any requested changes
- Once approved, maintainers will merge
- Your contribution will be included in the next release!

## Development Setup

### Prerequisites

- Claude Code installed
- Git
- Node.js (for testing with npm projects)

### Local Installation

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/doc-fetcher
cd doc-fetcher

# Link to Claude Code plugins directory
ln -s $(pwd) ~/.claude/plugins/doc-fetcher

# Restart Claude Code
```

### Testing Changes

**Manual Testing:**
```bash
# Test basic fetch
/fetch-docs nextjs

# Test with custom URL
/fetch-docs test --url https://docs.example.com

# Test dependency detection
cd /path/to/test-project
/list-docs --project
```

**Test Different Scenarios:**
- [ ] Standard documentation site (Docusaurus, VitePress, etc.)
- [ ] Site with llms.txt
- [ ] Custom/unknown framework
- [ ] Authenticated documentation
- [ ] Large documentation (>500 pages)
- [ ] Rate-limited site

## Documentation

### Adding/Updating Commands

Commands are in `commands/*.md` with YAML frontmatter:

```markdown
---
description: Brief description of what the command does
---

# Command Name

Detailed description...

## Usage

\`\`\`bash
/command-name [args] [options]
\`\`\`

## Examples
...
```

### Adding/Updating Skills

Skills are in `skills/skill-name/SKILL.md`:

```markdown
---
name: skill-name
description: What the skill does
version: 1.0.0
auto_activate: true/false
tool_restrictions:
  - ToolName
---

# Skill Name

I do XYZ...
```

### Updating README

Update `README.md` when:
- Adding new commands or skills
- Changing behavior significantly
- Adding new features
- Updating installation instructions

## Style Guide

### Markdown

- Use ATX-style headers (`#` not underlines)
- Use fenced code blocks with language tags
- Use reference-style links for repeated URLs
- Keep lines under 80 characters where reasonable

### Code Examples

```bash
# Use comments to explain
/fetch-docs nextjs 15.0.3

# Show expected output
✓ Documentation cached successfully
```

### Tone

- Be clear and concise
- Use active voice
- Write for developers of all skill levels
- Include examples liberally

## Project Structure

```
doc-fetcher/
├── .claude-plugin/
│   └── plugin.json          # Plugin metadata
├── skills/                  # Skill definitions
├── commands/                # Command definitions
├── agents/                  # Agent definitions
├── doc-fetcher-config.json  # Default config
├── README.md                # Main documentation
├── CONTRIBUTING.md          # This file
└── LICENSE                  # MIT License
```

## Roadmap & Priorities

### High Priority
- Actual crawling implementation (Phase 2)
- More framework support (Docusaurus, VitePress)
- Better error handling
- Testing framework

### Medium Priority
- Remote sync to squirrelsoft.dev
- Team sharing features
- Auto-update scheduler
- Embeddings for semantic search

### Low Priority
- GUI for browsing cached docs
- Analytics and usage tracking
- Plugin marketplace integration improvements

## Questions?

- Open an issue with the `question` label
- Join our [Discord](https://discord.gg/squirrelsoft-dev)
- Email: support@squirrelsoft.dev

## Recognition

Contributors will be:
- Added to CONTRIBUTORS.md (coming soon)
- Mentioned in release notes
- Given credit in documentation they contribute to

Thank you for contributing to Doc Fetcher! 🎉
