# AC-ADR-068: Reuse Explicit Skill Preselection With Separate Provisioning Grants

ID: AC-ADR-068
Title: Reuse Explicit Skill Preselection With Separate Provisioning Grants
Status: Accepted
Date: 2026-10-09
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: skill-reuse, preselection, consent, installation, provenance
Applies when: Resolving selected skills or optionally provisioning a missing capability during authorized work.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: AC-ADR-039
Superseded by: none
Guide verified: 2026-10-09
Gist: Reuse explicit scoped user selections without inferring installation, write or external-action permission.

Variants: **Short** · [Long, canonical](ac-adr-068-reuse-explicit-skill-preselection-with-separate-provisioning-grants.long.md) · [Guide](ac-adr-068-reuse-explicit-skill-preselection-with-separate-provisioning-grants.guide.md)

## Decision summary

A genuine scoped user preselection can select a named, source-verified skill for relevant tasks. Installation and every later side effect still need their own applicable grant and current host permission. Missing, disabled, unpromoted or unknown-origin skills produce targeted handoffs, not guessed installs.

## Read next

Read Long before applying the decision. Guide contains non-normative procedures and evidence requirements.
