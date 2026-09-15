# 2026-09-14 Measurable testing implementation

## Scope and completion state

Implementation evidence for the [approved integration spec](../../../docs/specs/architecture-compass-measurable-testing-adr-set-spec.md), Architecture Compass 0.7.0 and provider decisions AC-ADR-059–062. This is a dated, non-normative receipt. Canonical Longs and accepted local ADRs remain authoritative.

Source implementation, isolated local qualification, generated portable/OpenAI payloads, archive reproducibility and disposable install proof passed. Hosted validation is the remaining completion gate; exact-current results belong to [PR #84](https://github.com/stark-ai-de/agent-skills/pull/84/checks). This dated local receipt does not assert a hosted result or any release, target adoption or production optimization.

## Identity and evidence

- Observation: `2026-09-14T11:10:16.433Z`; stage `local`; execution `verified`.
- Fixture subject: `8f4438ba53cc898acd115ff2d63c179413a9ee2b3d6c7e3b21d2214c8429f751`. Recipe: SHA-256 of sorted relative path, NUL, file SHA-256 records joined by newlines, excluding dependencies, caches, reports and Python bytecode.
- Provider tree: `89829be4ba7a6a0a80606fc65d464be3114708665dd702ded0eac2182a92d3cc` over 210 files, using the same path/content recipe without exclusions. The JSON records each canonical Long's path and whole-file SHA-256 separately.
- Baseline and candidates share fixture/config/lock/runtime/platform/input identity; raw run/attempt and configuration/lock digests are in the receipt. No Git HEAD alone identifies these uncommitted changes.
- Runtime: Linux x64, Bun 1.4.2; native Node fallback records its own actual version. CLI, worker and product observations are separate. Hosted pinned-toolchain proof is pending.
- Raw evidence: [2026-09-14-measurable-testing-local.json.gz](2026-09-14-measurable-testing-local.json.gz), gzip-compressed JSON, SHA-256 `9a2c812ab39fa01cb3d2e8263fff4df938934c4eec2b4e687d6bb48062fb343f`. Decompressed JSON SHA-256: `dd827ebc5d1ba52ee6091f979064c0315773642f0281b9047daadb465102bc6e`. Read with `gzip -dc skill-evals/architecture-compass/runs/2026-09-14-measurable-testing-local.json.gz`.
- Reproduction: the [fixture README](../fixtures/measurable-testing/README.md) documents the isolated frozen-lockfile install and `qualify --output <receipt.json>` commands. Requalification must create a new dated receipt after relevant source, runtime, config or dependency changes.

## Target declarations and correctness

The fixture's target-native declarations TST-001–004 and PY-001 map scope, intent, ownership, adaptations and review triggers to the provider. These are explicit synthetic declarations in the fixture README, not adopted repository or production ADRs. The raw receipt binds those declarations to provider version/content, baseline/candidate identity, declared rule inventory, input digests, provisional budgets, measurement states and execution status.

Qualification executed 71 native Vitest runs plus typecheck, package entrypoint, native Python, watch and native collection/merge commands. The contracts lane passed 31 cases across six files. The monorepo target ran all 1,536 named cases across 24 files for five repeats each at 1, 2 and 4 shards. Every native merge checked complete, disjoint identity-bound inventories and predecessor outcomes before success; Vitest produced JSON and JUnit from native blob reports. This fixture emits no required attachments; temporary native report files are disposable, while the normalized native cases, diagnostics, identities and measurements remain in the raw receipt.

| Metric                            | Observed   | Denominator | Measurement state |
| --------------------------------- | ---------- | ----------- | ----------------- |
| `rule_mapping_coverage`           | 1          | 7           | met               |
| `negative_scenario_detection`     | 1          | 9           | met               |
| `unexpected_repository_mutations` | 0          | 1           | met               |
| `shard_inventory_errors`          | 0          | 15          | met               |
| `cache_parity_mismatches`         | 0          | 15          | met               |
| `hosted_runner_allocation`        | unmeasured | unknown     | unmeasured        |
| `persistent_cache_net_savings`    | unmeasured | unknown     | unmeasured        |
| `os_egress_enforcement`           | unmeasured | unknown     | unmeasured        |

These ratios cover the declared fixture population only. Sixteen partition/plan fault cases, metric truth/expiry faults, resource cleanup and process-tree faults are additional native assertions. Negative driver runs must match the intended owning test and diagnostic; arbitrary startup errors, missing reports and signal termination do not count as detection.

Actual watch add/rename/delete probes passed. Vitest 4.1.11 does not route unlink through `watchTriggerPatterns`; the tested profile uses a narrowly scoped public-API bridge to rerun the owning test. Typecheck and resolved project inheritance passed. Bun product behavior, ESM/CommonJS interop and ordinary Bun mocking passed; optional native-loader mocking reproduced Bun's `module.registerHooks` incompatibility, and the same narrow lane passed under Node. This does not establish a blanket Vitest-on-Bun failure.

## Measurements and decision

Five initial local samples per candidate support medians and ranges only. Provisional budgets were declared before samples by the synthetic fixture owner: 30 s critical path, 90 local runner seconds, at most twice baseline runner seconds, and 4 GiB summed process peak RSS. These are fixture budgets, not approved production thresholds. Dependency installation, queue delay, hosted billing and remote cache overhead are outside these local measurements.

| Shards | Median critical path (s) | Range (s)   | Median local runner seconds | Maximum sum of process peak RSS (GiB) |
| ------ | ------------------------ | ----------- | --------------------------- | ------------------------------------- |
| 1      | 2.040                    | 2.018–2.229 | 2.036                       | 4.418                                 |
| 2      | 1.302                    | 1.298–1.311 | 2.245                       | 4.382                                 |
| 4      | 0.990                    | 0.969–1.006 | 2.836                       | 4.747                                 |

Selection: **unmet**; retain 1 shard. No candidate met every provisional budget. The memory counter sums per-process peaks, including sequential workers; it is a conservative sum, not simultaneous peak memory. No hosted shard rollout is enabled.

Cache medians: off 0.282 s, cleared 0.282 s, warm 0.227 s. All 15 same-subject disabled/cleared/warm parity runs matched; plugin input mutation, real source failures, corruption with exactly one visible cache-off recovery, and rejection before untrusted restore passed. Persistent-cache net savings remain unmeasured, so remote persistence remains disabled.

## Provider checks and remaining gates

| Boundary                                                               | Evidence stage                      | Status and scope                                                                                                                                                                                |
| ---------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical provider history, structure, inventories and scenarios       | source/static + local               | Architecture Compass validator and 12 malformed-candidate regressions passed; 62 IDs, 186 variant files, 43 eligible adoption rows. Existing 58 decision-lock/lineage entries remain unchanged. |
| Governance/runtime ownership and source metadata                       | source/static + local               | Owning ADR, validation ownership, runtime matrix and skills checks passed.                                                                                                                      |
| Formatting, script lint and workflow syntax                            | local                               | Repository formatting, script syntax, smoke-install contract regressions, script lint and action lint passed.                                                                                   |
| Isolated target qualification                                          | local                               | Verified for the content identity above. Optimization outcome and execution status remain separate.                                                                                             |
| Independent review                                                     | source/static + local reproductions | Standards and specification reviewers closed their findings after metric, cache, watch and process-tree fixes. This is code review, not an agent-behavior evaluation run.                       |
| Portable projection/source identity and OpenAI archive                 | publication/install                 | Verified owner-run generation, projection safety/determinism and portable/OpenAI/standalone archive contracts; two isolated builds matched byte-for-byte.                                       |
| Disposable installed payload identity                                  | publication/install                 | Verified clean-copy public skill listing and Architecture Compass source-byte parity for Codex, Cursor and Claude Code.                                                                         |
| Validate aggregate, testing-profile and hosted archive/platform checks | CI                                  | Required after push; inspect the exact current PR head. Local results and earlier PR runs do not prove hosted execution.                                                                        |
| Fourteen Markdown evaluation scenarios                                 | source/static                       | Scenario contracts validated; no live agent-behavior success claimed.                                                                                                                           |

Local metadata checks also passed: OpenAI listing/marketplace contracts, six unchanged skill icons and metadata copies, release descriptor, requirement traceability and supply-chain inventory. The catalog site build and SEO checks passed for 44 pages. Root catalog release version and historical release-evidence files remain unchanged.

Archive identity for the unchanged provider/listing subject:

| Artifact                        | SHA-256                                                            | Bytes                         |
| ------------------------------- | ------------------------------------------------------------------ | ----------------------------- |
| Portable plugin                 | `e92000b52cc33aa1778a3aab49ffdb9483413a96a30c0fd3958b0cf945abcc08` | 2583615                       |
| OpenAI plugin                   | `6a05a0255294b0d5c1f532753b1ec78b684accaee451c30ffee7cb5313dd7548` | 2796933                       |
| Architecture Compass standalone | `25b76c94d6eb5c7082b4dd2c3ed99f24c4786f57a9f0ed135cae4eb02a7f9e69` | recorded by archive validator |

The remaining sequence is commit/push and exact-current hosted validation. Correct any failing boundary before reporting completion. Optimization budget failures must remain visible; they do not authorize weakening a threshold or dropping proof.
