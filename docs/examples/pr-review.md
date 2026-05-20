# PR Review Example

Prompt:

```text
Use $pr-review on the current diff.
```

Expected report shape:

```md
## Findings

- High: `src/cache.ts:42` stores failed lookups forever, so transient 500s become permanent until restart.
- Medium: `src/cache.test.ts` covers the happy path but not failed lookup eviction.

## Open Questions

- Should a failed lookup be retried immediately or after a short cooldown?

## Summary

The change is close, but the cache failure path needs a behavior fix and regression test before merge.
```
