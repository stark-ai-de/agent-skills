# ADR Governance Setup Report

## Action

- Top-level action: `setup`
- Internal mode: `<setup-existing-repo | setup-new-repo>`
- Collaboration route: `<native decision phase | portable no-write fallback | direct execution>`
- Host capability evidence:
- Planning capability: `<Active - evidence | Available but inactive - evidence | Unavailable - evidence | Explicitly declined - user statement | Indeterminate - evidence | Not applicable>`
- Read-only enforcement: `<enforced - evidence | available but inactive - evidence | unavailable - evidence | explicitly declined - user statement | indeterminate - evidence | not applicable>`
- Plan-mode fallback: `<unavailable - evidence | explicitly declined - user statement | indeterminate - evidence | not used>`
- Architecture decision status: `<not required | pending | approved | blocked>`
- Execution status: `<not requested | ready for direct execution | pending Plan-mode exit | pending write permission | blocked | completed>`

## Inspected evidence

- Agent instructions:
- ADR paths:
- Architecture docs:
- Stack rules:
- Referenced examples:
- Validation docs/scripts:

## Files created or changed

| Path | Change | Purpose |
| ---- | ------ | ------- |
|      |        |         |

## ADR discovery and precedence

- ADR discovery paths:
- Accepted ADRs are binding: yes/no
- Conflict rule:
- Final-response reporting rule:

## Bundled guardrail adoption

- Decisions: `adopt`, `adapt`, `defer`, or `reject`. Use `defer` when the guardrail is kept for future repo growth but not active in the current slice.
- For `adapt`, fill the active adapted rule. For `defer`, fill the future trigger or owner condition. For `reject`, fill the user-confirmed rejection rationale.

| Guardrail                                       | Decision | Target evidence | Active or adapted rule | Future trigger or owner condition | User-confirmed rejection rationale |
| ----------------------------------------------- | -------- | --------------- | ---------------------- | --------------------------------- | ---------------------------------- |
| Workspace and source-role ownership             |          |                 |                        |                                   |                                    |
| Thin framework entrypoints                      |          |                 |                        |                                   |                                    |
| Server-only and browser-safe runtime boundaries |          |                 |                        |                                   |                                    |
| Request read/write boundaries                   |          |                 |                        |                                   |                                    |
| Backend runtime composition                     |          |                 |                        |                                   |                                    |
| Environment loading and config ownership        |          |                 |                        |                                   |                                    |
| Infrastructure placement outside runtime source |          |                 |                        |                                   |                                    |
| Export/import boundary policy                   |          |                 |                        |                                   |                                    |
| Oxc formatting and linting for JS/TS starters   |          |                 |                        |                                   |                                    |
| Validation and documentation promotion path     |          |                 |                        |                                   |                                    |

## Active or starter ADRs

| ADR | Status | Area | Notes |
| --- | ------ | ---- | ----- |
|     |        |      |       |

## Future usage prompts

```text
Use Architecture Compass in setup mode for this repo.
```

```text
Use Architecture Compass in refactor mode for this repo.
```

For feature work:

```text
Use Architecture Compass in refactor mode. Read the relevant ADRs first, then create an implementation placement map before editing code.
```

When that map requires a durable decision, use the host's planning and read-only controls when available and do not edit until the architecture checkpoint is approved.

## Open decisions

| Decision | Why unresolved | Recommended owner |
| -------- | -------------- | ----------------- |
|          |                |                   |

## Approved execution boundary

Include this section only when implementation was requested; otherwise omit it.

- Approved setup slice:
- Allowed target paths:
- Validation commands:
- Material assumptions:
- Execution permission transition: `<required before direct execution | required after native Plan exit | required after portable-fallback approval | not required>`
- Continuation: `<exact direct/native/portable-fallback continuation from references/host-collaboration-modes.md | not required>`

## Validation

- Commands run:
- Commands skipped and reason:
- Remaining risks:
