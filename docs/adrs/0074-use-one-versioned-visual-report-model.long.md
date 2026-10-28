# ADR-0074: Use one versioned Visual Report model

ID: ADR-0074
Title: Use one versioned Visual Report model
Status: Accepted
Date: 2026-10-20
Owner: stark-ai-de
Scope: repository
Category: repository-architecture
Tags: visual-reports, html, portability
Applies when: Maintaining or using Visual Reports.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-10-20
Gist: Visual Reports uses versioned JSON as its canonical content model; bounded Markdown input compiles to the same validated model, and HTML, reader Markdown and JSON exports derive from one snapshot while version 1 APIs remain supported.

Variants: [Short](0074-use-one-versioned-visual-report-model.short.md) · **Long, canonical** · [Guide](0074-use-one-versioned-visual-report-model.guide.md)

## Decision

Visual Reports uses versioned JSON as its canonical content model; bounded Markdown input compiles to the same validated model, and HTML, reader Markdown and JSON exports derive from one snapshot while version 1 APIs remain supported.

## Why

One validation and rendering path prevents semantic drift between convenient input, interactive presentation and complete agent-readable exports. Markdown does not execute MDX or infer evidence from typography.

## Options

- Chosen: the bounded shared contract above.
- Rejected: separate framework applications and independent format-specific renderers.

## Consequences

- Good: reusable output with explicit source and runtime ownership.
- Tradeoff: compatibility and bundled artifacts require maintenance checks.
- Risk: tests do not establish clinical benefit or every host qualification.

## Follow-up

The maintainer explicitly approved the implementation plan on 2026-10-20. This acceptance covers implementation and local installation, not staging, push, merge or platform publication.
