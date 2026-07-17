# 2026-07-16 SkillOpt Exploratory Review

## Scope

Exploratory `codex-cli-all` optimization of the public `drawio-diagrams` body. The run used the 40/15/15 text-only split, one epoch, ten four-case steps, six-case selection and test subsets, and a soft-score gate because strict all-assertion hard scores were too sparse in the bounded text-only worker.

SkillOpt commit: `e4ea6a6771e797ef820cdd8bfea64c57e0481065` (`v0.2.0`). Target, judge, and reflection ran through the logged-in Codex CLI with network access disabled. Provider-backed optimization, slow update, and meta-skill optimization were disabled; model IDs were not explicitly pinned.

## Optimizer result

The selection soft score rose from `0.3606` to `0.5661`; four of ten proposals were accepted. The automatic Step 9 candidate was rejected by the adoption gate because held-out hard score fell from `1/6` to `0/6`, even though held-out soft score rose from `0.4717` to `0.6111`. The raw `best_skill.md` was not imported.

## Curated review and decision

Human review reduced the useful findings to four small rules: honor an explicitly requested repository icon contract, make XML repairs source-grounded, distinguish BPMN flow animation from structural notation, and report unavailable writes or validation honestly. The unrelated ML expansion and repeated reference content were rejected as bloat.

The curated candidate was then evaluated once on every validation and held-out text case without further tuning:

| Split           | Baseline hard | Curated hard | Baseline soft | Curated soft |
| --------------- | ------------: | -----------: | ------------: | -----------: |
| Validation (15) |          0/15 |         0/15 |        0.4780 |       0.4782 |
| Test (15)       |          1/15 |         0/15 |        0.4507 |       0.4967 |
| Mean            |             — |            — |        0.4644 |       0.4875 |

The lost hard pass was an unchanged MCP-path case, while both split-level soft scores were non-decreasing. A final paired rerun pinned target and judge to `gpt-5.5` with low target reasoning. It again failed the required hard non-regression gate and also lost soft score (`0.5293` to `0.5224`).

The candidate, its four rules, and the proposed 0.4.1 version bump were therefore rejected. The tracked `drawio-diagrams` body remains 0.4.0. These results are exploratory rejection evidence, not official-parity, deterministic, or visual-rendering proof; safety and approval boundaries are unchanged.

## Infrastructure fix

The first attempt exposed an operating-system argument-size failure for the large skill and resource snapshot. The reusable SkillOpt adapter now sends explicit UTF-8 prompts through stdin, redacts exact prompt echoes from captured streams, verifies full byte length and SHA-256, and covers a 256-KiB no-read timeout with process-group reaping. Prompt content no longer appears in argv or persisted adapter logs.

## Public-proof boundary

Raw prompts, responses, trajectories, authentication state, environment values, temporary candidates, and local paths remain under ignored `.agents/`. Only this concise review is public.
