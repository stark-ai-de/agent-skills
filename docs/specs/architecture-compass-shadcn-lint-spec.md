---
title: "Architecture Compass shadcn lint adoption"
slug: "architecture-compass-shadcn-lint"
artifact_path: "docs/specs/architecture-compass-shadcn-lint-spec.md"
mode: "standard"
status: "accepted"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-09-16"
updated: "2026-09-16"
source_request: "Publish a reusable Architecture Compass ADR for shadcn lint, with a spec first, all rules enabled by default, practical adoption examples, uncommitted review/fix, and PR delivery."
---

# Architecture Compass shadcn lint adoption

## Goal

Give Architecture Compass consumers an adoptable design-system lint decision
with comprehensive defaults and practical, evidence-backed integration guidance.
The policy defaults to all supported rules of the reviewed plugin version;
repository-specific configuration refines that baseline instead of starting
from an arbitrary subset.

## Scope and non-goals

- Publish AC-ADR-063 as linked Short, canonical Long, and non-normative Guide.
- Integrate catalog discovery, setup mappings, integrity inventories, behavioral
  evaluations, component versions, and generated plugin projections.
- Include complete ESLint and Oxlint examples and a generic shared-UI monorepo
  example, based on official upstream setup, adoption, and design-system docs.
- Do not install shadcn lint into this catalog, migrate its website, rewrite
  accepted ADRs, add a public workflow, or automatically install target tooling.
- Do not merge a PR, create a root release, publish archives, or deploy.

## Repository context

Canonical provider material lives under
`skills/engineering-workflows/architecture-compass/`. Plugin copies are generated.
Existing repository ADRs 0029, 0030, 0032, 0039, 0041, 0043, and 0050 govern
isolation, public material, ADR shape, exposed contracts, validation, projections,
and component versioning. Provider AC-ADR-013, 018, 024, 049, and 058 preserve
tooling ownership, staged enforcement, accessibility proof, validation scope,
and package-manager/runtime ownership.

The implementation is based on the measurable-testing ADR addition (059–062).
AC-ADR-063 yields 63 public ADRs, 189 public variants, and 44 eligible setup rows.
Refresh the PR head and inventories before editing; do not overwrite another
change that has allocated the same ID.

## Requirements and acceptance criteria

1. WHEN a target uses Tailwind v4, Architecture Compass SHALL evaluate supported
   syntax, existing lint ownership, component/theme discovery, and compatibility.
   shadcn/ui itself is optional. Unsupported targets receive an owned deferral,
   rationale, and revisit trigger, not a false adoption pass.
2. An adopted compatible setup SHALL enable every supported rule of the reviewed
   plugin version by default. The initial Guide SHALL name all six current rules:
   `no-restyle`, `no-raw-colors`, `no-arbitrary-values`, `no-inline-styles`,
   `no-unknown-classes`, and `require-static-classes`. Disabled or deferred rules
   require a bounded reason, scope, owner, and revisit/removal condition.
3. The default qualified profile SHALL use errors for consuming UI code, layout
   allowances for restyling/arbitrary-value checks, and concrete component
   contracts. Component definitions may use the upstream three-rule override;
   color, inline-style, and unknown-class checks remain enabled there.
4. Legacy adoption MAY use warnings with a measured baseline and owned promotion
   criteria. Verify actual command/wrapper behavior: `--deny-warnings` and warning
   caps can make warnings blocking. Do not weaken unrelated lint gates.
5. Preserve existing framework parsers, scripts, ignores, compiler, package
   manager, and runtime. Register with one owning linter. An engines.node floor
   alone does not justify removing an accepted Bun execution default.
6. The Guide SHALL demonstrate native component discovery, explicit custom
   discovery where necessary, shared UI exports, nearest-app theme ownership,
   and direct stylesheet dependencies under isolated package-manager layouts.
   It SHALL not prescribe dependency hoisting as a discovery workaround.
7. Use existing variants/tokens and narrow contracts before adding exceptions.
   Cover CardTitle typography with font restrictions, container spacing, Avatar
   sizing, and diagnostic notes pointing to actual local policy.
8. Each enforced rule SHALL have meaningful positive/negative adoption fixtures;
   cover consumers and component definitions separately. A zero exit alone,
   registration-only check, or printed config is insufficient. Missing theme
   discovery, unknown-class fallback, and stale caches limit evidence explicitly.
9. Document the plugin's static scope, lack of standalone CLI/shared preset,
   current editor-suggestion versus autofix distinction, and separate visual,
   accessibility, compiler, and runtime proof obligations.
10. Catalog routing, hashes, lineage, setup counts, eval inventories, installation
    counts, metadata, and generated copies SHALL agree. Existing accepted
    decision text and root release metadata remain unchanged.

## Architectural decisions

- ADR required: yes, as the requested reusable provider decision.
- ADR: AC-ADR-063, Enforce Tailwind Design-System Contracts with shadcn lint.
- Destination: canonical skill references, stem
  `ac-adr-063-enforce-tailwind-design-system-contracts-with-shadcn-lint`.
- Status: Accepted by maintainer confirmation and subsequent all-rules correction.
- Scope: target-repository; Category: stack-tooling; Adoptable: true.
- Supersedes: none; independent lineage. Complementary ADR links are not derivation.
- No additional repository-local decision or compiler migration is required.

## Design and file plan

Keep durable obligations in Long, faithful abstraction in Short, and current
versions, commands, links, configuration, migration, and troubleshooting in Guide.
Use repository-neutral names such as `@workspace/ui`. Preserve the public/private
boundary: publish no local checkout paths or private comparison provenance.

Update the canonical skill references/catalog/setup asset, skill metadata,
Architecture Compass validator/integrity records/evals, install smoke inventory,
spec index, plugin source descriptor and current listing/version surfaces.
Generate the submission worksheet and portable projection with repository scripts.
Bump Architecture Compass 0.7.0 to 0.8.0 and plugin 1.3.0 to 1.4.0. Do not change
root package version, root changelog, or Release Please manifest.

## Execution and review

1. Persist this verified spec in the assigned external worktree before implementation.
2. Recheck the accepted scope and base, then add the triplet and integration.
   Stage new source inputs only when the generator requires tracked inventory;
   all changes remain uncommitted until the review/fix loop passes.
3. Generate derived output and run checks owned by changed contracts.
4. Independently review standards and specification coverage on the complete
   uncommitted diff, including untracked files. Fix findings and repeat affected
   checks/review until actionable findings are resolved.
5. Stage only task changes, commit, push, and open a PR stacked on the current
   measurable-testing ADR branch. If it merges first, rebase onto current main,
   recheck the integrated candidate, and target main.
6. Observe hosted checks for the final head; fix task-caused failures and keep
   local, CI, installation, and runtime evidence distinct.

## Source challenge

Official upstream source was inspected at commit
`53de86f0e7dcc341a9cb45c383a9f2c454d1e958` (package 0.1.0).
[Setup](https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/SETUP.md)
only registers the plugin; rule activation is a separate policy change.
[Adoption](https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/docs/adoption.md)
provides staged enforcement and component overrides.
[Design-system examples](https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/docs/design-systems.md)
provide variants, contracts, and diagnostic guidance.

The maintainer explicitly selected all rules as the default target rather than
the upstream incremental one-rule starting point. Preserve upstream migration
mechanics without weakening that final baseline. The source challenge also
identified theme fallback, dependent-file cache invalidation, plugin-API maturity,
and parser/runtime compatibility as evidence boundaries. These source reads and
catalog evaluations are not a fresh runtime qualification of a consuming repo.

## Validation

```sh
pnpm run validate:architecture-compass
pnpm run validate:skills
pnpm run validate:projections
pnpm run validate:plugin-evals
pnpm run validate:openai
pnpm run validate:release-descriptor
pnpm run lint
pnpm run format:check
git diff --check
```

Run `pnpm run release:intent -- --base-ref <verified-feature-base>` and the existing
Architecture Compass contract tests when affected. Add tests only for new
validator behavior. The feature has no root release intent; a local aggregate
is not required solely to finalize it. Hosted Validate is a separate PR gate.

Behavioral evaluations cover full-rule defaults, single-app and monorepo setup,
ESLint/Oxlint ownership, compatibility deferral, narrow component overrides,
nonblocking migration, discovery/cache failures, and evidence limits. Evaluation
case structure validation is not an executed agent-behavior or plugin-runtime pass.

## User verification, risks, and completion

The maintainer approved public persistence, the ADR, scoped staging/commit/push,
stacking on PR #84, and the review/fix-to-PR delivery. The follow-up explicitly
requires all rules by default and practical adoption examples. Plan mode has ended.
No unresolved product decision remains.

Risk: moderate, because this changes a public adoptable policy and generated
package contents. Use checkpointed validation and one writer in an assigned
worktree. Roll back this additive feature through a reviewed revert; do not
rewrite older accepted decisions. Recheck upstream compatibility when consuming
repositories adopt or upgrade the tool.

Done when the artifacts and projections agree, required checks pass, independent
review findings are resolved, and a PR is open with accurate final-head evidence.
No runtime installation, merger, release, or deployment is implied.

## Codex execution handoff

Implement this accepted spec after verifying its base, ADR allocation, and assigned
worktree. Preserve the all-rules default, upstream-informed configuration examples,
existing tool ownership, and public/private boundary. Complete the uncommitted
standards/spec review-and-fix loop before scoped staging, commit, push, and PR
creation. Report focused local checks and hosted results separately.
