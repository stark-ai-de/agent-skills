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
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-10-20
Gist: Visual Reports bundles pinned parser, diagram-layout and icon artifacts at maintenance time; report generation uses portable Node.js and never installs dependencies or fetches rendering assets.

Variants: [Short](0073-bundle-visual-report-generator-dependencies.short.md) · [Long, canonical](0073-bundle-visual-report-generator-dependencies.long.md) · **Guide**

## Purpose

This guide is non-normative. The Long decision is canonical.

## How to apply

Build the checked-in artifacts with the repository pnpm dependencies and Bun builder; verify the output through Node without node_modules. Keep generated HTML free of external runtime assets.

## Verification

Run the Visual Reports owning tests and the applicable repository validation gates. Record actual results separately from acceptance.

## Current references

- [Visual Reports](../../skills/engineering-workflows/visual-reports/SKILL.md)

## Revisit

Revisit through a successor ADR when the ownership or runtime contract changes.
