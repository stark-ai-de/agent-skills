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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Keep a universal safe path and require live capability checks plus explicit consent for optional side effects.

Variants: [Short](ac-adr-038-gate-optional-capabilities-and-tool-side-effects.short.md) · **Long, canonical** · [Guide](ac-adr-038-gate-optional-capabilities-and-tool-side-effects.guide.md)

## Context

An optional generation provider, browser, binary, package, or system tool can improve quality or automation, but availability, model names, costs, credentials, supported platforms, and side effects are live facts. Automatically installing a tool or invoking a paid provider changes user or external state and can violate trust. Making the enhanced path mandatory narrows portability. Moving target-specific brand or product logic into a reusable skill also couples unrelated repositories.

## Decision

A public skill maintains a documented dependency-light path that delivers its core outcome without an optional paid provider, new package or system-tool installation, browser launch, or undeclared network access.

An enhanced path begins with the minimum read-only live discovery needed to establish current capability, selected model or tool, account or credential requirement by safe reference, expected cost or quota, data boundary, supported output, and fallback. The skill explains the concrete benefit and asks for explicit user selection before provider use, credentialed network access, installation, browser automation, or another material side effect. Prompt intent and tool availability do not count as consent.

Provider use, local tool installation, and browser fallback are separate approval boundaries. A user can approve one without approving the others. Reuse an already configured compatible tool or browser before proposing installation. Installation commands come from the target platform and package-manager evidence, are scoped and reversible where practical, and never run automatically. Decline, unavailable capability, or failed preflight returns to the universal path or stops with the exact missing capability if no honest fallback exists.

Reusable skills own generic mechanics, validation, safety limits, and provider routing. Product identity, brand choices, trusted recipes, target paths, and repository-specific behavior stay in the target repository. Outputs are staged and validated before replacement; missing or failed optional tools do not clobber valid artifacts.

## Invariants

- Core behavior does not depend on unapproved optional state changes.
- Capability discovery does not expose secret values or create external work.
- Provider, install, and browser approvals remain distinct and specific.
- Configured tools are preferred over duplicate installations when compatible.
- Optional failure preserves valid inputs and outputs and reports the fallback honestly.
- Reusable mechanics do not absorb target-specific identity or private provenance.

## Failure handling

On unavailable capability, denied approval, quota or cost uncertainty, credential failure, unsupported platform, or invalid output, stop the enhanced path and use the documented safe alternative. Preserve source and valid destination artifacts, clean only owned temporary state, and never broaden network, filesystem, or credential access to force success.

## Consequences

Skills remain usable across more environments and users control paid or state-changing behavior. Enhanced workflows add discovery and approval turns, and maintainers must test both optional and universal paths as tools and providers evolve.
