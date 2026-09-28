# AC-ADR-062: Cache test transforms without reusing correctness

ID: AC-ADR-062
Title: Cache test transforms without reusing correctness
Status: Accepted
Date: 2026-09-14
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: testing, transform-cache, invalidation, trust-boundaries, performance
Applies when: Persisting or restoring transformed test modules to reduce repeated validation work.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-14
Gist: Reuse transformation work only when inputs and trust match, while executing and proving validation independently.

Variants: [Short](ac-adr-062-cache-test-transforms-without-reusing-correctness.short.md) · [Long, canonical](ac-adr-062-cache-test-transforms-without-reusing-correctness.long.md) · **Guide**

This Guide is non-normative; the Long controls. Use the [testing outcome receipt](../assets/testing-outcome-receipt-template.md) in the target's existing evidence convention and the [Vitest 4 profile](../assets/vitest4-testing-profile.md) only when its stack applies.

The requested V4 profile uses `experimental.fsModuleCache` and `experimental.fsModuleCachePath`. Current V4 documentation describes incomplete default identity for some plugin inputs; use its cache-key extension or opt out when needed. Keep current APIs in this Guide, not the durable decision. Browser execution does not gain this cache automatically.

Use a project/runtime/config namespace and separate shard paths where appropriate. Add a cache-off switch and clear command. Remote keys should permit safe compatible reuse while including relevant input identities; immutable-cache services may need a content-relevant save suffix rather than repeatedly attempting to overwrite one key. Preserve the target package manager's dependency-cache policy separately.

Qualification examples: warm the cache, change a plugin-read JSON file, and verify the changed result; compare with caching disabled; remove the cache; supply a corrupt entry; attempt a cross-trust restore; test cleanup confined to the owned directory. Store raw timing samples and faults. A fresh passing test run remains necessary after every cache recovery.

## Related decisions

Use AC-ADR-025 for cache/performance budgets and AC-ADR-049 to distinguish transform reuse from reusable validation evidence.

## Sources

Current references: [V4 experimental cache](https://v4.vitest.dev/config/experimental), [GitHub cache semantics and access](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching).
