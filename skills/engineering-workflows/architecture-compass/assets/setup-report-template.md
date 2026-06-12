# ADR Governance Setup Report

## Action

- Top-level action: `setup`
- Internal mode: `<setup-existing-repo | setup-new-repo>`

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

## Open decisions

| Decision | Why unresolved | Recommended owner |
| -------- | -------------- | ----------------- |
|          |                |                   |

## Validation

- Commands run:
- Commands skipped and reason:
- Remaining risks:
