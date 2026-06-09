# Rule Extraction and Conflict Resolution

Use this reference before applying any bundled pattern. The target repository’s accepted rules are the source of truth.

## Evidence ranking

Rank evidence in this order unless the user says otherwise:

1. Explicit user instruction in the current task.
2. Accepted target-repository ADRs and superseding ADRs.
3. Target-repository architecture docs, stack rules, and agent instructions.
4. Representative target-repository examples identified as approved patterns.
5. Consistent current code practice in the touched area.
6. Bundled pattern references in this skill.
7. General framework defaults or assumptions.

Do not treat a current code example as approved when it contradicts an accepted ADR. Treat it as drift unless the user or repo docs identify it as the newer accepted pattern.

## Rule-set format

When extracting rules, maintain a short working table:

| Rule                     | Provenance      | Applies to           | Strength                      | Notes                                             |
| ------------------------ | --------------- | -------------------- | ----------------------------- | ------------------------------------------------- |
| Keep route files thin    | target ADR      | App Router routes    | required                      | Delegates to screen components or route helpers   |
| Use server-only sentinel | bundled pattern | `lib/server-only/**` | required when pattern applies | Mark unavailable if framework does not support it |

Strength values:

- `required`: must be followed unless the user approves an ADR change.
- `preferred`: should be followed unless a documented reason exists.
- `example`: use as shape guidance, not a mandatory rule.
- `assumption`: mark clearly and avoid broad edits until confirmed.

## Conflict handling

When rules conflict:

- Prefer target ADRs over bundled references.
- Prefer accepted docs over undocumented current drift.
- Prefer specific local rules over broad generic rules.
- Prefer current official framework requirements over stale examples when the framework behavior changed.
- Do not silently merge conflicting rules into a compromise. Report the conflict.

Conflict output:

```text
Conflict: <short name>
Evidence A: <file or source category>
Evidence B: <file or source category>
Impact: <what implementation decision is blocked>
Recommendation: <ask maintainer, draft ADR, limit scope, or follow accepted ADR>
```

## Target examples versus bundled examples

Use target examples first when they exist and match accepted rules. Use bundled examples only as generic shape guidance when the target repo lacks examples or the user asks for a starter pattern.

When using bundled examples:

- Rename placeholders to the target repo’s actual conventions.
- Adapt import aliases and package names.
- Preserve runtime boundaries and file responsibilities.
- Do not copy a snippet blindly if the target repo’s stack differs.

## Public-safety normalization

Never include private source-repository links or project-specific names in public skill outputs, examples, references, evals, or assets. Use neutral placeholders:

- `<web-app>` for a frontend app.
- `<docs-app>` for a docs app.
- `<backend-service>` for a long-running worker or service.
- `<feature>` for a product screen or domain feature.
- `<resource>` or `<entity>` for data examples.
- `<domain-core>` for a shared domain package.
- `<tooling>` for reusable repo tooling.

## ADR gate for target repos

A new or updated ADR is likely required when the task changes:

- source ownership across apps or packages,
- request read/write boundary policy,
- server-only or browser-safe runtime boundaries,
- backend service composition or DI policy,
- env/config loading policy,
- infrastructure placement policy,
- public package exports,
- validation or source-shape enforcement policy.

A new ADR is usually not required for:

- applying an existing ADR to one feature,
- moving files to match current rules,
- adding tests or validation commands under current policy,
- small implementation details that do not change durable architecture.
