# Telegram Serverless evaluation

These are synthetic, offline skill-behavior trials. They do not create bots, transmit credentials, invoke the Telegram CLI, or establish live platform behavior.

The case inventory covers bot and Mini App authoring, runtime errors, ownership, test/deploy boundaries, migration outcomes, concurrency, static hosting, webhook/upgrade diagnosis, and routing. The same inputs are used with and without the candidate skill. Both arms may consult the same temporary capture of the official Serverless documentation; the candidate arm additionally reads the skill. Independent agents return structured decisions and generated text artifacts, never execute proposed cloud operations.

Keep actual sanitized responses and a human-readable assessment in runs/. Assess observable outputs against rubric.md. A case inventory is not a behavioral pass; a successful syntax check does not prove SDK or Telegram behavior. Record the candidate content fingerprint, source versions, methodology, limitations, and any revision that invalidates evidence. Baseline comparisons are small, descriptive samples, not statistical performance claims.

The original baseline/candidate files and promotion fingerprint are historical snapshots. The [review-fix assessment](runs/2026-10-09-review-fixes.md) owns the current scoped follow-up, additional O12 case and corrected browser evidence. Its implementer-produced reevaluation is not a new independent baseline trial.

[Offline promotion assessment](runs/2026-10-08-offline-promotion.md) records the actual baseline/candidate outputs, checks, limitations and decision. [Source review](source-review.md) records documentation dates and CLI versions.

[Integration completion](runs/2026-10-09-integration-complete.md) records the earlier owning checks, package parity, reproducibility and unstaged/staged boundaries for the pre-review candidate.

## Offline regression check

Run `node skill-evals/telegram-serverless/validate-examples.mjs` from the repository root. The dependency-free, read-only runner extracts the actual HTML example from the canonical reference and executes it with controlled DOM/SDK doubles. It performs no installation, network request, file write or Telegram operation. The same check runs in `pnpm run validate:plugin-evals`, and therefore in the repository aggregate and CI.

The check covers unavailable SDK/call/init data, initial disabled controls, pending/success, safe text rendering, business/authentication/transport callback errors, synchronous SDK exceptions and absence of automatic retries. It does not prove Telegram authentication or deployed browser behavior.
