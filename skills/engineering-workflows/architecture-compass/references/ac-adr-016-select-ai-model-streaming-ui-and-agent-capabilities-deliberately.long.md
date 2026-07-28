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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Select the smallest AI capability stack that meets measured product needs while preserving explicit trust, data, cost, and tool boundaries.

Variants: [Short](ac-adr-016-select-ai-model-streaming-ui-and-agent-capabilities-deliberately.short.md) · **Long, canonical** · [Guide](ac-adr-016-select-ai-model-streaming-ui-and-agent-capabilities-deliberately.guide.md)

## Context

AI stacks change faster than most application architecture. Model SDKs, managed gateways, streaming UI, tool APIs, and agent frameworks solve different problems but are often collapsed into one preferred stack. Model-generated output and tool instructions also cross adversarial trust boundaries even when the end user is trusted.

## Decision

### Start from a capability and data contract

Every AI feature defines:

- the user task, acceptable quality, failure behavior, human fallback, and measurable evaluation set;
- latency, throughput, context, modality, structured-output, streaming, tool, and availability needs;
- data classification, minimization, retention, training use, residency, deletion, and audit requirements;
- expected token/tool/storage costs, budgets, quotas, and abuse controls;
- the authoritative non-AI behavior when output is missing, unsafe, stale, or unverifiable.

Model and provider selection follows that contract and is re-evaluated against versioned scenarios. Prompts do not become the only home of authorization, business invariants, or safety policy.

### Separate SDK, provider, and gateway choices

An SDK abstraction may own consistent model invocation, streaming, structured output, tools, and agent loops when those capabilities reduce application coupling. Provider-specific APIs remain behind an owned adapter when required features, performance, governance, or reliability cannot be represented safely by the abstraction.

A managed gateway is a separate architectural decision. It records allowed providers/models, routing and fallback, customer-supplied versus platform credentials, data flow, retention and training guarantees, regions, quotas, budgets, logs, outage independence, and exit path. An SDK does not imply a gateway, and a gateway does not replace application authorization or provider review.

### Treat all AI content as untrusted

User prompts, retrieved documents, model output, citations, URLs, markdown, generated files, and tool arguments are untrusted. Rendering applies an explicit HTML policy and protocol/host allowlists for links, images, and embedded content. Internal prompts, credentials, raw tool errors, and private retrieved context are not reflected to the client. Retrieved or model-provided instructions cannot override system policy, authorization, or tool capability checks.

Streaming defines cancellation, timeout, partial-output, reconnect, moderation, accounting, persistence, and error behavior. The UI distinguishes generated, verified, cited, pending, partial, and failed content where the product risk requires it.

### Bound tools and agents

Tools expose narrow schemas and capabilities. Before execution, trusted code validates arguments, authenticates the principal, authorizes the concrete action and object, applies rate/budget limits, and enforces an execution policy. High-impact, irreversible, external-message, payment, permission, secret, shell, or filesystem actions require explicit approval or an equivalently strong pre-authorized policy. Approval happens at execution time, not merely in a prompt.

Tool calls define timeouts, retries, idempotency, cancellation, sanitized output, and audit evidence. Shell and filesystem tools run in an isolated environment with narrow paths and credentials. Subagents receive only the tools and data required for their task; they cannot inherit unrestricted parent capability by convenience.

Use the least complex orchestration that satisfies the workflow. A direct generation or bounded tool loop is preferred over a general agent framework. Persistent graphs, resumability, human-in-the-loop checkpoints, long-running state, or cross-process recovery may justify a workflow/graph runtime. Multiple AI frameworks require clear ownership, interoperability, and removal boundaries.

Source-registry AI UI components become repository-owned code and are subject to the same security, accessibility, performance, and update policy as other local UI.

### Evaluate before promotion

Versioned evaluations cover representative success, refusal, ambiguity, adversarial prompt injection, unsafe output, structured-output failure, tool misuse, timeout, provider outage, cost, and human recovery. Production telemetry is privacy-safe and supports model/provider/version, latency, token/cost, tool, safety, and outcome analysis without logging protected content by default.

## Consequences

The AI stack can evolve without making a volatile package list canonical. Security and cost controls become explicit, at the expense of evaluation, policy, and adapter work before launch.

## Validation

- Run the versioned quality/safety/cost evaluation set against every candidate or changed model path.
- Test prompt injection from user and retrieved content, malformed structured output, unsafe links, and data-exfiltration attempts.
- Prove tool schema rejection, object-level authorization, approval, timeout, idempotency, sandbox limits, and sanitized results.
- Simulate stream cancellation, partial output, reconnect, provider throttling/outage, gateway outage, and fallback.
- Inspect traces, logs, client payloads, and stored conversations for secret or protected-data leakage.
