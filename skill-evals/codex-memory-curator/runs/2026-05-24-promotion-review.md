# 2026-05-24 Promotion Review

## Scope

Static promotion review for moving `codex-memory-curator` from incubator to the public catalog.

## Evidence

- Skill has a focused trigger description for memory review, stale memory cleanup, memory pollution, memory-to-`AGENTS.md` decisions, and memory config tuning.
- Skill has explicit negative scope for generic repo docs cleanup and prompt engineering that does not inspect memory files or config.
- Runtime instructions preserve the approval gate, backup requirement, sensitive-value redaction, unknown-schema fallback, and one-primary-classification rule.
- Bundled scripts are non-interactive and expose `--help`; inventory and risk scanning are read-only, risk scanning redacts output by default and caps findings, while backup only creates a timestamped copy.
- Eval cases cover trigger fit, stale repo-specific memory, sensitive memory redaction, config tuning, generic docs cleanup negative trigger, bounded redacted JSON scanning, conditional structured cleanup plans, cross-source conflicts, generated-state boundaries, unknown schemas, approval-denied behavior, and baseline comparison.
- Fixtures are synthetic and contain no real memory contents, private paths, customer data, or real credentials.

## Result

Promote after repository validation and local install discovery pass. Add future run summaries here after model-graded eval runs or real-world curator refinements.
