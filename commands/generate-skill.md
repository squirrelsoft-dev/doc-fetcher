---
description: Generate a Claude Code skill from cached documentation for version-specific expertise
allowed-tools: Bash(node:*)
argument-hint: <library> [version] [--template <template-name>] [--output <path>]
---

# Generate Documentation Skill

Create a Claude Code skill from cached documentation in the current project's `.claude/docs` directory, enabling version-specific expertise and accurate AI guidance.

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

2. **Run Generate Skill Command**:
   - Execute: `node ~/.claude/plugins/cache/doc-fetcher/scripts/generate-skill.js $ARGUMENTS --path "$(pwd)"`
   - The `--path` argument tells the script to operate on the **current project directory**
   - The script will:
     - Locate cached docs in the project's **`.claude/docs/[library]/[version]/`** directory
     - Analyze the documentation structure and content
     - Generate a skill file with version-specific expertise
     - Create proper directory structure for the skill
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

5. **Next Steps**: Inform the user that the skill is now available and will automatically activate when working with the library (if auto-activation is configured).

## Important Notes

- The script runs from the plugin directory: `~/.claude/plugins/cache/doc-fetcher/`
- The `--path` parameter tells it which project to operate on (current directory)
- Skills are generated from documentation cached in the project's `.claude/docs` directory
- The generated skill references the specific version of documentation
- Skills can auto-activate based on package.json dependencies or file patterns
- Use `--template` to customize skill focus (expert, quick-reference, troubleshooter, etc.)
- Multiple skills can reference the same cached documentation with different templates
- Regenerate skills after updating documentation to get the latest content
