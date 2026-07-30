# AC-ADR-038: Gate Optional Capabilities and Tool Side Effects

ID: AC-ADR-038
Title: Gate Optional Capabilities and Tool Side Effects
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: runtime-platform
Tags: providers, tools, approval, fallback
Applies when: A public skill can call an optional provider, install a missing tool, launch a browser, or use a higher-side-effect capability.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Keep a universal safe path and require live capability checks plus explicit consent for optional side effects.

Variants: [Short](ac-adr-038-gate-optional-capabilities-and-tool-side-effects.short.md) · [Long, canonical](ac-adr-038-gate-optional-capabilities-and-tool-side-effects.long.md) · **Guide**

This guide is non-normative. The canonical Long decision controls optional capability and side-effect gates.

## Preflight record

```text
Core fallback: <available path and expected result>
Enhanced capability: <provider/tool/browser>
Live discovery evidence: <source and freshness>
Benefit: <material improvement>
Cost/quota/data boundary: <known facts and gaps>
Credentials: <safe reference only>
Side effects: <network/install/browser/files>
Requested approval: <one exact boundary>
Decline/unavailable behavior: <fallback or stop>
```

Do not combine “use provider”, “install dependency”, and “launch browser” into one vague confirmation. Validate enhanced outputs in a staging location and replace only after all required checks pass.

## Decision lineage

- `generalizes`: [ADR-0025](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0025-keep-animated-readme-logo-portable-with-provider-routing.long.md), [ADR-0027](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0027-gate-logo-tool-installs-and-browser-fallbacks.long.md).

## Current references

- [NIST Secure Software Development Framework](https://csrc.nist.gov/pubs/sp/800/218/final)
- [OWASP least privilege guidance](https://owasp.org/www-community/Access_Control)

## Revisit

Create a successor if a claimed optional capability becomes a mandatory package contract. Re-verify providers, costs, models, and install instructions immediately before use.
