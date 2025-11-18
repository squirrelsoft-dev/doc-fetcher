---
name: dependency-detector
description: Detects project dependencies and suggests fetching relevant documentation automatically
version: 1.0.0
auto_activate: true
activation_patterns:
  - "opened project with package.json"
  - "user runs /list-docs --project"
  - "user starts coding in new project"
tool_restrictions:
  - Read
  - Glob
  - Bash
---

# Dependency Detector

I automatically detect your project's dependencies and suggest fetching relevant documentation to provide accurate, version-specific AI assistance.

## What I Do

I analyze your project to understand what libraries you're using:

1. **Detect Package Managers**: Identify npm, yarn, pnpm, bun
2. **Parse Dependencies**: Read package.json, requirements.txt, go.mod, etc.
3. **Extract Versions**: Get exact versions you're using
4. **Compare with Cache**: Check what documentation is already cached
5. **Suggest Fetches**: Recommend fetching missing or outdated docs
6. **Smart Prioritization**: Focus on major frameworks first

## Supported Project Types

### JavaScript/TypeScript (Node.js)

**Detection files:**
- `package.json` - npm/yarn/pnpm dependencies
- `package-lock.json` - Locked versions
- `yarn.lock` - Yarn locked versions
- `pnpm-lock.yaml` - pnpm locked versions
- `bun.lockb` - Bun locked versions

**Parsed fields:**
```json
{
  "dependencies": { ... },      // Production deps
  "devDependencies": { ... },   // Dev deps (lower priority)
  "peerDependencies": { ... }   // Peer deps (important for plugins)
}
```

**Prioritized libraries:**
- Frameworks: next, react, vue, svelte, angular, nuxt
- Meta-frameworks: astro, remix, solid-start
- Backend: express, fastify, nest, koa
- Databases: prisma, typeorm, mongoose, drizzle
- Supabase: @supabase/supabase-js, @supabase/auth-helpers
- UI: tailwindcss, shadcn-ui, mui, chakra-ui
- State: redux, zustand, jotai, mobx

### Python

**Detection files:**
- `requirements.txt` - pip dependencies
- `pyproject.toml` - Poetry/modern Python
- `Pipfile` - Pipenv
- `setup.py` - Package setup
- `environment.yml` - Conda

**Prioritized libraries:**
- Frameworks: django, flask, fastapi, tornado
- Data: pandas, numpy, scipy, matplotlib
- ML: tensorflow, pytorch, scikit-learn
- Async: asyncio, aiohttp, celery

### Go

**Detection files:**
- `go.mod` - Go modules
- `go.sum` - Checksums

**Prioritized libraries:**
- Frameworks: gin, echo, fiber, chi
- gRPC: grpc-go
- Databases: gorm, sqlx

### Rust

**Detection files:**
- `Cargo.toml` - Rust dependencies
- `Cargo.lock` - Locked versions

**Prioritized libraries:**
- Frameworks: actix-web, rocket, axum
- Async: tokio, async-std
- Serde: serde, serde_json

## Detection Process

### Phase 1: Project Scan

```
Scanning project for dependencies...

✓ Found package.json
✓ Found package-lock.json (exact versions available)
✓ Detected package manager: npm
```

### Phase 2: Parse Dependencies

```javascript
// Example package.json
{
  "dependencies": {
    "next": "^15.0.3",
    "react": "^18.2.0",
    "@supabase/supabase-js": "^2.39.0",
    "tailwindcss": "^3.4.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/react": "^18.2.0"
  }
}
```

Extracted:
```
Production dependencies: 4
Development dependencies: 2

Frameworks detected:
  - Next.js (v15.0.3)
  - React (v18.2.0)

Libraries detected:
  - Supabase (v2.39.0)
  - Tailwind CSS (v3.4.0)
```

### Phase 3: Version Resolution

```
Resolving exact versions...

next: ^15.0.3 → 15.0.3 (from package-lock.json)
react: ^18.2.0 → 18.2.0 (from package-lock.json)
@supabase/supabase-js: ^2.39.0 → 2.39.0 (from package-lock.json)
tailwindcss: ^3.4.0 → 3.4.1 (from package-lock.json)
```

### Phase 4: Cache Comparison

```
Comparing with cached documentation...

✓ next@15.0.3
  Cached: v15.0.3 ✓ (matches exactly)
  Skill: nextjs-15-expert (active)

✗ react@18.2.0
  Cached: Not cached
  Suggestion: /fetch-docs react 18.2.0

⚠ @supabase/supabase-js@2.39.0
  Cached: v2.38.0 (outdated by 1 minor version)
  Suggestion: /update-docs supabase

✓ tailwindcss@3.4.1
  Cached: v3.4.0 (close enough, minor version)
  Skill: tailwind-expert (active)
```

### Phase 5: Recommendations

```
Documentation Recommendations:

Priority 1 (Critical frameworks):
  1. /fetch-docs react 18.2.0
     Reason: Core framework, not cached

Priority 2 (Outdated versions):
  2. /update-docs supabase
     Reason: Cached version (2.38.0) is outdated

Priority 3 (Optional):
  3. /fetch-docs typescript 5.3.0
     Reason: Dev dependency, could improve type hints

Quick setup:
  Run all: /fetch-docs react && /update-docs supabase

Or automatically:
  /fetch-docs --project
```

## Smart Prioritization

I prioritize documentation fetching based on:

### Priority 1: Critical Frameworks

These are essential and should be fetched immediately:
- Next.js, React, Vue, Svelte, Angular
- Django, Flask, FastAPI
- Express, Fastify, NestJS

**Reasoning:** These are the foundation of your application. Accurate docs are critical.

### Priority 2: Major Libraries

Important but not critical:
- Supabase, Firebase, AWS SDK
- Prisma, TypeORM, Drizzle
- Tailwind CSS, MUI, Chakra UI

**Reasoning:** Used extensively, but usually have stable APIs.

### Priority 3: Utility Libraries

Nice to have:
- Lodash, Ramda
- Day.js, Moment
- Axios, node-fetch

**Reasoning:** Smaller scope, less likely to have breaking changes.

### Priority 4: Dev Dependencies

Lowest priority:
- TypeScript (mostly stable)
- Testing libraries
- Linters and formatters

**Reasoning:** Less likely to need frequent reference.

## Library Mapping

Some libraries have different documentation names:

```javascript
const libraryMappings = {
  // npm package → documentation name
  "@supabase/supabase-js": "supabase",
  "@supabase/auth-helpers-nextjs": "supabase-auth",
  "next": "nextjs",
  "tailwindcss": "tailwind",
  "@tanstack/react-query": "react-query",
  "@mui/material": "mui",
  "@chakra-ui/react": "chakra-ui"
};
```

I automatically map these when suggesting fetches.

## Version Matching Strategy

How I determine if cached docs are "good enough":

```javascript
const versionMatch = (cached, required) => {
  const [cMajor, cMinor, cPatch] = cached.split('.');
  const [rMajor, rMinor, rPatch] = required.split('.');

  // Major version MUST match
  if (cMajor !== rMajor) return 'mismatch';

  // Minor version ideally matches
  if (cMinor === rMinor) return 'exact';
  if (Math.abs(cMinor - rMinor) === 1) return 'close';

  return 'outdated';
};

// Results:
// 'exact'    → ✓ Perfect, use cached docs
// 'close'    → ⚠ Close enough, but update recommended
// 'outdated' → ⚠ Should update
// 'mismatch' → ✗ Must fetch correct major version
```

## Auto-Activation

I automatically activate in these scenarios:

### 1. Project Opens

When you open a project with Claude Code:

```
Welcome to your Next.js project!

Detected dependencies:
  - Next.js 15.0.3 ✓ (docs cached)
  - React 18.2.0 ✗ (not cached)

Would you like me to fetch React documentation?
  → /fetch-docs react 18.2.0
```

### 2. New Dependency Added

When you modify package.json:

```
Detected new dependency: @tanstack/react-query@5.17.0

This library is not cached yet. Fetch documentation?
  → /fetch-docs react-query 5.17.0
```

### 3. /list-docs --project

When you explicitly request project analysis:

```
/list-docs --project

Project Dependencies Analysis:

From package.json:
  ✓ next@15.0.3 (cached, current)
  ✗ react@18.2.0 (not cached)
  ⚠ @supabase/supabase-js@2.39.0 (cached 2.38.0, outdated)

Recommendations:
  /fetch-docs react 18.2.0
  /update-docs supabase
```

## Integration with Other Skills

I work with other doc-fetcher skills:

```
User opens project
  ↓
dependency-detector activates
  ↓
Detects: next@15.0.3, react@18.2.0
  ↓
Checks cache:
  - next ✓ cached
  - react ✗ not cached
  ↓
Suggests: /fetch-docs react
  ↓
User runs command
  ↓
llms-txt-finder checks for llms.txt
  ↓
doc-indexer crawls and caches
  ↓
doc-skill-generator creates react-18-expert
  ↓
dependency-detector confirms:
  ✓ All project dependencies documented
```

## Configuration

Configure my behavior in `doc-fetcher-config.json`:

```json
{
  "dependency_detection": {
    "auto_detect": true,
    "auto_suggest": true,
    "project_types": ["javascript", "typescript", "python", "go", "rust"],
    "include_dev_dependencies": false,
    "prioritize_frameworks": true,
    "version_match_tolerance": "minor",
    "suggest_on_project_open": true,
    "suggest_on_dependency_add": true
  }
}
```

## Output Examples

### Clean Project (All Cached)

```
Project dependency check:

✓ All dependencies have cached documentation

next@15.0.3 → nextjs-15-expert (active)
react@18.2.0 → react-18-expert (active)
@supabase/supabase-js@2.39.0 → supabase-expert (active)

You're all set! Claude has accurate docs for your entire stack.
```

### Missing Docs

```
Project dependency check:

Missing documentation for 2 dependencies:

✗ react@18.2.0
  Impact: High (core framework)
  Command: /fetch-docs react 18.2.0

✗ @tanstack/react-query@5.17.0
  Impact: Medium (data fetching library)
  Command: /fetch-docs react-query 5.17.0

Quick fix:
  /fetch-docs react 18.2.0 && /fetch-docs react-query 5.17.0

Or batch:
  /fetch-docs --project
```

### Mixed State

```
Project dependency check:

✓ Cached and current: 3 dependencies
  next@15.0.3, typescript@5.3.0, tailwindcss@3.4.1

⚠ Cached but outdated: 1 dependency
  @supabase/supabase-js@2.39.0
  (cached: 2.38.0, outdated by 1 minor version)
  Command: /update-docs supabase

✗ Not cached: 1 dependency
  react@18.2.0
  Command: /fetch-docs react 18.2.0

Quick fix:
  /update-docs supabase && /fetch-docs react 18.2.0
```

## Use Cases

### 1. New Project Setup

```bash
# Clone a repo
git clone https://github.com/example/app
cd app

# Open with Claude Code
# dependency-detector auto-runs

Detected: next@15.0.3, react@18.2.0, supabase@2.39.0

None cached. Fetch all?
  /fetch-docs --project

# Claude now has accurate context for entire stack
```

### 2. Version Upgrade

```bash
# Upgrade Next.js
npm install next@latest

# dependency-detector notices change

Dependency version changed:
  next: 15.0.3 → 15.1.0

Documentation needs update:
  /update-docs nextjs

# Claude now knows about new features
```

### 3. Adding New Library

```bash
# Add React Query
npm install @tanstack/react-query

# dependency-detector notices

New dependency detected: @tanstack/react-query@5.17.0

Fetch documentation?
  /fetch-docs react-query 5.17.0

# Claude can now help with React Query
```

## Troubleshooting

**"Dependency detection not working"**
- Check package.json exists in root
- Verify package.json is valid JSON
- Check `auto_detect` enabled in config

**"Wrong version detected"**
- Ensure lockfile is up to date (npm install)
- Check for conflicting version specifiers
- Manually specify version in /fetch-docs

**"Too many suggestions"**
- Disable dev dependencies in config
- Increase version tolerance
- Manually select which to fetch

**"Library not recognized"**
- Check library mapping in code
- Use custom URL: /fetch-docs mylib --url https://...
- Submit issue to add library to mappings

## See Also

- `/list-docs --project` - View project documentation status
- `/fetch-docs --project` - Fetch all missing project docs
- `/update-docs --project` - Update all project docs
- `doc-indexer` skill - Performs the actual fetching
