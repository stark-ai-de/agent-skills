# ADR-0014: Prefer Node skill helper scripts

ID: ADR-0014
Title: Prefer Node skill helper scripts
Status: Accepted
Date: 2026-05-24
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: node, scripts, portability
Applies when: Adding a helper script to a public skill.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Public skill helpers should be portable across common developer operating systems.

Variants: [Short](0014-prefer-node-skill-helper-scripts.short.md) · [Long, canonical](0014-prefer-node-skill-helper-scripts.long.md) · **Guide**

This guide is non-normative. [Long](0014-prefer-node-skill-helper-scripts.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

- Inventory the current tool owner, configuration, scripts, supported files, plugins, and compatibility constraints.
- Adopt the canonical choice only where target evidence satisfies its compatibility boundary; document narrow fallbacks explicitly.
- Keep package installation, runtime execution, and repository scripting ownership distinct.

## Verification

- Run representative checks across every file type and integration the replaced tool currently covers.
- Verify the configured command path in local validation and CI without claiming unsupported environments.
- Cite the exact files, commands, and evidence boundaries used for the conclusion.

## Historical follow-up context

The original record named these follow-ups. Revalidate them against current repository state before treating them as active work:

- Validate skill-local `.mjs` scripts with the repo script validation gate.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
