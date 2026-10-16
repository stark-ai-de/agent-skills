# Local CODEX pilot and PR 146 remediation receipt

Date: 2026-10-16. Starting PR revision: `570c4fbfcdace63aa329ca25b26a31ea5b5c6e55`.

**Five of five final fixture implementations pass behavioral and independent semantic adjudication. Workflow qualification remains PARTIAL.** Index-proof gaps and runtime incidents prevent claiming a fully conformant end-to-end workflow. This local experiment does not qualify HYBRID/Pi, Codex Cloud, external consumers or public promotion.

## Reproducible evidence

The [machine-readable receipt](2026-10-16-codex-pilot.json) contains initial/final SHA-256 manifests, complete final synthetic sources, prompt hashes, external grades, audited native launch counts, parent durations and observed parent-only token counters. Raw session identifiers, runtime transcripts and private configuration remain local. The [accepted specification](../../../docs/specs/review-fix-swarm-spec.md) defines the feature and remediation contract.

Observed environment: Linux/NixOS WSL, Node 24.22.0, Git 2.54.0, pnpm 11.24.0, Bun 1.4.2 and Codex CLI 0.162.1. Review parents used enforced read-only sessions and rejected Node write probes with EROFS; fixer sessions were separate. Three fresh reviewers per scored round have matching native creation receipts, directly audited `fork_turns: none` arguments and completion evidence before the collected parent result. Child models and individual child durations were not recorded. The first scored zero-case parent used gpt-6-sol/medium; other scored parents used gpt-6-luna/medium.

| Case                 | Baseline | Final external tests | Scored rounds / native reviewers | Fixers                           | Independent decision                                                                  |
| -------------------- | -------- | -------------------- | -------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------- |
| zero-is-present      | RED      | 3/3                  | 3 / 9                            | 1, resumed for follow-up cleanup | Accept 0/-0; preserve other falsy rejection and kind contract                         |
| duplicate-validators | GREEN    | 2/2                  | 3 / 9                            | 1                                | One shared predicate, both named exports retained                                     |
| distinct-contracts   | GREEN    | 2/2                  | 1 / 3                            | 0                                | Retain distinct zero boundaries without code changes                                  |
| untracked-component  | RED      | 3/3                  | 2 / 6                            | 1                                | Include originally untracked source; preserve empty label and other fallback behavior |
| regression-guard     | RED      | 4/4                  | 2 / 6                            | 1                                | Zero becomes normal; other falsy, nullish, negative and high cases preserved          |

Totals: 11 scored rounds, 33 audited native creation calls and 33 matching receipts, four fixer identities across separate fixtures. Each fixer was the sole writer for its fixture. All original test bytes remain unchanged. Independent root assertions additionally covered false/empty/NaN, negative zero, missing fields and numeric/type boundaries. Tests run outside the reviewer CLI and mechanical grade JSONs supply the canonical test counts.

The duplicate-validator mechanical grade remains exit 3, `needs_semantic_review`, with `passed: null` and `simplified: null`. Independent inspection accepts its single shared responsibility. The offline relocation/shared-helper/comment controls likewise remain mechanically pending: moving two predicates into different files is not deduplication; a genuine shared helper remains valid with an explanatory comment.

Pilot production balance against the original complete snapshots is +6/-5, net +1 physical line. Tests, docs, scripts and generated categories each have zero added/removed lines inside fixtures. The originally untracked chip is part of the baseline. The substantive simplification removes a second owner of the identical limit predicate; fewer lines or faster execution are not claimed. Zero's second fixer invocation removes a redundant type guard introduced by its first fix.

## Protocol deviations and runtime limits

- Distinct-contracts retained source, tests, TASK, HEAD and ref hashes. Its raw index hash changed, and timing relative to review is inconclusive because preflight used ordinary `git status`. Staged blob entries stayed unchanged. Duplicate-validator index bytes also changed during CLI execution. Whole `.git` immutability and index immutability across every earlier phase are not established; those phases do not satisfy the full snapshot gate.
- Two preliminary ephemeral zero-case coordinators, one Luna and one Sol, were unscored diagnostics without launch-audited transcripts. They changed no source but remain disclosed overhead. This is not a clean matched comparison.
- Duplicate round 2 already had completed reviewer messages. Requiring a particular explicit wait-tool spelling caused an unnecessary third round, which retained the same result. All three rounds count toward the ceiling.
- Untracked round 2 initially timed out with exit 124. Explicitly setting the verified fixture cwd and read-only mode resumed the same parent and collected its original reviewers without new launches. An earlier resume invocation instead used the outer checkout with writable permissions; its exact five-byte probe was verified and removed. That attempt was blocked. Session cwd and permissions must be rechecked on every start/resume before probes or agents.
- Internal exec CreateProcess ENOENT warnings in duplicate round 2 and untracked round 1 remain unresolved; the attempted executable and root cause were not established. A successful final source result does not imply a clean runtime.
- Parent durations come from persisted session start to task completion and can include resume gaps. Individual child durations, full pilot elapsed time, child usage and total cost are unavailable. Parent-only counters do not establish total usage. No speed or cost comparison is made.

The skill and copyable prompts now require re-confirming cwd/read-only enforcement on start or resume, and `GIT_OPTIONAL_LOCKS=0` for orchestration Git reads. Future qualification must rerun with complete per-phase index evidence; this receipt cannot retroactively supply it.

## Finding dispositions and repository checks

- Node gate: corrected to >=24.18.0; local Node 24.22.0 was exercised, Cloud was not.
- Metadata: retain boolean `internal: true` under ADR-0009 and the explicit maintainer decision. Pinned skills CLI 1.5.23 discovery hides the incubator by default and shows it with `INSTALL_INTERNAL_SKILLS=1`. This is a documented string-only metadata compatibility deviation, not portable conformance.
- Signing/configuration: synthetic Git ignores inherited Git variables and host global/system config, hooks and templates; fixture commits disable signing without modifying user settings.
- Git escape: verify the actual worktree/Git directory before staging and commit; regressions preserve an outer repository's HEAD, index, source and object bytes under environment injection.
- Simplification witness: remove the text-count verdict; require independent whole-diff adjudication with explicit pending status.
- Reviewer authority: require enforced read-only parents, separate writer phases, actual launch/completion evidence and snapshot checks; block missing enforcement or mutation.
- Privacy: remove identifying private maintainer provenance from public candidate instructions; preserve the original only in ignored local provenance under ADR-0056.

`pnpm run validate:review-fix-swarm`: **14/14 regression tests pass**, covering all five baselines, Git environment/configuration isolation, semantic controls, original-test integrity, extra tests, existing destination refusal, invalid inputs, indirect Git directories and timeout handling. `validate:skills`, `validate:ownership`, `validate:scripts`, lint and formatting pass locally. The skills validator reports five pre-existing warnings in unrelated public skills. The final published revision's mandatory hosted Validate result is recorded by PR checks separately. Local aggregate validation was not selected merely for finalization under ADR-0041.

The Karakeep start check returned `needs_setup`; no adopted project policy exists, no content was uploaded and adoption remains pending.

## Main integration

Before final publication, main advanced to `6984886b61b0cce820be14bc5119bbf5acbc29fb` through the Karakeep and Portless PRs. An ordinary merge preserves those changes and adds the Swarm gate alongside Karakeep. The three additive conflicts were in package scripts, validation ownership and its required-ID check. Fixture sources and the helper digest remain unchanged, so the pilot is not rerun. Ownership, skills, lint, deterministic fixtures, script validation and formatting are checked on the integrated tree; hosted checks qualify the resulting published revision separately.
