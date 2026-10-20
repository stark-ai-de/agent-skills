# ADR-0073: Bundle Visual Report generator dependencies

ID: ADR-0073
Title: Bundle Visual Report generator dependencies
Status: Accepted
Date: 2026-10-20
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: visual-reports, html, portability
Applies when: Maintaining or using Visual Reports.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-10-20
Gist: Visual Reports bundles pinned parser, diagram-layout and icon artifacts at maintenance time; report generation uses portable Node.js and never installs dependencies or fetches rendering assets.

Variants: **Short** · [Long, canonical](0073-bundle-visual-report-generator-dependencies.long.md) · [Guide](0073-bundle-visual-report-generator-dependencies.guide.md)

## Decision

Visual Reports bundles pinned parser, diagram-layout and icon artifacts at maintenance time; report generation uses portable Node.js and never installs dependencies or fetches rendering assets.

## Context

Bundling Remark/GFM/directives, Beautiful Mermaid and selected Lucide icons avoids a parser and layout reimplementation while preserving offline report delivery. Dependencies, licenses and digests remain reviewable.

## Consequences

- Good: reusable output with explicit source and runtime ownership.
- Tradeoff: compatibility and bundled artifacts require maintenance checks.
- Risk: tests do not establish clinical benefit or every host qualification.
