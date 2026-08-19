# AC-ADR-016: Select AI Model, Streaming, UI, and Agent Capabilities Deliberately

ID: AC-ADR-016
Title: Select AI Model, Streaming, UI, and Agent Capabilities Deliberately
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: runtime-platform
Tags: ai, models, providers, gateway, streaming, tools, agents, ai-ui, safety
Applies when: A product adds model access, streamed generation, tool calls, AI-rendered UI, or agent orchestration.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-30
Gist: Select the smallest AI capability stack that meets measured product needs while preserving explicit trust, data, cost, and tool boundaries.

Variants: **Short** · [Long, canonical](ac-adr-016-select-ai-model-streaming-ui-and-agent-capabilities-deliberately.long.md) · [Guide](ac-adr-016-select-ai-model-streaming-ui-and-agent-capabilities-deliberately.guide.md)

## Decision summary

- Define task quality, latency, context, modality, availability, data classification, retention, region, cost, and evaluation requirements before selecting a model or provider.
- Keep model SDK and managed gateway separate decisions. A gateway requires its own data, routing, provider, budget, credential, availability, and exit policy.
- Use a supported SDK abstraction only when portability, streaming, structured output, tools, or agent control justify it; preserve direct provider access where required capabilities would otherwise be lost.
- Treat prompts, retrieved content, model output, citations, links, files, and tool arguments as untrusted data.
- Sensitive tools require schema validation, least privilege, execution-time policy, approval where appropriate, timeouts, idempotency, isolation, and auditable results. Subagents receive only needed tools.
- Adopt AI UI components or agent frameworks conditionally. Source-distributed UI becomes repository-owned; orchestration complexity must match durable workflow needs.
- Evaluate quality, safety, latency, cost, failures, tool behavior, and human recovery against versioned scenarios before promotion.

Apply [AC-ADR-019](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.short.md) ([Long, canonical](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.long.md) · [Guide](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.guide.md)) and [AC-ADR-020](ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths.short.md) ([Long, canonical](ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths.long.md) · [Guide](ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths.guide.md)).
