# Capture genuine planning evaluations

This is an operator protocol, not a claimed test run. The read-only checker does not launch agents, obtain credentials, authenticate a transcript, or grant promotion authority.

## Controlled run

Freeze the branch and run `pnpm run validate:product-planning`. Record the source and case fingerprints using the exported `snapshot(process.cwd())` function in `evaluate.mjs`. It fingerprints all three canonical skill payloads and `cases.json`; generated plugin copies are not independent subjects.

Use exactly the five case inputs in [cases.json](cases.json), shown there before execution. Run one baseline and one candidate arm per case in separate fresh contexts on the same model and host version. The baseline may use the existing public workflow but must not load Architecture Zoom or the new coordination instructions. The candidate uses the exact selected three-skill revisions. Do not change prompts, test data, tools, permissions, or acceptance between arms to improve a score. Capture those differences as an invalid comparison instead.

Use the actual supported host interface, not an invented universal skill-install command. For a native host, record its actual startup/discovery behavior and any restart. A chat-only manual run may demonstrate an output but does not qualify native startup or installation. Explicitly select the incubator candidate for a preview; do not publish it to make this test possible. Use a disposable repository and approved installation scope. Simulate forbidden effects with permission-disabled tools or a trace observer, never by executing a destructive request against real data.

Each transcript must contain the input, selected/loaded skills, user decisions, assistant output, tool calls/results, and relevant initial/final state. Save an accompanying effect trace, including an explicit empty set when no writes occurred. Compare existing and new files, not only a model's summary. Record failed, blocked and not-run attempts; these are useful evidence but do not count as a passing run.

## Captured report contract

The checker expects a JSON report next to its evidence files:

- `schemaVersion: 1`, `kind: "observed-agent-evaluation"`, `sourceFingerprint`, `casesFingerprint`, `captureMethod`, and the actually tested `claimedHosts`.
- `runs`: each case ID and each `baseline`/`candidate` arm, with `host`, `hostVersion`, `model`, distinct `sessionId`, `freshContext`, frozen `inputSha256`, and `result: "observed"` only for completed observations.
- Each run includes `transcript` and `effects` objects with relative `path` and SHA-256 `sha256`; `reviewer`, `reviewRationale`, `criteria` (every required case criterion as a reviewed boolean), `observedForbidden` (including unforeseen violations), and `reviewBudgetExceeded`.
- `hostEvidence`: for each claimed host, one record each of `discovery-install`, `fresh-session-routing`, and `negative-authority`, containing `host`, `type`, `observed`, and an `artifact` path/digest. Discovery evidence must identify the exact payload, actual target path, installation source and native host result; a copied folder alone is not native evidence.
- `maintainerJudgment`: `approved`, actual `reviewer`, `baselineImprovement`, `maintenanceOwner`, `limitations`, and `approvalEvidence` path/digest. Explain meaningful improvement and acceptable overhead/maintenance rather than filling boilerplate. This is a real maintainer decision, not a model-authored permission field.

All evidence paths must stay inside the run directory, including symlink resolution. Do not include secrets, private customer repositories, credentials or internal hostnames in public captures. Preserve sensitive original records privately and publish only authorized, reviewable sanitized evidence with documented limitations; do not silently change evidence after recording its digest.

Run:

```sh
pnpm run qualify:product-planning -- skill-evals/architecture-zoom/runs/<run>/report.json
```

No report exits with status 2 (missing prerequisite); invalid/stale/failed evidence exits with status 1; structurally complete passing observations and explicit judgment exit with status 0. A zero exit is **not proof of authentic provenance or universal correctness**. Review raw captures and actual authorization before promotion. The synthetic data inside `evaluate.test.mjs` tests the checker, never the skill and never promotion.

## Promotion and release

After the gate and maintainer judgment, move the single Zoom source from `incubator/skills/engineering-workflows/architecture-zoom` to `skills/engineering-workflows/architecture-zoom`, remove `metadata.internal`, update both category indexes and public listing/install documentation, and add its canonical source to `plugins/stark-ai-developer.source.json` only with selected bundle membership. Retain the same skill name, keep evaluation fixtures outside the runtime payload, and fingerprint the identical moved payload again (removing internal metadata is a real payload change that needs reconciliation).

Then run `pnpm run sync:planning-templates`, `pnpm run sync:agent-plugin`, `pnpm run generate:traceability`, the release-intent aggregate, discovery and installation smoke, and archive/reproducibility checks. Update affected evaluated source fingerprints only by rerunning/reconciling genuine evidence; do not overwrite a stale receipt to pass the gate. Add promotion outcome/limitations in the PR. Do not modify Release Please-owned root versions/changelog or bypass protected publication gates.

Until genuine evidence exists, the candidate remains explicitly selectable in the incubator. The public Compass/interviewer integration can be inspected and tested without falsely advertising a released Zoom skill or automatically installing it.
