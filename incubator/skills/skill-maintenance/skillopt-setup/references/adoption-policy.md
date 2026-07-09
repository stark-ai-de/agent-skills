# Adoption Policy

`best_skill.md` is an optimization candidate, not a merge-ready artifact.

## Required Gates

1. Run `apply-skillopt-best.mjs --dry-run`.
2. Review the change amount, diff, and adoption report.
3. Confirm the candidate preserves frontmatter unless frontmatter optimization was explicitly requested.
4. Reject candidates that weaken safety rules, approval gates, or scope boundaries.
5. Reject candidates with secret-like strings, private local paths, raw transcripts, or optimizer-only workspace paths.
6. Reject candidates when the run summary beside `best_skill.md` records a lower test hard score than the baseline.
7. Require `--approved` before writing tracked files.
8. For promoted public skills, bump `metadata.version` explicitly.
9. Run repo validation after any write.

## Public Evidence

Commit only concise run summaries under `skill-evals/<target>/runs/`. Keep raw trajectories, provider metadata, Codex auth state, local paths, `.env` files, and temporary candidates under ignored `.agents/`.
