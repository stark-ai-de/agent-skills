# 2026-07-10 Native Plan Mode Lifecycle

## Scope

Revision of `codex-spec-interviewer` for v0.3.0 so supported Codex surfaces use native Plan mode for the interview and a separate non-Plan turn for artifact persistence. The trigger description and bundled spec and execution-prompt templates remain unchanged.

## Source Challenge

- Source-backed status: pass. The current [Codex developer commands](https://learn.chatgpt.com/docs/developer-commands#switch-to-plan-mode-with-plan) document that `/plan` switches the active conversation to Plan mode, accepts inline prompt text, and is temporarily unavailable while a task is running.
- Source-backed status: pass. The current [Agent Skills specification](https://agentskills.io/specification) defines skill frontmatter and body instructions but no portable collaboration-mode transition field, so the skill must request a host-controlled transition rather than claim to perform one.
- Repo-backed status: pass. Accepted ADR-0021 keeps spec interviewers runtime-specific because their names, evidence, and output contracts differ.

## Changes

- Added a native Plan-mode preflight with an exact copy-ready `/plan` continuation for supported but inactive sessions.
- Required `request_user_input` when available in active Plan mode and prohibited all interview-phase file writes.
- Split finalization into a verified read-only checkpoint and a save-only continuation outside Plan mode; pending persistence no longer counts as completion.
- Added explicit unavailable/declined fallback recording and prohibited feature implementation during persistence.
- Updated the OpenAI default prompt, eval proof, rubric, existing Plan trigger case, and a focused multi-turn lifecycle case.

## Verification Status

- Static repository validation: pass. `npm run validate` completed successfully, including skill, ADR, action, script, draw.io, SkillOpt, and site validation. A scoped `oxfmt --check`, `npm run validate:skills`, and `git diff --check` also passed for the changed skill and eval files.
- Manual contract review: pass for the inactive, active, fallback, persistence-declined, persistence-pending, and save-only branches against the updated skill and eval rubric.
- Interactive Codex transition run: partially exercised but not passed end to end. Supplying `/plan ...` as an initial CLI prompt remained in Default mode, confirming that it must be entered through Codex's interactive slash-command surface. A nested PTY could not reliably capture the subsequent user-action prompt from inside this Codex session, so the real TUI transition remains a manual follow-up.

## Result

The source-backed contract, static repository checks, and manual branch review pass. The test also confirms why the skill emits a copy-ready interactive `/plan` handoff instead of treating `/plan` as a CLI startup flag. The complete interactive transition remains an explicit manual follow-up rather than an inferred pass.
