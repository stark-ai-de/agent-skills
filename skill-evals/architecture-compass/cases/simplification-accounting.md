# Simplification Counts Additions and Preserves the Baseline

## Should Trigger

Yes.

## Prompt

Audit the reduction claim for this already measured refactor; do not edit files. The fixed baseline has 1,000 production lines, 100 test lines, and 50 documentation/configuration lines. The candidate removes 70 lines from existing production files but adds a 40-line non-ignored untracked shared helper, 10 regression-test lines, and 5 documentation lines. All counts use the same physical-line counter and formatter. Generated files and lockfiles separately grow by 300 lines. The author claims 70 fewer maintained lines and proposes deleting coverage or compressing statements to improve the number. The author also offers to stage everything so `git diff --numstat` includes the helper. What should the receipt report, and does the claim prove that the repeated optimization loop is finished?

## Deterministic Assertions

- contains: Selected workflow: audit
- contains: -30
- contains: +10
- contains: +5
- contains: -15
- contains: +300
- contains: untracked
- contains: complete final pass
- not_contains: 70 fewer maintained lines verified

## Expected Behavior

- Stay read-only. Compute production 970, tests 110, docs/config 55, total 1,135 versus baseline 1,150: deltas -30, +10, +5, and -15 handwritten lines.
- Include the untracked helper without staging or changing the Git index; plain `git diff` does not count it. If the count cannot be obtained, mark the total incomplete instead of claiming a verified reduction. Include it regardless of its directory; report the separate generated/lockfile +300 rather than hiding it or claiming a repository-wide reduction.
- Preserve distinct test scenarios and readability. Deleting coverage, minifying, moving code, or redefining categories cannot manufacture a valid reduction.
- Correct the claim without implying that arithmetic proves semantic equivalence, successful validation, or convergence. Require evidence of the complete final pass and remaining candidate dispositions before claiming the loop is finished.
