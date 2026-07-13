# 2026-07-12 SkillOpt Routing and Readability Run

## Scope

Exploratory `codex-cli-all` optimization of the public `drawio-diagrams` body, focused on orthogonal obstacle routing and dense-diagram delivery reporting. The accepted artifact is a human-reviewed, minimal candidate derived from the run rather than an unreviewed `best_skill.md`.

SkillOpt commit: `e4ea6a6771e797ef820cdd8bfea64c57e0481065` (`v0.2.0`). Slow update and meta-skill optimization were disabled because this profile bypasses the provider-backed optimizer path. Codex CLI execution ran with network access disabled.

## Evaluation

The matched A/B evaluation used 31 text-only positive cases: 19 train, 6 validation, and 6 held-out test cases. Six renderer-dependent visual cases and four activation-negative cases were excluded. Every included case had three deterministic response assertions.

| Split                |  Baseline hard | Candidate hard |  Baseline soft | Candidate soft |
| -------------------- | -------------: | -------------: | -------------: | -------------: |
| Train (19 cases)     |  9/19 (47.37%) | 12/19 (63.16%) | 47/57 (82.46%) | 49/57 (85.96%) |
| Validation (6 cases) |   1/6 (16.67%) |   4/6 (66.67%) | 12/18 (66.67%) | 16/18 (88.89%) |
| Test (6 cases)       |   4/6 (66.67%) |     6/6 (100%) | 16/18 (88.89%) |   18/18 (100%) |
| Composite (31 cases) | 14/31 (45.16%) | 22/31 (70.97%) | 75/93 (80.65%) | 83/93 (89.25%) |

`hard` is the share of cases that passed all three assertions. `soft` is the share of individual assertions that passed. All 62 baseline and candidate rollouts exited successfully.

## Adoption

Accepted after human review. The change adds explicit draw.io waypoint placement around text, annotation, and callout obstacles, plus concrete validator and readability reporting. Frontmatter was preserved except for the required public-skill version bump from `0.1.4` to `0.1.5`; safety and approval boundaries are unchanged.

This is exploratory evidence, not official-parity or visual-rendering proof. The summary omits raw prompts, responses, trajectories, provider metadata, authentication state, environment values, and local workspace paths.

## Validation

The adopted change passed `npm run validate`, including public/incubator skill validation, 24 draw.io visual assertions, SkillOpt contract validation, and the 35-page site build. It also passed `pnpm format:check`, `pnpm lint`, `npm run smoke:install`, the local public-skill catalog listing, release-intent validation for `v0.9.1`, release validation, and `git diff --check`.
