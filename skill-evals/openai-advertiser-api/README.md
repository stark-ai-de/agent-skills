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

## Goal review: plugin complement and standalone access

The 2026-11-23 PR review checked the original purpose against the official Ads Manager tools available in that session and current OpenAI Ads documentation. At review head `e2796bbf1085e936d93190b0996654bd3fa5df69`, the account-check tests passed; the gaps concerned capability-based routing, credential-only onboarding, practical API extension workflows, and evaluation coverage. The changes retain standalone catalog scope and do not add the skill to a plugin bundle.

The revised entrypoint covers absent plugins and missing tool parameters. The [capability map](../../skills/engineering-workflows/openai-advertiser-api/references/capabilities-and-recipes.md) distinguishes already-supported plugin operations from API opportunities, with a dated snapshot and mandatory runtime recheck. Access guidance distinguishes Advertiser, Platform, and Conversions API keys. The public APIs do not grant otherwise missing account permissions or feature access.

### Behavioral observations

One fresh agent context answered all 18 [synthetic cases](cases.md) using only the candidate entrypoint, its two local references, and the prompts. It had no reviewer diagnosis or expected-answer rubric. All outputs described proposed actions; no credentials, live documentation, Ads account, or network were accessed. The implementer manually assessed the answers. This checks prompted instruction use, not automatic activation or live API success.

| Cases | Observed behavior                                                                                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–8   | Retained account matching, options-only stopping, current-contract requirements, uncertain-write reconciliation, feature gates, and the unsupported Hosted URL scheduling boundary.               |
| 9     | Selected standalone API preparation; produced canonical `campaign.*` fields and a GET `date_range` covering November 16–22 inclusively in Europe/Berlin.                                          |
| 10    | Rejected using the ordinary Platform key for Ads and provided Ads account/Settings setup while retaining offline preparation.                                                                     |
| 11–12 | Kept supported reports in the plugin, used the API only for the unsupported `desktop_web` parameter, and recognized that conversion-only attribution is already available in the plugin.          |
| 13    | Prepared feed creation and Delta updates, separated initial SFTP ingestion, and preserved replacement/credential boundaries.                                                                      |
| 14–15 | Withheld draft submission; required a changed execution body and new request key; recognized that partial failures do not roll back successes and that every operation page needs reconciliation. |
| 16–17 | Stopped on disabled Delta access and honored plugin-only intent despite an available API key.                                                                                                     |
| 18    | Used official measurement guides when the conversions companion was absent; distinguished source ID, Pixel ID, Advertiser key, and CAPI key.                                                      |

Captured response excerpts:

- Case 9: `time_ranges[]={"type":"date_range","since":"2026-11-16","until":"2026-11-22","timezone":"Europe/Berlin"}` with `fields[]=campaign.id`, `campaign.name`, `campaign.clicks`, and `campaign.spend`.
- Case 11: `{"targeting":{"platforms":{"included":["desktop_web"]}}}`; the unresolved campaign ID remained a placeholder.
- Case 12: “Do not require an Advertiser key for these plugin calls.”
- Case 17: “Do not switch to the API because a key exists; do not substitute the broader `web` value.”

The first forward pass noted that bulk request construction and exact cursor extraction still required the upstream guide. The recipe now includes a local pause payload and specifies the last returned `operation_id` as the `after` cursor. A second fresh context answered two focused bulk tasks from the revised local references: it prepared both requested campaign pauses without submission, selected a new execution key, and returned `GET /v1/bulk_mutation_jobs/{job_id}/operations?after=fixture-op-100` while preserving earlier successful mutations. All recipes continue to require current official contract verification. An independent review also caught and resolved a draft ambiguity that could require an Ads API key for plugin-routed calls.

### Mechanical verification and limits

- `python3 -B skill-evals/openai-advertiser-api/test_account_example.py`: all eight tests passed against the actual documented Bash example.
- `node scripts/catalog/validate-skills.mjs` and `node scripts/validation/test-skill-invocation-token.mjs`: passed; 16 public skills and 31 incubator skills validated.
- `pnpm dlx skills@1.5.23 add ./skills --list`: discovered all 16 public skills, including the revised activation description.
- A temporary project-local Codex installation using Skills CLI 1.5.23 copied all three Advertiser skill files byte-for-byte. Repository clean-copy smoke installation also passed its 10 configured install cases; those cases are distinct from the focused Advertiser installation.
- Feature release-intent validation against the PR base passed at skill version 0.1.0. Focused Oxfmt 0.71.0 and `git diff --check` passed.
- The additional skill-creator `quick_validate.py` rejects `compatibility` on both the original PR and revised skill. Its allowed-field list is older than the [Agent Skills specification](https://agentskills.io/specification), which permits that field. The repository validator and Skills CLI accepted the unchanged field type; the generic helper was not modified or counted as passing.
- No live Ads call, native automatic selection, scheduled execution, release publication, or installed cross-skill handoff was verified. The feature-only review used focused local checks; hosted Validate is a separate PR gate.

Candidate SHA-256: `14e25d3e933af5dd8dced06a5bb07410749a9c609e7b754ce30655015141fbc6` (`SKILL.md`), `0a9b0cef7cc15e5ec69d5e618fb35a9cfe2dd7ed06b971bdee0a7d50d6779866` (`api-operations.md`), and `844692d1656d8e7609fa30b95b1d8b082546e3116f0e3fe1a3d008e6649c5616` (`capabilities-and-recipes.md`). The earlier comparison remains historical evidence; this follow-up does not establish a statistical improvement over it.
