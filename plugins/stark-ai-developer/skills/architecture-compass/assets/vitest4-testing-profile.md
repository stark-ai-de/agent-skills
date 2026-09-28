# Vitest 4 testing profile

> Derived, non-normative asset. The applicable canonical Long ADRs prevail if this template conflicts or drifts.

Owners: [AC-ADR-059](../references/ac-adr-059-own-repository-validation-through-discoverable-framework-tests.long.md), [AC-ADR-060](../references/ac-adr-060-isolate-test-execution-by-effects-and-runtime-contracts.long.md), [AC-ADR-061](../references/ac-adr-061-shard-tests-as-complete-fail-closed-evidence-sets.long.md), [AC-ADR-062](../references/ac-adr-062-cache-test-transforms-without-reusing-correctness.long.md). Last source review: 2026-09-14. Qualification uses Vitest 4.1.11; rerun the target runtime/configuration probes on patch changes. Transform caching is opt-in until parity and economics qualify it.

This is a dated, non-normative profile for the requested stack. Use the exact compatible versions selected in the target lockfile and runtime matrix; do not copy old Bun/Vitest patch pins or freeze “4” into durable architectural intent. The V4 APIs below are sourced from V4 documentation, not mixed with later-major configuration. [S1–S8]

### Runtime and dependency ownership

On a target adopting AC-ADR-058, pnpm owns persistent installs and its lockfile; Bun automatic installation is disabled. Script bodies select the intended runtime consistently even when callers use `pnpm run` or `bun run`.

The initial candidate is `bun --bun vitest ...`. Representative tests must cover worker startup, subprocess behavior, ESM/CJS/module transforms, required mocks, shutdown, coverage when used, sharding and reporting. Record actual parent/worker and tested application runtimes. Required Node/browser/Bun product behavior gets an appropriate real-runtime boundary test; running a harness under Node cannot establish Bun-only behavior or vice versa.

When a specific configuration is unsupported or materially worse under Bun, retain the narrow supported fallback with evidence, selected command and revisit trigger. Do not reject Bun generally from the optional native-loader limitation, and do not silently run an unsupported harness to obey a speed preference. [AC-ADR-058](../references/ac-adr-058-use-pnpm-for-package-management-and-bun-for-execution.long.md); [S1, S2]

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
      fsModuleCache: process.env.TEST_TRANSFORM_CACHE === "on",
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

The pinned 4.1.11 watcher routes add/change events through `watchTriggerPatterns`, but its unlink handler does not apply those patterns. Deletion of a filesystem-read input therefore needs an explicit owning fallback. The qualified fixture bridges only matching unlink events through Vitest's public `getModuleSpecifications` and `rerunTestSpecifications`, waits for the current run, and removes the listener on close. Test actual add/delete/rename behavior against the selected patch; do not treat the presence of a watch regex as deletion coverage. Source: [Vitest 4.1.11 watcher](https://github.com/vitest-dev/vitest/blob/v4.1.11/packages/vitest/src/node/watcher.ts).

### Parallel execution and reports

The reference large-suite experiment is four file shards; production N is recorded in the target's profile. Bound `maxWorkers` per process and aggregate concurrency across local shards, monorepo tasks and CI jobs. Account for Vite servers, memory and subprocess cost rather than allocating all host cores independently to every shard. [S6]

Shard command shape, with arguments passed directly through the package script:

```bash
pnpm run test:run --shard=1/4 --reporter=blob --outputFile=reports/vitest/blobs/shard-1.json
```

Keep incoming blobs in a dedicated directory and merged JUnit/JSON elsewhere. Before merge, verify envelopes and predecessor states as specified by AC-ADR-061; use framework-native report parsing rather than inventing a stable schema for Vitest internals. A small tested reporter/integration adapter may emit inventory and identity metadata, but must not become a second test runner. Attachments are separate artifacts when used. [S7]

```bash
pnpm run test:run --merge-reports=reports/vitest/blobs --reporter=default --reporter=junit --outputFile.junit=reports/vitest/merged/junit.xml
```

Test these argument combinations against the selected V4 patch before publishing them as executable target guidance. Use unique namespaces for run, attempt, subject, project and shard. Diagnostic aggregation should run after failures where possible; cancellations may prevent it, but never establish a successful required check. Keep existing required-check context and release receipts intact. A simple `if: always()` is not itself proof of completeness. [S8, S9]

### Cache safety and economics

V4 `experimental.fsModuleCache` is a filesystem transform cache, not a test-result cache; its custom path is separate from Vite's general cache directory. Plugin transforms may depend on inputs not captured in the default key. Local correctness needs complete input identity, an appropriate plugin key generator or selective opt-out; a remote CI cache key alone does not fix local stale transforms. [S1]

Separate dependency, transform, build-artifact and result-evidence caches. Keep generated output outside release/smoke source inventories. Use project/shard/config/runtime-qualified transform paths when processes must not share mutable entries. Remote persistence is optional after measuring total overhead.

Cache keys cover OS/architecture, relevant runtime/framework/plugin versions, lockfile, configuration and transform inputs. Use content/config identity for reuse, with a content-relevant save suffix when the CI cache service is immutable; do not accidentally make every compatible run a permanent cold cache. Never restore untrusted pull-request transformed code into privileged release execution. No secrets or authenticated state in caches. Separate trust namespaces and disable reuse across unsafe boundaries. [S9]

Recovery may discard only the owned cache and rerun once without it, recording the event. Real source errors and persistent failures remain failures. Do not implement endless retries that turn intermittent correctness faults into apparent success.

## Profile sources

- [S1] [Vitest V4 experimental configuration](https://v4.vitest.dev/config/experimental).
- [S2] [Bun runtime and shebang behavior](https://bun.sh/docs/runtime).
- [S3] [Vitest V4 projects and inheritance](https://v4.vitest.dev/guide/projects).
- [S4] [Vitest V4 watch-trigger patterns](https://v4.vitest.dev/config/watchtriggerpatterns).
- [S5] [Vitest V4 testing types](https://v4.vitest.dev/guide/testing-types).
- [S6] [Vitest V4 performance and file sharding](https://v4.vitest.dev/guide/improving-performance).
- [S7] [Vitest V4 reporters, blobs and attachments](https://v4.vitest.dev/guide/reporters).
- [S8] [Vitest V4 CLI](https://v4.vitest.dev/guide/cli).
- [S9] [GitHub cache reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching) and [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).
