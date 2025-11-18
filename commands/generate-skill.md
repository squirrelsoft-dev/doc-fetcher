---
description: Generate a Claude Code skill from cached documentation for version-specific expertise
---

# Generate Documentation Skill

Create a Claude Code skill from cached documentation, enabling version-specific expertise and accurate AI guidance.

## Usage

```bash
/generate-doc-skill <library> [version] [--template <template-name>] [--output <path>]
```

## Arguments

- `library` (required): Name of the cached library (e.g., "nextjs", "supabase")
- `version` (optional): Specific version to use. Defaults to latest cached version
- `--template` (optional): Skill template to use (default: "expert")
- `--output` (optional): Custom output path for the skill

## Examples

```bash
# Generate skill for latest cached Next.js docs
/generate-doc-skill nextjs

# Generate skill for specific version
/generate-doc-skill nextjs 15.0.0

# Use custom template
/generate-doc-skill supabase --template database-expert

# Custom output location
/generate-doc-skill react --output skills/my-react-helper
```

## What This Does

1. **Locates Cached Docs**: Finds the specified documentation in `.claude/docs/`
2. **Analyzes Content**: Examines page structure, topics, and code examples
3. **Generates Skill File**: Creates a YAML-formatted skill with:
   - Accurate version information
   - Topic coverage description
   - Reference to cached documentation
   - Auto-activation rules
4. **Creates Skill Directory**: Sets up proper directory structure
5. **Links Documentation**: Creates references to cached docs
6. **Registers Skill**: Makes skill available to Claude Code

## Generated Skill Structure

### Directory Layout

```
skills/
└── nextjs-15-expert/
    ├── SKILL.md              # Main skill file
    └── .doc-reference.json   # Metadata linking to cached docs
```

### Example Generated Skill

**`skills/nextjs-15-expert/SKILL.md`:**

```markdown
---
name: nextjs-15-expert
description: Expert knowledge of Next.js 15.0.3 based on official documentation
version: 15.0.3
library: nextjs
docs_path: .claude/docs/nextjs/15.0.3
last_updated: 2025-01-17
auto_activate: true
activation_patterns:
  - "package.json contains next@15"
  - "directory contains app/ or pages/"
  - "files contain from 'next'"
---

# Next.js 15 Expert

I have comprehensive knowledge of Next.js 15.0.3 based on the complete official documentation cached locally.

## What I Know

I can help you with:

### App Router (Next.js 15)
- File-based routing with the app directory
- Server Components and Client Components
- Server Actions for mutations
- Layouts, pages, and templates
- Route groups and parallel routes
- Intercepting routes and modal patterns

### Data Fetching
- Async Server Components
- fetch() with automatic caching
- React Server Component patterns
- Streaming with Suspense
- Incremental Static Regeneration (ISR)
- Dynamic rendering strategies

### API & Server-Side
- Route Handlers (route.ts)
- Server Actions and mutations
- Middleware for request processing
- Edge Runtime support
- API route patterns

### Rendering
- Static Site Generation (SSG)
- Server-Side Rendering (SSR)
- Client-Side Rendering (CSR)
- Partial Prerendering (PPR) - NEW in 15
- Streaming SSR with Suspense

### Metadata & SEO
- Metadata API for head tags
- Open Graph and Twitter cards
- Dynamic metadata generation
- Sitemap and robots.txt generation

### Optimization
- Image optimization with next/image
- Font optimization with next/font
- Script optimization with next/script
- Bundle analysis and code splitting

### Deployment
- Vercel deployment (recommended)
- Self-hosting with Node.js
- Docker containerization
- Edge deployment strategies

## Documentation Source

- **Source**: https://nextjs.org/docs
- **Version**: 15.0.3
- **Cached**: January 17, 2025
- **Pages**: 234
- **Framework**: Nextra
- **llms.txt**: Available ✓

## Usage

I automatically activate when you're working on Next.js 15 projects. Just ask me questions like:

- "How do I create a server action in Next.js 15?"
- "What's the best way to fetch data in the App Router?"
- "How do I implement authentication with Server Components?"
- "Show me how to use the new Partial Prerendering feature"
- "What's the difference between layout and template?"

## Version-Specific Guidance

I always reference Next.js 15.0.3 patterns. I will NOT suggest:
- Pages Router patterns (unless specifically asked)
- Deprecated APIs from earlier versions
- Outdated data fetching methods (getServerSideProps, etc. - App Router only)

If you're using a different version of Next.js, ask me to note that and I'll try to help, but my expertise is optimized for 15.0.3.

## Code Examples

I can provide accurate code examples for:
- TypeScript and JavaScript
- App Router file structures
- Server and Client Components
- Server Actions
- Route Handlers
- Middleware
- Configuration (next.config.js)

All examples are pulled from or based on the official Next.js 15.0.3 documentation.

## Updates

This skill was generated from documentation fetched on January 17, 2025.

To update when new Next.js versions are released:
```bash
/update-docs nextjs
/generate-doc-skill nextjs
```

## Related Skills

- `react-18-expert` - React 18 fundamentals
- `typescript-expert` - TypeScript best practices
- `vercel-deployment` - Vercel platform expertise

---

*Generated by doc-fetcher plugin*
*Documentation version: 15.0.3*
*Last updated: 2025-01-17*
```

### Metadata File

**`.doc-reference.json`:**

```json
{
  "library": "nextjs",
  "version": "15.0.3",
  "docs_path": ".claude/docs/nextjs/15.0.3",
  "generated_at": "2025-01-17T15:30:00Z",
  "source_url": "https://nextjs.org/docs",
  "page_count": 234,
  "template_used": "expert",
  "auto_generated": true
}
```

## Skill Templates

### Available Templates

1. **expert** (default): Comprehensive expertise skill
2. **quick-reference**: Concise helper for common tasks
3. **migration-guide**: Focused on upgrading from previous versions
4. **troubleshooter**: Debugging and error resolution
5. **best-practices**: Code review and optimization guidance

### Expert Template

Best for: Complete library coverage
- Includes all documentation topics
- Comprehensive code examples
- Auto-activation rules
- Version-specific guidance

### Quick Reference Template

Best for: Fast lookups and common patterns
- Condensed documentation
- Focuses on most-used features
- Cheat-sheet style
- Minimal context

```bash
/generate-doc-skill nextjs --template quick-reference
```

### Migration Guide Template

Best for: Version upgrades
- What's new in this version
- Breaking changes
- Migration steps
- Before/after code examples

```bash
/generate-doc-skill nextjs --template migration-guide
```

Requires: Multiple versions cached for comparison

### Troubleshooter Template

Best for: Debugging and problem-solving
- Common errors and solutions
- Debug strategies
- Performance issues
- Configuration problems

```bash
/generate-doc-skill nextjs --template troubleshooter
```

### Best Practices Template

Best for: Code quality and optimization
- Recommended patterns
- Anti-patterns to avoid
- Performance optimization
- Security considerations

```bash
/generate-doc-skill supabase --template best-practices
```

## Auto-Activation

Generated skills can automatically activate based on project context:

### Activation Triggers

1. **package.json dependencies**
   ```json
   {
     "dependencies": {
       "next": "^15.0.3"
     }
   }
   ```
   → Activates `nextjs-15-expert`

2. **File patterns**
   - `app/` directory → Next.js App Router
   - `pages/` directory → Next.js Pages Router
   - `*.config.js` → Framework configuration

3. **Import statements**
   ```typescript
   import { useState } from 'react'
   ```
   → Activates `react-18-expert`

4. **File extensions**
   - `.tsx`, `.jsx` → React skills
   - `.vue` → Vue skills
   - `.svelte` → Svelte skills

### Configure Auto-Activation

Edit the generated skill to customize activation:

```yaml
auto_activate: true
activation_patterns:
  - "package.json contains next@15"
  - "directory contains app/"
  - "user asks about Next.js 15"
activation_priority: high  # high, medium, low
```

## Skill Management

### Regenerate Skill

If documentation is updated:

```bash
/update-docs nextjs
/generate-doc-skill nextjs
```

This replaces the existing skill with updated content.

### Multiple Versions

Generate skills for multiple versions:

```bash
/fetch-docs nextjs 14.2.0
/fetch-docs nextjs 15.0.3

/generate-doc-skill nextjs 14.2.0 --output skills/nextjs-14-expert
/generate-doc-skill nextjs 15.0.3 --output skills/nextjs-15-expert
```

Both skills can coexist. Activate manually as needed.

### Skill Variants

Create specialized variants:

```bash
# General expertise
/generate-doc-skill nextjs --template expert

# Migration help
/generate-doc-skill nextjs --template migration-guide

# Quick reference
/generate-doc-skill nextjs --template quick-reference
```

All reference the same cached docs but with different focus.

## Integration with Claude Code

### How Skills Enhance AI Assistance

1. **Accurate Responses**: Claude references exact documentation, not training data
2. **Version-Specific**: Always uses the correct version for your project
3. **Context-Aware**: Activates automatically based on your code
4. **Consistent**: Same answers every time, based on official docs
5. **Up-to-Date**: Refresh docs and regenerate for latest information

### Using Generated Skills

Skills work passively in the background:

```
You: "How do I create a server action in Next.js?"

Claude: *Activates nextjs-15-expert skill*
        Based on Next.js 15.0.3 documentation...
        [Provides accurate, version-specific answer]
```

No need to explicitly invoke skills - they activate automatically.

## Output Example

```
Generating skill for Next.js 15.0.3...

✓ Located cached documentation
  Path: .claude/docs/nextjs/15.0.3/
  Pages: 234

✓ Analyzed documentation structure
  Topics: 12 major sections
  Code examples: 156
  API references: 45

✓ Generated skill file
  Template: expert
  Name: nextjs-15-expert
  Path: skills/nextjs-15-expert/SKILL.md

✓ Configured auto-activation
  Triggers: package.json, app/ directory, next imports

✓ Registered with Claude Code

Skill ready! Ask me anything about Next.js 15.0.3

Example questions:
- "How do I use Server Actions?"
- "What's the best data fetching pattern?"
- "Show me how to implement authentication"
```

## Troubleshooting

**"Documentation not found"**
- Run `/list-docs` to see what's cached
- Fetch first: `/fetch-docs <library>`

**"Skill generation failed"**
- Check documentation integrity: `/list-docs --health-check`
- Re-fetch docs: `/fetch-docs <library> --force`

**"Skill not activating"**
- Check activation patterns in the generated SKILL.md
- Manually activate: "Use nextjs-15-expert skill to help me"

**"Outdated skill content"**
- Update docs: `/update-docs <library>`
- Regenerate: `/generate-doc-skill <library>`

## Best Practices

1. **Match Project Versions**: Generate skills for the exact versions in package.json
2. **Regenerate on Updates**: When docs update, regenerate skills
3. **Use Templates Wisely**: Choose template based on your current need
4. **Name Meaningfully**: Use version in skill name (e.g., `nextjs-15-expert`)
5. **Review Generated Skills**: Customize activation patterns if needed

## Configuration

Configure skill generation in `doc-fetcher-config.json`:

```json
{
  "skill_generation": {
    "auto_generate": true,
    "default_template": "expert",
    "auto_activate": true,
    "naming_pattern": "{library}-{major-version}-expert",
    "output_directory": "skills"
  }
}
```

## See Also

- `/fetch-docs` - Fetch documentation to generate skills from
- `/update-docs` - Update documentation (regenerates skills automatically)
- `/list-docs` - See which docs are available for skill generation
- `doc-skill-generator` skill - Advanced skill generation options
