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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-30
Gist: Resolve environment-source policy before application bootstrap, then validate once into explicit typed configuration.

Variants: [Short](ac-adr-012-resolve-environment-and-configuration-at-deployable-boundaries.short.md) · **Long, canonical** · [Guide](ac-adr-012-resolve-environment-and-configuration-at-deployable-boundaries.guide.md)

## Context

Runtimes and platforms load environment values differently. Loading dotenv inside `main` can be too late for import-time code, can conflict with runtime auto-loading, and hides precedence from operators. Reading raw environment throughout the application creates inconsistent defaults, weak validation, and accidental secret exposure.

## Decision

### Resolve sources before bootstrap

The deployable boundary owns how values enter the process. Package scripts, runtime flags, a process manager, container or orchestration configuration, and the deployment platform select files, injected variables, and precedence before importing or running application bootstrap. Production secrets come from an approved secret delivery mechanism, not checked-in environment files.

Application `main` does not search for or load dotenv files and does not mutate the source environment to emulate another environment. Local development commands may select an explicit file, while deployment uses its configured injection mechanism. The chosen policy states whether runtime defaults are enabled, which source wins, and how accidental fallback is prevented.

### Validate once per deployable

Each independently deployed application owns a configuration module that accepts an environment-like input and returns immutable typed config. It:

- maps supported legacy or platform aliases to one canonical field;
- parses strings into domain types instead of relying on truthiness or implicit coercion;
- validates required values, formats, ranges, mutually dependent settings, and environment-specific constraints;
- applies only safe and documented defaults;
- rejects invalid production configuration before accepting traffic or work;
- exposes separate server-only and explicitly public shapes.

Aliases have deterministic precedence and a removal plan. Empty strings are handled deliberately. A required secret has no insecure fallback. The parser may be called in isolated tests with an explicit object; runtime composition calls it once for the process configuration.

### Pass typed configuration explicitly

Runtime composition receives resolved environment and passes parsed configuration or narrowed sections to clients and services. Domain code, shared packages, routes, and UI modules do not read `process.env` directly. This keeps shared packages deployable-agnostic and makes configuration dependencies testable.

Any import-time configuration read is treated as a boundary exception and must be proven compatible with the runtime's source-resolution timing. Config values and parse errors are sanitized: logs may name missing or invalid keys, but never include secret values. Client-exposed variables are allowlisted and reviewed as public data even if a framework prefixes them.

### Operate changes safely

Configuration changes document rollout order, compatibility window, owner, and rollback. Rotation-sensitive clients either read refreshed credentials through an approved dynamic mechanism or declare that a process restart is required. Feature flags and remotely mutable product policy are not disguised as static environment variables when they need auditing or live updates.

## Consequences

Configuration failures occur early and consistently, and runtime dependencies are explicit. Launch commands require slightly more care because source selection is no longer hidden inside application code.

## Validation

- Unit-test required, optional, empty, malformed, alias, precedence, and cross-field cases without modifying the real process environment.
- Start each deployable using its documented local, test, and production-like source-selection path.
- Prove production fails closed when a required secret is absent.
- Inspect client artifacts, logs, errors, reports, and snapshots for secret leakage.
- Test any alias migration and rotation/restart procedure in both forward and rollback directions.
