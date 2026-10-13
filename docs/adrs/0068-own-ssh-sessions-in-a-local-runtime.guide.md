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
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-10-11
Gist: A loopback daemon owns SSH lifetime independently of agent and viewer clients.

Variants: [Short](0068-own-ssh-sessions-in-a-local-runtime.short.md) · [Long, canonical](0068-own-ssh-sessions-in-a-local-runtime.long.md) · **Guide**

This guide is non-normative. [Long](0068-own-ssh-sessions-in-a-local-runtime.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

Test client EOF, SSH drop and daemon restart separately. Persist enough metadata to label plain sessions lost and recover tmux only after checking the remote session. Enforce bounded replay and authenticated writer leases. Distinguish local Linux results from native macOS/Windows and live host qualification.

## Verification

Run `pnpm run test:ssh` and the changed projection checks. Acceptance of the architecture is not test evidence or publication authorization. Record unrun native-host and operating-system gates explicitly.

## Revisit

Create a successor when the ownership or security boundary changes, with reciprocal metadata.
