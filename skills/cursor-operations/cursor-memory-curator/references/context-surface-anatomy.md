# Cursor Context Surface Anatomy

Use this reference when deciding which Cursor surface owns a durable instruction.

## Project Rules

Cursor Project Rules live in `.cursor/rules/` and use `.mdc` files. Treat the YAML frontmatter as behavior metadata:

- `description` describes when an intelligent rule should be considered.
- `globs` scopes rules to file patterns.
- `alwaysApply` marks a rule as broadly applied.

Prefer Project Rules for project-specific guidance that benefits from Cursor rule metadata, file scoping, or manual rule attachment.

Flag plain `.md` files under `.cursor/rules` as rule candidates that lack Cursor Project Rule metadata. Recommend converting them to `.mdc` or moving simple instructions to `AGENTS.md`.

## Legacy `.cursorrules`

Treat `.cursorrules` as legacy project context. If modern `.cursor/rules/*.mdc` files cover the same guidance, classify the older claim as `DELETE`, `KEEP BUT REWRITE`, or migration to a Project Rule.

## `AGENTS.md`

Cursor supports `AGENTS.md` in the project root and subdirectories. Prefer `AGENTS.md` for straightforward agent instructions that should be readable across agent runtimes and do not need Cursor rule metadata.

Nested `AGENTS.md` files are more specific than parent files for work in that subtree.

## User Rules

User Rules are global preferences configured in Cursor settings. Treat them as user-level preferences such as communication style or broad coding conventions.

Do not claim a local editable User Rules file unless current Cursor evidence proves one. If the user provides exported text, review it and return manual settings changes unless they approve editing the exported artifact.

## Team Rules

Team Rules are shared organization or team instructions managed through Cursor. Treat them as high-impact shared policy. Do not edit them directly from repo files unless the user provides an explicit exported artifact and approval.

Classify team-wide standards as `MOVE TO CURSOR TEAM RULES` only when they are durable, non-secret, and broader than one repo.

## Memory-Bank Artifacts

Some users keep Cursor memory-bank files in locations such as `memory-bank/`, `docs/memory/`, or `.cursor/memory-bank/`. There is no assumed official `~/.cursor/memories` store for this skill.

Treat memory-bank files as user-maintained artifacts:

- Review them when the user provides a path.
- Preserve their schema if it is clear.
- Defer the proposal in chat or the single curation record instead of editing or creating a sibling context file when the schema is unclear.

## Source Basis

- Cursor Rules docs: https://cursor.com/docs/rules
- Cursor Agent Skills docs: https://cursor.com/docs/skills
