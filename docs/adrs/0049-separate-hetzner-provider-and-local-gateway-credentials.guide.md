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
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-26
Gist: Keep the upstream token behind the gateway, use a protected machine-local administrative gateway key, bind to loopback, and make rotation and cleanup explicit.

Variants: [Short](0049-separate-hetzner-provider-and-local-gateway-credentials.short.md) · [Long, canonical](0049-separate-hetzner-provider-and-local-gateway-credentials.long.md) · **Guide**

This guide is non-normative. [Long](0049-separate-hetzner-provider-and-local-gateway-credentials.long.md) is authoritative.

## How to apply

Resolve machine-local roots through the host adapter:

- Linux and WSL config: `${XDG_CONFIG_HOME:-$HOME/.config}/stark-ai/hetzner-inference`
- Linux and WSL state: `${XDG_STATE_HOME:-$HOME/.local/state}/stark-ai/hetzner-inference`
- macOS config and state: `~/Library/Application Support/stark-ai/hetzner-inference`
- Windows config and state: `%LOCALAPPDATA%\stark-ai\hetzner-inference`

Store secrets separately:

```text
secrets/
├── hetzner-api-key
└── litellm-master-key
```

Generate the local key with a cryptographically secure random source, prefix it with `sk-`, and validate it against the exact LiteLLM version. Do not derive it from the provider token or machine identity.

Host checks:

- Linux, WSL, and macOS: directories `0700`, files `0600`, regular files only, no symlink traversal, current-user ownership.
- Windows: local non-roaming root, regular files only, no reparse redirect, narrowly bounded ACLs, and normalized principal checks.
- Every host: reject empty, multiline, whitespace-altered, NUL-containing, oversized, or concurrently changed values.

Generated `config.yaml` references environment names only. Launchers read the files, build the minimum child environment, start the exact owned executable, and never echo values.

Client authentication:

- Codex uses command-backed auth that prints only the local master key to the requesting process.
- Claude Code uses a supported `apiKeyHelper` or bounded launcher.
- Cursor receives the local key only through explicit guided manual action.
- Every receipt says the key is administrative.
- No client receives the Hetzner token.

Rotation validates all non-secret state before stopping the proxy, replaces only the selected secret atomically, revalidates permissions, invalidates stale receipts, and restarts only when requested. The workflow never persists an automatic old-secret backup.

## Verification

- Search generated artifacts, manifests, backups, logs, errors, and test output for exact secrets and reversible encodings.
- Fail before secret read or launch when permissions are broader than policy.
- Confirm process listings and commands contain neither secret.
- Confirm Windows never resolves the root through roaming AppData.
- Confirm the proxy is reachable only on loopback.
- Confirm an invalid local key fails before an upstream request.
- Confirm the provider token never appears in client config, receipts, clipboard output, or UI instructions.
- Confirm receipts call the local key administrative and never scoped.
- Confirm ordinary rollback preserves both files.
- Confirm deletion requires a separate explicit action and reports paths only.
- Confirm rotating one key leaves the other unchanged.
- Confirm prompt and response logging stays disabled.

## Current references

- [Hetzner Experiments Inference API](https://docs.hetzner.com/general/company-and-policy/experiments/inference/)
- [LiteLLM Proxy quick start](https://docs.litellm.ai/docs/proxy/quick_start)
- [LiteLLM virtual keys](https://docs.litellm.ai/docs/proxy/virtual_keys)
- [Anthropic Claude Code LLM gateway](https://docs.anthropic.com/en/docs/claude-code/llm-gateway)
- [ADR-0014](0014-prefer-node-skill-helper-scripts.short.md) ([Long, canonical](0014-prefer-node-skill-helper-scripts.long.md) · [Guide](0014-prefer-node-skill-helper-scripts.guide.md))

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all variants and reciprocal metadata together.
