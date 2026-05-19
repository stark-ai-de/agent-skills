# PR Review Rubric

Ask:

- Does the change do what the PR says?
- Are edge cases, error states, and rollback paths handled?
- Are public APIs, env vars, data contracts, or routes changed?
- Are tests added or updated at the right level?
- Do docs, examples, changelog, or migration notes need updates?
- Are dependency or lockfile changes expected?
- Could CI pass while runtime behavior regresses?
- Did an agent introduce broad refactors unrelated to the goal?

Prioritize correctness and maintainability over formatting preferences.
