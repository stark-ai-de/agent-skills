# Rubric

Grade each run from 0 to 2 for each criterion.

| Criterion           | 0                                            | 1                                              | 2                                                                                                                                                     |
| ------------------- | -------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Activation fit      | Activates incorrectly or misses obvious case | Activates but with weak scope                  | Activates only for suitable ADR/pattern tasks                                                                                                         |
| Evidence inspection | Skips target repo evidence                   | Inspects some evidence                         | Inspects ADRs, docs, stack rules, examples, and validation where relevant                                                                             |
| Rule extraction     | Produces vague best practices                | Extracts rules but misses provenance/conflicts | Produces a clear rule set with provenance and conflict handling                                                                                       |
| File-role mapping   | Does not classify files                      | Classifies some files                          | Classifies all touched files by role and runtime boundary                                                                                             |
| Refactor safety     | Suggests broad or risky rewrites             | Suggests mostly safe changes                   | Uses minimal reversible slices with validation                                                                                                        |
| Setup-mode support  | Does not install durable guardrails          | Creates partial ADR or agent docs              | Creates/updates agent instructions, ADR index, bundled guardrail adoption decisions, stack rules where relevant, future prompts, and validation notes |
| New repo support    | Only handles existing repos                  | Provides partial bootstrap guidance            | Produces ADR, docs, stack, layout, examples, and validation plan                                                                                      |
| Documentation sync  | Ignores docs                                 | Mentions docs vaguely                          | Updates or proposes only relevant canonical docs/indexes                                                                                              |
| Public safety       | Leaks private names or copied examples       | Minor cleanup needed                           | Uses only generic placeholders and no private links                                                                                                   |
| Output usefulness   | Hard to act on                               | Partially actionable                           | Clear gap report, file map, patches or plan, validation, and risks                                                                                    |

Promotion recommendation:

- Average below 1.5: keep incubating.
- Average 1.5 to 1.8: improve references and activation description.
- Average above 1.8 with no public-safety failures: eligible for maintainer promotion review.

## Setup-mode criteria

A setup-mode run passes only when it:

- discovers existing ADR and docs conventions before creating files,
- creates or updates agent instructions that make accepted ADRs binding,
- creates or updates an ADR index or reports why none should be created,
- records adopt/adapt/defer/reject decisions for bundled guardrails,
- keeps deferred guardrails visible with a future trigger and challenges rejected guardrails instead of dropping them silently,
- includes future setup/refactor prompts,
- marks open architectural decisions instead of inventing missing facts.
