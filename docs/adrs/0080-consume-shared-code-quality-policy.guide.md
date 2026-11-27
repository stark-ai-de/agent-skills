# ADR-0080: Consume shared code-quality policy

ID: ADR-0080
Title: Consume shared code-quality policy
Status: Accepted
Date: 2026-11-27
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: code-quality, ultracite, oxc, baseline, compatibility
Applies when: Changing repository lint, format, quality migration or the shared provider contract.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0036
Superseded by: None
Guide verified: 2026-11-27
Gist: Consume pinned shared quality policy with preserved correctness, explicit compatibility and non-increasing migration allowances.

Variants: [Short](0080-consume-shared-code-quality-policy.short.md) · [Long, canonical](0080-consume-shared-code-quality-policy.long.md) · **Guide**

## How to apply

This guide is non-normative. [Long](0080-consume-shared-code-quality-policy.long.md) is the authoritative local decision.

### Provider mapping and preserved decisions

| Provider                | Local disposition and owner                                                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-ADR-069              | Adapt through ADR-0080 for shared quality; ADR-0035 owns the compiler lane and ADR-0054/0055 retain runtime and pnpm ownership.                                                                    |
| AC-ADR-070              | Defer the new-public-repository profile because this is an established repository; revisit when establishing a new public skill repository. Shared quality adoption does not require that profile. |
| AC-ADR-018 / AC-ADR-049 | Preserve owning-boundary, staged enforcement and exact evidence requirements through existing local validation governance, including ADR-0041.                                                     |
| AC-ADR-063              | Preserve applicable Tailwind design-system enforcement; shared lint does not replace its independent framework coverage.                                                                           |

Repository maintainers own quality-policy updates and migration cleanup. ADR-0036 is superseded; its compatibility and no-coverage-loss safeguards continue here. Historical setup receipts remain historical.

### Exact package and tool versions

Consume `@servrox/code-quality@git+https://github.com/servrox/code-quality.git#16aff8c001f380feb9edf9624756fd57e01d9b6e` with `ultracite@8.2.1`, `oxlint@1.93.0`, `oxfmt@0.78.0`. Add `oxlint-tsgolint@7.0.2007` only for a separately qualified type-aware scope; this mixed-source repository currently retains its existing compiler checks without claiming repository-wide type-aware coverage. The reviewed source commit includes the exported-arrow function-budget fix qualified by the real consumer fixtures. Commit the resolved lockfile and use `pnpm install --frozen-lockfile` in CI. The public Git source needs no registry token.

Keep repository ownership at pnpm `11.24.0`, Bun `1.4.0` and Node `24.18.0` minimums unless their own accepted runtime/toolchain decision changes. The package's Node `>=24.15.0` requirement fits the existing Node floor; its development pnpm pin does not govern this consumer. Do not change application runtime selection from a lint dependency's engine field.

### Scope and compatibility record

Inventory all repository-maintained JavaScript/TypeScript boundaries in the consumer configuration. Keep generated portable projections, pinned vendor bytes, build outputs and intentionally invalid fixtures classified by their real owner. Exclusions must not become blanket exemptions for maintained skills, packages or tests. Preserve existing native correctness coverage while qualifying additional shared scope. Unsupported framework syntax or type-aware coverage remains a named compatibility gap, never an inferred pass.

Include the maintained `docs/listing/openai/review-video` subtree even though its authoring workspace is separate from production. Apply the shared React preset only to its `src/` tree, retain the core plugins and shared budgets there, and keep its recording server and Remotion configuration in the Node scope. The real CLI fixtures prove both scope inclusion and that React rules do not leak into the Astro site.

The formatter imports the shared `/oxfmt` policy and preserves three exact compatibility overrides:

| Override                | Reason and compensating proof                                                                                  | Owner and revisit trigger                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `trailingComma: "all"`  | Preserve current source formatting; the real format check remains blocking.                                    | Repository maintainers; revisit with a separately reviewed formatter migration.      |
| `sortImports: false`    | Preserve import order and byte-sensitive accepted source; lint and behavior checks retain import correctness.  | Repository maintainers; revisit after side-effect and generated-input qualification. |
| `proseWrap: "preserve"` | Preserve accepted ADR Decision text, source locks and authored prose; ADR/lineage validators retain integrity. | Repository maintainers; revisit only with explicit text/format compatibility proof.  |

These are consumer compatibility exceptions; the shared preset remains imported. Other relaxations require a precise rule/path/reason/authority/owner/removal record. Native compiler, actionlint, framework and behavior checks retain their existing owners.

### Migration commands and honest completion

- `pnpm run lint` preserves the repository's passing native correctness gate.
- `pnpm run quality:check` executes the full shared core, strict, modularity and anti-slop policy and compares validated findings with reviewed non-increasing allowances.
- `pnpm run validate:quality` owns the quality configuration/report contract and quality regression proof in required validation.
- `pnpm run quality:baseline:prune` is an explicit mutating maintenance command that can only preserve or reduce existing allowances. Review and commit its output to make improvements permanent.
- Baseline creation or expansion requires an explicit reviewed migration operation; CI does not update allowances.

The initial baseline records measured legacy debt and is not a clean-code claim. New groups/counts, increased numeric metrics, malformed or missing reports, and process failures must fail through the real wrapper. Fix uncountable module/export syntax or record a scoped entrypoint exception. Revisit the migration on each quality-package update and each change to scope or baseline ownership; complete cleanup or retain only explicit approved exceptions. The repository's current implementation and candidate-bound receipts supply measured counts rather than embedding stale numbers in this Guide.

## Verification

Run the real native lint, shared policy and formatter gates; prove rejection with a meaningful source violation, a baseline regression and a tool/report failure. Verify clean frozen installation and imports from the exact Git package, not a local checkout or undeclared dependency. Run `validate:adrs`, `validate:architecture-compass`, runtime-matrix, ownership and projection checks for their changed contracts, and follow ADR-0041 for mandatory aggregate obligations. Record hosted results separately from local observations.

## Official sources

- [Reviewed shared package](https://github.com/servrox/code-quality/blob/16aff8c001f380feb9edf9624756fd57e01d9b6e/README.md)
- [Reviewed exports and peer versions](https://github.com/servrox/code-quality/blob/16aff8c001f380feb9edf9624756fd57e01d9b6e/package.json)

## Revisit

Requalify source coverage, baseline ownership and exceptions when the package pin, toolchain, configuration or command wrapper changes. Change durable obligations through a reciprocal successor, preserving accepted Decision text.
