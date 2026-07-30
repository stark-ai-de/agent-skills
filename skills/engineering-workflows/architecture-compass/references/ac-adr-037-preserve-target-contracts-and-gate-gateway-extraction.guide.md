# AC-ADR-037: Preserve Target Contracts and Gate Gateway Extraction

ID: AC-ADR-037
Title: Preserve Target Contracts and Gate Gateway Extraction
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: repository-architecture
Tags: target-contracts, gateways, isolation, reuse
Applies when: Routing a skill across execution hosts, splitting variants, or extracting a shared agent or model gateway.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Preserve target behavior across hosts and extract gateways only after independent reuse and fail-closed isolation are proven.

Variants: [Short](ac-adr-037-preserve-target-contracts-and-gate-gateway-extraction.short.md) · [Long, canonical](ac-adr-037-preserve-target-contracts-and-gate-gateway-extraction.long.md) · **Guide**

This guide is non-normative. The canonical Long decision controls target preservation and gateway extraction.

## Target comparison

Compare skill name and description, required input, target evidence, permission boundary, artifacts, final handoff, and failure behavior across hosts. Route host-only differences through [AC-ADR-035](ac-adr-035-classify-skill-portability-before-choosing-host-variants.short.md); do not rename the target merely because another agent launches it.

## Gateway gate record

| Gate                        | Required evidence                                                      | Status |
| --------------------------- | ---------------------------------------------------------------------- | ------ |
| Second independent consumer | named owner, real protocol use, lifecycle and failure parity           |        |
| Filesystem                  | denied-by-default roots, symlink and traversal tests                   |        |
| Process/tool                | allowlisted execution, complete tree termination, no ambient tools     |        |
| Network                     | explicit destinations, loopback/egress policy, timeout and size bounds |        |
| Environment/credentials     | minimal inheritance, scoped references, redacted logs                  |        |
| Lifecycle                   | concurrency, disconnect, cancellation, cleanup, quotas, observability  |        |

## Decision lineage

- `generalizes`: [ADR-0028](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.long.md).

## Current references

- [OWASP least privilege guidance](https://owasp.org/www-community/Access_Control)
- [NIST Secure Software Development Framework](https://csrc.nist.gov/pubs/sp/800/218/final)

## Revisit

Create a successor if a standard host-provided gateway supplies stronger verified containment. Re-test isolation whenever deployment, tools, credentials, or consumers change.
