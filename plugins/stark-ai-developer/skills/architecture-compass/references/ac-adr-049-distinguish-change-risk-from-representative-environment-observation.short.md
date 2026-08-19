# AC-ADR-049: Distinguish Change Risk From Representative Environment Observation

ID: AC-ADR-049
Title: Distinguish Change Risk From Representative Environment Observation
Status: Accepted
Date: 2026-07-29
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: testing, validation-cadence, evidence-reuse, risk-classification, environment-evidence
Applies when: Implementing, refactoring, delegating, resuming, or validating a bounded change.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: AC-ADR-047
Superseded by: none
Guide verified: 2026-07-29
Gist: Classify risk by changed contracts while treating representative environments as proof locations rather than automatic risk triggers.

Variants: **Short** · [Long, canonical](ac-adr-049-distinguish-change-risk-from-representative-environment-observation.long.md) · [Guide](ac-adr-049-distinguish-change-risk-from-representative-environment-observation.guide.md)

## Decision summary

Repositories plan validation from mandatory gates, changed-contract proof, uncertainty, and reusable current evidence. Every proof obligation receives one owner and one of four internal cadences: `reuse`, `final-batch`, `checkpointed`, or `reproduce-first`. Risk follows the changed contract and its blast radius, not merely the observation environment. Low risk is limited to a non-behavioral or established localized adjustment with deterministic acceptance, one owning boundary, easy reversal and diagnosis, and no external-runtime, infrastructure, public, trust, data, high, or critical contract change. Such an adjustment may still require representative environment observation. A reversible behavioral change contained within one owning boundary is moderate when it does not qualify as low and has no high or critical trigger. Coupled, uncertain, boundary-changing, high, or critical work receives stronger classification and focused earlier checkpoints.

Receipts identify the proof obligation, subject, candidate fingerprint, command or scenario, harness and toolchain, exactly one canonical evidence stage, separate environment, explicit status, observation or result, freshness, owner, contracts, limitations, invalidators, and repository-native location. Required local and pre-deployment gates run first. When environment behavior remains relevant, the exact candidate artifact is checked in an available representative Preview. Only when Preview is unavailable or not representative may an already-authorized low-risk reversible adjustment receive bounded production observation of the exact already-authorized artifact. That observation never tests an external-runtime, infrastructure, public, trust, or data change, replaces a mandatory gate, or grants deployment authority. Moderate, high, and critical work never uses production as the first substitute.

## Context

AC-ADR-047 made low and moderate risk disjoint but excluded every external-runtime dependency from low while reserving production fallback for low-risk environment evidence. This successor preserves its full proof, cadence, receipt, Preview-first, and safety contract while separating change risk from where evidence is observed.

## Invariants

- Risk follows the changed contract and blast radius; observation location alone neither raises nor lowers it.
- A changed external-runtime, infrastructure, public, trust, or data contract is never low risk.
- Mandatory gates and changed observable contracts remain proved at their owning boundary.
- Receipt reuse includes the command or scenario and keeps stage, environment, status, and result distinct.
- Preview and production evidence never grant deployment or production authority.
- Production only observes an exact already-authorized low-risk artifact and never replaces a mandatory gate.

## Consequences

Risk classification remains repeatable while representative observation becomes reachable for otherwise low, established, localized adjustments. Runtime, infrastructure, public, trust, and data changes stay outside the production fallback, and evidence claims become consistent with the canonical stage and status schema.
