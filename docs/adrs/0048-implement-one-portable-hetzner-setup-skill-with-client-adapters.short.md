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
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-09-21
Gist: Keep one standalone Hetzner skill with explicit local, remote, manual, and client adapters; promote after current evidence in the implementation PR.

Variants: **Short** · [Long, canonical](0048-implement-one-portable-hetzner-setup-skill-with-client-adapters.long.md) · [Guide](0048-implement-one-portable-hetzner-setup-skill-with-client-adapters.guide.md)

## Decision

The repository will maintain one portable standalone Agent Skill named hetzner-inference-setup with explicit local and existing-remote targets, autonomous and manual execution modes, and optional client adapters. Dependency-free Node.js helpers orchestrate provider checks, configuration, protected credentials and owned local lifecycle; Python remains isolated to LiteLLM. Ask only for missing material choices and retain existing task authority. Keep manual guidance free of credential access and target mutation. Complete candidate evaluation and public promotion in the same implementation PR once quality, utility and maintenance evidence supports it; plugin membership remains a separate product decision.

## Context

One skill keeps Hetzner discovery and protocol knowledge together while preserving separate local process and remote management responsibilities. A manual path is useful even when users cannot share administrative access.

## Consequences

- Benefit: clear target, ownership and evidence boundaries.
- Tradeoff: installed versions and operating systems require current verification.
- Risk: provider and client contracts may change; unsupported paths must remain visibly unverified or blocked.

## Follow-up

Implement and verify the approved [Hetzner setup specification](../specs/hetzner-inference-setup-skill-spec.md).

## Revisit

Create a reciprocal successor ADR when the accepted decision changes.
