# Memory Store Anatomy

Use this when the memory directory contains multiple file types or generated evidence.

## Discovery Rule

Discover the local layout instead of assuming one fixed schema. Treat files under `<codex-home>/memories` as generated state unless a local instruction says otherwise.

Use `node scripts/inventory-memories.mjs --json` when file-kind grouping would make the review safer. The `kind` field is best-effort and should not override file contents or local instructions.

## Common Buckets

| Bucket                   | Examples                                                   | Default stance                                                                              |
| ------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Curated summaries        | `memory_summary.md`, `MEMORY.md`, durable preference files | Review and propose focused rewrites or removals.                                            |
| Recent/raw inputs        | recent prompts, extracted memories, raw candidates         | Inspect only as evidence; avoid hand edits unless sensitive data requires approved cleanup. |
| Supporting evidence      | rollout/session summaries, JSONL traces, citations         | Treat as append-only evidence; do not rewrite to fix a stale curated claim.                 |
| Skill or extension notes | skill-specific memories, ad hoc update notes               | Follow the local note/update workflow; do not bypass it.                                    |
| Backups                  | `memories.backup.*`                                        | Do not scan as active memory unless the user asks to review backups.                        |

## Editing Guidance

- Prefer changing the smallest curated claim that affects future behavior.
- Do not rewrite generated evidence just because a summary is stale.
- If a generated evidence file contains sensitive data, propose removal or redaction only after backup and explicit approval.
- If schema ownership is unclear, defer the proposal in chat or the single curation record instead of editing the original or creating a sibling memory file.
