# ADR-0068: Own SSH sessions in a local runtime

ID: ADR-0068
Title: Own SSH sessions in a local runtime
Status: Accepted
Date: 2026-10-11
Owner: stark-ai-de
Scope: repository
Category: runtime-platform
Tags: lifecycle, local-runtime, sessions, ssh
Applies when: Starting local SSH services or recovering sessions.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-10-11
Gist: A loopback daemon owns SSH lifetime independently of agent and viewer clients.

Variants: [Short](0068-own-ssh-sessions-in-a-local-runtime.short.md) · **Long, canonical** · [Guide](0068-own-ssh-sessions-in-a-local-runtime.guide.md)

## Decision

One authenticated local runtime per operating-system user owns durable profile metadata and live SSH connections, PTYs, jobs and tunnels. It binds only to loopback with client authentication and browser Origin/Host validation. Windows, WSL, Linux and macOS use native separate state directories; credentials and mutable stores are not copied between operating environments. Demand startup does not tie session lifetime to the MCP or viewer process. Client detach, SSH loss, service restart and target restart are distinct events. Plain PTYs become lost after SSH loss or daemon restart. Optional already-installed Unix tmux sessions may be reattached after fresh authorized authentication; tmux is never installed automatically, and target restart normally loses it. Reconnect never replays jobs or claims a lost terminal continued. Bounded buffers, client backpressure, channel timeouts, resource limits and versioned recoverable state are required.

## Why

An SSH connection is not a remote process supervisor. Separating client, daemon and target lifetimes prevents silent loss or duplicated execution. The local deployment matches the first product without adding cloud infrastructure.

## Options

- Chosen: the approved local reusable management design with explicit boundaries.
- Rejected: transport-owned policy or automatic privilege/trust escalation.

## Consequences

Independent consumers and target-specific packages can evolve without changing the SSH domain. Additional lifecycle and security tests are required. Native and publication evidence remain separate from architecture acceptance.

## Follow-up

Test client EOF, SSH drop and daemon restart separately. Persist enough metadata to label plain sessions lost and recover tmux only after checking the remote session. Enforce bounded replay and authenticated writer leases. Distinguish local Linux results from native macOS/Windows and live host qualification.
