# Validation and live evidence — 2026-09-21

## Candidate binding

Runtime source fingerprint: `3bc5150eefaeca3a1f31b00375d9a649442ed14bb4bcda8fb5e6aede9acdcfba`.

Compute SHA-256 over the sorted repository-relative files under this skill's `scripts/` and `assets/`: concatenate each UTF-8 path, NUL, its lowercase SHA-256 hex digest, and LF. This binds the actual installed code independently of later documentation and test-fixture commits. The PR records the final commit and hosted check results separately; a successful test on another source fingerprint is not reusable proof.

This receipt describes the local candidate above. It does not qualify the earlier published PR commit; native hosted results must be recorded after this candidate is published.

## Independent review

Independent reviews covered utility and workflow clarity, then specification/correctness/security and repository integration. Findings about optional clients, environment and settings boundaries, interrupted rollback, API ownership/readback, manual guidance and client evidence were corrected and re-reviewed. Later reviews covered every live-error correction and the standalone catalog/CI changes. No actionable source-review finding remained in those scopes. Review is not a substitute for the execution evidence below.

## Executed checks

- `pnpm run validate`: passed locally, including the registered Hetzner validator and the remaining repository aggregate.
- Hetzner behavior suite: 187 tests, 175 passed, 12 native-host skips, zero failures in the Linux/WSL run. Skips are not passes. Tests use mocks and do not consume live credentials.
- `pnpm run lint`, `pnpm run format:check`, and `git diff --check`: passed.
- Catalog discovery and `pnpm run smoke:install`: passed. The entire Hetzner installed payload matched source bytes for Codex, Cursor and Claude Code; this is installation evidence, not client inference.
- Twenty-three behavior cases are available. The separate six-case [text exercise](2026-09-21-text-evaluation.md) is a known-expectations simulation, not a blind activation benchmark.
- The first GitHub run passed the required `validate` job, Linux helper checks and archive identity checks on all three platforms. Native macOS/Windows helper jobs failed on temporary-path aliases and PowerShell argument/ACL boundaries. Those issues have local corrections, but hosted verification of the corrections is pending. These jobs exercise host/file/process contracts, not real provider or desktop-client calls; failed jobs and skips are not passes.

## Real local flow

The actual CLI performed discovery → saved plan → apply → start → provider/gateway checks → status → saved rollback plan → rollback in an isolated Debian Linux container. Versions: Node 24.18.0, Python 3.13.15, LiteLLM 1.101.0, FastAPI 0.136.3, Starlette 1.3.1. The model was discovered from Hetzner: `Qwen/Qwen3.6-35B-A3B-FP8`. Protected credentials were supplied only to the selected runtime; no values, private paths, hostnames or raw logs are published here.

| Component           | Actual result                                                                                                                                  | Evidence boundary                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Provider            | Model discovery, text, streaming and two-stage tool loop passed                                                                                | Streaming proves transport; no coding-client claim               |
| Gateway             | Authenticated model listing, Responses text/tool loop, Messages text/tool loop and invalid-key rejection with authenticated control all passed | Official protocol translation for the tested model/configuration |
| Ownership/lifecycle | Installation, start, offline status and receipt-owned rollback completed; ordinary rollback preserved credentials                              | Disposable test container was then removed                       |
| Codex 0.154.0       | Final real text request failed with system-message ordering error; an earlier disposable read/patch/shell request failed at the same boundary  | **Blocked**, not client E2E; no coding task succeeded            |
| Claude Code         | Native executable unavailable; Messages transport and tool loop passed through the real gateway                                                | No native Claude Code E2E evidence                               |
| Cursor              | Standard-chat/BYOK guidance reviewed; native application flow unavailable                                                                      | No Cursor live-client evidence                                   |

The final local check command exited successfully for all selected provider/gateway probes. An earlier diagnostic rerun timed out on Messages tool continuation; that run is recorded as failed, separate from this successful final run. The deliberately separate Codex command failed and was not promoted by gateway success. Native NixOS venv execution remains unqualified: the observed missing `libstdc++.so.6` requires a declared packaging adapter. A diagnostic process with an explicit loader path is not autonomous native support, and container success does not supply it.

## Real remote and UI boundary

Authenticated inspection and an approved model-create attempt ran against the selected existing Kubernetes gateway. The API refused the write because database model storage was disabled; no temporary model route was created. Thus remote creation, inference and owned deletion remain **unproven**. The next test requires the operator to enable the prerequisite in an agreed maintenance window, then use a unique temporary route, a separate inference credential, readback and receipt-owned cleanup. The skill does not mutate deployments or restart a shared gateway.

The deployed LiteLLM 1.97.0 UI was opened and inspected: Models + Endpoints → Add Model → OpenAI-Compatible Endpoints, plus Advanced Settings → LiteLLM Params. No provider key was entered and no UI model was saved. This verifies labels/field availability only; UI mutation and success remain untested. The manual guide keeps these version-specific limits explicit.

## Changes driven by real failures

- Pin FastAPI/Starlette to the proxy release's tested lock pair instead of accepting a breaking newer import surface.
- LiteLLM 1.101.0 omits empty tool arrays in Responses→Chat; 1.97.0 produced real Hetzner HTTP 400 responses. See the [tagged transformer](https://github.com/BerriAI/litellm/blob/v1.101.0/litellm/responses/litellm_completion_transformation/transformation.py).
- The local single-provider gateway uses the official global Messages→Chat setting to avoid the observed loss of visible message output through Responses. Remote instances receive an operator handoff, not an automatic global change.
- Drop only the unsupported `reasoning_effort` hint, preserving real tools. Codex effort settings are ignored; the provider model retains its own default.
- Responses tool proof uses explicit history and `store:false`; no database-backed continuation is implied. Exact no-database key rejection is paired with a successful authenticated control.
- Use a bounded 1024-token text/tool output budget, report exhaustion as inconclusive, compare stable object contents canonically, evaluate process freshness after slow verification, and recognize valid Linux namespace mount records without weakening Windows-mount protection.
- Codex's remaining instruction-order incompatibility is documented with a negative eval. Moving or downgrading developer instructions is not a supported workaround; the [upstream proposal](https://github.com/BerriAI/litellm/pull/39852) still needs qualification.
- Canonicalize test-created temporary roots on hosts with path aliases, while retaining production rejection of aliases. Pass Windows PowerShell arguments through a child-only JSON environment entry to a constant encoded script; paths remain data. A read-only Windows PowerShell 5.1 smoke check covered empty, multiple, Unicode and shell-metacharacter arguments, drive type and ACL inspection. This is separate from the native CI write/permission checks.
- Retry a complete namespace/offline snapshot only for an observed manifest-bound heartbeat publication. A real paused writer regression covers both temporary and quarantine phases; foreign identities, unsafe types, stale receipts and persistent recovery files remain blocking. An earlier live rollback exposed this race; its successful neighboring runs did not invalidate the failure.
- Protect native Windows remote-attempt journals with the shared current-user ACL checks. Validate the pre-existing parent without changing its permissions and refuse a changed journal before the remote write.

## Readiness

This evidence does not establish merge readiness while the promised remote live flow is blocked. The maintainer must also decide the supported public client/platform scope in light of the concrete Codex and native NixOS limits. A useful next native-client check is a small disposable repository read/edit/test flow after an upstream-compatible model/client combination is demonstrated. Full context-growth/compaction, cancellation and all declared client E2E cases remain unproven; absent clients and skips are never counted as passes.
