# ADR-0048: Implement one portable Hetzner setup skill with client adapters

ID: ADR-0048
Title: Implement one portable Hetzner setup skill with client adapters
Status: Accepted
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: client-adapters, cross-platform, hetzner, node, portability, setup
Applies when: Implementing, evaluating or promoting the standalone Hetzner Inference setup skill.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-09-21
Gist: Keep one standalone Hetzner skill with explicit local, remote, manual, and client adapters; promote after current evidence in the implementation PR.

Variants: [Short](0048-implement-one-portable-hetzner-setup-skill-with-client-adapters.short.md) · [Long, canonical](0048-implement-one-portable-hetzner-setup-skill-with-client-adapters.long.md) · **Guide**

This guide is non-normative. [Long](0048-implement-one-portable-hetzner-setup-skill-with-client-adapters.long.md) is authoritative.

## How to apply

One skill keeps Hetzner discovery and protocol knowledge together while preserving separate local process and remote management responsibilities. A manual path is useful even when users cannot share administrative access.

- Expose setup/add clients, diagnosis, compatibility checks, local lifecycle, local repair/rotation and attributable rollback.
- Keep local diagnose, plan and status offline; clearly disclose authenticated remote inspection.
- Separate the remote management adapter from local process-identity rules.
- Local mutation consumes a current hash-bound plan, owned lock, revalidation and rollback manifest. Remote mutation consumes a current plan and records attributable route identity.
- Retain native host boundaries across Windows, macOS, Linux and WSL; client support is version- and evidence-specific.
- Promotion follows ADR-0006 and ADR-0008 in the same PR; no separate incubation release is required.

## Verification

- Exercise local/remote crossed with autonomous/manual, clear intent and ambiguous invocation.
- Prove manual mode reads no credential and makes no target request or configuration write.
- Run helper tests, realistic activation evals, economical platform checks and live acceptance; record remaining evidence gaps.

## Follow-up

Implement and verify the approved [Hetzner setup specification](../specs/hetzner-inference-setup-skill-spec.md).

## Revisit

Create a reciprocal successor ADR when the accepted decision changes.
