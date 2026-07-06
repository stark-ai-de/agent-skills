# 2026-07-06 Initial Promotion Review

## Scope

Static promotion review for adding `claude-memory-curator` to the public Claude Operations catalog.

## Evidence

- Skill has a focused trigger description for `CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules`, user rules, auto memory, settings keys, `/memory`, stale instructions, conflicts, and sensitive contents.
- Skill has explicit negative scope for Codex memory cleanup, Cursor rules cleanup, Claude app account memory, Anthropic API Memory Stores, generic docs cleanup, and direct implementation without Claude durable context.
- Runtime instructions preserve the approval gate, backup requirement, sensitive-value redaction, unknown-schema fallback, one-primary-classification rule, and managed-policy read-only boundary.
- Bundled scripts are non-interactive and expose `--help`; inventory and risk scanning are read-only, risk scanning redacts output by default and caps findings, while backup only creates a timestamped copy.
- Eval cases cover trigger fit, stale auto memory, conflicting Claude instruction files, path-scoped rules, local private boundaries, managed policy handling, settings and hook destinations, sensitive redaction, negative runtime targets, generic docs cleanup, and approval-denied behavior.
- Fixtures are synthetic by description and contain no real memory contents, private paths, customer data, internal hostnames, or real credentials.

## Result

Promote after repository validation and local install discovery pass. Add model-graded run summaries here after maintainers run with-skill eval sessions.
