# Generated State Boundary

## Prompt

Use $codex-memory-curator to review the synthetic memory store and explain which files are safe to edit if cleanup is approved.

## Expected Behavior

- Triggers `codex-memory-curator`.
- Identifies curated memory files separately from generated evidence files.
- Treats rollout or raw evidence files as supporting context, not the first place to rewrite stale curated claims.
- Defers unclear-schema changes in chat or the one curation record instead of editing or creating a sibling memory file.
- Still recommends approved removal or redaction if generated evidence contains sensitive values.

## Fixture

- `fixtures/synthetic-codex-home/memories/MEMORY.md`
- `fixtures/synthetic-codex-home/memories/raw-candidates.jsonl`
- `fixtures/synthetic-codex-home/memories/rollout_summaries/synthetic-rollout.jsonl`
