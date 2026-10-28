---
title: "Review-Fix Swarm"
slug: "review-fix-swarm"
artifact_path: "docs/specs/review-fix-swarm-spec.md"
mode: "standard"
status: "accepted"
owner: "stark-ai-de"
repo: "agent-skills"
created: "2026-10-16"
updated: "2026-10-16"
source_request: "Review PR 146, address outstanding feedback, document the feature, test, and update the existing PR last."
---

# Review-Fix Swarm

## Goal and scope

Provide a reusable, bounded post-implementation review, repair and behavior-preserving
simplification workflow. This slice repairs the incubator candidate in
[PR 146](https://github.com/stark-ai-de/agent-skills/pull/146), adds deterministic
regression coverage and runs a real CODEX pilot on five synthetic repositories.

The reviewed starting revision is `570c4fbfcdace63aa329ca25b26a31ea5b5c6e55`.
The candidate remains under `incubator/skills/engineering-workflows/review-fix-swarm/`.
Public admission, plugin projection changes, release, merge, global configuration
changes and actual HYBRID/Cloud qualification are outside this slice.

## User-facing behavior and requirements

- CODEX is the default: three independent, fresh-context reviewers cover correctness,
  active simplification and regressions. HYBRID is explicitly selected and replaces
  only the simplification reviewer with a real read-only Pi process.
- Freeze the merge-base and complete authorized feature snapshot, including staged,
  unstaged and non-ignored untracked files, renames/deletions and affected consumers.
  Record exclusions and preserve unrelated changes.
- Reviewers run under an enforced read-only parent/session. A writable coordinator
  actively starts a separate host-supported read-only session in the target cwd;
  inspect the CLI help for its supported sandbox option and confirm effective cwd,
  policy and external tool restrictions. CI mode is not a prerequisite. Instructions
  or a requested option alone do not establish isolation. Compare source/index
  fingerprints around review;
  mutation invalidates all affected review results and blocks triage. Missing
  enforced isolation produces BLOCKED before reviewer execution.
- Wait for all reviewers, verify/deduplicate claims and classify candidates as
  apply, retain or defer with evidence. Exactly one authorized fixer writes after
  the review phase ends, within the target repository's worktree policy.
- Zero P1/P2 findings never skips simplification. Inspect deletion, native/runtime
  features, declared dependencies and existing owners before adding abstraction.
  Preserve observable behavior, architecture, tests, trust and runtime boundaries.
- At most three total review rounds. Re-inventory after fixes and rescan the whole
  authorized scope before DONE. A last-round fix without fresh re-review is PARTIAL.
- Use supported effective configuration and affordable available models; prefer
  gpt-6-luna/medium, never silently switch models or repair configuration. Restart
  requirements stop execution. HYBRID failure never silently substitutes CODEX.
- Report actual agent/model/round counts, measured durations, categorized
  fixed-baseline code balance and removed maintenance obligations. Unknown costs
  are null. End states are DONE, PARTIAL, BLOCKED, RESTART_REQUIRED or MANUAL_ACTION.

## Fixture design and CLI contract

Use built-in Node APIs and Git without new dependencies. Require Node >=24.18.0
for this repository and honor its pinned pnpm/Bun toolchain. Spawn test Node
processes through process.execPath.

For fixture subprocesses remove inherited GIT_* variables; ignore global/system
Git configuration and disable synthetic commit signing, hooks and templates.
Do not change user configuration. Refuse an existing output, establish a new
repository and verify the real worktree and Git directory before staging/commit.
Both must belong to that output; do not accept Git indirection to another repository.

Commands remain list, prepare, grade and selftest. Grade preserves original test
bytes, allows additional tests, and separates mechanical checks from semantic
simplification. Remove the raw Number.isInteger text-count witness.

| Grade status          | Exit | passed | Meaning                                                                 |
| --------------------- | ---- | ------ | ----------------------------------------------------------------------- |
| passed                | 0    | true   | Mechanical requirements pass; no additional simplification adjudication |
| failed                | 1    | false  | Tests fail or original tests changed/deleted                            |
| execution error       | 2    | absent | Invalid input, child-process failure or timeout                         |
| needs_semantic_review | 3    | null   | Mechanical requirements pass; simplification remains unassessed         |

The simplified field remains null without independent semantic adjudication.
A semantic evaluation report examines the whole implementation diff, including
new files. Relocating duplication is rejected; a shared helper is accepted when
behavior is preserved, with or without explanatory comments. The CLI never
converts an unassessed simplification into an automatic pass.
Selftest succeeds when the five intended RED/GREEN baselines and pending semantic
state are correct; it does not claim model effectiveness.

## Architectural decisions

ADR required: no. Existing decisions govern this feature:
[ADR-0001](../adrs/0001-use-open-agent-skills-spec.short.md) ([Long, canonical](../adrs/0001-use-open-agent-skills-spec.long.md) · [Guide](../adrs/0001-use-open-agent-skills-spec.guide.md)),
[ADR-0007](../adrs/0007-keep-skill-evals-outside-runtime-payload.short.md) ([Long, canonical](../adrs/0007-keep-skill-evals-outside-runtime-payload.long.md) · [Guide](../adrs/0007-keep-skill-evals-outside-runtime-payload.guide.md)),
[ADR-0009](../adrs/0009-mark-incubator-skills-internal.short.md) ([Long, canonical](../adrs/0009-mark-incubator-skills-internal.long.md) · [Guide](../adrs/0009-mark-incubator-skills-internal.guide.md)),
[ADR-0029](../adrs/0029-keep-linked-worktrees-inside-the-repository.short.md) ([Long, canonical](../adrs/0029-keep-linked-worktrees-inside-the-repository.long.md) · [Guide](../adrs/0029-keep-linked-worktrees-inside-the-repository.guide.md)),
[ADR-0041](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.short.md) ([Long, canonical](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.long.md) · [Guide](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.guide.md)),
[ADR-0056](../adrs/0056-allow-reviewed-public-comparisons-while-protecting-private-provenance.short.md) ([Long, canonical](../adrs/0056-allow-reviewed-public-comparisons-while-protecting-private-provenance.long.md) · [Guide](../adrs/0056-allow-reviewed-public-comparisons-while-protecting-private-provenance.guide.md)),
[ADR-0060](../adrs/0060-allow-intent-bound-workflow-disclosure.short.md) ([Long, canonical](../adrs/0060-allow-intent-bound-workflow-disclosure.long.md) · [Guide](../adrs/0060-allow-intent-bound-workflow-disclosure.guide.md)), and
[ADR-0065](../adrs/0065-allow-explicit-direct-public-skill-releases.short.md) ([Long, canonical](../adrs/0065-allow-explicit-direct-public-skill-releases.long.md) · [Guide](../adrs/0065-allow-explicit-direct-public-skill-releases.guide.md)).
Runtime selection also follows [ADR-0054](../adrs/0054-select-repository-runtimes-through-an-advisory-evidence-matrix.short.md) ([Long, canonical](../adrs/0054-select-repository-runtimes-through-an-advisory-evidence-matrix.long.md) · [Guide](../adrs/0054-select-repository-runtimes-through-an-advisory-evidence-matrix.guide.md)) and [ADR-0055](../adrs/0055-use-pnpm-for-package-management-and-bun-for-execution.short.md) ([Long, canonical](../adrs/0055-use-pnpm-for-package-management-and-bun-for-execution.long.md) · [Guide](../adrs/0055-use-pnpm-for-package-management-and-bun-for-execution.guide.md)).
No successor decision or ADR acceptance gate is introduced.

Keep the incubator's boolean internal: true. The maintainer explicitly chose this
over the review's quoted-string suggestion: skills CLI 1.5.23 tests strict boolean
equality. Quoting the value would defeat default discovery exclusion.
This is a documented incubator compatibility deviation from string-only portable
metadata; do not claim portable metadata conformance or public admission.

## Source challenge and review coverage

- [Git hooks](https://git-scm.com/docs/githooks) documents clearing repository-local
  environment before invoking Git in a foreign repository.
- [Git environment](https://git-scm.com/docs/git) documents configuration overrides.
- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents#approvals-and-sandbox-controls)
  inherit parent sandbox/approval settings; custom instructions cannot create a
  separate read-only sandbox.
- [Agent Skills metadata](https://agentskills.io/specification#metadata-field)
  requires string values; [skills CLI 1.5.23](https://github.com/vercel-labs/skills/blob/v1.5.23/src/skills.ts#L105-L111)
  requires a boolean for internal exclusion.
- Repository package.json establishes Node >=24.18.0. The four open review threads
  concern Node, metadata, signing and reviewer isolation.
- [Additional fixture findings](https://github.com/stark-ai-de/agent-skills/pull/146#issuecomment-6210548043)
  cover Git write escape and false simplification results. Both were reproduced
  in disposable repositories. The current hosted failure is formatting in nine
  changed files; previous baseline selftest success is not remediation evidence.
- An identifying private maintainer-repository reference in the candidate is removed from public instructions; original provenance is preserved only in the ignored local area under ADR-0056.
- No actual CODEX/HYBRID A/B comparison or Cloud observation is inferred from
  deterministic checks or the local pilot.

## Implementation and artifact plan

1. Use an exclusive policy-compliant worktree from the current PR head; save and
   read back this accepted spec before implementation.
2. Repair the fixture helper, skill and affected reference/evaluation documents.
3. Add black-box fixture regression tests under skill-evals/review-fix-swarm/.
   Introduce pnpm run validate:review-fix-swarm and register its deterministic
   owning boundary in the existing aggregate and ownership consistency check.
4. Format affected files and update existing relevant spec/evaluation indices.
5. Run the deterministic checks and real local CODEX pilot, then inspect the
   integrated diff and record sanitized evidence under skill-evals/review-fix-swarm/.
6. Publish scoped changes to the existing PR branch without force-push; inspect
   hosted checks and new feedback. Answer/resolve findings with evidence and
   update the PR description as the last write action.

## Validation and acceptance

Regression tests cover all five original baselines; existing-output refusal;
foreign repository HEAD/index/staged/unstaged/untracked preservation under inherited
Git directory/index/object/configuration variables; hostile signing/hooks/templates;
relocated duplication and shared-helper/comment controls; original-test modification
and deletion, permitted additional tests, invalid inputs and subprocess errors.

Run pnpm run validate:review-fix-swarm, validate:skills, validate:ownership,
validate:scripts, validate:adrs, validate:runtime-matrix, lint and format:check. The final published revision must pass the
mandatory hosted Validate workflow. Local aggregate validation is selected only
when required by an owning boundary or mandatory gate under ADR-0041.

Run five CODEX cases sequentially on independent fixtures, using three fresh
reviewers per round under an enforced read-only session and at most one later
fixer. Repair the three RED cases, genuinely deduplicate duplicate-validators and
preserve distinct-contracts' different zero boundaries. Keep original tests.
Capture prompt/snapshot fingerprints, actual models/agents/rounds, wall time,
mechanical and independent semantic outcomes, and limitations. Missing isolation
or access remains BLOCKED; no fabricated successful run is permitted.

## User verification, risks and completion

On 2026-10-16 the maintainer selected a public English spec, real CODEX pilot,
boolean internal marker and independent semantic adjudication. The full plan was
then approved with an explicit instruction to implement it. Authority covers
this spec/index, scoped implementation/evaluation/validation edits, targeted staging,
commit, normal push and updating existing PR 146. It does not cover merge/release.

Primary risks are Git escape, inherited reviewer write authority and overstating
qualification. Regression coverage, enforced isolation and separate evidence
records address them. There is no data migration. Rollback is a scoped follow-up
revert preserving unrelated work.

Done when all six findings are fixed or addressed through the approved metadata
retention, formatting and required checks pass, CODEX pilot evidence is genuine,
the accepted spec is saved/read back and the existing PR is updated. Any blocked
mandatory proof remains explicitly incomplete rather than being called DONE.

Execution handoff: implement this accepted contract, reuse the maintainer's
implementation and publication authority, preserve existing ADRs and unrelated
work, execute the validation above, and report observed results and remaining gaps.

### Pilot-derived session safety

Every session start or resume must re-confirm its effective working directory and enforced read-only policy before any probe or reviewer launch. CLI resumption is not evidence that either property persisted. Orchestration Git reads use `GIT_OPTIONAL_LOCKS=0`; capture fingerprints immediately around each review phase so index stat-cache refreshes during preflight cannot masquerade as reviewer writes. A mismatched or writable resumed session is blocked and its results are not accepted as review evidence.
