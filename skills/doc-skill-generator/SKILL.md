---
name: doc-skill-generator
description: Generates Claude Code skills from cached documentation with intelligent templates and auto-activation rules
version: 1.0.0
auto_activate: false
tool_restrictions:
  - Read
  - Write
  - Glob
  - Bash
---

# Documentation Skill Generator

I generate Claude Code skills from cached documentation, creating version-specific expert skills that reference your locally cached docs.

## What I Do

I transform cached documentation into functional Claude Code skills:

1. **Analyze Documentation**: Read cached docs and extract structure
2. **Generate Skill Content**: Create skill description and capabilities
3. **Configure Auto-Activation**: Set up smart activation based on project context
4. **Create Metadata**: Link skill to cached documentation
5. **Optimize for AI**: Structure content for effective AI assistance

## Skill Templates

I support multiple templates for different use cases:

### 1. Expert Template (Default)

**Best for:** Comprehensive library coverage

```yaml
Features:
  - Complete topic coverage
  - All API references included
  - Code examples from docs
  - Auto-activation rules
  - Version-specific guidance
  - Migration notes (if available)

Use case:
  "I want Claude to be an expert in Next.js 15"
```

### 2. Quick Reference Template

**Best for:** Fast lookups and common patterns

```yaml
Features:
  - Condensed documentation
  - Top 20% most-used features
  - Cheat-sheet style
  - Minimal context overhead
  - Fast activation

Use case:
  "I just need quick API references"
```

### 3. Migration Guide Template

**Best for:** Version upgrades

```yaml
Features:
  - What's new comparison
  - Breaking changes highlighted
  - Before/after examples
  - Deprecation warnings
  - Upgrade checklist

Use case:
  "I'm upgrading from Next.js 14 to 15"

Requirements:
  - Multiple versions cached
```

### 4. Troubleshooter Template

**Best for:** Debugging and problem-solving

```yaml
Features:
  - Common errors catalog
  - Debug strategies
  - Performance issues
  - Configuration problems
  - Stack trace interpretation

Use case:
  "Help me debug issues faster"
```

### 5. Best Practices Template

**Best for:** Code quality and optimization

```yaml
Features:
  - Recommended patterns
  - Anti-patterns to avoid
  - Performance optimization
  - Security considerations
  - Accessibility tips

Use case:
  "Ensure I'm using the library correctly"
```

## Skill Generation Process

### Step 1: Load Documentation

```
Reading cached documentation...
  Path: .claude/docs/nextjs/15.0.3/
  Files: 234 markdown files
  Size: 5.2 MB
  Index: index.json loaded
  Sitemap: sitemap.json loaded
```

### Step 2: Analyze Content

```javascript
// Conceptual analysis
const analysis = {
  topics: extractTopics(pages),           // ["Routing", "Data Fetching", ...]
  apiMethods: extractAPIMethods(pages),   // ["fetch", "cookies", "headers", ...]
  codeExamples: extractCodeBlocks(pages), // 156 code examples
  sections: buildHierarchy(sitemap),      // Nested structure
  keywords: generateKeywords(content),    // ["server actions", "app router", ...]
  version: extractVersion(metadata)       // "15.0.3"
};
```

### Step 3: Generate Skill Content

Based on the selected template, I create the skill file:

**Example: Expert Template**

```markdown
---
name: nextjs-15-expert
description: Expert knowledge of Next.js 15.0.3 based on official documentation
version: 15.0.3
library: nextjs
docs_path: .claude/docs/nextjs/15.0.3
auto_activate: true
activation_patterns:
  - "package.json contains next@15"
  - "directory contains app/ or pages/"
  - "imports from 'next'"
---

# Next.js 15 Expert

I have comprehensive, version-specific knowledge of Next.js 15.0.3 based on the complete official documentation.

## Topics I Cover

{/* Auto-generated from documentation structure */}

- **Routing** (App Router & Pages Router)
- **Data Fetching** (Server Components, fetch API, caching)
- **Rendering** (SSG, SSR, CSR, Streaming)
- **Server Actions** (Mutations, form handling)
- **API Routes** (Route handlers, middleware)
- **Optimization** (Images, fonts, scripts)
- **Metadata** (SEO, Open Graph)
- **Configuration** (next.config.js options)

## What I Know

{/* Auto-generated capability list */}

I can help you with:
- Setting up new Next.js 15 projects
- Implementing App Router patterns
- Creating Server Actions for mutations
- Optimizing performance and bundle size
- Configuring metadata for SEO
- Deploying to Vercel or self-hosting
- Migrating from Pages Router to App Router
- Troubleshooting common issues

## Code Examples

{/* Reference to extracted code examples */}

I have access to 156 code examples covering:
- TypeScript and JavaScript
- Server Components
- Client Components
- Server Actions
- Route Handlers
- Middleware
- Configuration

## Version Notes

This skill is specifically for Next.js **15.0.3**.

Key features in this version:
- Partial Prerendering (PPR)
- Enhanced Server Actions
- Improved fetch caching
- Better error handling

I will NOT suggest deprecated patterns from earlier versions.

---

*Generated by doc-fetcher plugin*
*Source: https://nextjs.org/docs*
*Cached: 2025-01-17*
```

### Step 4: Create Metadata

I create a `.doc-reference.json` file to link the skill to cached docs:

```json
{
  "library": "nextjs",
  "version": "15.0.3",
  "docs_path": ".claude/docs/nextjs/15.0.3",
  "generated_at": "2025-01-17T15:30:00Z",
  "template_used": "expert",
  "source_url": "https://nextjs.org/docs",
  "page_count": 234,
  "code_examples": 156,
  "auto_generated": true,
  "last_regenerated": "2025-01-17T15:30:00Z"
}
```

### Step 5: Configure Auto-Activation

I set up intelligent activation rules:

```yaml
# When to auto-activate this skill

activation_patterns:
  # package.json dependency
  - "package.json contains next@15"
  - "package.json contains next@^15"

  # Directory structure
  - "directory contains app/"
  - "directory contains pages/"

  # File imports
  - "imports from 'next'"
  - "imports from 'next/server'"
  - "imports from 'next/navigation'"

  # File names
  - "file named next.config.js"
  - "file named middleware.ts"
  - "file matches app/**/*.tsx"

  # User intent
  - "user asks about Next.js 15"
  - "user mentions App Router"
  - "user mentions Server Actions"

activation_priority: high  # high, medium, low
activation_confidence: 0.9  # 0.0 - 1.0
```

## Template Customization

### Expert Template

```yaml
Includes:
  - All topics from documentation
  - Complete API reference
  - All code examples
  - Migration notes
  - Best practices sections

Content structure:
  1. Overview
  2. Topics covered (exhaustive)
  3. What I know (capabilities)
  4. Code examples catalog
  5. Version-specific notes
  6. Usage examples

Activation:
  - Aggressive auto-activation
  - High confidence threshold
```

### Quick Reference Template

```yaml
Includes:
  - Top 20% most-used features only
  - Essential APIs
  - Common code patterns
  - Quick tips

Content structure:
  1. Brief overview
  2. Core features (condensed)
  3. Common patterns
  4. Quick reference tables

Activation:
  - Manual activation preferred
  - Low overhead
```

### Migration Guide Template

```yaml
Includes:
  - Version comparison (e.g., 14 → 15)
  - Breaking changes
  - New features
  - Deprecated features
  - Code migration examples

Content structure:
  1. What's new
  2. Breaking changes
  3. Deprecated APIs
  4. Migration checklist
  5. Before/after examples

Activation:
  - On version mismatch detection
  - Manual for upgrade planning

Requirements:
  - Requires multiple versions cached
  - Compares v14 vs v15 docs
```

### Troubleshooter Template

```yaml
Includes:
  - Common errors from docs
  - Debug strategies
  - Performance issues
  - Configuration gotchas

Content structure:
  1. Error catalog
  2. Debugging tips
  3. Performance checklist
  4. Configuration guide
  5. FAQ

Activation:
  - On error keywords
  - Manual for debugging sessions
```

### Best Practices Template

```yaml
Includes:
  - Recommended patterns from docs
  - Anti-patterns
  - Performance tips
  - Security guidelines

Content structure:
  1. Do's and Don'ts
  2. Performance optimization
  3. Security best practices
  4. Accessibility considerations
  5. Production checklist

Activation:
  - Manual for code review
  - On "best practice" queries
```

## Content Extraction Intelligence

I intelligently extract different content types:

### API Methods

```javascript
// Detected from documentation
const apiMethods = [
  {
    name: "cookies()",
    signature: "cookies(): RequestCookies",
    description: "Read incoming request cookies",
    availability: "Server Components, Route Handlers",
    example: "const cookieStore = cookies(); const theme = cookieStore.get('theme')"
  },
  // ... more methods
];
```

### Code Examples

```javascript
// Extracted and categorized
const codeExamples = [
  {
    language: "tsx",
    category: "Server Actions",
    title: "Creating a Server Action",
    code: "export async function createUser(formData: FormData) { ... }",
    sourceUrl: "https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions"
  },
  // ... 155 more examples
];
```

### Topics and Sections

```javascript
// Built from sitemap hierarchy
const topics = [
  {
    title: "Routing",
    pages: 24,
    subtopics: [
      "Defining Routes",
      "Pages and Layouts",
      "Dynamic Routes",
      "Route Groups",
      "Parallel Routes"
    ]
  },
  // ... more topics
];
```

## Skill Naming

I generate meaningful skill names:

```javascript
// Naming patterns
const patterns = {
  expert: "{library}-{major-version}-expert",
  quickRef: "{library}-quick-ref",
  migration: "{library}-{old-version}-to-{new-version}",
  troubleshoot: "{library}-troubleshooter",
  bestPractices: "{library}-best-practices"
};

// Examples:
// "nextjs-15-expert"
// "supabase-quick-ref"
// "react-17-to-18"
// "nextjs-troubleshooter"
// "nextjs-best-practices"
```

## Regeneration

When documentation is updated, I intelligently regenerate:

```
Detected documentation update for Next.js
  Old: 15.0.0
  New: 15.0.3

Regenerating skill: nextjs-15-expert

Changes detected:
  - 12 new pages added
  - 3 pages modified
  - 1 page removed
  - 8 new code examples

Skill updated:
  ✓ New features added to topics
  ✓ Code examples refreshed
  ✓ Version metadata updated
  ✓ Activation rules preserved

Skill ready: nextjs-15-expert
```

## Output Example

```
Generating skill for Next.js 15.0.3...

[1/5] Loading documentation
  ✓ Read 234 markdown files
  ✓ Loaded metadata and sitemap
  ✓ Parsed code examples

[2/5] Analyzing content
  ✓ Identified 12 major topics
  ✓ Extracted 156 code examples
  ✓ Found 89 API methods
  ✓ Generated 247 keywords

[3/5] Generating skill (expert template)
  ✓ Created skill description
  ✓ Listed all topics and capabilities
  ✓ Included code example references
  ✓ Added version-specific notes

[4/5] Configuring auto-activation
  ✓ Set activation patterns
  ✓ Priority: high
  ✓ Confidence: 0.9

[5/5] Saving skill
  ✓ Written to: skills/nextjs-15-expert/SKILL.md
  ✓ Created metadata: .doc-reference.json
  ✓ Registered with Claude Code

✓ Skill generated successfully!

Skill name: nextjs-15-expert
Location: skills/nextjs-15-expert/
Template: expert
Auto-activation: enabled

The skill is now active. Ask me anything about Next.js 15!
```

## Configuration

Configure my behavior in `doc-fetcher-config.json`:

```json
{
  "skill_generation": {
    "auto_generate": true,
    "default_template": "expert",
    "auto_activate": true,
    "naming_pattern": "{library}-{major-version}-expert",
    "output_directory": "skills",
    "include_code_examples": true,
    "max_examples_per_topic": 5,
    "generate_metadata": true
  }
}
```

## Advanced Features

### Multi-Version Skills

Generate and maintain skills for multiple versions:

```bash
/generate-doc-skill nextjs 14.2.0 --output skills/nextjs-14-expert
/generate-doc-skill nextjs 15.0.3 --output skills/nextjs-15-expert
```

Both skills coexist. Activation rules ensure the correct version is used.

### Skill Merging

Combine multiple libraries into one skill:

```bash
/generate-doc-skill nextjs,react,typescript --template full-stack
```

Creates a unified skill with knowledge of all three libraries.

### Custom Templates

Create your own templates:

```yaml
# templates/my-custom-template.yml
name: "{library}-custom"
description: "Custom skill for {library}"
sections:
  - overview
  - quick_start
  - api_reference
activation: manual
```

Use:
```bash
/generate-doc-skill nextjs --template ./templates/my-custom-template.yml
```

## Troubleshooting

**"Skill generation failed"**
- Check documentation cache exists
- Verify index.json is valid
- Re-fetch docs if corrupted

**"Skill too large"**
- Use `quick-reference` template instead
- Limit code examples in config
- Filter to specific topics

**"Skill not auto-activating"**
- Check activation patterns in SKILL.md
- Verify package.json contains dependency
- Manually activate first time

**"Outdated skill content"**
- Run `/update-docs <library>`
- Regenerate with `/generate-doc-skill <library>`

## See Also

- `/generate-doc-skill` command - Main entry point
- `doc-indexer` skill - Creates the cached docs I use
- `/fetch-docs` command - Auto-generates skills after fetching
