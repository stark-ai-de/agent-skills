# Copy-and-run test prompt

Use in a **new Codex session opened in the chosen finished feature checkout**. Replace the two values in the first lines. For a fair A/B, use **separate clean worktrees or equivalent immutable snapshots**, identical feature contents and base, same round/check budget. Do not run A and B on the same mutable working tree.

```text
You are my autonomous post-feature REVIEW + FIX + SIMPLIFY orchestrator.

MODE = CODEX              # For arm B set HYBRID
BASE_BRANCH = auto-detect # Resolve from PR/target; stop if ambiguous
MAX_ROUNDS = 3            # Total independent review rounds, not extra fix loops

GOAL
Find and fix proven bugs AND implement safe behavior-preserving simplifications
in the whole authorized feature scope. Zero P1/P2 findings never skips simplification.

PRECHECK
1. Inspect current branch/PR, user task, accepted ADRs, merge-base SHA and
   git status: committed diff + staged + unstaged + non-ignored untracked files.
   Inventory in-scope production, tests, docs, fixtures, new components,
   deleted/renamed paths and affected consumers. Show explicit exclusions.
   Keep immutable baseline and original dirty-snapshot identity.
2. Inspect effective Codex config, feature support, model availability and
   permissions. Enforce read-only permissions on the review PARENT/session;
   custom agent instructions cannot override inherited sandbox permissions.
   If the current parent is writable, use a separate enforced read-only review
   session and end it before starting the fixer. Missing enforcement is BLOCKED.
   On every start/resume, confirm actual cwd and read-only policy before any
   probe or reviewer; a resumed session may retain neither. Stop on mismatch.
   Set GIT_OPTIONAL_LOCKS=0 for orchestration Git reads to avoid index refreshes.
   Fingerprint all reviewed source, untracked paths, index and HEAD before/after
   review. Mutation invalidates results and blocks triage.
   Use 3 reviewers in parallel (<=4 threads), preferably
   available gpt-6-luna / medium. No Astra. Do not change validated config or
   rerun smoke tests. Only if setup is invalid: make minimal backed-up,
   supported changes when already authorized; otherwise MANUAL_ACTION.
   If restart is needed: RESTART_REQUIRED and STOP.
3. If MODE=HYBRID, probe existing pi --help, auth and model. Run Pi as a real
   externally launched read-only reviewer with supported read/search tools,
   no write-capable extensions; inspect exit status and actual result.
   Never silently replace a failed Pi reviewer with Codex.
   Do not install tools or claim Pi is faster without measured evidence.

PER ROUND
4. Run exactly three independent fresh-context READ-ONLY reviews of the same
   current snapshot:
   - Bugs: correctness, edge cases, security and error contracts.
   - Simplify: duplication, dead wrappers, deletion, existing platform/runtime
     features and declared libraries, unnecessary abstraction or work.
   - Regression: tests, consumers, failure paths, UI/accessibility.
   CODEX: all three native Codex reviewers.
   HYBRID: Codex bugs + Codex regression + external Pi simplify.
   Reconcile actual native creation receipts and completion evidence per role.
   Role labels in the coordinator summary alone do not prove launches.
   Keep raw runtime transcripts local; publish only sanitized evidence.
   No unnecessary 4th control reviewer.
5. Verify, deduplicate and classify candidates as APPLY / RETAIN / DEFER.
   For each simplification check: delete / native / existing library / reuse /
   keep; inspect consumers and prove unchanged observable behavior, including
   null/defaults, errors, ordering, persistence, security, async cleanup and UI.
6. Give the confirmed authorized fixes AND safe simplifications to EXACTLY
   ONE writing Codex fixer. Preserve unrelated work and repository worktree rules.
   No rewrites for cosmetic line savings; no added dependencies without approval.
7. Run impacted focused tests, type/lint/format where applicable. Re-inventory
   new/changed files. Start fresh reviewers for another round while real
   actionable findings or improvements remain, MAX_ROUNDS total.
   A last-round fix without fresh re-review is PARTIAL, never DONE.
   Stop earlier if no proven bug AND no proven simplification or no progress.
   Before DONE, rescan whole authorized scope for simplification opportunities.
8. Run final project-required contract tests/checks once; record any checks not
   run. Do not rerun expensive unchanged suites without a requirement.
   Performance benchmarks only for real performance claims/changes.

REPORT BRIEFLY
- MODE, exact baseline + covered/excluded files, config/preflight status
- Real agents, models, per-review/total wall time, token/cost provenance
- Bugs fixed AND simplifications applied/retained/deferred by round
- Added/removed/net lines by production, tests, docs, scripts, generated,
  including new helper files; name removed maintenance obligations
- Test outcomes, remaining warnings and proof gaps, one next action

Never push, merge, release, publish, stash/reset, stage or change unrelated
files. If isolation or coverage is unsafe, report PARTIAL/BLOCKED truthfully.
Begin PRECHECK immediately. No intermediate approval unless safety requires it.
```

## Running an A/B

- **A / CODEX**: start from snapshot S in worktree A, 3 native reviewers.
- **B / HYBRID**: start from the **same** snapshot S in worktree B, 2 native reviewers + real Pi.
- Use the [comparison protocol](benchmark.md); compare only after identical inputs and success criteria are recorded. No fabricated timings, cost or detected bugs.
