# OpenAI Advertiser API qualification

## Maintainer admission decision

On November 23, 2026, the maintainer selected standalone promotion and approved implementation of the reviewed specification. The decision admits the skill to the public standalone Skills CLI catalog. Plugin inclusion, merge, and publication require separate authorization. Behavioral evidence and its limits are recorded below.

## Method and results

On 2026-11-23, two fresh, separate Codex agent contexts answered the [synthetic cases](cases.md) using identical source facts. Only the candidate context read the skill. Both arms described actions and used no Ads account, credentials, or network. The implementer assessed the outputs. This is a single paired comparison of prompted behavior.

| Case               | Official references alone                                  | Candidate with official references                                                                                                                                              |
| ------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct read        | Verified the account ID and limited the output.            | Selected Inspect and specified the fixed origin, HTTP 200, expected ID, and validated summary.                                                                                  |
| Routing            | Separated connector reporting, Pixel, and server events.   | Identified the connected Insights and conversions workflows and kept the distinct credential.                                                                                   |
| Options only       | Listed example API capabilities.                           | Presented Inspect, Prepare, and Apply in order and explicitly withheld calls.                                                                                                   |
| Wrong account      | Stopped before the budget change.                          | Stopped on ID mismatch and required parent and budget readback after verification.                                                                                              |
| Docs unavailable   | Deferred the request.                                      | Withheld the call until the official method, field, and access contract could be checked.                                                                                       |
| Timed-out creation | Looked for a matching campaign before a retry.             | Also consulted documented audit or operation records and kept uncertain results unverified.                                                                                     |
| Gated feature      | Required confirmation of a replacement and its activation. | Also checked supported configuration, scope, and existing resources before creating it.                                                                                         |
| Hosted URL         | Checked whether the current API documents scheduling.      | Routed import to Ads Manager. The first response overstated what the reference proves about scheduling, so the runbook now requires checking the account's scheduling controls. |

The options-only response demonstrated the clearest workflow improvement. The candidate also specified stricter account verification and reconciliation. The baseline matched the candidate on several safety decisions. This evaluation supports standalone catalog admission under ADR-0065. The short runbook adds account and authorization handling for a consequential direct API workflow while using upstream documentation for the changing endpoint contract.

## Evidence and limits

- Candidate SHA-256 before removing the incubator marker, with Markdown formatting applied: `d2e3800104cca33238cb26bb0513a0aa7d01a8dec9fc0474f3d9419fb89f6ed1` for `SKILL.md` and `3c911589ac21d71cd2512b62e158ec24bd72fdbc8408005cf13db774a3c6c39a` for the runbook. The runbook wording changed only for the Hosted URL finding. A fresh recheck withheld the write, required account-level scheduling controls and called for authorization before switching to Ads Manager.
- Promotion SHA-256: `473688eec03b57e4340e5785e47023ec1e59a5ad7e46015db4a94d294ae09fc8` for `SKILL.md` and `5edd142bd7c375cb47991fbd9f11fd4f49c84f0e16c80ba7c1b621b31a3ca2ad` for the runbook. Promotion removed the incubator marker. Review clarified that an inconclusive readback leaves a write pending. A fresh recheck of cases 6 and 8 confirmed the written behavior.
- `python3 -B skill-evals/openai-advertiser-api/test_account_example.py` exposed raw output and missing guards in the draft, then passed five tests after hardening. The tests use synthetic credentials and a curl stub.
- Live Ads operations, automatic skill selection, publication, and installation from a public release were outside this evaluation.

## Review follow-up

Checked the full-refresh feed settings and conversion credential storage instructions against the official references. The revised runbook requires checking the feed setting and accounting for omitted products before upload, and confirming a server-side secret destination before requesting a new key. Runbook SHA-256: `5b98b8f1a1e6ef4a93e0f7717d805ff9ac490aefe6f037075486d92821c3a8a7`. Validation used documentation and synthetic checks.

A later review added explicit account discovery and completed the ADR-0060 handoff. The documented shell example passed eight mocked tests, including missing expected IDs, discovery, and conflicting inputs. Revised SHA-256 digests are `3f3dddec38f58dd436cb529d029cd817288f707b7bf8dd3839a0b17a44e86b85` for `SKILL.md` and `d56ca1a990c36772b05bf8616f252e941d9b395074afedbe4db4ad0a55c7c207` for the runbook.
