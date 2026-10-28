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
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-10-20
Gist: Managed Visual Reports store immutable revisions and replace a current pointer atomically under an exclusive writer lock with an expected-base check; the loopback preview applies new revisions only on request and protects unsaved local drafts.

Variants: [Short](0075-version-local-visual-reports-atomically.short.md) · [Long, canonical](0075-version-local-visual-reports-atomically.long.md) · **Guide**

## Purpose

This guide is non-normative. The Long decision is canonical.

## How to apply

Generate all three exports before publishing a revision, reject stale updates, retain history, and offer explicit draft export before revision replacement. A crash may leave an unreferenced revision or lock; never silently steal a lock.

## Verification

Run the Visual Reports owning tests and the applicable repository validation gates. Record actual results separately from acceptance.

## Current references

- [Visual Reports](../../skills/engineering-workflows/visual-reports/SKILL.md)

## Revisit

Revisit through a successor ADR when the ownership or runtime contract changes.
