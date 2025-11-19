---
description: Generate a Claude Code skill from cached documentation for version-specific expertise
allowed-tools: Bash(npm run generate-skill:*), Bash(npm run list:*)
argument-hint: <library> [version] [--template <template-name>] [--output <path>]
---

# Generate Documentation Skill

Create a Claude Code skill from cached documentation in the project's `.claude/docs` directory, enabling version-specific expertise and accurate AI guidance.

## Current Context

- Cached documentation: !`npm run list`
- Current working directory: !`pwd`

## Your Task

When the user invokes this command, follow these steps:

1. **Parse Arguments**: The user provided: `$ARGUMENTS`
   - First argument is the library name (required)
   - Second argument is optional version (defaults to latest cached version)
   - `--template <name>`: Skill template to use (default: "expert")
   - `--output <path>`: Custom output path for the skill
   - If library is missing: prompt for the library name

2. **Verify Documentation Exists**:
   - Check that the library is cached (you can see this from the list command output above)
   - If not cached: Inform user and suggest running `/fetch-docs [library]` first
   - If cached: Proceed to generate the skill

3. **Run Generate Skill Command**:
   - Execute: `npm run generate-skill -- $ARGUMENTS`
   - The script will:
     - Locate cached docs in **`.claude/docs/[library]/[version]/`**
     - Analyze the documentation structure and content
     - Generate a skill file with version-specific expertise
     - Create proper directory structure for the skill
     - Link the skill to the cached documentation
   - Monitor progress and capture output

4. **Handle Results**:
   - If successful: Report:
     - Skill name and location
     - Version the skill references
     - Topics covered
     - Auto-activation rules (if any)
     - How to use the skill
   - Show the generated skill path

5. **Error Handling**:
   - If documentation not found: Suggest `/fetch-docs [library]` to cache docs first
   - If skill already exists: Ask if user wants to overwrite or create a variant
   - If template not found: List available templates and ask user to choose
   - If generation fails: Show error and suggest re-fetching documentation

6. **Next Steps**: Inform the user that the skill is now available and will automatically activate when working with the library (if auto-activation is configured).

## Important Notes

- Skills are generated from documentation cached in `.claude/docs` (project directory)
- The generated skill references the specific version of documentation
- Skills can auto-activate based on package.json dependencies or file patterns
- Use `--template` to customize skill focus (expert, quick-reference, troubleshooter, etc.)
- Multiple skills can reference the same cached documentation with different templates
- Regenerate skills after updating documentation to get the latest content
