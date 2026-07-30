# AC-ADR-019: Apply Security and Privacy Controls at Every Trust Boundary

ID: AC-ADR-019
Title: Apply Security and Privacy Controls at Every Trust Boundary
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: security-data
Tags: security, privacy, authorization, ai-safety
Applies when: Processing identity, credentials, untrusted input, authorization, logs, errors, browser data, model output, tools, or third-party access.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Treat every crossing of identity, privilege, data, code, or system ownership as a boundary that must fail closed.

Variants: **Short** · [Long, canonical](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.long.md) · [Guide](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.guide.md)

## Decision summary

Each trust boundary validates inputs and outputs, authenticates the caller where identity matters, authorizes the requested object and action, minimizes disclosed data, and grants only the required privilege. Secrets stay out of client bundles, logs, prompts, fixtures, and public artifacts; errors and telemetry preserve operational value without exposing sensitive content.

Model output, retrieved content, tool arguments, and agent instructions are untrusted. Sensitive tools require constrained capabilities and explicit approval rather than prompt wording alone. High-risk identity, payment, child, health, credential, elevated-data, code-execution, and cross-tenant paths receive a manual threat review and negative security tests.

## Read next

Read the [Long variant](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.long.md) before creating or changing a trust boundary. Load the [Guide](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.guide.md) for a boundary inventory, test prompts, and current primary references.
