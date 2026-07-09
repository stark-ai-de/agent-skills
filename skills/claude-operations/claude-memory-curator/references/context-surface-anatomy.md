# Claude Context Surface Anatomy

Use this reference when deciding which Claude Code surface owns a durable instruction or memory.

## CLAUDE.md Files

Claude Code reads `CLAUDE.md`, not `AGENTS.md`, at session start. Project instructions can live at `./CLAUDE.md` or `./.claude/CLAUDE.md`. User instructions live at `~/.claude/CLAUDE.md`. Managed policy instructions can live in system-managed locations such as `/etc/claude-code/CLAUDE.md` on Linux and WSL.

Use `CLAUDE.md` for concise instructions that should be loaded broadly in Claude Code sessions. Keep files focused; long procedures usually belong in skills or path-scoped rules.

## CLAUDE.local.md

Use `CLAUDE.local.md` for personal project-specific preferences that should not be committed. Treat it as local user state. Do not move team or repo rules into it unless the user explicitly wants a private local preference.

## AGENTS.md

Claude Code does not read `AGENTS.md` directly. If a repo already uses `AGENTS.md` as the cross-agent source of truth, recommend a `CLAUDE.md` import such as `@AGENTS.md` plus any Claude-specific additions instead of duplicating the same rules.

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

- Claude Code memory docs: https://code.claude.com/docs/en/memory
- Claude Code settings docs: https://code.claude.com/docs/en/settings
- Claude Code skills docs: https://code.claude.com/docs/en/skills
- Claude Code hooks docs: https://code.claude.com/docs/en/hooks
