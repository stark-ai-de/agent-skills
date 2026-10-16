# Cloud review swarm fixture kit

This folder includes an executable synthetic fixture generator. The script is portable (Node built-ins + Git), makes no network or model requests and refuses to overwrite an existing output directory.

## Execute

- node incubator/skills/engineering-workflows/review-fix-swarm/scripts/fixture-kit.mjs list
- node incubator/skills/engineering-workflows/review-fix-swarm/scripts/fixture-kit.mjs selftest
- node incubator/skills/engineering-workflows/review-fix-swarm/scripts/fixture-kit.mjs prepare --case zero-is-present --out /tmp/swarm-case-A
- node incubator/skills/engineering-workflows/review-fix-swarm/scripts/fixture-kit.mjs grade --case zero-is-present --dir /tmp/swarm-case-A

## Built-in cases

| Case                 | Initial test | Expected task                                                             |
| -------------------- | ------------ | ------------------------------------------------------------------------- |
| zero-is-present      | RED          | Fix falsy-vs-missing identifier without breaking rejection                |
| duplicate-validators | GREEN        | **Actually simplify** duplicated validators; tests alone are insufficient |
| distinct-contracts   | GREEN        | Negative control: preserve different zero boundaries                      |
| untracked-component  | RED          | Include and repair an untracked component                                 |
| regression-guard     | RED          | Fix zero handling without breaking null, negative and threshold cases     |

The grader preserves exact original tests (adding new ones is fine) and runs the current Node executable with --test. For duplicate-validators it returns `needs_semantic_review`, exit 3, `passed: null` and `simplified: null`; there is no raw-text count or automatic simplification verdict. An independent evaluator inspects the entire implementation diff, including new files: relocated predicates remain duplication, while a behavior-preserving common helper can be accepted with or without explanatory comments. These mechanical checks are not a general semantic correctness proof. The same process that can inspect the fixture generator can inspect expected outcomes: do not call the results blind without enforcing isolation.

The Cloud Master must launch real Codex/Pi agents to do repairs, then grade and independently inspect the changes. Selftest only verifies that deliberately red/green baselines are set up correctly. Add new edge cases from observed failures and rerun earlier cases to prevent overfitting.

## Isolation and result codes

Preparation removes inherited GIT_* variables, ignores host global/system configuration, signing, hooks and templates, and verifies its own worktree/Git directory before staging or commit. It refuses existing outputs without overwriting them. This isolation applies only to the synthetic fixture subprocesses and does not edit user Git configuration.

Grade exits 0 for mechanical pass without a required simplification verdict, 1 for failing tests or modified/deleted original tests, 2 for execution/input errors, and 3 for pending semantic review. The `status` field distinguishes passed, failed and needs_semantic_review. Selftest exits 0 when the intended baselines and pending semantic state are correct.

Run `pnpm run validate:review-fix-swarm` for black-box regressions covering Git escape, signing/hooks/templates, original-test integrity and semantic negative/positive controls.
