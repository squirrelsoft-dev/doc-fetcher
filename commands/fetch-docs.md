---
description: Fetch and cache documentation for a library with version-specific snapshots
---

# Fetch Documentation

Fetch and cache documentation for a specified library, creating a local snapshot for accurate, version-specific AI context.

## Usage

```bash
/fetch-docs <library> [version] [--url <custom-url>] [--sync]
```

## Arguments

- `library` (required): Name of the library to fetch documentation for (e.g., "nextjs", "supabase", "react")
- `version` (optional): Specific version to fetch. If omitted, fetches the latest version
- `--url` (optional): Custom documentation URL if not using a well-known library
- `--sync` (optional): Sync to remote squirrelsoft.dev repository (if configured)

## Examples

```bash
# Fetch latest Next.js documentation
/fetch-docs nextjs

# Fetch specific version of Next.js docs
/fetch-docs nextjs 15.0.0

# Fetch Supabase docs
/fetch-docs supabase

# Fetch from custom URL
/fetch-docs my-internal-lib --url https://docs.company.com/my-lib

# Fetch and sync to remote
/fetch-docs react --sync
```

## What This Does

1. **Discovery**: First checks for AI-friendly documentation formats:
   - `llms.txt` - AI-optimized documentation format
   - `claude.txt` - Claude-specific documentation
   - `sitemap.xml` - Standard sitemap for crawling

2. **Framework Detection**: Identifies the documentation framework:
   - Docusaurus
   - VitePress
   - Nextra
   - GitBook
   - Mintlify
   - ReadTheDocs
   - Custom/Static sites

3. **Crawling**: Intelligently crawls the documentation:
   - Respects robots.txt
   - Rate-limited requests (configurable delay)
   - Extracts main content (strips navigation, footers, ads)
   - Preserves code examples with language tags
   - Maintains heading hierarchy

4. **Storage**: Saves documentation locally:
   - Path: `.claude/docs/[library]/[version]/`
   - Metadata: `index.json` with fetch info
   - Structure: `sitemap.json` with page hierarchy
   - Content: Individual markdown files per page

5. **Skill Generation**: Optionally creates a Claude Code skill:
   - Auto-generated if `auto_generate_skills: true` in config
   - Creates version-specific expert skill
   - Skill references cached documentation

6. **Confirmation**: Reports success with:
   - Number of pages fetched
   - Total storage size
   - Cache location
   - Generated skill (if applicable)

## Configuration

Default behavior can be modified in `doc-fetcher-config.json`:

```json
{
  "cache_directory": ".claude/docs",
  "auto_generate_skills": true,
  "crawl_delay_ms": 1000,
  "max_pages_per_fetch": 500,
  "remote_sync": false
}
```

## Output Example

```
Fetching Next.js documentation (v15.0.0)...

✓ Found llms.txt at https://nextjs.org/llms.txt
✓ Detected framework: Nextra
✓ Crawling 234 pages...
  [████████████████████] 234/234 (100%)

✓ Documentation cached successfully
  Location: .claude/docs/nextjs/15.0.0/
  Pages: 234
  Size: 5.2 MB

✓ Generated skill: nextjs-15-expert
  Activate with: You can now ask me Next.js 15 questions

Use /generate-doc-skill nextjs to regenerate the skill if needed.
```

## Error Handling

- **Network errors**: Retries with exponential backoff
- **404s**: Skips missing pages, continues crawling
- **Rate limits**: Automatically increases delay between requests
- **Large documentation**: Warns if exceeding `max_pages_per_fetch`, offers to continue
- **Timeouts**: Increases timeout and retries

## Best Practices

1. **Fetch project dependencies**: Run `/list-docs --project` first to see what's needed
2. **Version matching**: Always specify version matching your `package.json`
3. **Update regularly**: Run `/update-docs --project` weekly for active projects
4. **Use llms.txt when available**: These are optimized for AI consumption
5. **Custom docs**: For internal tools, use `--url` to cache proprietary documentation

## Integration with Skills

After fetching, the documentation becomes available to:

1. **Auto-generated skills**: Activated automatically based on your project
2. **Manual queries**: "Use Next.js 15 docs to help me with..."
3. **Code suggestions**: Claude references cached docs when suggesting code
4. **Version-aware**: Always uses the correct version you specified

## Technical Details

### Storage Structure

```
.claude/docs/
└── nextjs/
    └── 15.0.0/
        ├── index.json          # Metadata (source, fetch time, etc.)
        ├── sitemap.json        # Page hierarchy and navigation
        └── pages/
            ├── getting-started.md
            ├── routing/
            │   ├── introduction.md
            │   ├── defining-routes.md
            │   └── ...
            └── api-reference/
                └── ...
```

### Metadata Format (index.json)

```json
{
  "library": "nextjs",
  "version": "15.0.0",
  "source_url": "https://nextjs.org/docs",
  "fetched_at": "2025-01-17T10:30:00Z",
  "llms_txt_url": "https://nextjs.org/llms.txt",
  "sitemap_url": "https://nextjs.org/sitemap.xml",
  "page_count": 234,
  "total_size_bytes": 5242880,
  "framework": "nextra",
  "skill_generated": true,
  "skill_path": "skills/nextjs-15-expert"
}
```

## Troubleshooting

**"Could not detect documentation framework"**
- Try providing a direct URL to the docs homepage with `--url`
- Check if the site has a sitemap.xml
- The site may require JavaScript rendering (coming in Phase 2)

**"Rate limited by server"**
- Increase `crawl_delay_ms` in config
- Try again later
- Some sites may block automated access

**"Documentation too large (>500 pages)"**
- Increase `max_pages_per_fetch` in config
- Or fetch specific sections manually

**"Skill not auto-generated"**
- Check `auto_generate_skills` in config
- Manually run `/generate-doc-skill <library>`

## See Also

- `/update-docs` - Update cached documentation to latest version
- `/list-docs` - View all cached documentation
- `/generate-doc-skill` - Generate a skill from cached docs
- `doc-crawler` agent - For advanced crawling scenarios
