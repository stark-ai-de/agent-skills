# Output Contract

Report these fields for every activated task, including blocked and read-only results.

## Fields

- `Workflow`: `audit`, `create`, `transform`, or `animate`.
- `Source route`: `existing-svg`, `faithful-local-transform`, `recraft_v4_1`, `direct-local-svg`, `drawio-assisted-svg`, or `not-applicable`.
- `Selection`: task evidence and the reason for the selected workflow, or `unresolved` while an ambiguous activation awaits a choice.
- `Write scope and protected originals`: the authorized output boundary and originals that must not be overwritten; use `read-only; no writes` for `audit`.
- `Provider state`: `not-eligible`, `available`, `unavailable`, `indeterminate`, or `used`.
- `Approval state`: `not-required`, `pending`, `approved`, or `declined`.
- `Motion readiness`: `not-evaluated`, `invalid`, `blocked`, or `ready`.
- `Animation delivery`: `not-evaluated`, `incomplete`, `blocked`, or `completed`.

## Rules

- Use `Provider state: not-eligible` and `Approval state: not-required` when routing rules exclude Recraft.
- Use `Provider state: available` only after live capability, exact model, and current batch cost are confirmed.
- Use `Provider state: used` only after an explicitly approved batch actually succeeds.
- Use `Approval state: pending` after showing the live sanitized preflight but before approval. Do not generate or silently take the local fallback while approval is pending.
- Use `Approval state: not-required` for an ineligible, unavailable, or indeterminate provider route.
- Use `Approval state: declined` when the user rejects an available batch, then take the direct local route without repeating the request.
- Use `Motion readiness: ready` only when the canonical SVG passes strict validation, the motion specification is complete, and the repository-owned animation recipe passes the exporter's deterministic `--check`.
- Use `Animation delivery: completed` for a mutating route only when all five required artifacts exist, the PNG is validated, and the GIF passes the bundled inspector. Use `blocked` while an explicitly itemized local-tool installation awaits approval. Use `incomplete` when tooling is declined, forbidden, unavailable, or still cannot produce and verify the required PNG/GIF.
- An `audit` can report any evidence-backed readiness/delivery value, but must not create or repair artifacts. A non-complete pipeline includes concrete remediation.
- `create`, `transform`, and `animate` never report `Animation delivery: completed` without `<slug>-logo.svg`, `<slug>-logo-motion.md`, `<slug>-logo-animation.mjs`, `<slug>-logo-static.png`, and `<slug>-logo-animated.gif`.

After the fields, list:

1. Canonical and derived assets with exact paths and roles.
2. Motion-specification and animation-recipe paths and their distinct roles.
3. README markup or delivery recommendation.
4. Commands run and concise validation evidence.
5. Remaining blockers and the next approval, capability, or manual-preview step.

When a local installation is proposed, also report `Local-tool approval: pending | approved | declined | not-required`. This detail is separate from the public `Approval state`, which continues to describe provider spending.
