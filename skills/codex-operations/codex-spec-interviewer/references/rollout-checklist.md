# Rollout Checklist

Use this reference when validating the skill itself or planning broader adoption of generated specs.

## Skill Test Plan

### Objective

Validate that `codex-spec-interviewer` routes correctly, asks high-value questions, and returns a Codex-ready spec without inventing repo facts.

### Test Inputs

- Compact task:
- Standard task:
- Deep task:
- Negative / should-not-trigger task:

### Routing Checks

- [ ] Triggers on under-specified coding tasks
- [ ] Does not trigger on already-complete specs
- [ ] Does not expand into implementation work

### Interview Quality Checks

- [ ] Questions are high-impact, not trivial
- [ ] Questions are asked one at a time when the answer affects the next decision
- [ ] Independent low-friction questions may be batched
- [ ] After each answer or evidence pass, assumptions are summarized
- [ ] Unknowns are labeled explicitly
- [ ] Discoverable questions are answered from repo evidence before asking the user
- [ ] Interview stops when uncertainty is low enough for the selected mode, with material unknowns resolved, accepted as non-blocking, or marked as blocking

### Output Artifact Checks

- [ ] Frontmatter is present
- [ ] Scope and non-goals are explicit
- [ ] Acceptance criteria are testable
- [ ] Validation commands are present or marked `unspecified`
- [ ] Risks/rollout notes appear for standard/deep work
- [ ] Source challenge section lists repo evidence, ADRs/specs, and external docs checked or intentionally skipped
- [ ] Stale or unsupported requirements are revised, deferred, or escalated into a preceding decision
- [ ] ADR gate classifies whether a durable architectural decision is needed
- [ ] Feature-specific details stay in the spec instead of becoming ADRs
- [ ] Final checkpoint verifies scope, non-goals, assumptions, risks, validation plan, ADR result, and artifact paths
- [ ] Clear existing spec conventions are used and reported; ambiguous destinations, new directories, overwrites, and ADR writes are confirmed before writes
- [ ] Spec and ADR paths follow repo conventions or are proposed clearly
- [ ] The spec is saved, ADR files are saved only when required, and existing files are not overwritten silently

### Execution Readiness Checks

- [ ] A Codex execution prompt is produced
- [ ] Another coding agent can act on the spec without another interview cycle
- [ ] No invented file paths or commands appear
- [ ] Saved artifacts are reported by path, or save-ready markdown is returned with the blocker

## Adoption Notes

- Pilot locally before broad installation.
- Run compact, standard, and deep trials against real but sanitized tasks.
- Revise description, question bank, templates, and examples based on observed misses.
- Add repo-local `AGENTS.md` references only after the workflow proves useful.
- Keep the skill narrow: interview plus spec creation, not implementation.

## Risk Checklist

| Risk / edge case                 | Recommended mitigation                                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Over-broad skill description     | keep description narrow, concrete, and honest                                                                               |
| Mega skill scope                 | limit the skill to interviewing and spec creation                                                                           |
| Invented repo facts              | mark unknowns as `unspecified`                                                                                              |
| Missing non-goals                | require explicit non-goals in standard/deep modes                                                                           |
| Missing validation commands      | require validation section even if marked `unspecified`                                                                     |
| Premature final spec             | use the final checkpoint and block unresolved material decisions                                                            |
| Version-mismatched guidance      | inspect repo reality before asking detailed questions                                                                       |
| Stale ADR or named requirement   | challenge briefly and propose a preceding ADR/spec update if needed                                                         |
| ADR spam                         | create ADRs only for durable architectural or repo-level decisions                                                          |
| Missing architecture decision    | block or phase implementation until the ADR decision is explicit                                                            |
| Over-research                    | challenge only material decisions; do not re-evaluate everything                                                            |
| Hidden migrations / rollout risk | force rollout/rollback notes for standard/deep modes                                                                        |
| Surprise file churn              | use clear spec conventions, confirm ambiguous or risky writes, create ADRs only when required, and refuse silent overwrites |
| Sensitive examples               | use sanitized placeholders only                                                                                             |
| Prompt-injection style wording   | avoid hypey routing text and keep references curated                                                                        |
| Too many interview questions     | ask one high-impact question at a time unless independent questions can be batched                                          |
