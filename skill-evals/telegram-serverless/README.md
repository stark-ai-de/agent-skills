# Telegram Serverless evaluation

These are synthetic, offline skill-behavior trials. They do not create bots, transmit credentials, invoke the Telegram CLI, or establish live platform behavior.

The case inventory covers bot and Mini App authoring, runtime errors, ownership, test/deploy boundaries, migration outcomes, concurrency, static hosting, webhook/upgrade diagnosis, and routing. The same inputs are used with and without the candidate skill. Both arms may consult the same temporary capture of the official Serverless documentation; the candidate arm additionally reads the skill. Independent agents return structured decisions and generated text artifacts, never execute proposed cloud operations.

Keep actual sanitized responses and a human-readable assessment in runs/. Assess observable outputs against rubric.md. A case inventory is not a behavioral pass; a successful syntax check does not prove SDK or Telegram behavior. Record the candidate content fingerprint, source versions, methodology, limitations, and any revision that invalidates evidence. Baseline comparisons are small, descriptive samples, not statistical performance claims.

[Offline promotion assessment](runs/2026-10-08-offline-promotion.md) records the actual baseline/candidate outputs, checks, limitations and decision. [Source review](source-review.md) records documentation dates and CLI versions.

[Integration completion](runs/2026-10-09-integration-complete.md) records the final owning checks, package parity, reproducibility and unstaged/staged boundaries.
