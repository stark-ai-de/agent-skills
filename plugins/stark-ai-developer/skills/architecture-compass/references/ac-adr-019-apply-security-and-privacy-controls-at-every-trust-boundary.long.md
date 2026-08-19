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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Treat every crossing of identity, privilege, data, code, or system ownership as a boundary that must fail closed.

Variants: [Short](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.short.md) · **Long, canonical** · [Guide](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.guide.md)

## Context

Authentication alone does not prevent a caller from acting on another subject's object, and schema-shaped data is not necessarily safe or authorized data. Browser/server transitions, elevated database clients, webhooks, logs, third-party APIs, model calls, retrieved content, and agent tools all create trust changes that cannot be protected by a single perimeter control.

## Decision

The repository identifies every boundary where data, identity, privilege, executable behavior, or system ownership changes and applies layered, least-privilege controls at that boundary.

### Boundary controls

- Validate untrusted input with a real schema and bounded size, shape, encoding, and semantic constraints before trusted business logic runs. Validate and minimize outbound contracts before returning or forwarding data.
- Authenticate the calling principal when identity matters, then authorize both the requested action and the concrete object or tenant. UI visibility and possession of an identifier are not authorization.
- Propagate user or tenant context through user-owned operations. Isolate elevated credentials and clients to named system operations that cannot safely use ordinary row-level or service authorization.
- Grant processes, tokens, tools, queues, database roles, files, and network access only the capabilities and duration needed for their operation. Fail closed when identity, policy, validation, or dependency state is unknown.
- Protect state-changing browser actions against the applicable request-forgery, replay, duplicate-delivery, and concurrency risks. Verify webhook authenticity before parsing trusted semantics.

### Secrets, privacy, and outputs

- Keep secret values out of source, client bundles, prompts, test snapshots, logs, errors, analytics, public documentation, reports, and generated artifacts. Refer to approved secret or configuration locations by name, never by value.
- Minimize collected, retained, logged, exported, and shared personal or sensitive data to the approved purpose. Classify sensitive fields and define masking, access, retention, and deletion behavior with the owning data decision.
- Return stable, sanitized errors to untrusted callers. Preserve correlation and actionable diagnostics in restricted telemetry without recording tokens, raw credentials, unnecessary personal data, model prompts, or full payloads by default.
- Review dependencies and generated or copied source as repository-owned attack surface. Pin or constrain risky integrations according to repository policy and respond to supported security advisories.

### AI and agent boundaries

- Treat model output, retrieved documents, tool arguments, browser content, and nested agent instructions as untrusted input rather than authority.
- Constrain each tool to an explicit capability, identity, path, network target, operation, and budget. Sensitive mutation, credential, shell, filesystem, or external-message actions require a real approval or policy control outside the model prompt.
- Validate structured model output before use and escape or sanitize rendered content for its destination. Do not execute generated code or deserialize untrusted agent state without an isolated, explicitly approved boundary.
- Send only purpose-required data to model and gateway providers. Provider routing, training use, retention, region, access, and audit requirements are explicit product and security decisions.

### Review and proof

Perform a manual threat and privacy review for high-impact identity, cross-tenant, elevated-data, credential, payment, child, health, destructive, code-execution, or public-ingress paths. Tests cover unauthorized subjects, unauthorized objects/actions, malformed and oversized inputs, secret and error leakage, replay or duplicate delivery where relevant, and fail-closed dependency behavior.

Security proof is staged. Source review and local tests do not establish CI scanning, published artifact contents, deployed controls, provider configuration, or real external enforcement. Report each verified stage and all unverified boundaries explicitly.

## Failure handling

Stop a release-affecting path when its required identity, authorization, validation, credential separation, or deletion control is absent or untestable. On suspected disclosure, preserve evidence without copying secrets into reports, rotate or revoke through the authorized incident process, and distinguish containment from verified remediation.

## Acceptance criteria

- Every changed trust boundary has an owner, input and output contract, principal, authorization rule, and failure behavior.
- Elevated credentials are isolated and absent from user-context paths and client artifacts.
- Logs, errors, telemetry, prompts, fixtures, and public output are tested for sensitive-data leakage.
- High-risk boundaries have manual threat review and negative authorization or misuse cases.
- Evidence reports distinguish local controls from CI, publication, deployment, and external-provider proof.

## Consequences

Boundary controls add implementation and review work, especially for integrations and AI tools. They localize security reasoning, reduce ambient privilege, and turn privacy and authorization into testable contracts rather than UI conventions.
