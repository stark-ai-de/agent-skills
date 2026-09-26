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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-26
Gist: Require Jev advice in adopting repositories while keeping activation, processing authority, current eligibility, qualification, and native fallback separate.

Variants: [Short](ac-adr-065-require-qualified-jev-host-advice-after-repository-adoption.short.md) · **Long, canonical** · [Guide](ac-adr-065-require-qualified-jev-host-advice-after-repository-adoption.guide.md)

## Context

A repository can require capability advice without owning a contributor's global agent configuration. Installing a skill or registering a reminder does not establish repository adoption, provider-processing authority, current capability eligibility, or practical host qualification. These boundaries need independent evidence so a governance requirement cannot silently become universal activation or an availability dependency.

## Decision

An adopting repository MUST explicitly accept a repository-native decision and record its mapping to this provider policy, authorized host scope, and operational prerequisite gaps. Adoption establishes an obligation to obtain qualified Jev capability advice; it MUST NOT activate a host, authorize TypeSafe processing, establish eligibility, or claim integration qualification by itself. Non-adopting repositories retain native selection without this obligation, including when the same global hook is loaded.

For an adopted and authorized scope, the host MUST consult Jev before substantive work on a new actionable task or after a material task-scope or available-capability change when activation, processing authority, and reliable current eligibility are established. Bootstrap inspection and consultation preparation precede substantive work; model-mediated advice is not advice before the first model step. Unchanged continuations, confirmations, status requests, and the consultation itself MUST NOT cause repeated requests. Uncertain continuity or eligibility cannot justify claiming that prior advice is current.

Advice MUST use the existing `general` selection profile and `current` retrieval policy, retain both eligible skills and tools, respect existing request and time limits, and preserve the distinct `selected`, `none`, `clarify`, `incomplete`, and `error` outcomes. It MUST NOT silently substitute `next_skill`. The host retains selection, activation, permissions, and execution, validates recommended capability IDs before use, and preserves explicit user skill choices and known invocation or account restrictions.

Capability eligibility MUST come from reliable current host evidence. Installed files, omitted restriction flags, another session, or stale or unverified metadata MUST NOT establish eligibility. A model-visible catalog MUST NOT be called a complete authoritative inventory without evidence of that coverage.

Actual TypeSafe processing MUST have existing explicit authorization for the repository, host, and data scope. Send only a minimal task summary and bounded approved capability metadata; exclude secrets, private paths, customer data, raw transcripts, unrelated content, and tool results. Model-mediated minimization MUST NOT be represented as a deterministic redactor. Fixed integration guidance MUST NOT interpolate hook input into instructions or send, log, or retain it.

Missing integration, authority, credentials, reliable inventory, or qualified evidence, and provider failure, timeout, or cancellation, MUST preserve otherwise authorized native selection and identify the unmet obligation without a new retry loop or false success claim. Repeated unchanged messages MUST NOT produce status spam. Existing Plan, read-only, and permission constraints remain effective for input preparation, catalog export, and receipt handling; if compliant preparation is unavailable, fall back without forbidden writes.

Architecture Compass setup MUST record the local adoption mapping, authorized hosts, and missing prerequisites without treating setup authority as global host activation or processing consent. Architecture Compass audit MUST only inspect and report existing evidence: no provider requests, qualification probes, configuration repair, repository writes, or host changes. Audit reports an unmet obligation instead of performing a consultation to fill the evidence gap.

Evidence MUST distinguish installation, configuration, effective activation and trust, processing authority, current inventory and restrictions, and practical qualification. Qualification claims MUST identify the exact observed host, runtime, configuration, model, and reasoning context and show native reminder delivery, actual advice, disposition, and preserved host ownership before substantive work. Documentation, registration presence, and controlled unit fixtures alone are insufficient. Material changes to those inputs invalidate dependent qualification. Publication remains a separate stage.

## Invariants

- Repository adoption, host-owner activation, and processing consent are separately scoped decisions.
- A global registration evaluates the current repository; a repository claim cannot supply missing host-owner authority.
- Missing or failed advice keeps native work available and compliance gaps visible.
- Audit cannot turn missing evidence into permission for a provider call or repair.
- The exact seven-decision setup foundation and finite public workflows remain unchanged.

## Consequences

Repositories gain an auditable advice requirement without silently activating contributors' hosts. Maintainers must keep scoped authority and qualification evidence current. Model-mediated trigger and minimization behavior remains fallible; bounded native observations and truthful fallback constrain claims without promising universal host support or guaranteed secret removal.
