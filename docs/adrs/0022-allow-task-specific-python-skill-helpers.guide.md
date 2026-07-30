# ADR-0022: Allow task-specific Python skill helpers

ID: ADR-0022
Title: Allow task-specific Python skill helpers
Status: Accepted
Date: 2026-07-07
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: python, scripts, portability
Applies when: Proposing a Python helper inside a public skill.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Public skills may use Python helpers when the task needs Python's standard-library strengths.

Variants: [Short](0022-allow-task-specific-python-skill-helpers.short.md) · [Long, canonical](0022-allow-task-specific-python-skill-helpers.long.md) · **Guide**

This guide is non-normative. [Long](0022-allow-task-specific-python-skill-helpers.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

- Inventory the current tool owner, configuration, scripts, supported files, plugins, and compatibility constraints.
- Adopt the canonical choice only where target evidence satisfies its compatibility boundary; document narrow fallbacks explicitly.
- Keep package installation, runtime execution, and repository scripting ownership distinct.

## Verification

- Run representative checks across every file type and integration the replaced tool currently covers.
- Verify the configured command path in local validation and CI without claiming unsupported environments.
- Cite the exact files, commands, and evidence boundaries used for the conclusion.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
