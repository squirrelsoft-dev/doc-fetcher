---
description: List all cached documentation with versions, sizes, and metadata
---

# List Documentation

Display all cached documentation including versions, sizes, update times, and associated skills.

## Usage

```bash
/list-docs [--all] [--local] [--project] [--verbose]
```

## Arguments

- `--all` (optional): Show all available documentation (local + remote)
- `--local` (optional): Show only locally cached documentation (default)
- `--project` (optional): Show only docs relevant to current project dependencies
- `--verbose` (optional): Show detailed information including page counts and sources

## Examples

```bash
# List all locally cached documentation
/list-docs

# Show documentation matching project dependencies
/list-docs --project

# Show all available documentation (including remote)
/list-docs --all

# Detailed view with full metadata
/list-docs --verbose
```

## Output Formats

### Default View

```
Cached Documentation:

├── nextjs (v15.0.3)
│   234 pages · 5.2 MB · Updated 2 days ago
│   Skill: nextjs-15-expert ✓
│
├── supabase (v2.39.0)
│   156 pages · 3.1 MB · Updated 1 week ago
│   Skill: supabase-expert ✓
│
└── react (v18.2.0)
    89 pages · 1.8 MB · Updated 3 weeks ago
    Skill: None

Total: 3 libraries · 479 pages · 10.1 MB local
```

### Project View (--project)

Shows only documentation matching your `package.json` dependencies:

```
Project Documentation (from package.json):

Cached and Current:
├── ✓ next (^15.0.3)
│   Cached: v15.0.3 (matches dependency)
│   Updated 2 days ago
│
└── ✓ react (^18.2.0)
    Cached: v18.2.0 (matches dependency)
    Updated 3 weeks ago

Missing or Outdated:
├── ✗ @supabase/supabase-js (^2.39.0)
│   Cached: v2.38.0 (outdated)
│   Run: /update-docs supabase
│
└── ✗ tailwindcss (^3.4.0)
    Not cached
    Run: /fetch-docs tailwindcss 3.4.0

Suggestions:
- Run /fetch-docs tailwindcss to add missing docs
- Run /update-docs --project to update all
```

### Verbose View (--verbose)

Shows complete metadata:

```
Detailed Documentation Cache:

nextjs (v15.0.3)
├── Pages: 234
├── Size: 5,242,880 bytes (5.2 MB)
├── Source: https://nextjs.org/docs
├── Fetched: 2025-01-15 10:30:00 UTC
├── Last updated: 2 days ago
├── Framework: Nextra
├── llms.txt: ✓ Available
├── Sitemap: https://nextjs.org/sitemap.xml
├── Local path: .claude/docs/nextjs/15.0.3/
├── Skill: nextjs-15-expert (active)
└── Versions: 15.0.3 (current), 15.0.0 (2 weeks old)

supabase (v2.39.0)
├── Pages: 156
├── Size: 3,145,728 bytes (3.1 MB)
├── Source: https://supabase.com/docs
├── Fetched: 2025-01-10 14:20:00 UTC
├── Last updated: 1 week ago
├── Framework: Mintlify
├── llms.txt: ✗ Not available
├── Sitemap: https://supabase.com/sitemap.xml
├── Local path: .claude/docs/supabase/2.39.0/
├── Skill: supabase-expert (active)
└── Versions: 2.39.0 (current)

Total storage: 10,485,760 bytes (10.1 MB)
Total libraries: 2
Total pages: 390
```

### All Available (--all)

Shows both local and remote documentation (if remote sync enabled):

```
Available Documentation:

Locally Cached (3):
├── nextjs (v15.0.3) - 5.2 MB
├── supabase (v2.39.0) - 3.1 MB
└── react (v18.2.0) - 1.8 MB

Available on Remote (squirrelsoft.dev) (12):
├── vue (v3.4.0) - 2.1 MB
├── angular (v17.0.0) - 4.3 MB
├── svelte (v4.2.0) - 1.2 MB
├── tailwindcss (v3.4.0) - 2.8 MB
└── ... (8 more)

Quick fetch from remote:
/fetch-docs vue --sync
```

## Status Indicators

- `✓` - Cached and current
- `✗` - Missing or outdated
- `⚠` - Warning (e.g., old version, missing pages)
- `🔄` - Currently updating
- `📦` - Available remotely
- `⭐` - Popular/recommended

## Filtering

### By Status

```bash
/list-docs --status outdated
/list-docs --status missing
/list-docs --status current
```

### By Library

```bash
/list-docs --library nextjs
/list-docs --library "react*"  # Wildcard matching
```

### By Age

```bash
/list-docs --older-than 30d
/list-docs --newer-than 7d
```

## Sorting

Default sorting: Alphabetical by library name

```bash
/list-docs --sort size        # Largest first
/list-docs --sort updated     # Most recently updated first
/list-docs --sort pages       # Most pages first
/list-docs --sort name        # Alphabetical (default)
```

## Interactive Mode

Run without arguments for interactive mode:

```
What would you like to do?

1. View all cached documentation
2. View documentation for current project
3. Find documentation for a specific library
4. Check for updates
5. Clean up old versions

Enter choice (1-5):
```

## Integration with Other Commands

The list output suggests relevant commands:

```
nextjs (v15.0.0) - Outdated
  → Run: /update-docs nextjs

tailwindcss - Not cached
  → Run: /fetch-docs tailwindcss

react (v18.2.0) - Has old version (v18.0.0)
  → Run: /clean-docs react --keep 1
```

## Export Options

### JSON Export

```bash
/list-docs --format json > docs-cache.json
```

Output:
```json
{
  "libraries": [
    {
      "name": "nextjs",
      "version": "15.0.3",
      "pages": 234,
      "size_bytes": 5242880,
      "fetched_at": "2025-01-15T10:30:00Z",
      "source_url": "https://nextjs.org/docs",
      "framework": "nextra",
      "skill": "nextjs-15-expert",
      "local_path": ".claude/docs/nextjs/15.0.3/"
    }
  ],
  "total_libraries": 1,
  "total_pages": 234,
  "total_size_bytes": 5242880
}
```

### Markdown Export

```bash
/list-docs --format markdown > DOCS.md
```

Useful for project documentation or team wikis.

### CSV Export

```bash
/list-docs --format csv > docs-cache.csv
```

For analysis in spreadsheets.

## Cache Statistics

Shows summary statistics about your documentation cache:

```
Documentation Cache Statistics:

Storage:
- Total size: 10.1 MB
- Largest library: nextjs (5.2 MB)
- Smallest library: react (1.8 MB)
- Average size: 3.4 MB

Pages:
- Total pages: 479
- Most pages: nextjs (234)
- Least pages: react (89)
- Average pages: 160

Updates:
- Most recent: nextjs (2 days ago)
- Oldest: react (3 weeks ago)
- Average age: 12 days

Recommendations:
- Consider updating react (21 days old)
- Remove nextjs v15.0.0 (superseded by v15.0.3)
```

## Health Check

Verify integrity of cached documentation:

```bash
/list-docs --health-check
```

Output:
```
Checking documentation cache health...

✓ nextjs v15.0.3 - OK
  All 234 pages present
  Metadata valid
  Skill functional

⚠ supabase v2.39.0 - Warning
  Missing 3 pages (153/156)
  Suggestion: Re-fetch with /fetch-docs supabase

✗ react v18.2.0 - Error
  Corrupted metadata file
  Suggestion: Remove and re-fetch

Health Score: 67% (2/3 OK)
```

## Common Use Cases

### 1. Morning Routine
```bash
/list-docs --project
# Check if any project docs need updating
```

### 2. New Project Setup
```bash
/list-docs --project
# See what's missing, fetch needed docs
```

### 3. Cleanup
```bash
/list-docs --older-than 60d
# Find stale docs to remove
```

### 4. Team Sync
```bash
/list-docs --format json > team-docs.json
# Share with team what docs are cached
```

## Configuration

Configure list display in `doc-fetcher-config.json`:

```json
{
  "list": {
    "default_view": "tree",
    "show_skills": true,
    "show_sizes": true,
    "highlight_outdated_days": 30,
    "group_by": "library"
  }
}
```

## Performance Notes

- Listing is instant (reads from index files)
- `--health-check` may take longer (verifies all files)
- `--all` requires network call to check remote availability

## See Also

- `/fetch-docs` - Fetch new documentation
- `/update-docs` - Update existing documentation
- `/clean-docs` - Remove old documentation versions
- `/generate-doc-skill` - Create skills from cached docs
