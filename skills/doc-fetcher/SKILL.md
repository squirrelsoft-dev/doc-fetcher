---
name: doc-fetcher
description: Fetches and caches library documentation, then generates version-specific skills for Claude Code
version: 1.0.0
auto_activate: true
activation_patterns:
  - "get.*documentation for"
  - "fetch.*docs for"
  - "download.*documentation"
  - "get.*latest.*docs"
  - "need.*documentation for"
  - "update.*documentation"
  - "refresh.*docs"
  - "cache.*documentation"
tool_restrictions:
  - Task
  - Read
  - Glob
---

# Documentation Fetcher Skill

You have been activated because the user wants to fetch, update, or manage library documentation.

## Your Task

Use the **doc-crawler** subagent to fetch documentation and generate skills for the requested library.

## How to Proceed

### Step 1: Parse the User's Request

Extract from the user's message:
- **Library name** (e.g., "Next.js", "React", "Axios", "Tailwind")
- **Version** (optional - e.g., "15", "19", "latest")
- **Custom URL** (optional - if user provides a specific docs URL)

### Step 2: Spawn the Doc-Crawler Agent

Use the Task tool to spawn the `doc-crawler` subagent with a clear prompt:

```
Fetch the [version|latest] documentation for [library] and generate skills.

Library: [extracted library name]
Version: [extracted version or "latest"]
Custom URL: [if provided, otherwise omit]

After fetching:
1. Generate the expert skill using /doc-fetcher:generate-skill
2. Report the results including number of pages cached and skills generated
```

### Step 3: Report Results

After the agent completes, summarize the results to the user:
- Number of pages cached
- Location of cached documentation
- Skills that were generated
- Any errors or warnings

---

## Example Prompts That Activate This Skill

| User Says | Parsed As |
|-----------|-----------|
| "Get the latest documentation for Next.js" | library: nextjs, version: latest |
| "Fetch React 19 docs" | library: react, version: 19 |
| "I need the Tailwind CSS documentation" | library: tailwindcss, version: latest |
| "Download documentation for Prisma" | library: prisma, version: latest |
| "Update my Vue.js documentation" | library: vue, action: update |
| "Get docs from https://tanstack.com/query" | library: tanstack-query, url: provided |

---

## Spawning the Agent

When spawning the doc-crawler agent, use this pattern:

```
Task tool with subagent_type: "doc-fetcher:doc-crawler"

Prompt: "Fetch the [version] documentation for [library].

Instructions:
1. Find the documentation URL (use resolver script or web search)
2. Run /doc-fetcher:fetch-docs [library] [version] [--url if provided]
3. After fetching, run /doc-fetcher:generate-skill [library] [version]
4. Report:
   - Pages cached
   - Cache location
   - Skills generated
   - Any errors or warnings"
```

---

## Handling Special Cases

### User Provides a URL
If the user provides a URL like "Fetch docs from https://example.com/docs":
- Extract a library name from the URL or ask the user
- Pass the URL to the agent with `--url` flag

### Update Request
If the user says "update" instead of "fetch":
- Instruct the agent to use `/doc-fetcher:update-docs` instead
- Regenerate skills after update

### Multiple Libraries
If the user requests multiple libraries:
- Spawn separate agents for each library
- Summarize all results at the end

### Version Not Specified
If no version is specified:
- Default to "latest"
- The fetch command will detect the current version

---

## What NOT to Do

1. **DO NOT** fetch documentation yourself using WebFetch
2. **DO NOT** write custom crawling code
3. **DO NOT** skip the doc-crawler agent - it handles all the complexity
4. **DO NOT** forget to generate skills after fetching

---

## Success Criteria

The task is complete when:
1. Documentation is cached to `~/.claude/docs/[library]/[version]/`
2. At least one skill is generated (typically `[library]-[version]-expert`)
3. User receives a clear summary of what was done
