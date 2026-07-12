# Output Contract

Report these fields for every activated task, including blocked and review-only results.

## Fields

- `Task mode`: `review`, `create`, `transform`, or `animate-export`.
- `Source route`: `existing-svg`, `faithful-local-transform`, `recraft_v4_1`, `direct-local-svg`, `drawio-assisted-svg`, or `not-applicable`.
- `Provider state`: `not-eligible`, `available`, `unavailable`, `indeterminate`, or `used`.
- `Approval state`: `not-required`, `pending`, `approved`, or `declined`.
- `SVG readiness`: `not-evaluated`, `invalid`, `blocked`, or `ready`.
- `Export status`: `not-requested`, `capability-unavailable`, `blocked`, or `completed`.

## Rules

- Use `Provider state: not-eligible` and `Approval state: not-required` when routing rules exclude Recraft.
- Use `Provider state: available` only after live capability, exact model, and current batch cost are confirmed.
- Use `Provider state: used` only after an explicitly approved batch actually succeeds.
- Use `Approval state: pending` after showing the live sanitized preflight but before approval. Do not generate or silently take the local fallback while approval is pending.
- Use `Approval state: not-required` for an ineligible, unavailable, or indeterminate provider route.
- Use `Approval state: declined` when the user rejects an available batch, then take the direct local route without repeating the request.
- Use `SVG readiness: ready` only when the canonical SVG exists and passes strict validation.
- Use `Export status: completed` only for requested raster artifacts that exist and pass inspection. Report `capability-unavailable` when the exporter or inspector is missing.
- A review can report `SVG readiness: invalid` or `not-evaluated`, but must state that the pipeline is not complete and provide remediation.

After the fields, list:

1. Canonical and derived assets with exact paths and roles.
2. The deterministic motion specification or its path.
3. README markup or delivery recommendation.
4. Commands run and concise validation evidence.
5. Remaining blockers and the next approval, capability, or manual-preview step.
