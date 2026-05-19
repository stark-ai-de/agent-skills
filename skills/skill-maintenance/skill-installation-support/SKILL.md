---
name: skill-installation-support
description: Help install, list, update, remove, or troubleshoot Agent Skills using the Vercel skills CLI. Use when the user asks about npx skills add, installing a whole repo, installing one skill, global vs project installs, symlink vs copy, or Codex/Claude/Cursor agent targets.
license: MIT
metadata:
  author: stark-ai-de
  category: skill-maintenance
  version: "0.1.0"
---

# Skill Installation Support

## Goal

Help users install, list, update, remove, and troubleshoot Agent Skills with clear commands and safe distinctions between local, global, and agent-specific installation.

## When to use

- The user asks how to install a skills repo or one skill.
- `npx skills@latest add` fails or does not discover expected skills.
- The user asks about Codex, Claude Code, Cursor, or all-agent installation targets.

## When not to use

- The user wants to create or review a skill; use `skill-authoring-review`.
- The user wants to maintain this repository's catalog or release state; use `skill-repo-curator`.
- The source skill has unclear provenance or license and should not be installed yet.

## Inputs

- Repository path or GitHub owner/repo.
- Desired skill name, target agent, and global or project install preference.
- Error output from `npx skills@latest`.
- Local `skills/` tree and `SKILL.md` frontmatter when troubleshooting discovery.

## Inputs to inspect

- Inspect the source path or repository, requested skill name, target agent, global/project scope, and CLI error output.
- Check `SKILL.md` names and descriptions when discovery fails.

## Process

1. Identify source: local folder, GitHub repo, full Git URL, or specific skill.
2. List skills before installing when the source is unfamiliar.
3. Choose global or project install based on the user's scope.
4. Choose target agent flag based on the user's runtime.
5. Troubleshoot discovery by checking folder structure, `SKILL.md`, name matching, and CLI output.
6. Avoid global installation or overwrites without user approval.

## Workflow

Follow the process above, then return a copy-pasteable command plus a verification command before suggesting any global install.

## Decision points

- Use `--list` before installation for unfamiliar repos.
- Use `--skill <name>` when installing one skill from a multi-skill repo.
- Use `--all` only when the user wants all supported agents.
- Prefer local folder install for testing unpublished repos.

## Safety rules

- Tell users to review public skills before installing them.
- Do not install globally unless the user requested or approved it.
- Do not run commands that overwrite existing local skills without approval.

## References

Read `references/vercel-skills-cli.md` when the user needs command examples or troubleshooting steps.

## Scripts

No bundled scripts.

## Output format

Return:

1. Recommended command
2. What it installs
3. Scope and target agent
4. Verification command
5. Troubleshooting notes

## Failure modes

- If the CLI is unavailable, give the install prerequisite and a no-op discovery check.
- If the skill name is not found, list available skills from the source.
- If global installation is risky, recommend project-local installation first.

## Completion criteria

- The user has an exact command for their source and target agent.
- Safety and scope are explicit.
- Discovery or installation failure has a concrete next diagnostic step.
