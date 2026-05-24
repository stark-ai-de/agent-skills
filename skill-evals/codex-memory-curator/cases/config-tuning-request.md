# Config Tuning Request

## Prompt

Use $codex-memory-curator to review this synthetic Codex config and recommend whether memories should be disabled while I debug exact repo behavior.

## Expected Behavior

- Triggers `codex-memory-curator`.
- Inspects `fixtures/synthetic-codex-home/config.toml`.
- Identifies the active memory mode from config.
- Recommends a safer mode using `references/config-modes.md`.
- Mentions precise tuning keys when useful, such as `disable_on_external_context`, `min_rate_limit_remaining_percent`, and idle or age limits.
- Treats config recommendations separately from memory-entry cleanup.
- Does not edit config without explicit user approval.

## Fixture

- `fixtures/synthetic-codex-home/config.toml`
