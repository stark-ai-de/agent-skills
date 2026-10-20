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
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-10-20
Gist: Visual Reports uses versioned JSON as its canonical content model; bounded Markdown input compiles to the same validated model, and HTML, reader Markdown and JSON exports derive from one snapshot while version 1 APIs remain supported.

Variants: [Short](0074-use-one-versioned-visual-report-model.short.md) · [Long, canonical](0074-use-one-versioned-visual-report-model.long.md) · **Guide**

## Purpose

This guide is non-normative. The Long decision is canonical.

## How to apply

Validate explicit units, source references, states and comparison direction. Keep unsupported input visible as a diagnostic. Preserve unknown extension fields in complete exports; never parse text diagrams back into source data.

## Verification

Run the Visual Reports owning tests and the applicable repository validation gates. Record actual results separately from acceptance.

## Current references

- [Visual Reports](../../skills/engineering-workflows/visual-reports/SKILL.md)

## Revisit

Revisit through a successor ADR when the ownership or runtime contract changes.
