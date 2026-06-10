# Rule Extraction and Conflict Resolution

Use this reference before applying any bundled pattern. The target repository’s accepted rules are the source of truth for existing implementation decisions. In setup and new-repo modes, bundled ADR guardrails are adoption candidates that must be explicitly adopted, adapted, deferred, or rejected.

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

Evidence ranking does not mean bundled guardrails disappear when target evidence exists. In setup and new-repo modes, inspect every bundled guardrail and record an adoption decision. Absence of target evidence is not a reason to omit a guardrail. If a guardrail does not fit the current implementation slice, defer it with a future trigger. Contrary target evidence blocks silent adoption and requires an explicit user decision.

## Rule-set format

When extracting rules, maintain a short working table:

| Rule                     | Provenance            | Applies to           | Strength              | Notes                                                 |
| ------------------------ | --------------------- | -------------------- | --------------------- | ----------------------------------------------------- |
| Keep route files thin    | target ADR            | App Router routes    | required              | Delegates to screen components or route helpers       |
| Use server-only sentinel | bundled ADR candidate | `lib/server-only/**` | required when adopted | Defer if no server-only framework boundary exists yet |

Strength values:

- `required`: must be followed unless the user approves an ADR change.
- `preferred`: should be followed unless a documented reason exists.
- `example`: use as shape guidance, not a mandatory rule.
- `assumption`: mark clearly and avoid broad edits until confirmed.

## Conflict handling

When rules conflict:

- Treat accepted target ADRs as binding for refactor work.
- In setup mode, treat target ADRs that contradict bundled guardrails as conflict evidence, not automatic permission to omit the bundled guardrail.
- Prefer accepted docs over undocumented current drift.
- Prefer specific local rules over broad generic rules.
- Prefer current official framework requirements over stale examples when the framework behavior changed.
- Do not silently merge conflicting rules into a compromise. Report the conflict.
- If a bundled guardrail does not fit the current slice, record it as `defer` with the future repo condition that would activate it.
- If target evidence points toward rejecting a bundled guardrail, ask an interview-style question and record the user-confirmed rationale.

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

Do not use target examples to erase a bundled ADR guardrail unless they are tied to accepted target ADRs or the user explicitly confirms rejection.

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
