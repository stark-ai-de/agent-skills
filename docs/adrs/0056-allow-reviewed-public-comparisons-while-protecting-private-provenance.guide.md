# ADR-0056: Allow reviewed public comparisons while protecting private provenance

ID: ADR-0056
Title: Allow reviewed public comparisons while protecting private provenance
Status: Proposed
Date: 2026-09-22
Owner: stark-ai-de
Scope: repository
Category: security-data
Tags: public-artifacts, comparisons, provenance, evidence
Applies when: Publishing skill comparisons and promotional benchmark claims.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-09-22
Gist: Permit sourced public comparisons while keeping private provenance local and preserving material measurement limits.

Variants: [Short](0056-allow-reviewed-public-comparisons-while-protecting-private-provenance.short.md) · [Long, canonical](0056-allow-reviewed-public-comparisons-while-protecting-private-provenance.long.md) · **Guide**

This guide is non-normative. [Long](0056-allow-reviewed-public-comparisons-while-protecting-private-provenance.long.md) is authoritative.

## How to apply

Keep a canonical public Markdown comparison and render the same content on the site. Link the public source revision for feature observations. Label local preparation, full recommendation and host execution as different measurements. An unmeasured competitor cell says Not measured, not a dash presented as failure.

## Verification

- Check reported values against frozen raw results and the current candidate; keep raw private data local.
- Check that sample, version, cache state and measurement boundary appear beside the claim.
- Review source changes, names and limits before release. Run ADR validation after acceptance and reciprocal linking.

## Current references

- [Current ADR-0030](0030-separate-public-contracts-from-private-provenance.long.md).
- [Promotion requirements](0008-promote-skills-by-quality-utility-and-maintenance-fit.long.md).

## Revisit

Create a reciprocal successor if the public/private boundary or comparative evidence requirements change.
