# AC-ADR-012: Resolve Environment and Configuration at Deployable Boundaries

ID: AC-ADR-012
Title: Resolve Environment and Configuration at Deployable Boundaries
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: runtime-platform
Tags: environment, configuration, secrets, deployables, validation, bootstrap
Applies when: A deployable app reads environment variables, secrets, ports, URLs, feature configuration, or runtime configuration.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Resolve environment-source policy before application bootstrap, then validate once into explicit typed configuration.

Variants: **Short** · [Long, canonical](ac-adr-012-resolve-environment-and-configuration-at-deployable-boundaries.long.md) · [Guide](ac-adr-012-resolve-environment-and-configuration-at-deployable-boundaries.guide.md)

## Decision summary

- The launcher, runtime command, process manager, or deployment platform selects environment-file and secret-injection policy before application code starts.
- `main` does not discover or load dotenv files. It passes the already-resolved environment into an app-local parser.
- Each deployable owns one schema that normalizes aliases, validates required values and relationships, applies safe defaults, and produces an immutable typed config.
- Runtime code receives config explicitly. Scattered reads from `process.env`, repeated parsing, and import-time environment capture are prohibited outside the config boundary.
- Public and server-only configuration are separate contracts. Secret values never enter client bundles, logs, errors, generated docs, or test snapshots.
- Source precedence, per-environment requirements, development conveniences, rotation behavior, and failure policy are documented and tested.

Use [AC-ADR-019](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.short.md) ([Long, canonical](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.long.md) · [Guide](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.guide.md)) for secret and exposure controls.
