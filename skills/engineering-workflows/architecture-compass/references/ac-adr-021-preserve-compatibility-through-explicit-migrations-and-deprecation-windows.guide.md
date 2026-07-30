# AC-ADR-021: Preserve Compatibility Through Explicit Migrations and Deprecation Windows

ID: AC-ADR-021
Title: Preserve Compatibility Through Explicit Migrations and Deprecation Windows
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: migration, compatibility, deprecation, data-change
Applies when: Changing schemas, APIs, events, public exports, runtimes, stored data, or accepted ADR contracts.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Declare compatibility direction and move through observable expand, migrate, and contract stages with an owned exit.

Variants: [Short](ac-adr-021-preserve-compatibility-through-explicit-migrations-and-deprecation-windows.short.md) · [Long, canonical](ac-adr-021-preserve-compatibility-through-explicit-migrations-and-deprecation-windows.long.md) · **Guide**

> Non-normative implementation guidance. The Long variant is authoritative.

## Migration worksheet

Before implementation, fill in:

```text
Surface and owner:
Known producers and consumers:
Stored or in-flight representations:
Compatibility direction and supported matrix:
Expand change:
Producer/consumer rollout order:
Backfill or translation process:
Reconciliation query or metric:
Deprecation deadline and owner:
Last reversible point:
Stop conditions:
Rollback or recovery procedure:
Contract/removal authorization:
```

For a column replacement, a common sequence is: add the new nullable representation; deploy readers that tolerate both; deploy writers that maintain the transition contract; run a resumable backfill; reconcile old and new; move reads; stop the old write path; observe; then separately approve and apply the destructive removal. Adapt the sequence to the actual database and consistency model.

For public packages or APIs, test both old-consumer/new-provider and new-consumer/old-provider combinations that the declared window supports. Search known consumers, publish the deprecation through their normal channel, and measure use where privacy and platform controls permit it.

For a TypeScript 7 transition, inventory direct `tsc` callers separately from compiler-API, transformer, embedded-language, framework, editor, and plugin consumers. Expand by adding the stable TypeScript 7 lane and named TypeScript 6 compatibility commands; migrate supported callers with diagnostic and build comparisons; contract only after every compatibility consumer has current support or an explicitly retained owner and removal condition. A successful TypeScript 7 CLI check does not prove a Next.js build, VS Code or Cursor plugin, or embedded-language workflow has migrated.

## Verification by stage

- **Source/static:** inventory references, schemas, exports, events, jobs, and fallback code.
- **Local:** migrate representative old fixtures forward; test mixed-version combinations, retries, rollback, and repeated backfill.
- **CI:** run the supported version matrix and migration fixtures in a clean environment.
- **Publication/install:** verify the actual artifact exposes the intended compatibility surface.
- **Deployed/production:** verify migration counts, reconciliation, errors, latency, and the rollback window.
- **External:** obtain direct consumer or provider confirmation when the boundary is not controlled by the repository.

## Decision lineage

- `generalizes`: [ADR-0035](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0035-use-stable-native-typescript-with-a-compatibility-lane.long.md).

## Official sources

- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/ddl-alter.html)
- [Kubernetes API deprecation policy](https://kubernetes.io/docs/reference/using-api/deprecation-policy/)
- [Semantic Versioning](https://semver.org/)
- [Google SRE: data integrity](https://sre.google/sre-book/data-integrity/)
