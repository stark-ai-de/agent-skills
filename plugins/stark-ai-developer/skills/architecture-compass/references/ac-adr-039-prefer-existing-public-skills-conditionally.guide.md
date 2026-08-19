# AC-ADR-039: Prefer Existing Public Skills Conditionally

ID: AC-ADR-039
Title: Prefer Existing Public Skills Conditionally
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: skill-reuse, consent, installation, provenance
Applies when: Architecture Compass would otherwise recommend or implement a capability already offered by a public skill.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Propose a fitting existing public skill before bespoke work, but never install or invoke it without explicit selection.

Variants: [Short](ac-adr-039-prefer-existing-public-skills-conditionally.short.md) · [Long, canonical](ac-adr-039-prefer-existing-public-skills-conditionally.long.md) · **Guide**

This guide is non-normative. The canonical Long decision controls skill reuse and consent.

## Comparison shape

| Option                         | Requirement fit | Target/host contract | Side effects | Evidence gaps | Maintenance owner |
| ------------------------------ | --------------- | -------------------- | ------------ | ------------- | ----------------- |
| Existing public skill          |                 |                      |              |               |                   |
| Bounded bespoke implementation |                 |                      |              |               |                   |

List before installing when the current CLI supports it. Do not append `--yes` to an install proposal unless the user has already selected the exact skill, scope, and host and non-interactive execution is separately appropriate. Prefer project-local installation when the requirement belongs to one repository; global installation is a distinct user-level choice.

## Selection checkpoint

```text
Recommended option: <existing skill or bespoke>
Why it fits: <one sentence>
Target ADR/instruction check: <result>
Install/use scope: <none until selected>
Material side effects: <list>
Choose: use existing skill | build bounded local capability | stop
```

## Current references

- [Open skills CLI list, add, and use workflows](https://github.com/vercel-labs/skills)
- [Agent Skills specification](https://agentskills.io/specification)

## Revisit

Create a successor if Architecture Compass gains a repository-owned dependency resolver with an equivalent explicit consent contract.
