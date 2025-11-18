---
description: Update cached documentation to the latest version or refresh existing docs
---

# Update Documentation

Update cached documentation to the latest version or refresh existing documentation snapshots.

## Usage

```bash
/update-docs [library] [--all] [--project] [--force]
```

## Arguments

- `library` (optional): Specific library to update (e.g., "nextjs", "supabase")
- `--all` (optional): Update all cached documentation
- `--project` (optional): Update only docs matching current project dependencies
- `--force` (optional): Force re-fetch even if recently updated

## Examples

```bash
# Update specific library to latest version
/update-docs nextjs

# Update all cached documentation
/update-docs --all

# Update docs matching package.json dependencies
/update-docs --project

# Force update even if recently fetched
/update-docs supabase --force
```

## What This Does

1. **Check Current Cache**: Identifies which documentation is already cached
2. **Detect Latest Version**: Queries the library's docs for the latest version
3. **Compare Versions**: Determines if update is needed
4. **Fetch Updated Docs**: Re-crawls if new version available or if forced
5. **Update Skills**: Regenerates associated skills with new documentation
6. **Clean Old Versions**: Optionally removes outdated versions (keeps last 2 by default)

## Update Strategies

### Update Specific Library

```bash
/update-docs nextjs
```

Checks if a newer version of Next.js docs is available and fetches it if so.

**Output:**
```
Checking Next.js documentation...

Current: v15.0.0 (cached 7 days ago)
Latest: v15.0.3

Fetching updated documentation...
✓ Updated to v15.0.3 (234 pages)
✓ Regenerated skill: nextjs-15-expert

Old versions kept: v15.0.0
Run /clean-docs nextjs to remove old versions
```

### Update All Documentation

```bash
/update-docs --all
```

Checks all cached libraries for updates.

**Output:**
```
Updating all cached documentation...

✓ nextjs: v15.0.0 → v15.0.3 (updated)
✓ supabase: v2.39.0 (current, checked 2 days ago)
✓ react: v18.2.0 (current, no new version)

Updated: 1 library
Skipped: 2 libraries (already current)
```

### Update Project Dependencies

```bash
/update-docs --project
```

Reads `package.json` and updates documentation for all detected dependencies.

**Output:**
```
Detecting project dependencies from package.json...

Found:
- next: ^15.0.3
- react: ^18.2.0
- @supabase/supabase-js: ^2.39.0

Checking for updates...

✓ next: Already cached v15.0.3
✓ react: Not cached - would you like to fetch? (yes/no)
✓ supabase: v2.38.0 → v2.39.0 (updating...)

Updated: 1 library
Skipped: 1 library
Not cached: 1 library
```

## Update Frequency

Documentation is automatically checked for updates based on:

- **Daily**: Critical dependencies (React, Next.js, etc.)
- **Weekly**: Regular dependencies
- **Monthly**: Stable/mature libraries
- **On-demand**: Manual `/update-docs` commands

Configure in `doc-fetcher-config.json`:

```json
{
  "auto_update_frequency": {
    "critical": "daily",
    "regular": "weekly",
    "stable": "monthly"
  },
  "auto_update_enabled": true
}
```

## Version Management

### Keep Multiple Versions

By default, Doc Fetcher keeps the last 2 versions of each library:

```
.claude/docs/nextjs/
├── 15.0.3/  (latest)
└── 15.0.0/  (previous)
```

This allows you to:
- Compare changes between versions
- Work on projects with different versions
- Rollback if new docs have issues

### Clean Old Versions

```bash
/clean-docs nextjs --keep 1
```

Removes all but the most recent version.

## Smart Update Logic

Doc Fetcher intelligently decides when to update:

### Skip Update If:
- Cached version matches latest version
- Last fetch was within 24 hours (unless `--force`)
- No changes detected in documentation
- Currently working offline

### Force Update If:
- `--force` flag provided
- Documentation reports errors or missing pages
- User explicitly requests refresh
- Skill generation failed previously

## Integration with Skills

When documentation is updated:

1. **Skills Auto-Update**: Associated skills are regenerated with new content
2. **Version Pinning**: Skills reference specific versions (e.g., `nextjs-15-expert`)
3. **Migration Guides**: If available, extracts "What's New" or migration guides
4. **Deprecation Warnings**: Identifies deprecated APIs between versions

## Batch Updates

For teams or CI/CD integration:

```bash
# In package.json scripts
{
  "scripts": {
    "docs:update": "claude /update-docs --project",
    "docs:fetch": "claude /fetch-docs nextjs && claude /fetch-docs supabase"
  }
}
```

Run before development sessions to ensure current docs.

## Conflict Resolution

If documentation structure changes significantly:

```
Warning: Documentation structure changed significantly
- Old: 234 pages
- New: 189 pages (45 removed, 12 added)

This may indicate a major version change or docs restructure.
Proceed with update? (yes/no)
```

## Output Details

### Successful Update
```
✓ Updated Next.js documentation

Version: v15.0.0 → v15.0.3
Pages: 234 (no change)
Size: 5.2 MB → 5.3 MB (+100 KB)
Skill: Regenerated nextjs-15-expert
Fetch time: 3m 24s
```

### No Update Needed
```
✓ Next.js documentation is current

Version: v15.0.3
Last checked: 2 hours ago
Next check: in 22 hours (daily schedule)

Use --force to re-fetch anyway.
```

### Failed Update
```
✗ Failed to update Supabase documentation

Reason: Rate limited by server
Retry: Automatically in 1 hour
Manual retry: /update-docs supabase --force

Documentation remains at v2.38.0 (still usable)
```

## Configuration

Configure update behavior in `doc-fetcher-config.json`:

```json
{
  "update": {
    "auto_update_enabled": true,
    "check_frequency_hours": 24,
    "keep_versions": 2,
    "update_skills_on_change": true,
    "notify_on_update": true
  }
}
```

## Best Practices

1. **Regular Updates**: Run `/update-docs --project` weekly for active projects
2. **Before Major Refactors**: Update docs to catch API changes
3. **Version Pinning**: Pin to specific versions in production projects
4. **Monitor Changelogs**: Check library changelogs when docs update
5. **Test After Update**: Verify skills still work correctly after major doc updates

## Comparison with /fetch-docs

| Feature | /fetch-docs | /update-docs |
|---------|-------------|--------------|
| Use case | First-time fetch | Refresh existing |
| Version | Specify any version | Latest version only |
| Overwrites | No (creates new version) | Yes (replaces current) |
| Skill generation | Optional | Auto if skill exists |
| Best for | New projects | Maintenance |

## Automation

### Automatic Updates (Future)

Enable automatic background updates:

```json
{
  "auto_update": {
    "enabled": true,
    "schedule": "0 2 * * *",  // 2 AM daily
    "libraries": ["nextjs", "supabase", "react"],
    "notify": true
  }
}
```

Claude Code will automatically check for and fetch updated documentation.

## Troubleshooting

**"No updates available"**
- Documentation is already current
- Use `--force` to re-fetch anyway

**"Failed to detect latest version"**
- Library may not publish version in docs
- Manually specify version with `/fetch-docs library version`

**"Skill regeneration failed"**
- Check skill template configuration
- Manually regenerate with `/generate-doc-skill`

**"Update taking too long"**
- Large documentation sets may take 5-10 minutes
- Check `crawl_delay_ms` - reducing speeds up but may trigger rate limits

## See Also

- `/fetch-docs` - Fetch documentation for the first time
- `/list-docs` - View all cached documentation and versions
- `/clean-docs` - Remove old documentation versions
- `/generate-doc-skill` - Regenerate skills from cached docs
