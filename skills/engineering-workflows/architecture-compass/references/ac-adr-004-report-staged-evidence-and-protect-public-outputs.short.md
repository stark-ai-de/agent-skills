# AC-ADR-004: Report Staged Evidence and Protect Public Outputs

ID: AC-ADR-004
Title: Report Staged Evidence and Protect Public Outputs
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: quality-delivery
Tags: evidence, public-safety, delivery
Applies when: Architecture Compass reports validation, completion, release readiness, deployment, or content intended for persistence or publication.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Tie every claim to its actual evidence stage and keep secrets and private provenance out of public artifacts.

Variants: **Short** · [Long, canonical](ac-adr-004-report-staged-evidence-and-protect-public-outputs.long.md) · [Guide](ac-adr-004-report-staged-evidence-and-protect-public-outputs.guide.md)

## Decision summary

Architecture Compass distinguishes source/static, local, CI, publication/install, deployed/production, and external/third-party evidence. A result at one stage never proves a later stage. Reports identify the stage, status, subject, command or source, freshness, and limitations of each material claim.

Secret values are forbidden in prompts, commands, logs, reports, and artifacts. Public persisted outputs also exclude customer data, private repository paths or links, internal hostnames, and private comparison provenance. Exact private paths may appear only in the authorized task report when they are needed to define or verify that task's boundary.

## Read next

Read the [Long variant](ac-adr-004-report-staged-evidence-and-protect-public-outputs.long.md) before claiming completion or producing public artifacts. Use the [Guide](ac-adr-004-report-staged-evidence-and-protect-public-outputs.guide.md) for evidence tables and normalization examples.
