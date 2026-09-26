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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-16
Gist: Enable the reviewed shadcn lint rule set by default, adapt upstream examples to real component ownership, and qualify staged enforcement.

Variants: **Short** · [Long, canonical](ac-adr-063-enforce-tailwind-design-system-contracts-with-shadcn-lint.long.md) · [Guide](ac-adr-063-enforce-tailwind-design-system-contracts-with-shadcn-lint.guide.md)

## Decision summary

Compatible Tailwind v4 repositories adopting this decision use `@shadcn/lint`
through their existing owning linter to enforce design-system usage. shadcn/ui
is optional. Enable all supported rules of the reviewed plugin version by
default; assess new rules on upgrade. Rule exclusions require bounded scope,
rationale, owner, and a revisit condition.

Adapt upstream examples to actual components, theme tokens, imports, and file
ownership. Preserve layout flexibility and use narrow component-definition
exceptions without excluding the library from all checks. Qualified consuming
code uses blocking enforcement; legacy findings may progress from an owned,
measured report-only stage to errors. Check the real command's warning policy.

Keep local tooling, runtime, and dependency authority. Governance adoption does
not itself authorize installation or source migration. Prove allowed and
forbidden uses, theme/component discovery, command exit behavior, and result
freshness. Registration alone, missing discovery, stale cache results, and
unsupported targets are not completed enforcement. Static lint does not replace
visual, accessibility, compiler, or runtime evidence.

## Consequences

Comprehensive, configurable feedback helps agents follow the design system.
Compatibility, fixture proof, and maintaining scoped exceptions add adoption work.
