# ADR-Guided Refactor Report

## Action and mode

Top-level action: `refactor`

Internal mode:

`audit | refactor | new-implementation | new-repo-bootstrap | pr-review | docs-sync | stack-deviation`

Collaboration route:

`native decision phase | portable no-write fallback | direct execution | read-only audit | review`

Host capability evidence:

Planning capability: `<Active - evidence | Available but inactive - evidence | Unavailable - evidence | Explicitly declined - user statement | Indeterminate - evidence | Not applicable>`

Read-only enforcement: `<enforced - evidence | available but inactive - evidence | unavailable - evidence | explicitly declined - user statement | indeterminate - evidence | not applicable>`

Plan-mode fallback: `<unavailable - evidence | explicitly declined - user statement | indeterminate - evidence | not used>`

Architecture decision status: `<not required | pending | approved | blocked>`

Execution status: `<not requested | ready for direct execution | pending Plan-mode exit | pending write permission | blocked | completed>`

## Inspected evidence

| Evidence                | Status                                | Notes |
| ----------------------- | ------------------------------------- | ----- |
| ADRs                    | inspected / unavailable / not present |       |
| Agent instructions      | inspected / unavailable / not present |       |
| Stack rules             | inspected / unavailable / not present |       |
| Representative examples | inspected / unavailable / not present |       |
| Validation commands     | inspected / unavailable / not present |       |

## Rule-set summary

| Rule | Provenance | Applies to | Strength |
| ---- | ---------- | ---------- | -------- |
|      |            |            |          |

## Gap report

| Severity                       | File or area | Drift | Rule | Recommended change |
| ------------------------------ | ------------ | ----- | ---- | ------------------ |
| blocking / important / cleanup |              |       |      |                    |

## Proposed slices

1. Slice name:
   - Scope:
   - Files:
   - Behavior change: yes/no
   - Validation:

## Approved execution boundary

Include this section only when implementation was requested; otherwise omit it.

- Approved slice:
- Allowed target paths:
- Validation commands:
- Material assumptions:
- Execution permission transition: `<required before direct execution | required after native Plan exit | required after portable-fallback approval | not required>`
- Continuation: `<exact direct/native/portable-fallback continuation from references/host-collaboration-modes.md | not required>`
- Pre-execution state recheck: passed / material drift found / not applicable

## Docs or ADR updates

- Required:
- Optional:
- Not needed because:

## Stack-deviation result

- Preferred option considered:
- Gap:
- Chosen option:
- Docs update needed:

## Validation

```bash
# commands
```

Result:

- Passed:
- Failed:
- Skipped with reason:

## Remaining risks

-

## Done when

-
