# AC-ADR-069: Require Shared Code Quality with Explicit Toolchain Ownership

ID: AC-ADR-069
Title: Require Shared Code Quality with Explicit Toolchain Ownership
Status: Accepted
Date: 2026-11-27
Owner: stark-ai-de
Scope: target-repository
Category: stack-tooling
Tags: code-quality, ultracite, oxc, compatibility, supply-chain
Applies when: Establishing, auditing, or changing quality enforcement for maintained JavaScript/TypeScript source or its tooling ownership.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: AC-ADR-013
Superseded by: none
Guide verified: 2026-11-27
Gist: Require shared quality presets while retaining explicit consumer ownership, compatibility exceptions and measured migration.

Variants: [Short](ac-adr-069-require-shared-code-quality-with-explicit-toolchain-ownership.short.md) · [Long, canonical](ac-adr-069-require-shared-code-quality-with-explicit-toolchain-ownership.long.md) · **Guide**

## Implementation guide

This guide is non-normative. Read Long for obligations; use this sequence within the selected workflow and existing target authority.

Contents: [Applicability](#applicability-and-local-mapping) · [Installation](#install-the-reviewed-package) · [Configuration](#configure-one-policy-owner) · [Ownership](#shared-policy-and-consumer-extensions) · [Migration](#qualify-compatibility-and-migrate-existing-debt) · [Toolchain](#typescript-package-runtime-and-build-ownership) · [Proof](#proof-and-update-checklist).

### Applicability and local mapping

For `setup`, inspect manifests, maintained source and helpers, compiler/linter configuration, CI and accepted local decisions. Map AC-ADR-069 to the repository's own ADR identity; do not copy the provider ID as a local ID. For `audit`, report the same facts and gaps without installation, generated artifacts, baseline updates, or CI changes. Use the already-authorized refactor route for implementation after governance is settled.

| Target evidence                                                             | Disposition and implementation boundary                                                                                                                        |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pure non-JavaScript/TypeScript repository, including its maintained tooling | Record non-applicability with evidence; retain its native tools and add no JavaScript toolchain solely for this policy.                                        |
| Mixed-language repository                                                   | Adopt/adapt for maintained JavaScript/TypeScript packages, scripts and helpers; retain checks for other languages.                                             |
| Supported JavaScript/TypeScript repository                                  | Adopt/adapt the mandatory shared presets with exact paths, versions, commands and CI ownership.                                                                |
| Accepted conflicting toolchain or unsupported parser/plugin behavior        | Preserve current required checks; record the bounded conflict, successor/adaptation, compatibility evidence and resolution owner before replacing enforcement. |

Governance acceptance is not installed or active enforcement. Record source-inspected, installed, configured, locally exercised and hosted states separately. A missing prerequisite is an unmet obligation with an owner and revisit trigger, not a completed adoption.

### Install the reviewed package

The reviewed public source is [servrox/code-quality at `16aff8c001f380feb9edf9624756fd57e01d9b6e`](https://github.com/servrox/code-quality/tree/16aff8c001f380feb9edf9624756fd57e01d9b6e). The installation below pins this reviewed source commit, including the qualified exported-arrow function-budget fix. The source currently provides package version `0.1.0`, is private/unpublished to npm, and declares `UNLICENSED`; consume its exact Git source without inventing an npm release or changing its license metadata.

```sh
pnpm add -D '@servrox/code-quality@git+https://github.com/servrox/code-quality.git#16aff8c001f380feb9edf9624756fd57e01d9b6e' \
  ultracite@8.2.1 oxlint@1.93.0 oxfmt@0.78.0
```

Run installation only when it is within the user's existing authorization. Commit the manifest and lockfile and verify `pnpm install --frozen-lockfile` in a clean disposable consumer. No GitHub or registry token is required for this public Git source. Require the package's Node `>=24.15.0` compatibility without transferring pnpm ownership or replacing unrelated target runtime decisions. The package's own development pnpm pin does not set the consumer's package-manager version.

Keep the exact peer versions above together. Add `oxlint-tsgolint@7.0.2007` only when enabling a separately qualified type-aware scope. Add `dependency-cruiser@18.9.0` only when using its optional export. Dependency Cruiser needs a supported TypeScript compiler API; a TypeScript 7 consumer can keep a bounded TypeScript `6.0.3` tool-specific compatibility lane, with exact pnpm resolution qualified in that consumer. Package archive integrity changes require a reviewed lockfile update; never disable integrity verification.

### Configure one policy owner

For an illustrative Node-owned JavaScript source tree, `oxlint.config.mjs` can start with:

```js
import antiSlop from "@servrox/code-quality/oxlint/anti-slop";
import core from "@servrox/code-quality/oxlint/core";
import modularity from "@servrox/code-quality/oxlint/modularity";
import strict from "@servrox/code-quality/oxlint/strict";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [core, strict, modularity, antiSlop],
  env: { node: true, browser: false },
  options: { denyWarnings: true, reportUnusedDisableDirectives: "error" },
  ignorePatterns: [...(core.ignorePatterns ?? []), "**/_generated/**"],
});
```

Set `typeAware: true` in the root options for qualified TypeScript scope with its actual compiler configuration and pinned companion tool. Root-only flags, environment globals, source arguments, suppressions and failure behavior belong to the consumer. Do not silently force browser globals into Node code or ignore tests/helpers because they are inconvenient. Use `/oxlint/react` only for React source and `/oxlint/playwright` only for Playwright source. The Playwright export is the limited native Ultracite compatibility preset, not the entire ESLint Playwright plugin.

For Solid, TanStack, Jest, Vitest or Storybook, first inspect the actual framework versions and matching source/test/story paths. The reviewed package does not expose dedicated presets for them. Add reusable presets and their dependencies in `servrox/code-quality` only after proving Oxlint compatibility with real fixtures; then select those exported presets for the relevant consumer paths. Preserve the existing owner for unsupported capabilities through a bounded compatibility exception. Do not invent package export paths, enable every framework globally, or change the test runner merely to configure linting.

For `oxfmt.config.mjs`, import the shared formatting policy and append only reviewed exclusions:

```js
import shared from "@servrox/code-quality/oxfmt";
import { defineConfig } from "oxfmt";

export default defineConfig({
  ...shared,
  ignorePatterns: [...(shared.ignorePatterns ?? []), "pnpm-lock.yaml"],
});
```

The shared formatter selects 100-column width. Qualify it on representative source, Markdown/config, generated fixtures and accepted ADR text before writes. Document any exact compatibility override and its owner; do not replace the shared import with an unrelated local preset. Do not copy the package's plugin code or launch a second ESLint runner to reproduce its diagnostics.

### Shared policy and consumer extensions

| Shared package owns                                                                 | Consumer owns                                                                                       |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Core, strict, modularity and anti-slop preset bodies; compatible tool/peer versions | Exact source/test/helper paths, environment globals, command wrappers and one CI owner              |
| Shared Oxfmt defaults                                                               | Generated/vendor/lockfile exclusions and reviewed formatting compatibility exceptions               |
| React and native Playwright exports                                                 | Evidence that those frameworks exist, matching paths and framework/parser qualification             |
| Syntax-based function/export budgets                                                | Deliberate public entrypoints, cohesion review and scoped syntax exceptions                         |
| `/jscpd` defaults, including the 3% target                                          | Actual scan roots, generated exclusions, measured duplication and project-local migration baseline  |
| `/dependency-cruiser` runtime-cycle defaults                                        | Entrypoints, TypeScript emit semantics, workspace boundaries and project-specific forbidden imports |
| `/baseline` report validation and comparison helpers                                | Baseline storage, orchestration, owner, reviewed updates, cleanup criteria and pruning              |
| No consumer-specific Knip configuration                                             | Knip entrypoints, project files, package ownership, ignores and unused-code evidence                |

These optional analyses are selected from repository evidence; their package exports do not install tools or establish coverage. For dependency graphs, retain external dependency edges with `doNotFollow` when checking boundaries into tooling packages; fully excluding those targets removes the evidence. Exclude erased type-only edges before cycle detection, and use the actual TypeScript configuration. Native type-stripping runtimes normally need `verbatimModuleSyntax: true` to preserve unused value-import edges.

The reviewed modularity defaults are eight top-level functions, five explicit ESM exports or CommonJS object properties, and 300 physical lines per file (500 for test/spec files). They are team policy and syntax-based signals, not proof of cohesion. Change a reusable threshold or fix a missed syntax case upstream with failing/passing fixtures and the package's verification gate. Keep a deliberate package entrypoint exception local and exact, preserving unrelated function/file limits. Adopt the resulting immutable commit and lockfile only after consumer fixtures prove the rule executes and each exception stays bounded.

### Qualify compatibility and migrate existing debt

Before Oxc adoption, inventory current rules, parsers, plugins, processors, resolvers, formatting, inline suppressions, editors and CI exit behavior. Preserve their required coverage. Record an existing/current owner, required capability, evidenced gap, chosen shared policy, exact exception if needed, local ADR impact and focused proof. A technically unsupported file remains covered by its current owner or explicitly unqualified; a green empty scan is not evidence.

For new source, start with the mandatory blocking policy. For an existing repository, retain its passing correctness gate and introduce the full shared presets in a separate invocation of the same owning Oxlint tool when needed. Measure existing diagnostics through the real command and use `/baseline` to allow only approved, countable debt. Store the initial report identity, source revision, package pin, paths/config, owner, cleanup criteria and revisit trigger with the baseline.

`normalizeLint` validates Oxlint JSON; `normalizeKnip` validates Knip 6 JSON. `createBaseline` and `findRegressions` preserve normalized file/rule/message identity and numeric metric ceilings. New diagnostic groups, counts or metrics fail. Malformed, missing or unclassified reports and process failures fail closed. Fix uncountable module/export syntax or define an explicit entrypoint exception. Keep initial/expanded allowances behind a reviewed migration operation; CI must never regenerate them. A prune may only retain or reduce existing allowances, and its checked-in result makes improvements permanent.

Name a migration partial until cleanup/promotion criteria or an approved bounded exception is reached. Do not claim zero findings from a passing baseline gate. Inspect baselines and suppressions during the consumer's package-pin update PR, with tool/config changes invalidating previous evidence.

### TypeScript, package, runtime and build ownership

TypeScript 7 is the primary supported stable compiler lane under `typescript` and `tsc`, instead of the former `@typescript/native-preview`/`tsgo` transition. Keep a TS6 alias only where a named integration still requires it. Record owner, exact command, affected files/packages, divergence fixtures and removal condition. Lint is not compiler proof.

Direct compiler checking requires diagnostic comparison. Compiler-API consumers, language-service plugins, transformers and embedded-language integrations retain the named compatibility lane until support is qualified. VS Code can use the current TypeScript 7 LSP or extension path and its documented fallback; Cursor and VS Code-compatible extensions require direct verification against the workspace compiler or LSP. Remove preview-only editor settings only after all claimed integrations work. Next.js and other frameworks need supported production-build and type-check proof in addition to `tsc`.

For verified pnpm 11 consumers, review `strictDepBuilds: true`, `blockExoticSubdeps: true`, `minimumReleaseAge: 1440`, `minimumReleaseAgeStrict: true`, `trustPolicy: no-downgrade` and narrow `allowBuilds` entries against the target's exact supported version. Keep exceptions package-specific and exercise both approved and unapproved lifecycle behavior in a clean frozen install.

Use the target's `packageManager`, workspace membership and one lockfile. In an adopted Bun runtime, `[install] auto = "disable"` prevents implicit installation; follow AC-ADR-058 and the local runtime evidence rather than changing application execution because lint dependencies use Node. Review exact supported pnpm lifecycle, trust and registry options. Add Turborepo only when its graph/cache value is demonstrated, and verify invalidation for source, toolchain, dependency, platform, configuration and environment inputs. Publication, destructive and security-sensitive tasks retain safe cache boundaries.

### Proof and update checklist

- Inspect the packed/installed exports from a clean consumer and the immutable source pin; verify one frozen lockfile and no implicit runtime installation.
- Run actual lint/format commands over all declared maintained source boundaries, compiler checks, framework/build checks and applicable behavior tests.
- Exercise a real forbidden source example and an allowed example; for migrations also prove new findings, increasing metrics, malformed reports and process failures reject through the wrapper.
- Verify compatibility exceptions, generated/vendor exclusions, entrypoints and framework scopes explicitly.
- Record local and hosted CI evidence separately with exact candidate, commands, source scope, tool/config/lockfile identity and limitations.
- Update the shared package in its own reviewed change, then update each consumer pin/lockfile and prune reviewed baselines in a separate consumer PR. No automatic cross-repository upgrade is implied.

## Decision lineage

- `adapts`: [ADR-0080](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0080-consume-shared-code-quality-policy.long.md).

## Official sources

- [Reviewed shared package and installation contract](https://github.com/servrox/code-quality/blob/16aff8c001f380feb9edf9624756fd57e01d9b6e/README.md)
- [Reviewed package exports and peer versions](https://github.com/servrox/code-quality/blob/16aff8c001f380feb9edf9624756fd57e01d9b6e/package.json)
- [Oxc configuration](https://oxc.rs/docs/guide/usage/linter/config.html)
- [pnpm frozen installs](https://pnpm.io/cli/install)
