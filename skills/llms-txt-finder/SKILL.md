---
name: llms-txt-finder
description: Detects and fetches AI-optimized documentation formats (llms.txt, claude.txt) from documentation sites
version: 1.0.0
auto_activate: false
tool_restrictions:
  - WebFetch
  - Bash
  - Read
  - Write
---

# LLMs.txt Finder

I specialize in detecting and fetching AI-optimized documentation formats like `llms.txt` and `claude.txt` from documentation websites.

## What I Do

I help the doc-fetcher plugin find the most AI-friendly documentation format available:

1. **Check for llms.txt**: Look for `/llms.txt` or `/llms-full.txt` at the site root
2. **Check for claude.txt**: Look for Claude-specific documentation at `/claude.txt`
3. **Parse and validate**: Ensure the file contains valid documentation content
4. **Extract metadata**: Pull version info, update dates, and structure from the file
5. **Download content**: Fetch the complete content for caching

## AI-Optimized Documentation Formats

### llms.txt

A standard format designed specifically for AI consumption:

```
# Library Name

> Version: 1.0.0
> Last Updated: 2025-01-17

## Overview

[Concise description optimized for AI understanding]

## Installation

[Installation instructions]

## Quick Start

[Getting started guide]

## API Reference

[Complete API documentation]

## Examples

[Code examples with context]
```

**Benefits:**
- Pre-formatted for AI parsing
- Optimized for token efficiency
- Includes structured metadata
- Often more concise than web docs

### claude.txt

Claude-specific documentation format:

```
# Library Name for Claude

This documentation is optimized for Claude AI assistant.

[Documentation structured specifically for Claude's capabilities]
```

## Detection Strategy

When given a documentation URL, I check in this order:

1. `https://example.com/llms-full.txt` (comprehensive version)
2. `https://example.com/llms.txt` (standard version)
3. `https://example.com/claude.txt` (Claude-specific)
4. `https://example.com/.well-known/llms.txt` (alternative location)
5. `https://example.com/docs/llms.txt` (docs subdirectory)

## Usage

### Automatic Activation

I'm automatically invoked when you run:

```bash
/fetch-docs <library>
```

I run first and check for AI-optimized formats before falling back to web crawling.

### Manual Usage

You can also invoke me directly through the skill:

```
"Check if Next.js has an llms.txt file"
"Find AI-optimized docs for Supabase"
"Does https://react.dev have claude.txt?"
```

## What I Return

If I find an AI-optimized documentation file, I return:

```json
{
  "found": true,
  "type": "llms.txt",
  "url": "https://nextjs.org/llms.txt",
  "size_bytes": 524288,
  "version": "15.0.3",
  "last_updated": "2025-01-15",
  "content_preview": "# Next.js 15.0.3...",
  "should_use": true,
  "reason": "AI-optimized format available, more efficient than crawling"
}
```

If not found:

```json
{
  "found": false,
  "checked_urls": [
    "https://example.com/llms.txt",
    "https://example.com/claude.txt",
    "https://example.com/.well-known/llms.txt"
  ],
  "fallback": "sitemap.xml",
  "reason": "No AI-optimized format found, falling back to web crawling"
}
```

## Integration with Doc Fetcher

When I find an AI-optimized file:

1. **Skip Crawling**: No need to crawl hundreds of pages
2. **Faster Fetching**: Single file download vs. many HTTP requests
3. **Better Structure**: Pre-formatted for AI understanding
4. **Token Efficient**: Content is already optimized for LLM context windows
5. **More Accurate**: Maintained specifically for AI assistants

## Example Flow

```
User: /fetch-docs nextjs

Doc Fetcher: Invoking llms-txt-finder skill...

llms-txt-finder:
  ✓ Checking https://nextjs.org/llms.txt
  ✓ Found! (524 KB)
  ✓ Version: 15.0.3
  ✓ Last updated: 2025-01-15

  Recommendation: Use llms.txt instead of crawling
  Benefits:
    - 1 file vs ~234 pages to crawl
    - Pre-optimized for AI
    - Faster download (5 seconds vs 4 minutes)

Doc Fetcher: Using llms.txt...
  ✓ Downloaded and cached
  ✓ Generated skill: nextjs-15-expert
```

## Validation

I validate AI-optimized documentation files for:

1. **Format**: Proper markdown structure
2. **Completeness**: Contains essential sections (installation, API, examples)
3. **Version Info**: Includes version metadata
4. **Size**: Reasonable size (not truncated or too small)
5. **Content Quality**: Actual documentation, not just a placeholder

If validation fails, I recommend falling back to crawling:

```
⚠ Found llms.txt but validation failed
  Issue: File is only 2 KB (likely incomplete)
  Recommendation: Fall back to sitemap.xml crawling
```

## Known Sites with AI-Optimized Docs

I maintain awareness of popular libraries that provide AI-optimized documentation:

- **Next.js**: `/llms.txt` ✓
- **Vercel AI SDK**: `/llms.txt` ✓
- **Anthropic Claude**: `/claude.txt` ✓
- **OpenAI**: `/llms.txt` ✓
- **Supabase**: Checking...
- **Tailwind CSS**: Checking...

This list helps me make intelligent guesses about where to look.

## Creating llms.txt for Your Project

If you maintain a library, I can help you create an llms.txt file:

```
"Help me create an llms.txt file for my library"
```

I'll generate a template following best practices:

```markdown
# Your Library Name

> Version: 1.0.0
> Last Updated: 2025-01-17
> Repository: https://github.com/you/your-lib
> Documentation: https://docs.yourlib.com

## Overview

[2-3 sentence description of what your library does]

## Installation

[Installation commands for different package managers]

## Quick Start

[Minimal example to get started]

## Core Concepts

[Key concepts users need to understand]

## API Reference

[Complete API documentation]

## Examples

[Common use cases with code examples]

## Advanced Usage

[Advanced patterns and techniques]

## Troubleshooting

[Common issues and solutions]

## Changelog

[Recent changes and migration notes]
```

## Performance Impact

Using AI-optimized documentation dramatically improves performance:

| Metric | Web Crawling | llms.txt |
|--------|-------------|----------|
| Files fetched | 100-500 | 1 |
| Time to fetch | 2-10 min | 5-30 sec |
| Network requests | 100-500 | 1 |
| Size on disk | 5-50 MB | 0.5-5 MB |
| Token efficiency | Variable | Optimized |

## Error Handling

I handle various error scenarios:

- **404**: File doesn't exist, fall back to crawling
- **403**: Access forbidden, try alternative URLs
- **Timeout**: Server slow, retry with backoff
- **Invalid format**: Not proper documentation, fall back
- **Too large**: File >50MB, might be data dump, validate carefully

## Configuration

Configure my behavior in `doc-fetcher-config.json`:

```json
{
  "llms_txt": {
    "enabled": true,
    "check_locations": [
      "/llms-full.txt",
      "/llms.txt",
      "/claude.txt",
      "/.well-known/llms.txt",
      "/docs/llms.txt"
    ],
    "max_size_bytes": 52428800,
    "validation_strict": true,
    "prefer_over_crawling": true
  }
}
```

## Future Enhancements

- **Registry**: Maintain a registry of known llms.txt URLs
- **Validation Service**: Validate llms.txt files against a schema
- **Generator**: Auto-generate llms.txt from existing docs
- **Suggestions**: Suggest improvements to existing llms.txt files

## Technical Implementation

I use these tools to accomplish my tasks:

1. **WebFetch**: Fetch content from URLs
2. **Bash**: Check HTTP headers with curl
3. **Read**: Read configuration files
4. **Write**: Cache fetched llms.txt files

## Example Checks

### Successful Find

```
Checking for AI-optimized docs at https://nextjs.org...

✓ https://nextjs.org/llms.txt
  Status: 200 OK
  Size: 524 KB
  Content-Type: text/plain
  Last-Modified: 2025-01-15

✓ Validation passed
  - Valid markdown format
  - Contains version: 15.0.3
  - Comprehensive content
  - Reasonable size

Recommendation: Use llms.txt
Benefits: 40x faster than crawling 234 pages
```

### Not Found

```
Checking for AI-optimized docs at https://example.com...

✗ https://example.com/llms-full.txt (404)
✗ https://example.com/llms.txt (404)
✗ https://example.com/claude.txt (404)
✗ https://example.com/.well-known/llms.txt (404)

No AI-optimized documentation found.
Falling back to sitemap.xml or web crawling.
```

## See Also

- `doc-indexer` skill - Main documentation crawling logic
- `doc-crawler` agent - Advanced web crawling for non-standard sites
- `/fetch-docs` command - Primary entry point that uses this skill
