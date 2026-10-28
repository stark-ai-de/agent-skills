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
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-10-20
Gist: Managed Visual Reports store immutable revisions and replace a current pointer atomically under an exclusive writer lock with an expected-base check; the loopback preview applies new revisions only on request and protects unsaved local drafts.

Variants: **Short** · [Long, canonical](0075-version-local-visual-reports-atomically.long.md) · [Guide](0075-version-local-visual-reports-atomically.guide.md)

## Decision

Managed Visual Reports store immutable revisions and replace a current pointer atomically under an exclusive writer lock with an expected-base check; the loopback preview applies new revisions only on request and protects unsaved local drafts.

## Context

A stable reader URL and optimistic concurrency support incremental chat work without stale agents overwriting newer content. Standalone HTML remains independent of the preview service.

## Consequences

- Good: reusable output with explicit source and runtime ownership.
- Tradeoff: compatibility and bundled artifacts require maintenance checks.
- Risk: tests do not establish clinical benefit or every host qualification.
