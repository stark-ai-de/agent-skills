# ADR-0058: Require qualified Jev host advice after repository adoption

ID: ADR-0058
Title: Require qualified Jev host advice after repository adoption
Status: Accepted
Date: 2026-09-25
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: architecture-compass, jev, host-advice, adoption, qualification
Applies when: Publishing or adopting a repository policy for qualified Jev advice through explicitly enabled agent hosts.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-09-26
Gist: Require qualified Jev advice after explicit repository adoption while retaining separate host activation, processing authorization and native fallback.

Variants: **Short** · [Long, canonical](0058-require-qualified-jev-host-advice-after-repository-adoption.long.md) · [Guide](0058-require-qualified-jev-host-advice-after-repository-adoption.guide.md)

## Decision

We will expose an explicitly adoptable Architecture Compass policy requiring qualified host-mediated Jev capability advice before substantive work on new or materially changed tasks, including material changes to available capabilities, in adopting repositories. Repository adoption establishes a governance obligation; it does not activate a host, authorize TypeSafe processing, establish capability eligibility or qualify an integration. Host activation and authorization to process a minimal task summary and bounded approved capability metadata remain separate, explicit and scoped prerequisites. When those prerequisites and current host eligibility evidence are established, the host obtains advice and retains responsibility for selection, activation, permissions and execution. Missing prerequisites, unavailable or stale inventory, provider failure, timeout and cancellation retain native selection while making the unfulfilled obligation visible; they do not block unrelated authorized work. Native selection remains the default outside the opted-in scope. Architecture Compass setup records adoption and the required host evidence, while audit reports the evidence without changing configuration. Installation, configuration, actual host qualification and publication remain distinct evidence stages.

## Context

ADR-0057 permits qualified optional host advice. Repositories that deliberately adopt a Jev requirement need a portable way to record that obligation and inspect its evidence without implicitly configuring every contributor's host. This accepted decision preserves ADR-0057. Public policy promotion, host activation and practical qualification remain separate implementation stages.

## Consequences

- Good: adopting repositories can state and audit the same host-advice obligation.
- Tradeoff: host activation, processing authorization and qualification remain separately managed.
- Risk: a model-mediated reminder can be skipped or use incomplete evidence; native fallback must retain a visible unmet obligation.
