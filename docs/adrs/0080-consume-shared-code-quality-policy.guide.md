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
Guide verified: 2026-11-28
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

During authorized setup and dependency updates, resolve the public npm `latest` tag for `@servrox/code-quality`, inspect that exact release's metadata, source and packed exports, and qualify the newest stable release. `latest` is a movable publisher tag, not proof of stability or compatibility; reject prereleases and deprecated releases. Record the registry check time and selected version. Save an exact `x.y.z` dependency, its exact required peers and the generated lockfile integrity. Do not persist `latest`, a range, a Git URL or a tarball override. Ordinary installs and CI use `pnpm install --frozen-lockfile`; they do not query npm to decide whether unchanged source passes.

The reviewed selection on 2026-11-28 is `@servrox/code-quality@0.2.0`, published at `2026-11-28T00:00:49Z`, with `ultracite@8.2.1`, `oxlint@1.93.0` and `oxfmt@0.78.0`. This is a dated qualification snapshot, not a permanent version ceiling. Follow the reusable [registry discovery and installation sequence](../../skills/engineering-workflows/architecture-compass/references/ac-adr-069-require-shared-code-quality-with-explicit-toolchain-ownership.guide.md#install-the-reviewed-package) for the next update. The published tarball's SHA-512 matches its registry integrity, and the existing presets, formatter and baseline APIs are byte-identical to the previously reviewed Git pin. Preserve the historical initial-capture record and migration allowances. Add `oxlint-tsgolint@7.0.2007` only for separately qualified type-aware scope; existing compiler checks remain authoritative. This public npm package needs no registry token.

If the newest stable release cannot satisfy runtime, peer, behavior or supply-chain requirements, retain the qualified installation and record the candidate, blocker, owner and revisit condition. Do not silently downgrade the target to an older candidate or claim the update is complete. Re-evaluate during the next authorized dependency update; a provider release does not itself authorize rewriting every consumer.

The repository keeps `minimumReleaseAge: 1440`, `minimumReleaseAgeStrict: true`, `trustPolicy: no-downgrade` and its lifecycle guards. The maintainer-requested npm adoption uses one reviewed, version-specific age exception: `@servrox/code-quality@0.2.0`. Repository maintainers own it; justification is the verified tarball identity, inspected publication provenance and byte-identical already-consumed policy. Remove the exception once this release is at least 1440 minutes old and a frozen install without it passes. It grants no exception to later releases or other dependencies. Provenance metadata was inspected; this receipt does not claim independent cryptographic verification of its signature chain.

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

Follow the [daily, upgrade and file-move workflow](../../tools/quality/README.md) for command effects and migration limits.

- `pnpm run lint` preserves the repository's passing native correctness gate.
- `pnpm run quality:report` shows debt by rule/file; pass explicit files for original messages and locations. Use `pnpm --silent run quality:report -- --json` for machine-readable evidence.
- `pnpm run quality:fix -- <files>` applies deliberate shared-policy fixes to explicit maintained files. It does not change allowances; saving in the editor does not trigger shared lint fixes.
- `pnpm run quality:check` executes the full shared core, strict, modularity and anti-slop policy and compares validated findings with reviewed non-increasing allowances.
- `pnpm run validate:quality` owns the quality configuration/report contract and quality regression proof in required validation.
- `pnpm run quality:baseline:prune` is an explicit mutating maintenance command that can only preserve or reduce existing allowances. Review and commit its output to make improvements permanent.
- Baseline creation or expansion requires an explicit reviewed migration operation; CI does not update allowances.

The initial baseline records measured legacy debt and is not a clean-code claim. New groups/counts, increased numeric metrics, malformed or missing reports, and process failures must fail through the real wrapper. Fix uncountable module/export syntax or record a scoped entrypoint exception. Revisit the migration on each quality-package update and each change to scope or baseline ownership; complete cleanup or retain only explicit approved exceptions. The repository's current implementation and candidate-bound receipts supply measured counts rather than embedding stale numbers in this Guide.

## Verification

Run the real native lint, shared policy and formatter gates; prove rejection with a meaningful source violation, a baseline regression and a tool/report failure. Verify clean frozen installation and imports from the exact published npm package, not a local checkout or undeclared dependency. Run `validate:adrs`, `validate:architecture-compass`, runtime-matrix, ownership and projection checks for their changed contracts, and follow ADR-0041 for mandatory aggregate obligations. Record hosted results separately from local observations.

## Official sources

- [Published npm release and metadata](https://registry.npmjs.org/@servrox%2fcode-quality/0.2.0)
- [Reviewed release source](https://github.com/servrox/code-quality/tree/651582f77fecf1904bc84787b6d8a9d78394162e)
- [npm distribution-tag semantics](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/)
- [pnpm version-scoped release-age exceptions](https://pnpm.io/blog/releases/10.19)

## Revisit

Requalify source coverage, baseline ownership and exceptions when the package pin, toolchain, configuration or command wrapper changes. Change durable obligations through a reciprocal successor, preserving accepted Decision text.
