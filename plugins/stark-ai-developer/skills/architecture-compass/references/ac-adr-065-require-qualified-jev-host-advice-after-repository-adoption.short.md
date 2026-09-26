# AC-ADR-065: Require Qualified Jev Host Advice after Repository Adoption

ID: AC-ADR-065
Title: Require Qualified Jev Host Advice after Repository Adoption
Status: Accepted
Date: 2026-09-26
Owner: stark-ai-de
Scope: target-repository
Category: governance
Tags: jev, host-advice, adoption, authorization, eligibility, qualification
Applies when: A repository elects to require qualified Jev capability advice through explicitly authorized agent hosts.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-26
Gist: Require Jev advice in adopting repositories while keeping activation, processing authority, current eligibility, qualification, and native fallback separate.

Variants: **Short** · [Long, canonical](ac-adr-065-require-qualified-jev-host-advice-after-repository-adoption.long.md) · [Guide](ac-adr-065-require-qualified-jev-host-advice-after-repository-adoption.guide.md)

## Context and Problem Statement

Repository governance can require Jev advice while contributor hosts, provider processing, and capability eligibility remain separately controlled. A configured reminder alone does not prove a qualified consultation.

## Decision Outcome

Chosen option: **explicit repository adoption with independently evidenced operational prerequisites and native fallback**.

- Map an accepted repository-native decision to this policy; record authorized hosts and prerequisite gaps. Adoption does not activate hooks, authorize TypeSafe processing, establish eligibility, or qualify a host. Non-adopting repositories retain native selection.
- For adopted, activated, and processing-authorized scopes with reliable current eligibility, consult Jev before substantive work on new actionable tasks or material task/capability changes. Use `general/current`, eligible skills and tools, existing limits, and distinct advice outcomes. Do not silently choose `next_skill` or repeat advice for unchanged continuations, status, confirmations, or the consultation itself.
- Preserve host selection, permissions, explicit user choices, and known restrictions; validate recommended IDs. Installed files, missing flags, stale or other-session metadata do not establish current eligibility or complete inventory coverage.
- Send only the explicitly authorized minimal task summary and bounded approved metadata. Exclude secrets, private paths, customer data, raw transcripts, unrelated content, and tool results. Fixed guidance cannot interpolate or transmit hook input; model-mediated minimization is not a deterministic redactor.
- Missing prerequisites or qualification, failure, timeout, or cancellation preserve native work and expose the unmet obligation without retries or repeated status noise. Preparation and receipts must respect Plan/read-only constraints.
- Setup records adoption and host evidence. Audit inspects existing evidence only: no provider requests, probes, repair, or writes.
- Separate installed, configured, active/trusted, processing-authorized, current inventory, and qualified states. Qualification identifies exact host/runtime/configuration/model/reasoning and observed native advice; documentation or fixtures alone do not qualify it. Requalify after material drift; publication is separate.

## Decision summary

Require qualified Jev advice only after explicit local adoption and independent operational authority; preserve current eligibility, bounded processing, host ownership, read-only audit, and native fallback with visible unmet obligations.
