# AC-ADR-019: Apply Security and Privacy Controls at Every Trust Boundary

ID: AC-ADR-019
Title: Apply Security and Privacy Controls at Every Trust Boundary
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: security-data
Tags: security, privacy, authorization, ai-safety
Applies when: Processing identity, credentials, untrusted input, authorization, logs, errors, browser data, model output, tools, or third-party access.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Treat every crossing of identity, privilege, data, code, or system ownership as a boundary that must fail closed.

Variants: [Short](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.short.md) · [Long, canonical](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.long.md) · **Guide**

> Non-normative implementation guidance. The Long variant is authoritative.

## Boundary inventory

For each browser, route, action, job, queue, webhook, database, model, tool, file, and third-party crossing, record:

- trusted and untrusted sides;
- data classification and approved purpose;
- authenticated principal and tenant or subject context;
- object- and action-level authorization rule;
- schema, size, rate, replay, and output controls;
- credential and capability scope;
- sanitized error and telemetry behavior;
- owner, negative tests, and manual-review requirement.

Start with externally reachable and elevated paths. Trace a representative request through all layers; a later service must not assume that an earlier UI or route performed the only required authorization.

## Focused security scenarios

- A valid user requests another user's or tenant's object.
- A valid identifier is paired with an unauthorized action.
- Input is structurally valid but semantically oversized, duplicated, stale, or unsafe.
- A webhook is unsigned, replayed, or delivered twice.
- A downstream dependency is unavailable or returns excessive data.
- An error contains a credential, private path, personal value, or raw provider payload.
- Retrieved content tells a model to ignore policy or call a sensitive tool.
- A tool receives a path, target, argument, or budget outside its allowlist.

For Supabase-style user operations, preserve the user's access context so row-level policies apply. Keep secret-key or other RLS-bypassing clients in small, server-only modules for named administrative operations and add negative tests proving they are not reachable from ordinary user flows.

## Evidence review

Scan the built client artifact and install payload when those stages are authorized; a source grep alone cannot prove that secrets or private files were excluded from a published bundle. Likewise, a local authorization test does not prove deployed database policies or provider-side retention settings. Record those as separate deployment or external checks.

## Official sources

- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html)
- [Supabase API keys and elevated access](https://supabase.com/docs/guides/api/api-keys)
- [Supabase secure data and row-level security](https://supabase.com/docs/guides/database/secure-data)
- [NIST Privacy Framework](https://www.nist.gov/privacy-framework)
