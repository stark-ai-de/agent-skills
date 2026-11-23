# OpenAI Advertiser API qualification

## Maintainer admission decision

On November 23, 2026, the maintainer selected standalone promotion and approved implementation of the reviewed specification. The decision admitted the skill to the public standalone Skills CLI catalog. Later in the same review, the maintainer explicitly requested the complete independent Ads plugin and MCP implementation in PR #203. That implementation authorization covers the canonical skill, server and package; merge, live deployment and public publication remain separate outcomes. Earlier behavioral evidence and its limits are preserved below.

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

The 2026-11-23 PR review checked the original purpose against the official Ads Manager tools available in that session and current OpenAI Ads documentation. At review head `e2796bbf1085e936d93190b0996654bd3fa5df69`, the account-check tests passed; the gaps concerned capability-based routing, credential-only onboarding, practical API extension workflows, and evaluation coverage. That first follow-up retained standalone catalog scope without adding a plugin bundle; the subsequent, explicitly authorized plugin implementation is recorded below.

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

## Independent Ads plugin and MCP implementation

The maintainer then requested the complete implementation and PR update. The resulting `stark-ai-ads` package contains this canonical skill, ChatGPT/Codex metadata and a configurable OAuth MCP connection. The service in [packages/openai-ads-mcp](../../packages/openai-ads-mcp/README.md) exposes 66 typed Advertiser API operations. It verifies each account owner through an Ads-specific key, stores the key encrypted, and gives the client separate scoped OAuth tokens. This preserves both the official-plugin complement and API-only workflows without requiring a local shell or a local Advertiser key when the MCP connection is available.

### Fresh instruction-use check

A new agent context read the updated skill and answered cases 19–24 without the implementation diagnosis or expected-answer rubric. The implementer manually assessed the proposed actions. No live Ads account, key or network was used.

- Case 19 used the connected OAuth MCP tools for an API-only request despite the absence of a local Ads key.
- Case 20 treated missing write scope as an authorization boundary and required reconnection instead of switching transports to evade it.
- Case 21 returned the protected credential-download link to the user without fetching or displaying the credential.
- Case 22 prepared the requested options without calling tools or submitting a write.
- Case 23 kept an incomplete bulk result pending, retained the known results and did not invent a pagination cursor or resubmit the job.
- Case 24 treated an expired SFTP-credential handoff as a potentially disruptive rotation, required scoped authorization and did not retry automatically. An explicit request for that same rotation can already provide the authorization.

These are checks of prompted instruction use, not evidence of automatic skill selection or a completed ChatGPT installation.

### Implementation verification

All 61 automated runtime tests passed. The suites exercise the real MCP SDK transport with synthetic upstream responses, including complete OAuth code exchange, read-only enforcement, concurrent account isolation, write readback and one-time credential download. They also cover malformed requests, PKCE and resource binding, refresh replay and revocation, encrypted persistence, callback CSP restrictions, filesystem symlink rejection, typed API contracts, targeting merges, uncertain writes, secret-response containment and the maximum supported audience upload.

Independent review found and corrected three integration/security defects: unsafe SQLite path handling, concurrency slots released before a streaming request finished, and a consent-page CSP that would block the registered cross-origin OAuth callback. Regression checks cover each boundary. The streaming check also cancels response bodies while upstream work is pending and confirms that the six-operation limit per authorization grant remains enforced.

All eight plugin-packaging tests passed, validating canonical source bytes, metadata, explicit HTTPS endpoints, scoped public OAuth, reproducibility, tamper detection, containment and rejection of untracked inputs. Packaging verification uses test configuration and does not attest that an endpoint is deployed. The eight mocked Bash-example tests also passed as a separate check of the direct-API fallback. Repository validation includes the new runtime and packaging suites in its existing owned aggregate.

A fresh temporary project-local Codex installation using `npx --offline --yes skills@1.5.23 add <canonical-skill-directory> --skill openai-advertiser-api --agent codex --copy --yes` succeeded. The CLI listed the installed skill with project scope. A recursive comparison verified exactly five regular files, identical relative paths and identical bytes, including `agents/openai.yaml` and `references/mcp-workflows.md`; source hashes were unchanged after installation. This establishes local Skills CLI distribution, not public ChatGPT plugin installation.

All owned checks in `pnpm run validate` passed across the aggregate run and targeted continuations, including the site build. The initial aggregate stopped when the existing actionlint wrapper could not download its binary; the unchanged validator subsequently passed using official actionlint 1.7.12 from an archive whose SHA-256 matched the published release digest. The existing draw.io fixture also encountered a `pnpm dlx`-injected Node import loader that rejected its `.net` executable filename; both unchanged draw.io validators passed after clearing `NODE_OPTIONS` only for those validator processes. No validator or repository policy was changed to obtain these results. Full-repository formatting, script/runtime lint, feature release-intent and diff checks also passed. Hosted GitHub validation remains a separate gate.

The documented container dependency-install stage was reproduced in a clean temporary directory with the pinned pnpm version; the resulting runtime imported all 66 tools. Docker was unavailable, so an actual image build and Compose startup were not verified. Chromium could not launch in this environment; the callback-CSP regression is checked at the emitted policy and redirect boundary, not through a real browser session.

No live Ads mutation, hosted service, real ChatGPT OAuth connection, domain verification or public plugin submission was performed. Account feature gates still apply. A real HTTPS deployment, its registered callback/client configuration and the publication checks in the [Ads plugin guide](../../docs/listing/openai/stark-ai-ads.md) remain necessary before users can install the public plugin.

## Serverless PostgreSQL implementation follow-up

The maintainer approved one repository with the deployable service under `packages/openai-ads-mcp`, a dedicated Vercel project rooted at that package, external PostgreSQL (Neon recommended), and linked operations/publication documentation. The [service map](../../docs/services.md) records those boundaries. This supersedes the initial SQLite/single-instance deployment design described by the historical proof above; the canonical skill and independent plugin identity remain the same.

On 2026-11-23, the current source passed **98/98 runtime tests**, with **zero skips**, on Node.js 24.22.3 and real PostgreSQL 18.7 on Linux. Each fixture creates its own schema in a disposable database; separate pools exercise concurrent workers. Ads API responses and keys are synthetic. The suite covers atomic OAuth code and refresh consumption/replay, revocation races, encrypted persistence, one-time credential downloads, explicit migration concurrency/checksums/rollback, environment isolation, shared rate counters and leases, combined operation deadlines, Vercel pool/header/cookie/stream behavior, protected cleanup and runtime staging without secrets/database access.

Review and boundary tests found and corrected:

- Database URL query parameters could override the effective host/TLS mode; the shared parser now rejects routing overrides and duplicate parameters, and requires verified TLS remotely.
- Session startup timeout parameters were unsuitable for transaction pooling. Database work now uses one checked-out client per transaction and `SET LOCAL` limits, with bounded client connection/query deadlines.
- The original credential-URL sanitizer scanned long scheme-like text quadratically. Delimiter-first redaction preserves credential protection and handles megabyte-sized strings linearly; the regression runs in a child process with an external five-second limit so an event-loop stall cannot hang the runner.
- Native startup diagnostics could expose driver identities or private certificate paths. Startup now emits a fixed diagnostic; a subprocess regression checks that raw driver values stay out of logs.
- A stream cancellation hook could delay a response deadline. Cancellation no longer waits for an unresponsive hook, while the independent upstream lease remains held until actual Ads work settles. Late lease acquisition and release are also covered.

An independent review rechecked the TLS bypasses and sanitizer regression and reported no remaining confirmed P1/P2 findings in the reviewed source. A separate read-only documentation audit found all 24 checked relative links valid and configuration/CLI/Compose instructions consistent with the implementation.

Additional current checks passed: all **8 packaging tests**, ADR triplets, runtime selection, validation ownership, supply-chain verification, Actionlint 1.7.12, repository formatting, repository script lint and Ads-package lint, native Vercel staging/import, and installation from the frozen lockfile with pinned pnpm 11.24.0. These are targeted checks for the changed runtime/deployment contracts; the earlier full-aggregate receipt is historical and was not counted as a new full-aggregate run. CI's existing Validate job now supplies PostgreSQL and remains the single owner of the complete runtime suite.

No live Vercel deployment, hosted Neon/PgBouncer connection, real cron invocation, container build, ChatGPT/browser installation, Ads operation or public listing was performed. Direct PostgreSQL transaction tests do not qualify a particular provider's pooler or hosted environment. Operators must verify the selected deployment, callback, production/preview isolation and cleanup before public use.

## PR #203 independent re-review and regression fixes

A further maintainer-requested review on 2026-11-23 started from commit `249637639434c759b91e3c14187004c787d907ea`. Its hosted [Validate run](https://github.com/stark-ai-de/agent-skills/actions/runs/45175270253), release-contract forwarding and SSH artifact qualification had all completed successfully. Those results qualified that earlier commit; the checks below cover the new fixes locally.

The review independently examined API/schema behavior, OAuth/storage isolation, and deployment/transport behavior. It reproduced and corrected seven findings:

- **P1 — Lost request properties:** the pinned OpenAPI projection had removed real fields named `title` or `description`. Valid ad creatives were rejected while missing required titles could pass local validation. The snapshot now restores eight affected property maps. A dependency-free offline helper preserves field names and literal data, retains the reviewed operation allowlist, and follows transitive schema references. Reprojection against the same source digest verified all 62 selected operations and 69 schemas; the public 66-tool surface is unchanged.
- **P2 — False Delta success:** HTTP 200 with `accepted: false` was treated as a successful write. It now returns an explicit upstream rejection; missing or malformed acceptance remains uncertain. Neither case automatically retries the mutation.
- **P2 — Premature audience completion:** creation responses in `upload_pending`, `rockset_ingest_pending` or `publishing` were treated as complete. All documented nonterminal stages remain pending; a ready-state control still performs readback.
- **P2 — Reversed pagination:** a request using `before` returned an `after` cursor. Responses now preserve backward traversal with `next_before`, the first opaque cursor and `cursor_parameter: before`. Forward responses retain their existing shape, and missing cursors remain explicitly incomplete. The MCP output schema and canonical skill guidance agree.
- **P2 — Broken hosted credential downloads:** named Vercel rewrite captures appended a query parameter that the credential route correctly rejects. Unnamed captures preserve caller queries without introducing routing parameters. A regression uses Vercel's actual route compiler and a real PostgreSQL-backed one-time download through the adapter.
- **P2 — Cron origin mismatch:** a custom `ADS_PUBLIC_ORIGIN` rejected the production deployment host used by Vercel cron. Only the exact platform-owned `VERCEL_URL`, `GET /internal/prune` and no query receive a canonical internal URL; the shared route still requires the cron bearer. Other hosts, routes and methods remain rejected.
- **P2 — Modern MCP browser preflight:** CORS omitted the `Mcp-Method` and `Mcp-Name` headers required by MCP 2026-07-28. Allowed browser origins can now discover the server and invoke tools with those headers. Untrusted origins and inconsistent header/body values remain rejected.

Primary contract references: the [pinned Advertiser contract and regeneration procedure](../../packages/openai-ads-mcp/references/README.md), [Delta acceptance](https://developers.openai.com/ads/delta-feeds), [audience processing states](https://developers.openai.com/ads/custom-audiences), [insights pagination](https://developers.openai.com/ads/api-reference/insights), [Vercel rewrite query behavior](https://vercel.com/docs/routing/rewrites), [Vercel cron request origins](https://vercel.com/docs/schedules/cron-jobs), and [MCP Streamable HTTP request headers](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/transports/streamable-http.mdx).

The integrated source passed **108/108 runtime tests, zero skips**, on Node.js 24.22.3 and real PostgreSQL 18.7 with synthetic Ads responses, plus **8/8 plugin-packaging tests**. The modern-browser regression first failed on the omitted preflight header, then passed through actual OAuth, MCP discovery and an authenticated tool call after the fix. Schema regressions likewise reproduced the missing-field failure before correction. The pinned, attested `@vercel/routing-utils` development dependency verifies compiled routing behavior; production dependencies are unchanged. Installation from the frozen lockfile passed with the repository's pinned pnpm 11.24.0 without relaxing supply-chain policy.

Repository formatting, script and service lint, runtime-selection and validation-ownership checks, supply-chain verification, canonical skill validation and the Vercel runtime build also passed. These were selected checks for the changed contracts, not a new full-repository aggregate run.

Independent read-only follow-up review found no further confirmed P1/P2 defects in the corrected deployment/transport paths, contract regeneration or API-result/pagination changes. Additional PostgreSQL-backed probes confirmed concurrent key-entry isolation, expired-consent rejection, refresh-scope attenuation and credential isolation. These probes do not imply a live browser or provider deployment.

No live Ads request, hosted Vercel/Neon/PgBouncer test, real cron invocation, Docker build, ChatGPT installation or publication was performed. The hosted and operator qualification requirements above still apply.
