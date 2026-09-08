# ADR-0047: Use a local LiteLLM gateway for Hetzner coding clients

ID: ADR-0047
Title: Use a local LiteLLM gateway for Hetzner coding clients
Status: Proposed
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: runtime-platform
Tags: claude-code, codex, cursor, hetzner, litellm, provider-routing
Applies when: Configuring a local coding client to use Hetzner Inference.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-26
Gist: Use an isolated, pinned loopback LiteLLM gateway as the default client boundary, with direct Hetzner calls reserved for discovery, probes, or an explicitly verified direct lane.

Variants: [Short](0047-use-a-local-litellm-gateway-for-hetzner-coding-clients.short.md) · **Long, canonical** · [Guide](0047-use-a-local-litellm-gateway-for-hetzner-coding-clients.guide.md)

## Decision

The repository will use an isolated, exactly pinned LiteLLM Proxy Server bound to loopback as the default workstation boundary between Hetzner Inference and Codex CLI, Claude Code, and Cursor standard chat. The workflow will discover models from Hetzner `/v1/models`, probe `/v1/chat/completions` directly before testing the gateway, expose each client through its verified API surface, and report provider, gateway, and client evidence separately. It will not ship a repository-owned protocol translator, hardcode a model catalog, silently bypass the gateway, or treat text transport as proof of tool or coding compatibility.

## Decision invariants

1. **LiteLLM is the shared default boundary.** Configure the official proxy, not a repository-owned translator.
2. **The runtime is isolated and reproducible.** Run LiteLLM from an owned per-user virtual environment with an exact reviewed version and recorded Python and package inventory.
3. **Loopback is the trust boundary.** Bind to `127.0.0.1`; another interface requires a separate security decision.
4. **Provider discovery is live.** Hetzner `/v1/models` is authoritative; examples and cached observations are advisory only.
5. **Client surfaces remain distinct.** Codex uses Responses, Claude Code uses Messages, and Cursor uses only a verified standard-chat BYOK lane.
6. **Direct calls are diagnostic first.** A direct-client lane requires explicit selection and proof that both sides share a supported contract.
7. **Text success is insufficient.** Streaming, tools, tool results, cancellation, errors, and a disposable coding flow are classified independently.
8. **No silent semantic loss is accepted.** Unsupported required fields or tools lower the proof level or block the route.
9. **The scope is one workstation.** Remote hosting, multi-user routing, databases, budgets, and high availability require separate decisions.

## Why

- Hetzner documents model discovery and Chat Completions, but no native Responses or Messages endpoint.
- Current Codex custom providers accept Responses and support command-backed authentication.
- LiteLLM documents both the Responses bridge and Anthropic-compatible Messages endpoint.
- Cursor's documented boundary is standard-chat BYOK and remains version- and UI-dependent.
- One gateway avoids duplicated upstream credentials, aliases, retries, health checks, and adaptation.
- Hetzner remains experimental, so compatibility must be evidence rather than a promise.

## Options

- **Chosen:** One isolated, exactly pinned loopback LiteLLM proxy, with direct Hetzner discovery and probes before gateway and client checks.
- **Rejected:** Configure every client directly against Hetzner; Codex and Claude Code do not currently share Hetzner's wire contract.
- **Rejected:** Build a custom bridge; maintaining tool, streaming, error, and state semantics would create a protocol product.
- **Rejected:** Start with Kubernetes or a remote proxy; a workstation does not need those operational dependencies.
- **Rejected:** Declare compatibility after text-only transport; agent workflows require more evidence.

## Consequences

- **Good:** The provider token stays behind one stable local boundary.
- **Good:** One evidence model works across Windows, macOS, Linux, and WSL.
- **Tradeoff:** Python and LiteLLM become explicit pinned workstation dependencies.
- **Tradeoff:** Cursor may remain guided and transport-only.
- **Risk:** LiteLLM behavior can regress; exact pinning, mocks, and opt-in live probes mitigate it.
- **Risk:** A model can accept schemas but fail coding tasks; per-component proof prevents overclaiming.

## Follow-up

- Implement the contract in [`../specs/hetzner-inference-setup-skill-spec.md`](../specs/hetzner-inference-setup-skill-spec.md).
- Select and record the exact Python and LiteLLM baseline during implementation review.
- Keep the skill in the incubator until cross-platform and client-specific evidence passes review.

## External contract baseline

Reviewed on 2026-08-26:

- [Hetzner Experiments Inference API](https://docs.hetzner.com/general/company-and-policy/experiments/inference/)
- [LiteLLM Proxy quick start](https://docs.litellm.ai/docs/proxy/quick_start)
- [LiteLLM Responses API](https://docs.litellm.ai/docs/response_api)
- [LiteLLM Claude Code gateway](https://docs.litellm.ai/docs/tutorials/claude_non_anthropic_models)
- [OpenAI Codex model-provider implementation](https://github.com/openai/codex/blob/main/codex-rs/model-provider-info/src/lib.rs)
- [Anthropic Claude Code LLM gateway](https://docs.anthropic.com/en/docs/claude-code/llm-gateway)
- [Cursor API keys](https://docs.cursor.com/settings/api-keys)

## Revisit

Create a successor ADR when provider or client contracts remove the gateway requirement, LiteLLM no longer provides the required bridges, or the repository adopts another shared boundary.
