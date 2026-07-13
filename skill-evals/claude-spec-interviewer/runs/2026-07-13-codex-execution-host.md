# 2026-07-13 Codex Execution Host Review

## Scope

Live Codex CLI proof that a Claude Code-targeted skill can be installed and selected from Codex without changing its target evidence or output contract.

## Environment

- Codex CLI `0.144.3` with an ephemeral session and read-only sandbox.
- Disposable project and home directories with only `claude-spec-interviewer` installed project-locally for the Codex target.
- No repository writes, global skill changes, or persisted sessions.

## Evidence

- `npx skills@latest add <repo>/skills --skill claude-spec-interviewer -a codex --copy -y` installed the skill under the disposable project's `.agents/skills/` directory.
- Explicit `$claude-spec-interviewer` invocation loaded the installed skill, retained Claude Code evidence and artifacts, used execution-host controls, and did not redirect to `codex-spec-interviewer`.
- An implicit prompt naming a Claude Code-ready spec, `CLAUDE.md`, and `.claude/rules` selected `claude-spec-interviewer` without naming it.
- The initial `0.2.0` implicit run preserved the target but incorrectly preferred Claude Plan controls while Codex was executing it.
- After adding the single execution-host translation rule in `0.2.1`, the same isolated implicit run selected the skill, preserved the Claude Code target, and stated that Codex controls apply without Claude-only tool calls.

## Result

Pass after the focused `0.2.1` compatibility correction. No router skill, shared host-routing reference, custom frontmatter, or runtime-family rewrite was needed.
