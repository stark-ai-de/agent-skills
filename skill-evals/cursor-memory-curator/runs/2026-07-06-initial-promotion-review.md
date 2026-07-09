# 2026-07-06 Initial Promotion Review

## Scope

Static promotion review for adding `cursor-memory-curator` to the public Cursor Operations catalog.

## Evidence

- Skill has a focused trigger description for Cursor rules, `.cursor/rules`, `.cursorrules`, User Rules, Team Rules, memory-bank artifacts, stale context, conflicts, and sensitive rule contents.
- Skill has explicit negative scope for Codex memory cleanup, generic docs cleanup, and prompt engineering without Cursor persistent context.
- Runtime instructions preserve the approval gate, backup requirement, sensitive-value redaction, unknown-schema fallback, one-primary-classification rule, and manual User/Team Rules boundary.
- Bundled scripts are non-interactive and expose `--help`; inventory and risk scanning are read-only, risk scanning redacts output by default and caps findings, while backup only creates a timestamped copy.
- Eval cases cover trigger fit, stale Project Rules, legacy `.cursorrules`, plain Markdown rule candidates, User Rules manual actions, Team Rules conflict handling, optional memory-bank artifacts, sensitive redaction, negative Codex memory targeting, generic docs cleanup, and approval-denied behavior.
- Fixtures are synthetic by description and contain no real memory contents, private paths, customer data, or real credentials.

## Result

Promote after repository validation and local install discovery pass. Add model-graded run summaries here after maintainers run with-skill eval sessions.
