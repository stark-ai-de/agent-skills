# ADR-0007: Resolve configuration at the deployable boundary

> Derived, non-normative asset. The applicable canonical Long ADRs prevail if this example conflicts or drifts.

ID: ADR-0007
Title: Resolve configuration at the deployable boundary
Status: Accepted
Date: 2026-07-28
Owner: example-team
Scope: repository
Category: runtime-platform
Tags: configuration, environment, bootstrap
Applies when: A deployable process reads environment-backed configuration.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Select environment before bootstrap and parse resolved configuration once.

Variants: [Short](adr-example.short.md) · **Long, canonical** · [Guide](adr-example.guide.md)

## Context

Environment selection and configuration parsing become ambiguous when services load files or read global variables independently. Tests then need process-global mutation and deployments can select conflicting inputs.

## Decision

The process launcher, runtime, or deployment platform owns environment selection before application bootstrap. The deployable app owns one boundary parser that validates resolved input and creates typed immutable configuration. Bootstrap injects that configuration; domain, service, route, and shared modules do not load environment files or read scattered environment variables.

## Invariants

- Selection completes before runtime construction.
- One deployable owns one parsing boundary and redacts sensitive validation failures.
- Shared packages accept typed values and remain environment-source agnostic.

## Alternatives

- Chosen: launcher selection plus deployable-local parsing.
- Rejected: each module reads globals, because ownership and tests become implicit.
- Rejected: shared package loads dotenv, because it couples reusable code to one deployment model.

## Consequences

- Benefit: deterministic configuration ownership and test seams.
- Tradeoff: launch commands must state local environment selection explicitly.
- Risk: bypasses need static checks or review until automated enforcement exists.

## Acceptance

- A test can construct the runtime from typed config without mutating process environment.
- Production can run from injected variables without loading a repository file.
