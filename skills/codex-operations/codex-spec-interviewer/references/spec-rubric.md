# Spec Rubric

Use this before finalizing the implementation spec.

## Mode Selection

| Mode       | Use when                                                                         | Required depth                                        |
| ---------- | -------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `compact`  | one-file or tightly scoped feature/bugfix with low ambiguity                     | enough to implement safely in one sitting             |
| `standard` | default for most features, bugfixes, refactors, migrations                       | explicit requirements, file plan, validation, risks   |
| `deep`     | repo-wide refactor, architecture change, migration, multi-team or phased rollout | requirements, design, phased tasks, rollout, rollback |

## Required Sections

| Section                            | Compact   | Standard | Deep     |
| ---------------------------------- | --------- | -------- | -------- |
| Frontmatter                        | required  | required | required |
| Goal                               | required  | required | required |
| Scope                              | required  | required | required |
| Non-goals                          | optional  | required | required |
| Repo context                       | required  | required | required |
| Assumptions / open questions       | required  | required | required |
| Requirements / acceptance criteria | required  | required | required |
| ADR gate                           | required  | required | required |
| Design notes                       | optional  | required | required |
| Task breakdown                     | light     | required | required |
| Validation commands                | required  | required | required |
| Source challenge                   | required  | required | required |
| Risks / rollout                    | optional  | required | required |
| Artifact path / persistence        | path only | required | required |
| Done when                          | required  | required | required |

## Acceptance Criteria Bar

- Specificity: no vague "handle appropriately" language.
- Testability: at least one concrete verification route exists.
- Bounded scope: non-goals and exclusions are explicit.
- Repo fit: references actual repo files and commands when known.
- Source fit: important decisions are checked against repo instructions, ADRs, current code, and current external docs when relevant.
- ADR fit: durable architectural decisions are captured in ADRs, while feature-specific details remain in the spec.
- Persistence fit: the skill uses clear repo conventions without ceremony, confirms ambiguous or risky destinations, saves the spec by default, keeps compact specs to an artifact path line, saves ADR files only when required, and uses chat output only after an explicit persistence decline or blocker.
- Safety: risky changes have migration or rollback notes.
- Codex readiness: a coding agent can act without another discovery loop.
- User verification: the final scope, non-goals, assumptions, risks, validation plan, ADR result, and artifact paths were confirmed by the user before final spec creation.
- Persistence: the spec is saved to `docs/specs/<kebab-slug>-spec.md` or the repo-approved equivalent, and required ADRs are saved to the repo's ADR folder.
- Documentation propagation: existing relevant repo-facing files are updated when the spec or ADR changes contributor expectations, promotion state, install behavior, trigger behavior, or public catalog docs; missing docs require user approval before creation.

## Final Self-Check

- Is the goal explicit?
- Are non-goals explicit?
- Are acceptance criteria testable?
- Are validation commands concrete?
- Are unknowns labeled rather than invented?
- Are all material unknowns resolved, source-backed, or explicitly verified by the user as non-blocking?
- Were named requirements and important assumptions challenged against the best available sources?
- Did the ADR gate classify architectural decisions correctly?
- Does the spec reference ADRs instead of duplicating durable architecture rationale?
- Did the final checkpoint verify scope, non-goals, assumptions, risks, validation, ADR status, and artifact paths?
- Are any unresolved decisions clearly blocking, non-blocking, or accepted by the user?
- Was any required ADR persisted to the repo and indexed where the repo expects?
- Was the spec persisted to the repo with the approved filename pattern?
- Did the user approve final artifact paths and confirm the checkpoint before creation?
- Were existing related docs updated when the artifact changes repo operation or promotion/public-catalog state, and was user approval obtained before creating missing docs?
- Is any skipped source challenge justified?
- Could Codex implement this without another interview cycle?
