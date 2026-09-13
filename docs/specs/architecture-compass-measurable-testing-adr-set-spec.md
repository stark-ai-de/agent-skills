---
title: "Architecture Compass: Measurable Testing ADR Set"
slug: "architecture-compass-measurable-testing-adr-set"
artifact_path: "docs/specs/architecture-compass-measurable-testing-adr-set-spec.md"
mode: "deep"
status: "proposed"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-09-13"
updated: "2026-09-13"
baseline_ref: "6e425701183ab189c556b91cd546ef920dad8a28"
source_request: "Evaluate the testing setup and specify reusable, intent-preserving, measurable ADRs for Architecture Compass; open a specification PR."
---

# Architecture Compass: Measurable Testing ADR Set

## 1. Outcome and authorized scope

Make repository validation easier to discover, faster to execute, and harder to misreport, without losing the rules it protects. The reusable outcome is not “install Vitest and enable four shards.” It is **complete, attributable validation with measured feedback time and cost, reproducible failure detection, and no silent correctness tradeoffs**.

This specification PR contains planning artifacts only. It evaluates the prior Bun/Vitest setup, supplies four proposed Short/Long/Guide decision triplets in the [draft companion](architecture-compass-measurable-testing-adr-drafts-spec.md), and defines their later integration into Architecture Compass. It does not migrate this repository's tests, change runtime policy, publish new skill content, or adopt decisions in another repository.

The request to create a PR authorizes public persistence of this non-sensitive plan. It does not imply acceptance of every proposed decision. The provider drafts remain Proposed until maintainers accept their canonical Long text. Target repositories still require local adoption or adaptation.

## 2. Source challenge and evaluation

### Repository findings

The inspected baseline has package version `0.22.0`, Architecture Compass `0.6.8`, and a validator expecting 58 public ADR identities. Current commands are under `scripts/catalog/`, `scripts/plugin/`, `scripts/release/`, `scripts/repo/`, and `scripts/validation/`; many enforce Bun, while memory-curator validation retains Node. The earlier root-script inventory and suggested old runtime pins must not be reused as current facts. Sources: `package.json`, the skill's `SKILL.md`, and `scripts/validation/architecture-compass/validate.mjs` at `baseline_ref`.

**Conflict found:** accepted AC-ADR-058 selects pnpm ownership, Bun-first execution inside script bodies, and evidence-based fallback. The earlier blanket “Bun is only a launcher; never force Vitest onto Bun” contradicts that rule. Preserve AC-ADR-058. Probe the applicable Vitest configuration under Bun, record actual harness/worker identities, and use a supported fallback only with command-specific evidence. An upstream limitation of Vitest's optional native-loader mode is not proof that every Vitest-on-Bun configuration fails. [R3, S1, S2]

### Evaluation of the complete proposal

| Earlier approach | Disposition and reason | Verification required |
| --- | --- | --- |
| Validation becomes framework tests, not just tests of old scripts | Keep. Move contract assertions and lifecycle into the runner; shelling into each old validator is not completion. | Complete old-rule inventory, direct discoverable assertions, positive/negative parity. |
| Never extract a validator function | Narrow. Reusable parsers, schemas, domain functions, diagnostic formatting and public validation APIs remain legitimate. Avoid duplicating a runner, not ordinary abstraction. | No auto-running repository validator or custom scheduling/reporting layer; production guards remain intact. |
| One framework for all repos and all test layers | Adapt. Vitest is the requested JS/TS profile; native language/framework owners remain valid for other layers and non-JS repos. | Each obligation has an owner; no unsupported tool is installed merely to match a provider. |
| Bun launch always implies Node-backed tests | Correct. Outer launcher, CLI runtime, worker runtime and product runtime are different facts. | Runtime evidence matrix and narrowly scoped fallback record. |
| Exactly four shards everywhere | Replace with measured selection. Four is an initial candidate for substantial suites, not a durable invariant. Small repositories may stay unsharded. | Compare 1/2/4 where applicable; approve latency and runner-cost budgets before enabling fan-out. |
| Always enable filesystem module caching | Keep as a capability/profile candidate, not an unconditional success claim. V4 exposes an experimental transform cache with plugin-input limitations. | On/off and warm/cleared parity, mutation invalidation, trusted cache scope, positive net benefit. |
| Root config automatically configures every project | Correct. Use explicit inheritance or a tested shared configuration. | Resolved child settings and disjoint project discovery are tested. [S3] |
| Static test inventory means no data-driven tests | Correct. Stable file discovery is important; deterministic cases derived from current repository data are useful. | Sorted current input enumeration, additions/deletions detected, independent coverage sentinel. |
| Watch mode finds all repository dependencies | Correct. Plain filesystem reads are outside the import graph. | Root watch mappings and change-selection tests for Markdown, JSON, YAML, generated inputs, additions and deletions. [S4] |
| Fork isolation makes tests safe | Narrow. It is a starting compatibility choice, not an OS security boundary or shared-database/filesystem lock. | Resource namespaces, bounded child processes, actual egress controls where required, and cleanup on failure. |
| TypeScript execution proves type safety | Reject. Preserve or define the owning typecheck boundary; transformation is not typechecking. | Applicable TS tests/config are covered by the target's typecheck command or an explicit evidence gap. [S5] |
| Four report files prove full execution | Reject. Identity, partition, outcomes and upstream job states matter, not just count. | Missing/extra/duplicate/foreign/stale reports and failed/cancelled/skipped required jobs never produce success. |
| Build, lint, format and external smoke run once | Keep one owner per obligation and artifact. “Once” is per required environment/artifact, not a reason to remove cross-OS or production-like proof. | CI graph has no accidental repeated work or omitted supported platform. |
| Grep filenames to ban validators | Use as discovery aid only. Classify executable behavior, imports, scripts and workflow call sites; exclude historical prose and runtime APIs. | Positive and negative guard fixtures, reviewed operational exceptions, zero unowned live validation entrypoints. |
| Thirty percent faster is universally required | Replace with target-owned budgets and counter-metrics. The percentage can be a declared example target, never invented proof. | Comparable measured baseline, sample count, spread, approved thresholds and raw evidence. |

### Architectural conclusion

Keep framework ownership, focused execution, deterministic fixtures, native reporters and caching/sharding capabilities. Change the rigid settings into a **versioned implementation profile** constrained by measurable outcomes. The Long ADRs preserve intent, correctness invariants and required evidence; Guides hold current APIs and examples. No accepted Long text is silently rewritten.

## 3. Reusable decision set and existing owners

Provisional IDs are `AC-ADR-059` through `AC-ADR-062`, based on the inspected 58-record library. They are not reserved merely by this document. Recheck the provider inventory before promotion, then update every new sibling link, catalog entry and fixture consistently if allocation changes.

| Proposed ADR | Single durable decision | Intent and primary measurable outcome |
| --- | --- | --- |
| 059 — Own repository validation through discoverable framework tests | The framework owns executable repository contract assertions and lifecycle. | Complete rule-to-test mapping; zero unowned bare validator entrypoints; current input changes reach the owning tests. |
| 060 — Isolate test execution by effects and runtime contracts | Each execution lane declares and enforces its state, I/O and runtime boundary. | No unauthorized checkout/index/shared-state writes; representative runtime coverage; no unexplained outcome changes under selected concurrency. |
| 061 — Shard tests as complete fail-closed evidence sets | Parallel results count as success only for one complete, identity-bound partition. | Exact inventory union with no overlap; all required outcomes pass; lower feedback latency within approved cost limits. |
| 062 — Cache test transforms without reusing correctness | Transform caches are disposable accelerators, never validation receipts. | Same correctness with cache enabled/disabled/cleared and after input mutation; trusted cache boundaries; positive measured net savings. |

Reuse existing decisions instead of creating redundant runtime, performance or migration policies:

- AC-ADR-013 and 014 own toolchain and runtime selection; AC-ADR-058 supplies the JS/TS Bun/pnpm/Vitest candidate. [R3]
- AC-ADR-018 owns test boundaries, realistic proof, retries and gradual gate promotion. [R1]
- AC-ADR-025 owns workload budgets and representative measurements. [R2]
- AC-ADR-021 and 022 own compatible migration and reversible delivery.
- AC-ADR-049 owns risk-proportional check selection and current evidence reuse; a transform-cache hit is not reusable validation evidence.
- AC-ADR-044 owns decision lineage, AC-ADR-046 precedence, and AC-ADR-051/052 provider namespace and target-local persistence.

The four additions are target-repository candidates, not skill-runtime instructions or automatic global defaults. Repositories adopt native IDs and map to provider identity/version. “Usable in every repo” means every repo can evaluate applicability, not that every repo must run JavaScript tests.

## 4. Mandatory intent and measurement contract

Every new canonical Long must contain `Intent`, `Decision`, `Invariants`, `Measurable outcomes`, `Adoption evidence`, `Failure and exceptions`, and `Revisit` sections. Short must preserve all obligations in abstraction. Guide is non-normative and may not weaken a metric or add a new mandatory policy.

For each adopted/adapted decision, the target records the following in its existing ADR/validation receipt convention, not a new provider-owned database:

| Field | Required content |
| --- | --- |
| Identity | Provider ID, provider version/commit and canonical content identity; local ADR ID/status and mapping disposition. |
| Intent | Original problem, beneficiaries, desired behavior and explicitly prohibited tradeoffs. |
| Applicability | Owning package/language/runtime/lane, in-scope rules/inputs, exclusions and their authority. |
| Baseline | Subject identity, test/input inventory identities, selected command, environment, cache state, samples and raw evidence location. |
| Metric | Name, definition, unit, population/denominator, aggregation, threshold, direction and measurement command. |
| Target | Target-approved value and owner; timing of approval; cost/memory/flake counter-metrics. |
| Observation | Actual value or explicitly unmeasured, evidence stage, subject, run ID/attempt and collection date. |
| Enforcement | Guidance/report-only/blocking stage; restoration trigger for a regression; next review. |
| Exceptions | Scope, rationale, approver/owner, expiry or observable revisit trigger and replacement evidence. |

A null baseline is not zero. An unmeasured outcome is not met. Adoption is a governance state; rollout completion and achieved outcome are separately reported. No fixed p95 claim from five samples: use a sufficiently populated distribution or report only the measured median/range and uncertainty.

### Correctness metrics

All denominators are frozen for an evidence run and changes to scope require review. Zero denominators are `not applicable` with evidence, never a fabricated 100 percent.

- `rule_mapping_coverage = mapped_in_scope_rule_ids / all_in_scope_rule_ids`; completion requires 1.0 plus reviewed exceptions, not a raw count of test files.
- `unowned_validation_entrypoints`; completion requires 0 after approved operational/runtime exceptions have been separately classified.
- `negative_scenario_detection = expected_rejections_observed / declared_negative_scenarios`; completion requires 1.0 for the declared suite, not a claim to detect every possible defect.
- `unexpected_repository_mutations`, `unauthorized_network_events`, `unexplained_outcome_mismatches`; require 0 for the declared evidence runs. Any unobservable enforcement boundary is reported as such.
- `shard_inventory_difference` and `shard_inventory_overlap`; require 0 within each subject/runtime/platform partition.
- `false_green_fault_cases`; require 0 across the declared report/job/cache failure fixtures.
- `cache_parity_mismatches`; require 0 across same-subject warm, cleared and disabled runs, plus declared mutation fixtures.

### Performance metrics

Measure developer feedback and CI completion, not just test-body time. Define `critical_path_seconds` from eligible workflow start to final required verdict; track queue delay separately or state its inclusion. Define `runner_seconds` as the sum of the relevant jobs' elapsed allocation times; include setup, duplicate installs, upload/download, merge and cache overhead.

`speedup = baseline_critical_path / candidate_critical_path` and `net_savings_seconds = baseline_critical_path - candidate_critical_path` use equivalent proof scopes. Also report runner cost, peak memory and flake frequency. A suite made faster by dropping tests, removing a runtime lane or suppressing a failed merge does not improve this outcome.

Profile experiments normally compare an unsharded baseline with 2 and 4 shards where there is enough work, and cache disabled/cold/warm. Record at least five comparable measured local runs for an initial median/range comparison when affordable; stronger claims need stronger samples. These are measurement examples, not universal numeric gates. Approve project-specific latency/cost thresholds before selecting a winner. A new repo starts with an explicit provisional budget and establishes its baseline before claiming an optimization.

### Example target receipt (illustrative, not measured)

```json
{
  "format": "testing-outcome-receipt/v1",
  "provider": { "id": "AC-ADR-061", "revision": "RECORD_ACCEPTED_PROVIDER_REVISION" },
  "localDecision": { "id": "TARGET_NATIVE_ADR_ID", "disposition": "adapt" },
  "intent": "Reduce required validation feedback without losing rules or increasing approved runner cost",
  "scope": { "lane": "contracts", "ruleInventoryDigest": null, "inputInventoryDigest": null },
  "execution": { "framework": "Vitest 4 profile", "runtimeEvidence": null, "shards": 1 },
  "correctness": { "missingTestsTarget": 0, "duplicateTestsTarget": 0, "falseGreenFaultCasesTarget": 0 },
  "performance": { "baselineSeconds": null, "targetSeconds": null, "runnerSecondsCeiling": null, "samples": [] },
  "evidence": { "stage": "source/static", "subject": null, "runId": null, "attempt": null },
  "measurementState": "unmeasured",
  "enforcement": "report-only",
  "review": { "owner": "TARGET_OWNER", "trigger": "Benchmark before enabling fan-out" }
}
```

A target may use Markdown rather than JSON. Preserve the semantics and avoid a second authority competing with an existing receipt ledger.

## 5. Vitest 4 implementation profile

This is a dated, non-normative profile for the requested stack. Use the exact compatible versions selected in the target lockfile and runtime matrix; do not copy old Bun/Vitest patch pins or freeze “4” into durable architectural intent. The V4 APIs below are sourced from V4 documentation, not mixed with later-major configuration. [S1–S8]

### Runtime and dependency ownership

On a target adopting AC-ADR-058, pnpm owns persistent installs and its lockfile; Bun automatic installation is disabled. Script bodies select the intended runtime consistently even when callers use `pnpm run` or `bun run`.

The initial candidate is `bun --bun vitest ...`. Representative tests must cover worker startup, subprocess behavior, ESM/CJS/module transforms, required mocks, shutdown, coverage when used, sharding and reporting. Record actual parent/worker and tested application runtimes. Required Node/browser/Bun product behavior gets an appropriate real-runtime boundary test; running a harness under Node cannot establish Bun-only behavior or vice versa.

When a specific configuration is unsupported or materially worse under Bun, retain the narrow supported fallback with evidence, selected command and revisit trigger. Do not reject Bun generally from the optional native-loader limitation, and do not silently run an unsupported harness to obey a speed preference. [R3, S1, S2]

### Explicit project configuration

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    allowOnly: false,
    passWithNoTests: false,
    retry: 0,
    environment: "node",
    pool: "forks",
    isolate: true,
    experimental: {
      fsModuleCache: process.env.TEST_TRANSFORM_CACHE !== "off",
      fsModuleCachePath:
        process.env.VITEST_FS_MODULE_CACHE_PATH ?? ".cache/vitest/transforms/local",
    },
    projects: [
      {
        extends: true,
        test: { name: "contracts", include: ["tests/contracts/**/*.test.ts"] },
      },
      {
        extends: true,
        test: {
          name: "external",
          include: ["tests/external/**/*.test.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
});
```

This is a configuration template, not proof of compatibility. Target tests must verify effective inherited settings. Put global reporters and `watchTriggerPatterns` at the root. Add only projects with real distinct execution needs; do not create five empty projects in a small repository. Ensure default commands select the offline lane, not external smoke. Retain the target's typecheck gate and include new TS tests/config in its documented scope. [S3–S5]

### Commands and data dependencies

A Bun-compatible target can define `test` as `bun --bun vitest --project contracts` and `test:run` as `bun --bun vitest run --project contracts`. `pnpm run test:run` is the AC-ADR-058 entrypoint; `bun run test:run` reaches the same script body. `bun test` is not an alias for the Vitest script.

Use focused aliases for real owning domains. Filesystem-loaded schemas, Markdown and directory listings need explicit watch/change ownership. For V4, use root `watchTriggerPatterns` where appropriate and a separate conservative affected-check map where change selection requires it. Unknown changed inputs broaden to the relevant suite; an import-only `--changed` result must not silently exclude required repository rules. Add/delete/rename and empty-domain scenarios need tests. Stable discovered test-file identities can contain deterministically enumerated per-file assertions; prohibit silent omissions, not useful data-driven tests. [S4]

### Parallel execution and reports

The reference large-suite experiment is four file shards; production N is recorded in the target's profile. Bound `maxWorkers` per process and aggregate concurrency across local shards, monorepo tasks and CI jobs. Account for Vite servers, memory and subprocess cost rather than allocating all host cores independently to every shard. [S6]

Shard command shape, with arguments passed directly through the package script:

```bash
pnpm run test:run --shard=1/4 --reporter=blob --outputFile=reports/vitest/blobs/shard-1.json
```

Keep incoming blobs in a dedicated directory and merged JUnit/JSON elsewhere. Before merge, verify envelopes and predecessor states as specified by ADR-061; use framework-native report parsing rather than inventing a stable schema for Vitest internals. A small tested reporter/integration adapter may emit inventory and identity metadata, but must not become a second test runner. Attachments are separate artifacts when used. [S7]

```bash
pnpm run test:run --merge-reports=reports/vitest/blobs --reporter=default --reporter=junit --outputFile.junit=reports/vitest/merged/junit.xml
```

Test these argument combinations against the selected V4 patch before publishing them as executable target guidance. Use unique namespaces for run, attempt, subject, project and shard. Diagnostic aggregation should run after failures where possible; cancellations may prevent it, but never establish a successful required check. Keep existing required-check context and release receipts intact. A simple `if: always()` is not itself proof of completeness. [S8, S9]

### Cache safety and economics

V4 `experimental.fsModuleCache` is a filesystem transform cache, not a test-result cache; its custom path is separate from Vite's general cache directory. Plugin transforms may depend on inputs not captured in the default key. Local correctness needs complete input identity, an appropriate plugin key generator or selective opt-out; a remote CI cache key alone does not fix local stale transforms. [S1]

Separate dependency, transform, build-artifact and result-evidence caches. Keep generated output outside release/smoke source inventories. Use project/shard/config/runtime-qualified transform paths when processes must not share mutable entries. Remote persistence is optional after measuring total overhead.

Cache keys cover OS/architecture, relevant runtime/framework/plugin versions, lockfile, configuration and transform inputs. Use content/config identity for reuse, with a content-relevant save suffix when the CI cache service is immutable; do not accidentally make every compatible run a permanent cold cache. Never restore untrusted pull-request transformed code into privileged release execution. No secrets or authenticated state in caches. Separate trust namespaces and disable reuse across unsafe boundaries. [S9]

Recovery may discard only the owned cache and rerun once without it, recording the event. Real source errors and persistent failures remain failures. Do not implement endless retries that turn intermittent correctness faults into apparent success.

## 6. Architecture Compass integration contract

### Provider lifecycle

The companion contains reviewable proposed text, not installed provider files. Current validation allows Accepted/Superseded statuses and expects 58 identities. Do not weaken that validator to ship Proposed drafts. After approval, add the twelve accepted variants atomically, update the expected inventory to 62 if IDs remain available, and preserve all existing decision hashes. A source implementation PR must recheck current inventory and local governance first. [R4]

This plan requires new provider decisions, not automatic adoption of all four in `agent-skills`. Use the repository's next free local ADR identity only if the owning integration decision needs one; do not reuse old assumed ADR-0044. If an accepted local policy conflicts, resolve only the dependent implementation through the native successor/adaptation process.

### Routing and progressive disclosure

Retain the five workflows: `setup`, `audit`, `refactor`, `plan-refactor`, `plan-run-refactor`. No new testing workflow or parallel governance system.

In `setup/recommended`, select 059 for validation ownership work, 060 for runtime/state/concurrency risk, 061 when distributed proof is needed, and 062 when transform caching is used or being evaluated. Reuse 018/025/049 and 058 as applicable. Small/non-JS targets can adapt to their native framework, defer sharding or reject a JS-specific profile with reasons. Do not expand the evidence-empty default foundation automatically.

In `setup/complete`, evaluate every accepted adoptable candidate with `adopt`, `adapt`, `defer` or `reject`. Mapping must preserve intent and list material deviations; configuration presence is not achieved outcome. An existing equivalent local ADR is mapped, not duplicated.

In `audit`, compare local evidence against adopted outcomes and report met/unmet/unmeasured/waived/not-applicable measurement states without writes. These are metric states, not replacements for Architecture Compass's existing execution or presentation statuses. Refactor routes use already approved scope and governing local decisions.

### Intended later file changes

- `skills/engineering-workflows/architecture-compass/references/`: add the twelve promoted variants; update `adr-catalog.md` concern routing and category rows.
- The same skill's `assets/`: add a derived `testing-outcome-receipt-template.md` and optional V4 profile asset only when it avoids duplicated guidance; reference canonical Long text.
- Existing setup/refactor report assets: concise pointer to the target-native measurement receipt, not a second ledger.
- The skill's `SKILL.md`: concise testing routing pointer only if needed; preserve workflow semantics and progressive disclosure.
- `scripts/validation/architecture-compass/validate.mjs`, `decision-lock.tsv`, `decision-lineage.json`: inventory/categories, locked decisions and honest lineage disposition. Add each new independently originated record with `disposition: "independent"` and `relations: []`; do not invent derivation from an unrelated local ADR.
- Existing Architecture Compass validator regression harness and `skill-evals/architecture-compass/`: add the scenarios below, update live expected inventories and real evidence receipts; never rewrite historical captured results to make them current.
- `scripts/repo/smoke-install.mjs` and owning payload/inventory expectations: complete accepted library is installed; fixtures, private provenance and provider-only evaluation data do not leak.
- Skill metadata, generated plugin projection and release inputs: follow current source ownership, `pnpm run sync:agent-plugin`, and the generated release/change-impact workflow. No hand-editing generated plugin copies or historical release metadata.

### Required evaluation scenarios

1. Tiny TS repo chooses a framework-owned suite with one shard; no empty projects or claimed speedup.
2. Large TS monorepo compares 1/2/4 shards including worker and CI cost, then selects an evidenced configuration.
3. Bun product with supported Vitest harness verifies actual runtime identities and product behavior.
4. Specific Bun incompatibility selects a documented Node fallback without weakening AC-ADR-058 or overclaiming broader incompatibility.
5. Python/Go or framework-owned tests adapt the outcome contract without installing Bun/Vitest by default.
6. Accepted conflicting local ADR remains authoritative; only the dependent change stops.
7. Existing schema/public validator remains reusable; its standalone repository orchestration disappears rather than its production input checks.
8. Markdown/schema add/delete/rename triggers the owning checks; an empty domain cannot quietly pass.
9. Isolation leak, failed cleanup, child timeout and unexpected external access produce attributable failures.
10. Foreign SHA/config, duplicate partition, missing file, skipped/cancelled required job and absent report all prevent green aggregation.
11. Cache warm/cleared/disabled and plugin-input mutation agree on correctness; corrupt/untrusted cache recovery cannot suppress a real failure.
12. Missing baseline, missing denominator, expired waiver or invented p95 is reported as unmeasured/unmet, not achieved.
13. Shared-reference change loads only relevant Short/Long/Guide documents; setup does not adopt internal ADRs or force all four candidates.
14. Promotion updates all live 58-record expectations consistently while preserving accepted history and install byte identity.

Each scenario defines input, expected selection/decision, expected refusal/failure where relevant, and evidence stage. Evaluation data stays outside the installable skill payload.

## 7. Delivery plan, validation and rollback

| Phase | Deliverable | Exit evidence |
| --- | --- | --- |
| A — This specification PR | Evaluation, proposed four-ADR text, measurable adoption contract, integration tasks | Source review, artifact consistency and scoped diff; no runtime claim. |
| B — Maintainer decision review | Accept/revise four canonical Longs; allocate IDs; resolve local-policy dependencies | Explicit decision approval; unchanged existing accepted decisions. |
| C — Provider integration | Twelve variants, catalog/assets, validator/lineage changes and eval scenarios | Focused governance/library checks, negative cases, type/config validation for any executable examples. |
| D — Representative target pilots | Small TS, large TS, runtime fallback and non-JS/native-framework adoption examples | Actual target receipts; command/runtime/cache/shard evidence; no fabricated results. |
| E — Promotion and maintenance | Generated projection/install proof and current release process | Owned hosted/install evidence; review dates and triggers for changing APIs/budgets. |

Current candidate commands for the later integration slice, confirmed from baseline package scripts:

```bash
pnpm run validate:adrs
pnpm run validate:architecture-compass
pnpm run validate:ownership
pnpm run validate:runtime-matrix
pnpm run validate:skills
pnpm run validate:projections
pnpm run format:check
pnpm run lint
```

Select these only when their owning boundary changes; follow the local ADR-0041 mapping. `pnpm run sync:agent-plugin` is a separate authorized generator, not a read-only check. Run smoke/install, site, hosted and release-specific gates when those obligations change. Do not invent an already existing Vitest command in this repository.

For this docs-only PR, review links, variant metadata parity, metric definitions, prospective ID allocation, protected scopes and diff. Full runtime/hosted/pilot proof is a later stage, not something this plan claims.

Before merging provider implementation, failures of history locking, routing, portability, non-sensitive payload boundaries or required evidence stop promotion. Revert the unmerged implementation normally; after publication use a forward patch or governed successor, not rewritten accepted decisions or moved tags. A target can reduce shard count or disable a bad cache without losing framework validation. Revert a target execution-path cutover together with its commands and checks, not as disconnected deletions.

## 8. Acceptance and completion

- [ ] Four one-decision ADRs retain measurable intent in canonical Long, faithfully abstracted in Short and operationalized in Guide.
- [ ] Existing 018/025/049/058 ownership and accepted local precedence remain intact; runtime conflict is explicit and resolved through evidence.
- [ ] Target-native mappings record scope, problem, baseline, units, denominators, thresholds, owner, observations, evidence stage and revisit conditions.
- [ ] Adoption state is separate from implementation completion and achieved outcome; unmeasured never means passed.
- [ ] Four shards and `fsModuleCache` are documented profile candidates, not universal requirements or claimed performance results.
- [ ] JS/TS, small-repo, monorepo and non-JS/framework-owned adoption routes are specified without compulsory tool churn.
- [ ] Watch/changed-file input coverage, typecheck ownership, real-runtime proof and effective project inheritance have verification scenarios.
- [ ] Partition identity, expected inventory, outcomes and predecessor states are checked before a successful aggregate; attachments remain available when required.
- [ ] Cache invalidation covers local plugin inputs as well as remote keys; trust boundaries and safe clear/disable paths are defined.
- [ ] Existing validation semantics, warnings and production guards survive; no custom runner or misleading one-wrapper-per-old-script migration remains.
- [ ] Provider promotion updates all live catalog/lock/lineage/eval/install expectations without rewriting historical evidence.
- [ ] No repository-wide migration, new automatic workflow, unapproved ADR acceptance, target adoption or release is bundled into the specification PR.

Planning completion means these artifacts are persisted in a reviewable PR. Provider integration and measurable target outcomes remain future, separately evidenced stages.

## 9. Source register and evidence limits

Repository sources refer to `baseline_ref`; resolve their paths in that revision. The source register is public contract material, not private comparison provenance.

- R1: `skills/engineering-workflows/architecture-compass/references/ac-adr-018-validate-behavior-at-the-owning-boundary-and-promote-enforcement-gradually.long.md`.
- R2: `skills/engineering-workflows/architecture-compass/references/ac-adr-025-set-measurable-performance-budgets-and-optimize-from-evidence.long.md`.
- R3: `skills/engineering-workflows/architecture-compass/references/ac-adr-058-use-pnpm-for-package-management-and-bun-for-execution.long.md` and `.guide.md`.
- R4: `scripts/validation/architecture-compass/validate.mjs`, the skill `SKILL.md` and `references/adr-catalog.md`.
- R5: `AGENTS.md`, `docs/specs.md`, `docs/specs/README.md`, `package.json`, the bundled `codex-spec-interviewer/SKILL.md`, and AC-ADR-048 Guide.
- S1: [Vitest V4 experimental configuration](https://v4.vitest.dev/config/experimental).
- S2: [Bun runtime and shebang behavior](https://bun.sh/docs/runtime).
- S3: [Vitest V4 projects and inheritance](https://v4.vitest.dev/guide/projects).
- S4: [Vitest V4 watch-trigger patterns](https://v4.vitest.dev/config/watchtriggerpatterns).
- S5: [Vitest V4 testing types](https://v4.vitest.dev/guide/testing-types).
- S6: [Vitest V4 performance and file sharding](https://v4.vitest.dev/guide/improving-performance).
- S7: [Vitest V4 reporters, blobs and attachments](https://v4.vitest.dev/guide/reporters).
- S8: [Vitest V4 CLI](https://v4.vitest.dev/guide/cli).
- S9: [GitHub cache reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching) and [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).

External mechanics were inspected on 2026-09-13. Examples are design templates, not runtime-tested fixtures. No benchmark, cache correctness, hosted CI, installation or product-runtime outcome is claimed from document review. Native host Plan activation is not asserted or manipulated; the authorized mutation is the isolated GitHub documentation branch and PR, not a user checkout or feature implementation.

## 10. Bounded implementation handoff

Implement only the approved Architecture Compass provider integration from this specification and its companion. Read current repository instructions and relevant accepted Long ADRs; recheck HEAD, IDs, runtime policy, release process and protected paths. Obtain acceptance of the four proposed provider decisions before installing them as live Accepted records. Preserve existing accepted history and the five workflows. Add faithful triplets, routing, derived receipt guidance, integrity checks and the specified evaluation cases; regenerate plugin projections only through their owner. Demonstrate focused source/local/hosted/install stages separately. Do not migrate this repository's validation framework or other target repositories without a separate approved specification. Stop the dependent slice on conflicts or missing proof, and report exactly what was and was not executed.
