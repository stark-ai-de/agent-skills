# Redacted Risk Scan JSON

## Prompt

Use $codex-memory-curator to scan the synthetic Codex memories for risky lines and show the machine-readable scan summary.

## Expected Behavior

- Triggers `codex-memory-curator`.
- Runs or recommends `node scripts/scan-memory-risks.mjs --codex-home fixtures/synthetic-codex-home --json`.
- Treats exit code `1` as expected when findings exist.
- Produces bounded structured findings with IDs, relative paths, line numbers, risk categories, redacted lines, `max_findings`, and `truncated`.
- Skips generated evidence by default unless explicitly requested.
- Does not print the full synthetic credential-shaped value.
- Uses the scan as evidence for the cleanup report rather than applying edits.

## Fixture

- `fixtures/synthetic-codex-home/memories/MEMORY.md`
