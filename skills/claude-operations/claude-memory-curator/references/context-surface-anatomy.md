# Claude Context Surface Anatomy

Use this reference when deciding which Claude Code surface owns a durable instruction or memory.

## CLAUDE.md Files

Claude Code loads applicable `CLAUDE.md` instructions; native `AGENTS.md` support is conditional, as described below. Project instructions can live at `./CLAUDE.md` or `./.claude/CLAUDE.md`. User instructions live at `~/.claude/CLAUDE.md`. Managed policy instructions can live in system-managed locations such as `/etc/claude-code/CLAUDE.md` on Linux and WSL.

Use `CLAUDE.md` for concise instructions that should be loaded broadly in Claude Code sessions. Keep files focused; long procedures usually belong in skills or path-scoped rules.

## CLAUDE.local.md

Use `CLAUDE.local.md` for personal project-specific preferences that should not be committed. Treat it as local user state. Do not move team or repo rules into it unless the user explicitly wants a private local preference.

## AGENTS.md

Confirm native support from the installed version and session evidence; file presence is not loading proof. As documented on 2026-09-21, direct loading requires v2.1.277+, available feature flags, enabled built-in `agents-md`, and compatible hooks. Older versions, some providers (including Bedrock), disabled telemetry, first sessions after installation/upgrade, `disableAllHooks`, or `allowManagedHooksOnly` can prevent it.

The default `claude-md-or-agents-md` uses `AGENTS.md` only without a project/ancestor `CLAUDE.md`, `.claude/CLAUDE.md`, or `CLAUDE.local.md`. `claude-md-and-agents-md` loads both; `claude-md` and `managed-only` exclude native `AGENTS.md`. Check `pluginConfigs["agents-md@builtin"].options.instructionFiles` in user, explicit, or managed settings; project/local settings do not control it. Inventory reports these as observed signals, not resolved effective settings.

Native candidates include `AGENTS.md` and `.claude/AGENTS.md`; exclude `AGENTS.local.md`, `AGENTS.override.md`, and `.agents/`. Check the startup loading message or session instruction evidence. Absence from `/memory`, `/context` Memory files, or `InstructionsLoaded` hooks is not proof of non-loading.

Retain a working `CLAUDE.md` import (`@AGENTS.md`) for unsupported, restricted, or uncertain hosts. Do not remove it or alter settings/hooks merely because a newer version exists. Verify the actual session before recommending a migration; shared-file changes require named approval.

## .claude/rules

Project rules live under `.claude/rules/**/*.md`. Rules without `paths` frontmatter load broadly. Rules with `paths` frontmatter are path-specific and should contain guidance for matching files.

Prefer path-scoped rules for large repos, language-specific conventions, package-specific workflows, or instructions that should not load into every session.

User-level rules live under `~/.claude/rules/**/*.md` and apply across projects. Use them for stable personal preferences, not repo-specific commands.

## Auto Memory

Claude Code auto memory is local markdown state. A configured `autoMemoryDirectory` overrides the default. Otherwise Claude Code derives a per-project directory under `~/.claude/projects/<project>/memory/`.

`MEMORY.md` is the loaded entrypoint. The first 200 lines or first 25KB are loaded at conversation start. Topic files are read on demand. Prefer `MEMORY.md` for concise indexes and topic files for detail.

## Settings And Hooks

`CLAUDE.md` and auto memory are context, not enforcement. Use settings or hooks when an instruction must be enforced deterministically, such as blocking a command, restricting filesystem access, or running a guard before tool use.

## Managed Policy

Managed policy files and managed settings are organization-controlled. Treat them as higher-precedence read-only evidence by default. Recommend manual managed-policy changes only when the user explicitly asks and the change is team-wide or organization-wide.

## Source Basis

- Claude Code memory docs (conditional loading, verified 2026-09-21): https://code.claude.com/docs/en/memory#agents-md
- Claude Code settings docs: https://code.claude.com/docs/en/settings
- Claude Code skills docs: https://code.claude.com/docs/en/skills
- Claude Code hooks docs: https://code.claude.com/docs/en/hooks
