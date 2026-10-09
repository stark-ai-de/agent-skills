# Scoped review-fix assessment

Reviewed 2026-10-09 (UTC), starting from PR head 41878b7. The concurrent portal-glyph documentation commit 28e95f9 was retained by fast-forward before final validation. This follow-up supersedes the affected guidance and browser evidence in the historical promotion/integration receipts. Skill 0.1.0 and plugin 1.8.0 remain the unreleased additions in this feature PR.

## Corrected contracts

- CLI 0.2.0 status is network-capable: an available saved/environment token enables authenticated GET /webhook through webhookStatusLine. diff is the cached offline comparison. The reference now prohibits status during offline-only work without altering credentials.
- The canonical Mini App example starts disabled, requires a callable SDK and nonempty init data, and restores controls on synchronous and callback failures. Authentication errors request reopening Telegram; unexpected details are not exposed. Successful note text uses textContent, and no failure retries automatically.

The [source review](../source-review.md) identifies the official CLI archive and Mini Apps SDK. A final review follow-up clarified that Telegram keyboard-button and inline launches may lack init data; the example now explains the unavailable launch capability and offers a usable Mini App entry path. The operations reference also links directly to the published CLI 0.2.0 implementation. No upstream executable code is bundled into the regression runner.

## Method and evidence

The implementing assistant produced [scoped B2/O1/O12 responses](2026-10-09-review-fixes-candidate.json) with the current skill available. B2 retains the historical backend artifacts and corrects its browser behavior. This is an implementer-produced reevaluation, not a new independent, blinded or statistical baseline comparison. The previous trial files and promoted fingerprint remain historical; current payload hashes are recorded separately in [the follow-up fingerprint](2026-10-09-review-fixes-fingerprint.json).

The dependency-free regression runner executes the actual canonical HTML example with controlled DOM/SDK doubles. Before the fix it failed because an existing Serverless object without a callable method enabled the button; the earlier review also reproduced a missing-init-data synchronous exception leaving Loading visible. After the fix all eleven scenarios pass. The runner is included in validate:plugin-evals and therefore in CI.

The follow-up B2 HTML also passed fourteen local DOM/SDK scenarios: four missing prerequisites, pending/success with safe list/create rendering, business/authentication/transport callbacks for both endpoints, synchronous throws for both endpoints, and empty/oversized input rejection. Failed writes preserve the draft and do not retry. The three backend modules passed Node syntax checks; all four backend/config artifacts remain byte-identical to the historical B2 output. These checks used a temporary local harness against the recorded response, not a browser engine or Telegram SDK runtime.

The O1 supplied fixture passed local syntax and context-double checks: context user 123 is returned despite a conflicting input user, and missing context rejects. This proves only fixture behavior. Manual assessment of O1/O12 confirms that remote run is not authentication proof, status is excluded from offline work, cached diff/local inspection remain allowed, and no credential changes or CLI execution are proposed as completed. O12 was checked against the published CLI 0.2.0 status/webhook implementation; it is a source-backed response assessment, not a live invocation.

## Validation

| Check                                               | Result                                                                                                            |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Canonical HTML regression (Node and Bun)            | Pass: eleven offline scenarios; old example failed before the fix                                                 |
| Scoped B2/O1/O12 reevaluation                       | Pass within the local/source-only limits described above                                                          |
| `pnpm run validate:plugin-evals`                    | Pass: existing inventory/install fixtures and the new HTML regression                                             |
| `pnpm run release:intent -- --base-ref origin/main` | Pass: feature contract, new skill 0.1.0 and plugin 1.8.0                                                          |
| `pnpm run validate`                                 | Pass on the integrated candidate, including projections, supply chain, contract suites and 47-page site/SEO build |
| Formatting and focused runner lint                  | Pass; receipt formatting and ADR/documentation checks repeated after recording these results                      |
| Current fingerprint and portable byte parity        | Pass: all ten canonical files plus the recorded evaluation inputs                                                 |
| Version/release metadata preservation               | Pass: skill/plugin versions, root package version, lockfile, Release Please manifest and changelog unchanged      |
| `git diff --check`                                  | Pass                                                                                                              |

Validation used native NixOS/WSL tools: Node 24.21.0, Bun 1.4.2 and pnpm 11.24.0. The aggregate retained existing warnings for unrelated skills; no new validation failure remained. The receipt was completed after the successful aggregate. Hosted CI must be checked separately on the published commit; this local record does not pre-claim that result.

## Boundaries

The original archive hashes and reproducibility receipt do not describe this changed payload. New archive identity must come from the updated hosted checks or a later release build. No release, merge, portal upload, bot, credential, live CLI operation, database change or hosted Mini App verification is claimed.
