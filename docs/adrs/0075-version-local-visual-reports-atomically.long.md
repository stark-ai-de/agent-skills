# ADR-0075: Version local Visual Reports atomically

ID: ADR-0075
Title: Version local Visual Reports atomically
Status: Accepted
Date: 2026-10-20
Owner: stark-ai-de
Scope: repository
Category: runtime-platform
Tags: visual-reports, html, portability
Applies when: Maintaining or using Visual Reports.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-10-20
Gist: Managed Visual Reports store immutable revisions and replace a current pointer atomically under an exclusive writer lock with an expected-base check; the loopback preview applies new revisions only on request and protects unsaved local drafts.

Variants: [Short](0075-version-local-visual-reports-atomically.short.md) · **Long, canonical** · [Guide](0075-version-local-visual-reports-atomically.guide.md)

## Decision

Managed Visual Reports store immutable revisions and replace a current pointer atomically under an exclusive writer lock with an expected-base check; the loopback preview applies new revisions only on request and protects unsaved local drafts.

## Why

A stable reader URL and optimistic concurrency support incremental chat work without stale agents overwriting newer content. Standalone HTML remains independent of the preview service.

## Options

- Chosen: the bounded shared contract above.
- Rejected: separate framework applications and independent format-specific renderers.

## Consequences

- Good: reusable output with explicit source and runtime ownership.
- Tradeoff: compatibility and bundled artifacts require maintenance checks.
- Risk: tests do not establish clinical benefit or every host qualification.

## Follow-up

The maintainer explicitly approved the implementation plan on 2026-10-20. This acceptance covers implementation and local installation, not staging, push, merge or platform publication.
