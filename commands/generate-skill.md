---
description: Generate a Claude Code skill from cached documentation for version-specific expertise
allowed-tools: Bash(node:*)
argument-hint: <library> [version] [--template <template-name>] [--output <path>]
---

# Generate Documentation Skill

Create a Claude Code skill from cached documentation in `~/.claude/docs`, enabling version-specific expertise and accurate AI guidance. Skills are saved to `~/.claude/skills`.

## Current Context

- Current working directory: !`pwd`

## Your Task

When the user invokes this command, follow these steps:

1. **Parse Arguments**: The user provided: `$ARGUMENTS`
   - First argument is the library name (required)
   - Second argument is optional version (defaults to latest cached version)
   - `--template <name>`: Skill template to use (default: "expert")
   - `--output <path>`: Custom output path for the skill
   - If library is missing: prompt for the library name

1.5. **INSTALL DEPENDENCIES**: If ~/.claude/plugins/cache/doc-fetcher/node_modules doesn't exist then execute `cd ~/.claude/plugins/cache/doc-fetcher && npm install` after installation change the directory back to the project workspace root.

2. **Run Generate Skill Command**:
   - Execute: `node ~/.claude/plugins/cache/doc-fetcher/scripts/generate-skill.js $ARGUMENTS`
   - The script will:
     - Locate cached docs in **`~/.claude/docs/[library]/[version]/`**
     - Analyze the documentation structure and content
     - Generate a skill file with version-specific expertise
     - Save skill to **`~/.claude/skills/[library]-[version]-[template]/`**
     - Link the skill to the cached documentation
   - Monitor progress and capture output

3. **Handle Results**:
   - If successful: Report:
     - Skill name and location
     - Version the skill references
     - Topics covered
     - Auto-activation rules (if any)
     - How to use the skill
   - Show the generated skill path

4. **Error Handling**:
   - If documentation not found: Suggest `/fetch-docs [library]` to cache docs first
   - If skill already exists: Ask if user wants to overwrite or create a variant
   - If template not found: List available templates and ask user to choose
   - If generation fails: Show error and suggest re-fetching documentation
   - If script not found: Verify the doc-fetcher plugin is installed

5. **Next Steps**:
   - **IMPORTANT**: Tell the user they need to **restart Claude Code** (exit and reopen) to load the newly generated skills
   - Explain that skills will automatically activate when working with the library once Claude is restarted

## Important Notes

- The script runs from the plugin directory: `~/.claude/plugins/cache/doc-fetcher/`
- Documentation is cached globally in `~/.claude/docs` and skills in `~/.claude/skills`
- Skills are available across all projects (global Claude Code skills)
- The generated skill references the specific version of documentation
- Skills can auto-activate based on package.json dependencies or file patterns
- Use `--template` to customize skill focus (expert, quick-reference, troubleshooter, etc.)
- Multiple skills can reference the same cached documentation with different templates
- Regenerate skills after updating documentation to get the latest content
