# 2026-07-06 Initial Promotion Review

## Scope

Static promotion review for adding `claude-spec-interviewer` to the public catalog as a Claude Code-native counterpart to `codex-spec-interviewer` and `cursor-spec-interviewer`.

## Evidence

- Skill has a Claude Code-native trigger description with explicit positive and negative trigger cases.
- Skill treats `CLAUDE.md`, `.claude/rules`, and auto memory as evidence, not default implementation-spec destinations.
- Skill includes self-contained templates, examples, ADR gate guidance, source-challenge guidance, artifact-destination guidance, and a Claude Code execution prompt asset.
- Eval cases cover fuzzy implementation requests, vague feature requests, plan-before-coding triggers, `CLAUDE.md` evidence, `.claude/rules` ADR implications, docs-producing interview behavior, declined persistence, missing spec structure, already complete specs, direct implementation, Claude memory cleanup, and Codex memory cleanup.
- Claude plugin metadata and `agents/openai.yaml` are intentionally omitted under the current ADR boundary.
- Manual install proof should use Claude Code's native project or personal skill folders: `.claude/skills/claude-spec-interviewer/` or `~/.claude/skills/claude-spec-interviewer/`.

## Result

Promote as a Claude Operations public skill once repository validation and manual Claude skills-folder smoke checks pass for the current release batch.
