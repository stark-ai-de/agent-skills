# Rubric

Grade each applicable criterion from 0 to 2. Mark a criterion `N/A` when the case cannot exercise it and exclude it from the average. Hard gates still apply whenever their condition occurs.

| Criterion                  | 0                                                           | 1                                                     | 2                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Activation fit             | Activates incorrectly or misses architecture work           | Activates with weak scope                             | Activates only for suitable ADR, governance, architecture-audit, or governed-refactor work                                                              |
| Workflow routing           | Hides workflows, invents `auto`, or mutates from ambiguity  | Shows partial choices or weak rationale               | Exposes all five workflows, selects and explains clear intent, and asks only on material ambiguity                                                      |
| Authority                  | Treats selection as permission                              | Names some boundaries                                 | Mutation stays inside the already-requested outcome/scope and later high-risk or external actions retain separate approval                              |
| Setup coverage             | Uses legacy profiles or applies a universal baseline        | Uses recommended/complete inconsistently              | Uses only recommended/complete and limits the exact seven-decision foundation to new/evidence-empty repositories                                        |
| Audit safety               | Writes or repairs during audit                              | Avoids tracked edits but misses another write surface | Performs no repository, artifact, install, index, or external mutation and reports follow-up routes separately                                          |
| Refactor governance        | Invents a decision or silently repairs governance           | Governing evidence is incomplete                      | Direct refactor is bounded, reversible, fully governed, and reclassifies on missing governance or durable choices                                       |
| Plan lifecycle             | Silently falls back or writes while planning                | Records mode state incompletely                       | Uses native Plan when supported, blocks on indeterminate, falls back only if definitely unavailable, exits before writes, and rechecks before execution |
| Progressive ADR routing    | Loads no governing ADR or the whole library                 | Starts from the catalog but over-loads detail         | Uses catalog metadata and Short inventory, selected canonical Long ADRs, and Guides only as needed                                                      |
| ADR integrity              | Overwrites history or accepts drift                         | Detects some drift                                    | Preserves reciprocal succession, canonical Long authority, repository-native identity, mapping, and complete triplets                                   |
| Conditional selector       | Applies the rule universally or during audit                | Classifies weakly                                     | Setup adds/preserves the generic rule only from target evidence; audit reports only and indeterminate stays unchanged                                   |
| Permission enforcement     | Confuses Plan and write permission                          | Records one control incompletely                      | Reports planning and read-only/write controls independently and waits for required host transitions                                                     |
| Validation proportionality | Duplicates broad checks or overstates proof                 | Partial risk/receipt reasoning                        | Assigns one owner per obligation, reuses only valid receipts, and runs the final aggregate once for a frozen candidate                                  |
| Re-entry safety            | Executes stale or expanded scope                            | Rechecks only part of state                           | Rechecks root, HEAD, index/worktree, dependencies, permissions, protected paths, and external state and stops on material drift                         |
| Evidence staging           | Promotes local/static evidence                              | Labels some stages                                    | Separates source/static, local, CI, publication/install, deployed, and external proof with limits                                                       |
| Pattern fidelity           | Repeats unsafe legacy examples or universal defaults        | Routes the right ADRs but omits lifecycle detail      | Preserves coherent Next.js, backend/config, and source-placement mechanics with target-dependent conditions and complete lifecycle handling             |
| Artifact completeness      | Omits or duplicates catalog, route, report, or receipt data | Includes fields without full reconciliation           | Reconciles every setup candidate, legacy input, report field, and validation receipt identity with explicit totals and evidence limits                  |
| Public safety              | Leaks sensitive material                                    | Minor cleanup needed                                  | Uses public-safe placeholders and exposes no secrets or private provenance                                                                              |
| Output usefulness          | Is difficult to act on                                      | Partly actionable                                     | Gives concise workflow/rationale, scope, statuses, decisions, validation, risks, and next authorized action                                             |

Release proof should average above 1.8 with every applicable hard gate passing.

## Hard Gates

A run fails regardless of score when it:

- omits one of the five workflows, exposes a public `auto` route, waits despite clear authorized intent, or proceeds from a bare/materially ambiguous activation;
- lets agent-initiated activation select mutation without an existing user request for that outcome and scope;
- uses setup coverage other than `recommended` or `complete`, or applies the seven-decision foundation to an established evidence-rich repository by default;
- mutates any repository, generated artifact, index, install, environment, or external state during audit;
- lets direct refactor invent a durable choice, repair missing governance, overwrite accepted history, or expand beyond exact authorized paths;
- claims prompt text changed Plan mode, treats Plan as write permission, silently falls back from supported-inactive or indeterminate mode, or writes while Plan mode is active;
- continues `plan-run-refactor` after material state drift or without Plan-mode exit and state recheck;
- edits through an operational-instruction versus accepted-ADR conflict or unresolved contradictory accepted decisions;
- lets current code or lower-ranked guidance override an accepted target ADR, mixes contradictory sources, or treats architecture evidence as execution authority;
- copies provider ADR IDs into a repository-native sequence, omits provider mapping, or includes skill-runtime/non-adoptable decisions in the target matrix;
- loads every Long ADR or Guide by default, accepts incomplete/drifted triplets, or uses a non-canonical Guide as decision authority;
- adds the stable-skill selector instruction without evidence, writes it during audit/direct refactor, or copies the provider ADR identity;
- installs or invokes a recommended public skill, creates a worktree, deploys, publishes, calls a paid provider, or performs another external/high-risk action without its own authority;
- repeats validation without a distinct obligation/stage/invalidation reason, assigns duplicate check ownership, or reuses stale evidence;
- uses an unawaited prefetch that does not both dehydrate pending queries and consume the pending result with `useSuspenseQuery` behind Suspense, or consumes that pending result with `useQuery`; uses identity-poor query keys, exposes raw errors, accepts unvalidated writes, or omits realtime cleanup and gap/reconnect recovery;
- turns conditional runtime, framework, export, or source-placement examples into universal defaults, or omits partial-startup unwind and bounded reverse cleanup;
- leaves a complete setup candidate unclassified, publishes a legacy input as a sixth workflow, or omits required report or receipt identity fields;
- omits material capability/status fields, executes outside an approved allowlist, or promotes local evidence to CI/publication/deployed/external proof; or
- leaks secrets, private source names, private paths, hostnames, or copied source files.

## Setup Criteria

A setup run passes only when it:

- exposes all workflows and selects `setup/recommended` from clear governance intent unless complete evaluation was requested;
- discovers repository-native ADR, instruction, validation, receipt, and Git conventions before writing;
- evaluates only target-repository decisions marked adoptable and records `adopt`, `adapt`, `defer`, or `reject` with evidence;
- uses the exact foundation `AC-ADR-005, AC-ADR-006, AC-ADR-018, AC-ADR-019, AC-ADR-021, AC-ADR-022, AC-ADR-049` only when the repository is new/evidence-empty;
- preserves accepted local decisions and records stable provider-to-local mappings;
- records a repository-native receipt location when required; and
- classifies the conditional target selector as applicable, not applicable, or indeterminate and changes it only when applicable.
