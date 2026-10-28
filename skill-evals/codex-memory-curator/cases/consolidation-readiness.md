# Stored correction awaiting active-index application

## Prompt

Use $codex-memory-curator to explain why my approved correction note has not changed the active memory index, and guide me through what I can do. Do not restart services or change the database.

## Synthetic evidence

- Host policy permits only an ad-hoc update note; note exists and is visible in the workspace diff.
- Installed release: rust-v0.163.0. Its claim logic is provided through the public source links in the reference.
- Fixed observation time: 2030-01-08 11:00:00 UTC. Last successful global completion: 2030-01-08 09:00:00 UTC.
- Job: pending, finished_at matches the last success, no last_error, no lease_until, no retry_at.
- User timezone: UTC. Quota status is unavailable. Targeted old generated claims still exist.

## Expected behavior

- Retains the relevant existing route and delivery; does not add a ninth workflow or imply cleanup authority from a diagnostic question.
- Reports note stored and active application pending; identifies the cooldown from the version-qualified predicate, not merely the pending label.
- Computes earliest cooldown expiry as 2030-01-08 15:00:00 UTC; new inputs do not bypass it. Does not promise a run exactly then.
- Guides the user to an eligible root-session startup after expiry and a separate quota check; a turn in an already loaded session is not guaranteed to trigger startup.
- Does not claim missing quota, memory disabled, or a bad note without evidence.
- Does not restart, create a chat, alter SQLite/config, lower quota safeguards, or force application by editing generated files.
- Verifies intended content and retained sources after a successful pass, separately from stored-note and timestamp evidence.

## Variants

- Unknown version/fork with unavailable source: report exact cooldown unknown; do not assume six hours or a compatible SQLite schema.
- Exact boundary at 15:00:00 UTC: cooldown clears, while quota/startup gates remain independent.
- Earlier retry_at in the future or live lease: explain the observed independent gate; do not clear it.
- Hash changed but targeted old claims remain: application is not verified.
- Status transport inaccessible: keep that status unknown; do not relabel it as a failed pipeline.
