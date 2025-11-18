---
name: doc-indexer
description: Main crawling and indexing logic for documentation sites, handles sitemap parsing, content extraction, and storage
version: 1.0.0
auto_activate: false
tool_restrictions:
  - WebFetch
  - Bash
  - Read
  - Write
  - Glob
  - Task
---

# Documentation Indexer

I orchestrate the crawling, parsing, and indexing of documentation from web sources. I'm the core engine behind the `/fetch-docs` command.

## What I Do

I handle the complete documentation fetching workflow:

1. **Discovery**: Find documentation pages via sitemap.xml or navigation
2. **Framework Detection**: Identify the documentation framework in use
3. **Crawling**: Systematically fetch all documentation pages
4. **Content Extraction**: Extract clean content from HTML (remove nav, footer, etc.)
5. **Storage**: Organize and save documentation locally
6. **Indexing**: Create searchable index and metadata
7. **Validation**: Ensure completeness and quality

## Workflow

### Phase 1: Discovery

First, I determine how to discover all documentation pages:

```
1. Check for llms.txt (delegate to llms-txt-finder)
   ✗ Not found → Continue

2. Check for sitemap.xml
   ✓ Found at https://example.com/sitemap.xml

3. Parse sitemap
   Found 234 URLs matching /docs/ pattern

4. Filter and validate URLs
   Kept 234 documentation URLs
   Excluded 45 blog/marketing URLs
```

### Phase 2: Framework Detection

I detect the documentation framework to optimize extraction:

**Supported Frameworks:**

- **Docusaurus** - Meta's React-based doc framework
  - Detect: `docusaurus.config.js` or `<meta name="generator" content="Docusaurus">`
  - Extract: Main article content, sidebar structure
  - Navigate: Use generated sidebar for page discovery

- **VitePress** - Vue-powered static site generator
  - Detect: `.vitepress/config.js` or `<meta name="generator" content="VitePress">`
  - Extract: `.vp-doc` content blocks
  - Navigate: Parse `config.js` for sidebar structure

- **Nextra** - Next.js-based docs framework (used by Next.js itself)
  - Detect: `_meta.json` files or Next.js patterns
  - Extract: Main content from MDX files
  - Navigate: Follow `_meta.json` hierarchy

- **GitBook** - Popular documentation platform
  - Detect: `SUMMARY.md` or GitBook meta tags
  - Extract: Main article content
  - Navigate: Parse `SUMMARY.md` for structure

- **Mintlify** - Modern documentation platform (used by Supabase)
  - Detect: Mintlify-specific meta tags
  - Extract: Main content blocks
  - Navigate: API-based navigation discovery

- **ReadTheDocs** - Sphinx-based documentation
  - Detect: ReadTheDocs theme or Sphinx meta
  - Extract: `.document` or `.body` content
  - Navigate: `searchindex.js` for page list

- **Custom/Static** - Fallback for custom sites
  - Detect: No recognized framework
  - Extract: Heuristic-based content extraction
  - Navigate: Follow internal links carefully

### Phase 3: Crawling

Systematic fetching with safeguards:

```javascript
// Conceptual crawling algorithm
const crawlConfig = {
  maxPages: 500,              // Configurable limit
  delayMs: 1000,              // Rate limiting
  timeout: 30000,             // 30 second timeout per page
  retries: 3,                 // Retry failed pages
  respectRobotsTxt: true,     // Honor robots.txt
  userAgent: "Claude Code Doc Fetcher/1.0"
};

for (const url of discoveredUrls) {
  // Rate limiting
  await delay(crawlConfig.delayMs);

  // Fetch with timeout
  const html = await fetchWithTimeout(url, crawlConfig.timeout);

  // Extract content
  const content = await extractContent(html, framework);

  // Save to cache
  await saveToCache(url, content);

  // Progress update
  updateProgress(currentPage, totalPages);
}
```

### Phase 4: Content Extraction

I extract clean, AI-friendly content:

**What I Keep:**
- Main article content
- Headings (h1-h6) with hierarchy
- Code blocks with language tags
- Lists and tables
- Images (with alt text)
- Inline code
- Blockquotes (notes, warnings, tips)

**What I Remove:**
- Navigation menus
- Headers and footers
- Sidebars
- Advertisement blocks
- Cookie notices
- Social media widgets
- JavaScript bundles
- Analytics scripts

**Example Extraction:**

Input (HTML):
```html
<!DOCTYPE html>
<html>
  <head>...</head>
  <body>
    <nav><!-- Navigation --></nav>
    <main>
      <h1>Server Actions</h1>
      <p>Server Actions are asynchronous functions...</p>
      <pre><code class="language-tsx">
        export async function createUser(formData: FormData) {
          'use server'
          // ...
        }
      </code></pre>
    </main>
    <footer><!-- Footer --></footer>
  </body>
</html>
```

Output (Markdown):
```markdown
# Server Actions

Server Actions are asynchronous functions...

```tsx
export async function createUser(formData: FormData) {
  'use server'
  // ...
}
```
```

### Phase 5: Storage

I organize documentation in a structured format:

```
.claude/docs/
└── nextjs/
    └── 15.0.3/
        ├── index.json              # Metadata
        ├── sitemap.json            # Page hierarchy
        └── pages/
            ├── getting-started.md
            ├── routing/
            │   ├── introduction.md
            │   ├── defining-routes.md
            │   ├── pages-and-layouts.md
            │   └── ...
            ├── data-fetching/
            │   ├── fetching.md
            │   ├── caching.md
            │   └── ...
            └── api-reference/
                └── ...
```

**index.json** - Complete metadata:
```json
{
  "library": "nextjs",
  "version": "15.0.3",
  "source_url": "https://nextjs.org/docs",
  "fetched_at": "2025-01-17T10:30:00Z",
  "framework": "nextra",
  "page_count": 234,
  "total_size_bytes": 5242880,
  "llms_txt_url": null,
  "sitemap_url": "https://nextjs.org/sitemap.xml",
  "skill_generated": true,
  "skill_path": "skills/nextjs-15-expert",
  "extraction_strategy": "nextra-optimized",
  "crawl_duration_seconds": 245,
  "errors": 0,
  "warnings": 3
}
```

**sitemap.json** - Page hierarchy:
```json
{
  "structure": [
    {
      "title": "Getting Started",
      "path": "getting-started.md",
      "children": []
    },
    {
      "title": "Routing",
      "path": "routing/",
      "children": [
        {
          "title": "Introduction",
          "path": "routing/introduction.md"
        },
        {
          "title": "Defining Routes",
          "path": "routing/defining-routes.md"
        }
      ]
    }
  ]
}
```

### Phase 6: Indexing

Create searchable index for fast lookups:

```json
{
  "index_version": "1.0",
  "created_at": "2025-01-17T10:35:00Z",
  "pages": [
    {
      "path": "routing/defining-routes.md",
      "title": "Defining Routes",
      "headings": [
        "Creating Routes",
        "File Conventions",
        "Dynamic Routes"
      ],
      "keywords": ["routing", "file-system", "app-router", "dynamic"],
      "code_languages": ["tsx", "jsx"],
      "word_count": 1234
    }
  ]
}
```

## Framework-Specific Extraction

### Docusaurus

```
Strategy:
1. Parse docusaurus.config.js for sidebar structure
2. Extract from <article> or .markdown elements
3. Preserve admonitions (:::note, :::tip, etc.)
4. Handle versioned docs (if multiple versions)

Example:
  <article class="markdown">
    <h1>Title</h1>
    <p>Content...</p>
  </article>

  →

  # Title
  Content...
```

### VitePress

```
Strategy:
1. Parse .vitepress/config.js for navigation
2. Extract from .vp-doc or .content divs
3. Handle frontmatter in markdown source
4. Preserve custom containers

Example selectors:
  - .vp-doc
  - .content
  - main article
```

### Nextra

```
Strategy:
1. Parse _meta.json files for structure
2. Extract main content from MDX
3. Handle Next.js-specific components
4. Follow nested _meta.json for hierarchy

Example:
  _meta.json:
  {
    "index": "Introduction",
    "routing": "Routing",
    "data-fetching": "Data Fetching"
  }
```

### GitBook

```
Strategy:
1. Parse SUMMARY.md for table of contents
2. Extract from .page-inner or article elements
3. Handle GitBook-specific markdown extensions
4. Follow chapter structure

Example SUMMARY.md:
  # Summary
  * [Introduction](README.md)
  * [Chapter 1](chapter1.md)
    * [Section 1.1](chapter1/section1.md)
```

### Mintlify

```
Strategy:
1. Use Mintlify API if available
2. Extract from main content containers
3. Handle MDX components
4. Parse mint.json for navigation

Example selectors:
  - .docs-content
  - main article
```

### ReadTheDocs

```
Strategy:
1. Parse searchindex.js for page list
2. Extract from .document or .body
3. Handle Sphinx directives
4. Preserve code-block languages

Example selectors:
  - div.document
  - div.body
  - section[role="main"]
```

## Crawling Safeguards

### Rate Limiting

```
Default: 1 second between requests
Configurable: 100ms - 5000ms

Behavior:
- Respect server delays
- Exponential backoff on errors
- Throttle on rate limit responses (429)
```

### Robots.txt Compliance

```
1. Fetch robots.txt before crawling
2. Parse User-agent rules
3. Respect Disallow directives
4. Honor Crawl-delay if specified

Example robots.txt:
  User-agent: *
  Disallow: /admin
  Crawl-delay: 1
```

### Error Handling

```
404 Not Found:
  → Skip page, log warning, continue

500 Server Error:
  → Retry with exponential backoff (3 attempts)

Rate Limit (429):
  → Increase delay, retry after specified time

Timeout:
  → Retry with longer timeout

Network Error:
  → Retry, offer to pause/resume
```

### Progress Reporting

```
Fetching Next.js documentation...

[████████████░░░░░░░░] 156/234 pages (67%)

Current: /docs/app/building-your-application/routing/defining-routes
Speed: 2.5 pages/sec
Elapsed: 1m 2s
Remaining: ~30s
Errors: 0
```

## Content Validation

After crawling, I validate the content:

```
✓ All pages fetched (234/234)
✓ No missing dependencies
✓ Code blocks properly formatted
✓ Images referenced correctly
✓ Internal links valid
⚠ 3 external links broken (logged)

Quality Score: 98/100
```

## Incremental Updates

When updating existing documentation:

```
1. Compare current index with new sitemap
2. Identify:
   - New pages (added)
   - Modified pages (changed)
   - Removed pages (deleted)
3. Fetch only changed pages
4. Update index
5. Preserve unchanged content

Example:
  Checking for changes...

  New: 5 pages
  Modified: 12 pages
  Removed: 2 pages
  Unchanged: 215 pages

  Fetching only 17 changed pages...
  (Saves ~90% of time vs full re-crawl)
```

## Configuration

Configure my behavior in `doc-fetcher-config.json`:

```json
{
  "indexer": {
    "crawl_delay_ms": 1000,
    "max_pages_per_fetch": 500,
    "timeout_ms": 30000,
    "max_retries": 3,
    "respect_robots_txt": true,
    "user_agent": "Claude Code Doc Fetcher/1.0",
    "frameworks": {
      "auto_detect": true,
      "priority": ["docusaurus", "vitepress", "nextra", "gitbook"]
    },
    "extraction": {
      "remove_navigation": true,
      "preserve_code_blocks": true,
      "extract_images": true,
      "follow_redirects": true
    },
    "validation": {
      "check_links": true,
      "validate_code": false,
      "min_content_length": 100
    }
  }
}
```

## Technical Implementation

I leverage these tools:

- **WebFetch**: Fetch HTML content from URLs
- **Bash**: Run curl commands for headers, robots.txt checking
- **Read/Write**: Manage local cache storage
- **Glob**: Find and organize cached files
- **Task**: Launch doc-crawler agent for complex sites

## Example Crawl Session

```
/fetch-docs nextjs

→ Invoking doc-indexer skill...

[1/7] Discovery
  ✓ Checked for llms.txt (not found)
  ✓ Found sitemap.xml
  ✓ Parsed 234 documentation URLs

[2/7] Framework Detection
  ✓ Detected: Nextra
  ✓ Optimized extraction strategy loaded

[3/7] Robots.txt Check
  ✓ Fetched robots.txt
  ✓ No restrictions for our user-agent
  ✓ Crawl-delay: 1 second (using default)

[4/7] Crawling
  [████████████████████] 234/234 (100%)
  Duration: 4m 12s
  Errors: 0

[5/7] Content Extraction
  ✓ Extracted clean markdown from all pages
  ✓ Preserved 156 code blocks
  ✓ Removed navigation/footer from all pages

[6/7] Storage
  ✓ Saved to .claude/docs/nextjs/15.0.3/
  ✓ Created index.json
  ✓ Created sitemap.json
  Total size: 5.2 MB

[7/7] Validation
  ✓ All pages valid
  ✓ Code blocks properly formatted
  ✓ Links checked (3 external broken - logged)
  Quality: 98/100

✓ Documentation indexed successfully!

Next: Generating skill (auto-enabled)
  Run: /generate-doc-skill nextjs
```

## Troubleshooting

**"Framework detection failed"**
- Falls back to generic extraction
- May be less accurate
- Consider manual framework hint

**"Too many pages (>500)"**
- Increase max_pages_per_fetch in config
- Or fetch specific sections manually

**"Rate limited by server"**
- Automatic: I increase delay automatically
- Manual: Increase crawl_delay_ms in config

**"Content extraction poor quality"**
- Framework detection may be wrong
- Custom site may need doc-crawler agent
- Check extraction selectors

## See Also

- `llms-txt-finder` skill - Checks for AI-optimized docs first
- `doc-crawler` agent - Advanced crawling for difficult sites
- `/fetch-docs` command - Main entry point
- `/update-docs` command - Incremental updates
