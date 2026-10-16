# ADR-0069: Protect SSH credentials, trust and target grants

ID: ADR-0069
Title: Protect SSH credentials, trust and target grants
Status: Accepted
Date: 2026-10-11
Owner: stark-ai-de
Scope: repository
Category: security-data
Tags: authorization, credentials, host-trust, ssh
Applies when: Authenticating SSH targets or exposing management actions.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-10-11
Gist: Credentials, explicit host trust and per-target human grants are shared policy across every access path.

Variants: **Short** · [Long, canonical](0069-protect-ssh-credentials-trust-and-target-grants.long.md) · [Guide](0069-protect-ssh-credentials-trust-and-target-grants.guide.md)

## Decision

Every SSH handshake, including each jump host, must verify its host key using read-only existing known_hosts and explicit locally confirmed pins. Unknown keys require actual operator confirmation; changed or revoked keys block access. Missing trust blocks an individual connection, not service startup. Operators grant capabilities per target; agents cannot grant rights, enter secrets, assert operator identity or extend credential/route assignments. Endpoint, credential or route changes invalidate affected grants and live or pending connections, including dependents. Arbitrary shell execution is a powerful write capability and regex filters are not a read-only security boundary. Credentials enter only trusted local setup or a trusted library embedder; MCP receives references and status. Support SSH agents, existing key-file references and a local Argon2id/AES-256-GCM vault with random separate data key, authenticated versioned metadata, password rewrapping and encrypted backup/restore. Vault lock blocks new decryptions while existing authenticated sessions remain usable. Audit defaults to metadata, terminal recording is optional and encrypted, and diagnostics never expose credential bytes. This is encryption at rest, not zero knowledge against the running SSH process.

## Context

The approved V1 supports powerful remote operations. Consistent domain enforcement prevents transport-specific bypasses. Automatic first-use trust and model-supplied confirmed/operator flags do not constitute a human decision. Separate data and wrapping keys allow password rotation without decrypting and rewriting every record.

## Consequences

Credentials, explicit host trust and per-target human grants are shared policy across every access path. Acceptance does not imply successful tests, installation or publication.
