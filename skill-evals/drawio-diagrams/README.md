# drawio-diagrams Eval Proof

This folder contains initial promotion proof for `drawio-diagrams`.

## Promotion Rationale

- Clear routing: activates for editable draw.io / diagrams.net `.drawio` diagrams, technical flows, architecture diagrams, sequence/ER/class/state/network diagrams, repair, validation, and export.
- High utility: gives agents a deterministic XML path when draw.io Desktop, MCP tools, or network access are unavailable.
- Safe defaults: avoids installs, MCP config writes, hosted previews, remote icon fetches, and external indexes without explicit approval.
- Maintenance fit: public runtime payload is original guidance, deterministic helper scripts, and small regression fixtures; copied third-party reference packs and icon/index assets are not shipped in the public skill.

## Eval Set

Positive trigger cases:

- `cases/create-architecture-diagram.md`
- `cases/edit-existing-diagram.md`
- `cases/validate-and-export.md`
- `cases/multi-page-diagram.md`

Negative activation or safety-boundary cases:

- `cases/chart-request-negative.md`
- `cases/remote-icon-fetch-approval.md`

Use `rubric.md` to grade outputs. `runs/` stores promotion review summaries and future run evidence.

Passing outputs must create or edit editable `.drawio` XML, run deterministic validation when `python3` is available, preserve existing diagram structure during edits, report visual/export limitations honestly, and avoid external services or remote assets without approval.
