# AC-ADR-063: Enforce Tailwind Design-System Contracts with shadcn lint

ID: AC-ADR-063
Title: Enforce Tailwind Design-System Contracts with shadcn lint
Status: Accepted
Date: 2026-09-16
Owner: stark-ai-de
Scope: target-repository
Category: stack-tooling
Tags: tailwind, shadcn, design-system, lint, components, adoption
Applies when: A Tailwind v4 repository adopts or changes mechanical enforcement of design-system usage in supported source files.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-16
Gist: Enable the reviewed shadcn lint rule set by default, adapt upstream examples to real component ownership, and qualify staged enforcement.

Variants: [Short](ac-adr-063-enforce-tailwind-design-system-contracts-with-shadcn-lint.short.md) · **Long, canonical** · [Guide](ac-adr-063-enforce-tailwind-design-system-contracts-with-shadcn-lint.guide.md)

## Context

Reusable UI components can expose a flexible styling API while still requiring
callers to respect token, variant, and ownership boundaries. Prose instructions
alone do not provide repeatable feedback to developers or coding agents.
`@shadcn/lint` makes supported Tailwind design-system usage mechanically
checkable, but registering the plugin is not the same as enabling a policy.
A clean result can also conceal incomplete discovery or stale dependent inputs.

## Decision

A compatible Tailwind v4 repository adopting this decision SHALL integrate
`@shadcn/lint` with its existing owning linter and enable all supported rules of
the reviewed plugin version by default. shadcn/ui is not a prerequisite. The
repository SHALL review the rule inventory during upgrades and explicitly
configure newly qualified rules; an upstream release cannot silently change
accepted policy. Record any disabled or deferred rule with rationale, bounded
files or behavior, owner, authority, and a removal or revisit condition.

### Bind enforcement to the actual design system

Use the upstream adoption and design-system examples as the starting point for
configuration, then adapt them to actual components, theme tokens, import aliases,
source paths, and ownership. Preserve ordinary caller-owned layout while
protecting component-owned appearance. Prefer an existing variant or token;
express legitimate caller flexibility with narrow component contracts rather
than blanket ignores. Review new tokens, variants, contracts, and suppressions
as design decisions. Exempt only the necessary checks within verified component
definition paths; component libraries remain subject to the remaining checks.

### Preserve tooling and operational authority

Select the linter that already owns the relevant source, preserving framework
parsers, unrelated rules, ignores, scripts, compiler, package-manager/lockfile
ownership, and runtime policy. Do not register competing enforcement in two
linters. A toolchain replacement or runtime fallback requires the evidence and
authority established by applicable local decisions. Check installed plugin,
linter, parser, and theme dependencies at the actual owning workspace; do not
rely on undeclared transitive availability.

Architecture Compass evaluates this candidate through its existing setup and
mapping workflow. Provider acceptance or target governance setup alone does not
authorize installation, source rewrites, runtime migration, or CI modification.
Unsupported syntax, unresolved discovery, or incompatible tooling receives an
owned deferral or explicit local adaptation, not a false adoption pass.

### Promote qualified enforcement

The steady-state profile SHALL fail the established lint gate on rule violations
in consuming UI code. A legacy migration MAY begin with report-only diagnostics,
an explicit measured baseline, owner, cleanup/promotion criteria, and revisit
trigger. Verify the actual command and wrappers: warnings may already fail due
to warning caps or other CLI policy. Use a scoped reporting lane when necessary;
do not weaken unrelated mandatory checks. Promote each rule when its discovery,
passing/failing examples, and agreed cleanup criteria are satisfied. A warning
stage is partial adoption until the blocking target or an approved exception
is reached; a green command is not a substitute for that record.

### Prove enforcement and freshness

Before claiming qualified adoption, demonstrate meaningful allowed and forbidden
examples for each enforced rule through the repository's real invocation. Check
consumer and component-definition behavior separately, including paths, imports,
theme tokens, shared packages, and custom CSS classes where applicable. Expected
diagnostics and process outcomes must agree. Configuration printing and plugin
registration alone are insufficient.

Treat unresolved component/theme discovery or reduced-analysis fallback as a
coverage limitation even when the process exits successfully. Correct discovery
or defer the affected claim. Changes to components, variants, CSS/themes,
configuration, dependencies, or imported styling plugins SHALL invalidate
relevant cached evidence; rerun affected consumers without unsafe file-only
caches and restart persistent processes when their module state is stale.

Keep evidence within the supported static-analysis scope. A passing lint command
does not prove CSS-wide policy, runtime behavior, visual correctness, color
contrast, dark-mode quality, or accessibility. Those obligations remain with
their existing owning checks.

## Adoption evidence

Record the provider-to-local mapping, reviewed versions, source/linter ownership,
all-rule inventory, configuration and path boundaries, exceptions, enforcement
stage, baseline/promotion criteria, representative positive/negative results,
discovery warnings, cache freshness, owner, and revisit trigger using the target's
existing evidence convention. Distinguish source inspection, local execution,
and hosted results. Missing proof remains unverified.

## Related decisions

- [AC-ADR-013](ac-adr-013-own-language-package-build-lint-and-supply-chain-tooling-explicitly.long.md): tooling ownership and compatibility.
- [AC-ADR-018](ac-adr-018-validate-behavior-at-the-owning-boundary-and-promote-enforcement-gradually.long.md): gradual enforcement and negative fixtures.
- [AC-ADR-024](ac-adr-024-meet-an-explicit-accessibility-baseline-with-automated-and-manual-proof.long.md): separate accessibility evidence.
- [AC-ADR-049](ac-adr-049-distinguish-change-risk-from-representative-environment-observation.long.md): changed-contract validation and fresh receipts.
- [AC-ADR-058](ac-adr-058-use-pnpm-for-package-management-and-bun-for-execution.long.md): package-manager and runtime authority.

## Consequences

A comprehensive default makes design-system feedback predictable for humans and
agents while examples keep setup actionable. The cost is explicit compatibility,
discovery, and behavioral qualification; narrow exceptions need maintenance.
Early plugin APIs and incomplete static analysis can leave gaps, which remain
visible instead of being hidden by a clean exit or broad allowlist.

## Revisit

Requalify affected behavior when plugin rules, parser/runtime support, linter
APIs, source syntax, component/theme ownership, or caching changes. Update
version-specific instructions in Guide; change durable obligations through a
reciprocal successor rather than rewriting accepted policy.
