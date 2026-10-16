# Matched Codex vs Pi-hybrid benchmark

## Minimum fair protocol

1. Freeze one baseline revision **and** the exact feature snapshot, including any non-ignored untracked files. Create two isolated copies/worktrees A and B with identical content; retain snapshot fingerprints.
2. Enforce read-only reviewer parents/sessions, followed by one separate writer phase. Record actual effective sandbox/approval settings; custom agent prompts do not change inherited permissions. Reject changed source/index/HEAD fingerprints around review and block before launch if read-only enforcement is unavailable. Run in separate new agent contexts, with the same user task, allowed write scope, three reviewer roles, max rounds (3), concurrency ceiling, model reasoning effort and test plan. A uses native Codex for all roles; B replaces only the simplification reviewer with a read-only Pi subprocess.
3. Keep actual provider/model and cache/auth differences visible; matching model name does not establish matching serving path. Avoid running both arms in the same mutable checkout or counting overlapping asynchronous clocks as comparative wall time.
4. Time **wall-clock from beginning of precheck to final report**, as well as config/smoke work, each reviewer, triage/fixer, focused checks and final checks. Log actual process start/end and unexpected 4th reviews. No synthetic timings.
5. Evaluate blind against a source-grounded adjudicated list of real bugs and behavior-preserving simplification opportunities; also count introduced regressions, unneeded churn, contract breaks, missed/untracked scope and unresolved verification.
6. Record token input/output and spend for every model only if actually observed. Distinguish Pi estimated API pricing from OAuth/seat spend and from unknown Codex spend; unknown is `null` not `$0`. Include retries, failed agents and tool usage if measurable.

## Small scorecard

| Field                                                | A / Codex          | B / Hybrid         |
| ---------------------------------------------------- | ------------------ | ------------------ |
| Snapshot identifier, reviewed paths                  | required           | same               |
| Reviewers actually started, model/effort             | observed           | observed           |
| Wall time, phases and cold-start/smoke               | measured           | measured           |
| Verified bugs fixed / real simplifications applied   | adjudicated        | adjudicated        |
| Remaining known issues / introduced regressions      | observed           | observed           |
| Net production/test/other lines; removed obligations | categorized        | categorized        |
| Validated tests and unrun mandatory checks           | observed           | observed           |
| Token and cost source                                | observed / unknown | observed / unknown |

A round with no verified issues cannot establish relative quality; select several representative branches including seeded or historically known simplification candidates and negative controls. A single 9-vs-13-minute wall-time comparison with different start conditions is not a speed benchmark. Maintain the per-run measurement file as a test artifact, not a new mandatory repository tracking system.

Mechanical grades and independent semantic verdicts are separate observations. Exit 3 (`needs_semantic_review`) is not a failed behavioral test or a simplification pass. Inspect all implementation files and added helpers; record why responsibility was removed or retained.
