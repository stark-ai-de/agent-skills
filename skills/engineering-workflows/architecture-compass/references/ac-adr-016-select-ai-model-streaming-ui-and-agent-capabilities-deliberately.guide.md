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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-30
Gist: Select the smallest AI capability stack that meets measured product needs while preserving explicit trust, data, cost, and tool boundaries.

Variants: [Short](ac-adr-016-select-ai-model-streaming-ui-and-agent-capabilities-deliberately.short.md) · [Long, canonical](ac-adr-016-select-ai-model-streaming-ui-and-agent-capabilities-deliberately.long.md) · **Guide**

## Implementation guide

This guide is non-normative. AI package APIs and provider policies must be re-verified before implementation.

### Current TypeScript candidates

AI SDK 7 is the current supported major on the verification date. It can provide provider-agnostic generation, streaming, structured output, native tools, `ToolLoopAgent`, `WorkflowAgent`, execution-level tool approval, timeouts, and sandbox integrations. Use only the capabilities needed by the product and pin a repository-supported range. Prefer native `tool()`/dynamic-tool APIs before adding an ambiguously named third-party “AI SDK Tools” package.

Vercel AI Gateway is a separately managed service, not another name for AI SDK. Evaluate direct providers versus the gateway for routing, provider allowlists, customer keys, zero-data-retention/training terms, budgets, regions, observability, failure coupling, and contract requirements.

AI Elements is a source registry suited to compatible React/Next.js, shadcn/ui, and Tailwind projects. Imported components become local code. Its message-response component uses Streamdown for streaming markdown. If Streamdown is used directly, restrict link and image protocols/hosts, decide whether data images are allowed, preserve sanitizer behavior when changing plugins, and define raw-HTML policy for model output.

Use AI SDK's bounded agents for ordinary tool loops. Consider LangChain for a broad integration/retrieval ecosystem and `@langchain/langgraph` for explicit graphs, persistence, resumability, or human-in-the-loop workflows. Treat `@openharness/core` as an experimental candidate, not a default: verify its current AI SDK compatibility and review tool/subagent permission behavior, especially shell and filesystem access.

### Stack-deviation comparison

Before adding or replacing an AI SDK, provider, gateway, model path, UI layer, or agent framework, record:

| Existing or accepted option | Required capability | Evidence-backed gap           | Candidate     | Chosen option            | Docs/ADR impact              | Validation        |
| --------------------------- | ------------------- | ----------------------------- | ------------- | ------------------------ | ---------------------------- | ----------------- |
| `<current AI path>`         | `<needed behavior>` | `<gap or "not insufficient">` | `<candidate>` | `<current or candidate>` | `<none, docs, or local ADR>` | `<focused proof>` |

Prefer the existing path and built-in capability when they satisfy the requirement. If the evidence-backed gap is `not insufficient`, reject the extra dependency or provider and continue only with the authorized bounded change. If the chosen option creates a durable deviation from an accepted target rule, stop the affected implementation and use the target repository's ADR change or successor process; AC-ADR-046 ranks the evidence but grants no write authority.

### Tool implementation checklist

- strict input schema and small output contract;
- server-side actor, tenant, capability, object, and budget check;
- per-execution approval for sensitive impact;
- timeout, cancellation, retry, idempotency, and audit record;
- sandbox and narrow filesystem/network/credential scope;
- safe user-facing result and server-side correlation ID;
- adversarial tests in which prompt content asks to bypass every control.

## Primary sources

- [AI SDK 7 announcement](https://vercel.com/changelog/ai-sdk-7)
- [AI SDK: Tools and tool calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [AI Gateway documentation](https://vercel.com/docs/ai-gateway)
- [AI Gateway provider options](https://vercel.com/docs/ai-gateway/models-and-providers/provider-options)
- [AI Elements](https://elements.ai-sdk.dev/docs)
- [Streamdown security](https://streamdown.ai/docs/security)
- [LangChain overview](https://docs.langchain.com/oss/javascript/langchain/overview)
- [LangGraph overview](https://docs.langchain.com/oss/javascript/langgraph/overview)
- [Open Harness permissions](https://docs.open-harness.dev/tools/permissions)
