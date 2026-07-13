# 2026-07-13 Codex Execution Host Review

## Scope

Live Codex CLI proof that a Cursor-targeted skill can be installed and selected from Codex without changing its target evidence or output contract.

## Environment

- Codex CLI `0.144.3` with an ephemeral session and read-only sandbox.
- Disposable project and home directories with only `cursor-spec-interviewer` installed project-locally for the Codex target.
- No repository writes, global skill changes, or persisted sessions.

## Evidence

- `npx skills@latest add <repo>/skills --skill cursor-spec-interviewer -a codex --copy -y` installed the skill under the disposable project's `.agents/skills/` directory.
- An implicit prompt naming a Cursor Agent-ready spec and `.cursor/rules` selected `cursor-spec-interviewer` without naming it.
- The first run with only a late adapter sentence preserved the target but still preferred Cursor controls because the compatibility and early workflow instructions remained Cursor-only.
- After scoping Cursor-native controls to Cursor-as-executor and moving current-host substitution to the workflow entry, the same isolated prompt selected the skill, preserved the Cursor target, and chose Codex-equivalent controls without Cursor-only calls.

## Result

Pass for `0.2.1` after removing the contradictory early routing instructions. No router skill, shared host-routing reference, or custom frontmatter was needed.
