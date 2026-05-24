# Structured Cleanup Plan Artifact

## Prompt

Use $codex-memory-curator to prepare a cleanup plan for the synthetic memory fixture. I want to approve individual memory IDs later.

## Expected Behavior

- Triggers `codex-memory-curator`.
- Produces a cleanup plan shaped like `assets/cleanup-plan-template.md` or an equivalent table.
- Includes stable memory IDs, source file, line, redacted current memory, primary classification, risk tags, confidence, conflicts, proposed action, proposed replacement, and approval status.
- Leaves `approved` false or clearly unapproved until the user approves specific IDs.
- Does not edit memory files before approval.

## Fixture

- `fixtures/synthetic-codex-home/memories/MEMORY.md`
- `skills/codex-operations/codex-memory-curator/assets/cleanup-plan-template.md`
