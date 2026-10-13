# Review-Fix Swarm — pilot acceptance cases

Run these manually on independent disposable feature snapshots, with fresh agent contexts. This is an **evaluation plan, not results**. Use public-safe synthetic examples or authorized real work. Never seed failures into production branches.

| Case | Fixture / request | Required behavior |
| --- | --- | --- |
| S1: No P1/P2, duplication exists | Two identical owned validators behind trivial wrappers; tests already green | Simplify reviewer finds candidate, fixer removes genuinely redundant layer, tests preserve behavior; no early exit on zero bugs |
| S2: Similar text, different contracts | Two adapters differ in nullability, error type or cancellation | Retain separately or defer until equivalence proven; no unsafe deduplication |
| S3: Untracked UI file | New non-ignored component is untracked but in authorized feature scope | Inventory and reviewers include it and its consumers; report file coverage accurately |
| S4: Bad regression | Fix passes focused test but breaks a consumer | Fresh round discovers regression; one fixer repairs, targeted consumer tests run |
| S5: Already minimal | No proven bug or meaningful simplification | Stop after first round, zero writes; justify inspected opportunities, no fabricated work |
| S6: Pi failure | Pi unavailable, nonzero exit, empty response or write-capable extension | HYBRID reports BLOCKED; no silent Codex fallback or pretend Pi review |
| S7: Config needs restart | Supported config change requires process restart | Back up/validate with authority; RESTART_REQUIRED before starting agents; no hidden continuation |
| S8: Misleading code reduction | Removing tests shrinks LOC; replacing helper adds more owned complexity | Reject unjustified deletion, report production/test/total balance separately |
| S9: Dirty worktree + missing source | Existing unrelated edit, rename and untracked file | Preserve originals, avoid stash/reset/index actions, classify omissions and blocked write scope |
| S10: Timing comparison | A/B share start snapshot but run with different smoke passes or extra reviewer | Flag protocol mismatch; do not claim relative wall-time/model-cost superiority |

## Grading

For each arm, score: complete scope (+ untracked), verified bug recall, verified simplification recall, correctness after fixes, avoidable churn, evidence quality, real agent launches, accurate stop condition, and timing/cost provenance. A candidate "PASS" requires no contract-breaking edits, no silent file omissions and no unauthorized operations; feature effectiveness remains **unproven** until evaluated against adjudicated positive and negative fixtures.
