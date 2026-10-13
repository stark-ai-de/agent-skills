# Cloud review swarm fixture kit

This folder includes an executable synthetic fixture generator. The script is portable (Node built-ins + Git), makes no network or model requests and refuses to overwrite an existing output directory.

## Execute

- node incubator/skills/engineering-workflows/review-fix-swarm/scripts/fixture-kit.mjs list
- node incubator/skills/engineering-workflows/review-fix-swarm/scripts/fixture-kit.mjs selftest
- node incubator/skills/engineering-workflows/review-fix-swarm/scripts/fixture-kit.mjs prepare --case zero-is-present --out /tmp/swarm-case-A
- node incubator/skills/engineering-workflows/review-fix-swarm/scripts/fixture-kit.mjs grade --case zero-is-present --dir /tmp/swarm-case-A

## Built-in cases

| Case | Initial test | Expected task |
| --- | --- | --- |
| zero-is-present | RED | Fix falsy-vs-missing identifier without breaking rejection |
| duplicate-validators | GREEN | **Actually simplify** duplicated validators; tests alone are insufficient |
| distinct-contracts | GREEN | Negative control: preserve different zero boundaries |
| untracked-component | RED | Include and repair an untracked component |
| regression-guard | RED | Fix zero handling without breaking null, negative and threshold cases |

The grader preserves exact original tests (adding new ones is fine), runs node --test and checks that duplicate-validators reduces Number.isInteger uses to at most one. These checks are narrow **mechanical witnesses**, not a general semantic correctness proof. The same process that can inspect the fixture generator can inspect expected outcomes: do not call the results blind without enforcing isolation.

The Cloud Master must launch real Codex/Pi agents to do repairs, then grade and independently inspect the changes. Selftest only verifies that deliberately red/green baselines are set up correctly. Add new edge cases from observed failures and rerun earlier cases to prevent overfitting.
