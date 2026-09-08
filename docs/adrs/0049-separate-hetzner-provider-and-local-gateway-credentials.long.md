# ADR-0049: Separate Hetzner provider and local gateway credentials

ID: ADR-0049
Title: Separate Hetzner provider and local gateway credentials
Status: Proposed
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: security-data
Tags: credentials, hetzner, least-privilege, litellm, local-gateway, secrets
Applies when: Storing, launching, exposing, rotating, or removing credentials for the local Hetzner Inference gateway.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-26
Gist: Keep the upstream token behind the gateway, use a protected machine-local administrative gateway key, bind to loopback, and make rotation and cleanup explicit.

Variants: [Short](0049-separate-hetzner-provider-and-local-gateway-credentials.short.md) · **Long, canonical** · [Guide](0049-separate-hetzner-provider-and-local-gateway-credentials.guide.md)

## Decision

The Hetzner setup skill will keep the upstream Hetzner token and local LiteLLM master key as separate secrets; store neither value in repositories, generated client profiles, command arguments, logs, shell startup files, roaming profiles, or global environment state; and bind the gateway to loopback by default. The portable baseline will use protected machine-local per-user secret files, inject values only into the minimum child environment, verify host-specific permissions before use, redact all evidence, preserve credentials during ordinary rollback, and describe the database-free LiteLLM master key as an administrative gateway credential rather than a scoped client key.

## Decision invariants

1. **Two credentials, two purposes.** `HETZNER_INFERENCE_API_KEY` authenticates LiteLLM upstream; `LITELLM_MASTER_KEY` authenticates local clients to the proxy.
2. **The provider token stays behind the gateway.** Client profiles and UI instructions never contain it.
3. **The local key is administrative.** Generate one random `sk-`-prefixed master key; never call it scoped or least-privilege.
4. **Scoped keys are separate architecture.** Database-backed virtual keys remain outside the workstation baseline.
5. **Storage is protected and machine-local.** Use local per-user roots; Windows uses `%LOCALAPPDATA%`, never roaming AppData.
6. **No global persistence.** Do not use shell profiles, global environments, `direnv`, service definitions, generated config values, or committed `.env` files.
7. **Minimal process exposure.** Read secrets immediately before use, pass only required values to the intended child, and never place them in arguments.
8. **Loopback by default.** Non-loopback binding requires explicit approval, TLS and network controls, and a separate security decision.
9. **Redacted evidence.** Logs, manifests, backups, tests, errors, and support bundles contain no secret or reversible encoding.
10. **Preserving rollback.** Ordinary rollback retains credentials; deletion is a separate destructive action.
11. **Explicit UI disclosure.** A client UI may receive only the local key after explicit user action.
12. **No prompt logging by default.** Disable request and response body logging and verbose environment diagnostics.
13. **Rotation is attributable.** Rotate one credential through a current plan without persisting an automatic copy of the old value.

## Why

- The upstream token is more powerful than a loopback proxy credential.
- Separate credentials permit independent rotation.
- Command arguments, shell history, global environments, generated config, and roaming profiles are poor secret channels.
- LiteLLM's master key is administrative; virtual keys are database-backed.
- Unix permissions and Windows ACLs require different verification.
- Loopback materially reduces the workstation attack surface.

## Options

- **Chosen:** Protected machine-local files, separate provider and administrative gateway keys, child-process injection, loopback, redaction, and explicit rotation or deletion.
- **Rejected:** Put the provider token in every client; exposure multiplies.
- **Rejected:** Reuse one key; a local leak becomes an upstream leak.
- **Rejected:** Call the master key scoped; that would overstate isolation.
- **Rejected:** Add PostgreSQL-backed virtual keys to the first workstation version.
- **Rejected:** Make native keychains mandatory; portable support cannot assume them on every target.
- **Rejected:** Store secrets in roaming or global state.
- **Rejected:** Delete credentials during normal rollback.
- **Rejected:** Listen on all interfaces for convenience.

## Consequences

- **Good:** Client configuration is inspectable without the provider token.
- **Good:** Diagnostics prove paths and permissions without values.
- **Good:** Rollback is repeatable and non-destructive.
- **Tradeoff:** Selected clients share an administrative loopback key.
- **Tradeoff:** Cursor may require explicit manual entry.
- **Risk:** Same-user malware can still read files; this narrows exposure but is not an OS security boundary.
- **Risk:** Debug output can serialize environments; exact-value redaction tests and disabled verbose modes mitigate it.

## Follow-up

- Implement secure creation, permissions, generation, redaction, rotation, and rollback.
- State the administrative scope of the local key in every client receipt.
- Consider optional keychain or virtual-key adapters only through later decisions with migration paths.

## Revisit

Create a successor ADR when LiteLLM supports database-free scoped credentials, the repository mandates keychains, or a central gateway replaces per-user credentials.
