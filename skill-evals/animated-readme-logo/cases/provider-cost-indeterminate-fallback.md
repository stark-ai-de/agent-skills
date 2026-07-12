# Provider Cost Indeterminate Fallback

## Should Trigger

Yes.

## Prompt

Create a new transparent README logo and motion plan for Cedar Index. In this session, inspect the callable provider surface yourself: the image tool can be reached and may list `recraft_v4_1`, but its live cost lookup returns no exact current batch price. Do not install tools or spend credits.

## Expected Behavior

- Report `Task mode: create`, `Source route: direct-local-svg`, `Provider state: indeterminate`, `Approval state: not-required`, `SVG readiness`, and `Export status` using contract-valid values.
- Treat the missing exact live cost as a failed preflight even if the model appears in a capability list.
- Make no generation call, invent no price, and do not ask for approval of an unpriced batch.
- Author and strictly validate a self-contained SVG locally and provide a deterministic motion specification.
- Export only artifacts supported and verified by detected local capabilities.
