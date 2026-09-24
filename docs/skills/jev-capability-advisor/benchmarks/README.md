# Jev, measured

**Faster capability selection. Compact, inspectable advice.**

Jev Capability Advisor helps your agent find a relevant skill or tool from its available catalog. [Install and use the advisor](../README.md).

## Current next-skill comparison

**6.40× the native selector’s speed; 1.78× the published Hussi9 chooser’s speed.** Jev Session selects a skill in 0.487 seconds, with **48/48 correct accepted choices**. This measures selection, not complete-task speed.

| Variant                                    | Skill median |  Skill p95 | Speed vs Native | Correct accepted choices | No match correct | Errors |
| ------------------------------------------ | -----------: | ---------: | --------------: | -----------------------: | ---------------: | -----: |
| Hussi9 + our HTTPS (internal, unpublished) |   0.478569 s | 0.672245 s |           6.51× |                    48/48 |            16/16 |      0 |
| Jev Session                                |   0.486692 s | 0.585938 s |           6.40× |                    48/48 |            16/16 |      0 |
| Published Hussi9 chooser                   |   0.866494 s | 0.926820 s |           3.60× |                    46/48 |            16/16 |      0 |
| Native                                     |   3.116305 s | 5.863254 s |        Baseline |                    48/48 |            16/16 |      0 |

The independent confirmation uses **32 tasks × two repetitions**: **48 skill observations and 16 NONE observations per variant**, from the same frozen 132-skill catalog. Jev and Hussi ran interleaved; the new Native supplement ran separately. Native receives Jev’s exact next-skill cards and rules; Hussi retains its published domain/process/path chooser format and 0.8 acceptance gate. Its two withheld suggestions count against accepted correctness.

- **Models:** Native requests **gpt-6-luna, reasoning medium**, using Codex CLI 0.156.1. Its resolved backend identity was not independently observable. Jev and both Hussi variants use **jev-1.13.0**.
- **Measurement windows:** Jev/Hussi 2026-09-24T10:11:43.628637+00:00 – 2026-09-24T10:13:44.394861+00:00; Native 2026-09-24T13:33:34.289325Z – 2026-09-24T13:37:59.254101Z. Provider load and caching were uncontrolled; Native reported cached input in **43/64** turns.
- **Timing:** preparation plus model turn. Process startup, skill loading and task execution are excluded. Session requires a retained process to reuse HTTPS and its search index. No harness retries, warmup or decision cache.
- **Precision:** medians and factors use full raw timing values. All four p95 values use **nearest rank**. The original Native handoff used linear interpolation and rounded summaries; those source summaries and their hash remain in the normalized evidence.

**The internal experiment remains visible for review.** It is our unpublished transport modification, not a Hussi9 release or an integrated advisor. Removing its entry from the central visible-variant list hides only its bar; the full results remain available. Stars mark every complete score equally, including the experiment. Hover, focus or tap updates factor, correctness and product features together; Native restores the Jev default.

**15,164 completed benchmark executions:** the previous 15,100 plus exactly **64 new Native observations**. The 192 reused Jev/Hussi observations were already counted. UI tests, audits and re-rendering add no benchmark executions.

[Native observations, exact timings and audit bindings](../../../../skill-evals/jev-capability-advisor/benchmarks/native-next-skill-2026-09-24.json) · [Unchanged Jev/Hussi confirmation](../../../../skill-evals/jev-capability-advisor/benchmarks/next-skill-2026-09-24.json) · [Measurement and import audit](../../../../skill-evals/jev-capability-advisor/README.md#native-next-skill-supplement-2026-09-24).

## Product features and measured selection

**One fast next-skill choice, plus a broader advisor when needed.** Jev Session selects the next eligible skill in the explicit `next_skill` mode. Its `general` mode also supports MCP tools and other outcomes. The feature table describes each product; the timing and correctness results measure the pinned selection paths, not every product feature.

| Product feature       | Jev Capability Advisor  | Hussi9 skill-router          |
| --------------------- | ----------------------- | ---------------------------- |
| Skills & MCP          | Yes · general mode      | Yes · Codex variant          |
| Task text sent to Jev | Up to 16,000 characters | Up to 600 characters         |
| Reuse                 | HTTPS + search index    | Index + saved decisions      |
| Capability source     | Current host catalog    | Local index + inventory scan |

- **Why Jev avoids work:** a retained Session reuses HTTPS and its bounded search index. Each request still validates current inventory and checks the answer. The measured `next_skill` path uses no saved decisions.
- **Why the published Hussi chooser takes longer here:** it opens fresh HTTPS in the measured path. Transport, payload and provider effects were not isolated individually; this does not time its complete router or cached routes.
- **What the text limits mean:** task characters sent to Jev, not whole-product input limits. For tasks of 15 words or fewer, Hussi can additionally send up to 300 characters from the previous assistant message. It also supports MCP tools, offline inspection and other routing paths outside the measured chooser.
- **What the internal experiment proves:** adding our reusable HTTPS client and compact JSON to Hussi's chooser is slightly faster in this task set. This unpublished adapter was qualified for skills/no-match only; its other workflows are unassessed.

Sources: [our advisor](../../../../skills/skill-maintenance/jev-capability-advisor/scripts/jev_advisor.py), [our session](../../../../skills/skill-maintenance/jev-capability-advisor/scripts/jev_session.py), [pinned Hussi chooser](https://github.com/hussi9/skill-router/blob/652953a0cbb423d4bb7f62de83db15ad4ca9b16e/scripts/jev_choose.py), [Hussi router sources at the same revision](https://github.com/hussi9/skill-router/tree/652953a0cbb423d4bb7f62de83db15ad4ca9b16e).

## Next-skill input efficiency

**6.3% less selection input than both measured Hussi variants, confirmed on an independent task set.** Choose the explicit `next_skill` profile when the host needs one eligible skill to load next. Additional work remains unassessed; the default `general` profile still handles skills, tools and compound advice.

The KPI is **provider-reported input tokens for skill selection**. It does not measure total agent tokens, price, loading time or complete-task speed. Both the median and aggregate input must improve, with every candidate skill and no-match case correct, before the comparison qualifies.

### Matched tasks

**6.4% less total skill-selection input** than each Hussi variant. Median input is shown separately.

| Variant                                | Median input tokens | Total skill input | Skills correct | No match correct | Median selection |
| -------------------------------------- | ------------------: | ----------------: | -------------: | ---------------: | ---------------: |
| Our Jev · next skill                   |               8,433 |           674,614 |          80/80 |            16/16 |          0.474 s |
| Published Hussi9 chooser               |               9,007 |           720,418 |          76/80 |            16/16 |          0.866 s |
| Hussi9 + our HTTPS client (experiment) |               9,007 |           720,418 |          80/80 |            16/16 |          0.472 s |

No-match input (median / total), kept outside the skill-input headline:

- **Our Jev:** 8,411.5 / 134,596 input tokens.
- **Published Hussi9:** 8,986 / 143,802 input tokens.
- **Pooled Hussi9 control:** 8,986 / 143,802 input tokens.

### Independent confirmation

**6.3% less total skill-selection input** than each Hussi variant. Median input is shown separately.

| Variant                                | Median input tokens | Total skill input | Skills correct | No match correct | Median selection |
| -------------------------------------- | ------------------: | ----------------: | -------------: | ---------------: | ---------------: |
| Our Jev · next skill                   |             8,430.5 |           404,678 |          48/48 |            16/16 |          0.487 s |
| Published Hussi9 chooser               |             8,996.5 |           431,896 |          46/48 |            16/16 |          0.866 s |
| Hussi9 + our HTTPS client (experiment) |             8,996.5 |           431,896 |          48/48 |            16/16 |          0.479 s |

No-match input (median / total), kept outside the skill-input headline:

- **Our Jev:** 8,401 / 134,528 input tokens.
- **Published Hussi9:** 8,981 / 143,686 input tokens.
- **Pooled Hussi9 control:** 8,981 / 143,686 input tokens.

### Why the next-skill profile uses less input

| Technical difference     | Our explicit next-skill profile                                                    | Pinned Hussi9 chooser                                                   |
| ------------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Selection question       | One next-skill choice; at most one provider call                                   | Domain, process and task-path choices in one request                    |
| Candidate representation | Shared bounded cards, compact numeric codes and no repeated option descriptions    | Published domain/process option layout                                  |
| Coverage                 | One skill; remaining work explicitly unassessed                                    | Published skill-routing chooser contract                                |
| Connection               | Persistent HTTPS within a retained session                                         | Published chooser: fresh connection; our control: persistent HTTPS      |
| Checks retained          | Current catalog, activation restrictions, valid host IDs and strict answer parsing | Original returned-ID checks, 0.8 route threshold and 1.2-second timeout |

**The pooled Hussi control remains slightly faster.** Our winning KPI is lower selection input, with 128/128 skill choices and 32/32 no-match decisions correct across the two confirmation cohorts. Input savings are observed for the complete format; the individual effects of encoding and question count were not isolated. Withheld Hussi recommendations count against accepted-selection accuracy and can still contain the correct raw guess.

Both cohorts used the same **132-skill catalog** and **`jev-1.13.0`** on 2026-09-24, with randomized task/variant order and two repetitions. There were 48 matched tasks and 32 independently authored confirmation tasks: **80 unique tasks / 480 comparison observations**. The confirmation author knew earlier diagnostic themes, but these tasks were not executed before the candidate was frozen. No retries, warmup or decision cache; first connections are included. Every scheduled observation and provider call is retained, with no errors, missing results or unknown input usage in the qualified cohorts. Timing includes selection preparation and response handling, excluding process startup, skill loading and task execution. Provider load and caching were uncontrolled.

Hussi9 here means its [pinned published Jev chooser](https://github.com/hussi9/skill-router/blob/652953a0cbb423d4bb7f62de83db15ad4ca9b16e/scripts/jev_choose.py), not its complete router, hooks or fallback workflow. The pooled control is our unpublished modification. The original three-arm study contains no Native measurements; the separately audited Native supplement is documented above. No universal speed ranking follows from this study.

[Audited observations, source hashes and qualification gates](../../../../skill-evals/jev-capability-advisor/benchmarks/next-skill-2026-09-24.json) · [Earlier optimization attempts and provider interruption](../../../../skill-evals/jev-capability-advisor/benchmarks/optimization-development-2026-09-24.json) · [Evaluation details and limitations](../../../../skill-evals/jev-capability-advisor/README.md#explicit-next-skill-qualification-2026-09-24).

### Historical total before the Native supplement: 15,100 completed benchmark executions

| Contribution                                   | Completed executions | What counts                                                 |
| ---------------------------------------------- | -------------------: | ----------------------------------------------------------- |
| Historical documented total through 2026-09-23 |               11,308 | Earlier studies remain separately documented below          |
| Subsequent optimization development            |                3,303 | Includes rejected candidates and one provider refusal       |
| Next-skill qualification                       |                  489 | 9 development + 288 matched + 192 confirmation observations |
| **Cumulative total**                           |           **15,100** | Each completed execution counted once                       |

This records development effort, not unique tasks or only passing tests. The latest campaign used 4,362 benchmark API attempts; two diagnostic calls are separate. The 107 observations left unexecuted after the earlier provider interruption do not count. Offline unit tests, 232 recorded-response replays and subgroup summaries add no new executions. The replay preserves 29 incorrect baseline outcomes, including two errors; it establishes unchanged general behavior, not new quality wins.

An additional scope audit retains one inherited alias limitation: a trailing period after an explicitly named qualified skill ID can prefer an equivalent unqualified alias. The 16-case supplementary suite passed 15 cases and reproduced that failure in both baseline and candidate; the 173 main contract tests passed. This does not establish a permission bypass, and the limitation is not represented as fixed.

## Historical general-profile Session comparison: 9.54× the native selector's speed

**443 ms median skill selection.** Same tasks and catalog; the Jev-based variants ran interleaved, Native separately. All 80 skill-selection observations per variant remain in the timing distributions, including wrong or withheld recommendations. The 16 no-match observations are separate.

| Variant              | Skill-selection median |     p95 | Correct accepted selections | No match correct | Errors |
| -------------------- | ---------------------: | ------: | --------------------------: | ---------------: | -----: |
| Hussi9 + our HTTPS   |                0.407 s | 0.499 s |                       80/80 |            16/16 |      0 |
| Jev Session          |                0.443 s | 0.531 s |                       79/80 |            16/16 |      0 |
| Hussi9               |                0.449 s | 0.544 s |                       76/80 |            16/16 |      0 |
| Jev Fresh Connection |                0.509 s | 0.612 s |                       79/80 |            16/16 |      0 |
| Native               |                4.226 s | 6.090 s |                       80/80 |            16/16 |      0 |

Native: **gpt-6-astra, reasoning low** (requested model; resolved backend not independently observable). Jev and Hussi9: **jev-1.13.0**. Factors use unrounded medians. Native uses baseline preparation plus its model turn; input equivalence is proven for all 48 tasks. Process startup, skill loading and task execution are excluded. Measurement windows are recorded separately in the evidence. Native reported provider-side prefix-cache use in 51/96 turns; this is not a decision cache. Provider caching and service load were uncontrolled.

Session reuses HTTPS and one bounded derived index, while each frame validates the current catalog. First connections and first index builds are included. Fresh creates and closes a real Session for every task, including index retention checks. No retries, warmup, result cache or disk index cache. This is selection speed, not whole-agent task speed or a market-wide ranking.

[Current five-arm TypeSafe evidence](../../../../skill-evals/jev-capability-advisor/benchmarks/session-index-2026-09-23.json) · [Native supplement](../../../../skill-evals/jev-capability-advisor/benchmarks/native-index-2026-09-23.json) · [Input equivalence and replay](../../../../skill-evals/jev-capability-advisor/benchmarks/session-index-parity-2026-09-23.json).

### Larger catalogs. Less repeated preparation.

**13.6% lower median selection time in the 718-entry mixed catalog.** The 100 tasks ran twice per variant, covering skills, MCP tools, clarification, no match and compounds.

| Variant                            | Median | Complete correct results | Errors |
| ---------------------------------- | -----: | -----------------------: | -----: |
| Jev Session · previous preparation | 666 ms |                  174/200 |      4 |
| Jev Session · reusable index       | 576 ms |                  173/200 |      3 |

- **Less repeated preparation.** Reuse a matching derived index; rebuild when catalog or representative identity changes. Search and validate current metadata again for every task; reuse HTTPS in the same process.
- **No information removed.** Keep 200-character initial descriptions, 240-character follow-ups, long task context, MCP tools, activation restrictions and strict answer checks. Shorter descriptions failed qualification and were rejected.
- **Equivalent recorded decisions.** 676/676 recorded observations and 868 request payloads reproduced unchanged. This is an offline equivalence check, not additional live model testing.

**Tradeoff:** the smaller skill-only cohort was 3.6% slower overall (443 versus 428 ms), with 79/80 versus 80/80 accepted choices. The mixed cohort scored 173/200 versus 174/200: its sole additional mistake was a different response on byte-identical initial and follow-up inputs. These remain observed failures; replay does not turn them into passing live results. Compound advice remains experimental.

Local preparation fell from 18.89 to 5.99 ms for the skill catalog, and 72.95 to 15.61 ms for the mixed catalog. Those medians do not add to overall medians; request time also includes network, provider work and evidence recording. First-use retention checking adds cold cost. Use `reuse_index=False` or `--no-index-reuse` to disable index reuse while retaining HTTPS reuse.

### Why routing speeds differ

Same Jev model. Different selection work. Session reuses HTTPS and a bounded search index; Fresh pays their first-use costs for every task.

| Difference   | Hussi9 chooser                                                          | Jev advisor                                                                                                 |
| ------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Candidates   | Eligible skill index; split into domain and process choices.            | Validate, deduplicate and locally rank skills + MCP tools; up to 240 candidates.                            |
| Questions    | Domain, process and task type in one request.                           | Selection mode + first capability; up to two follow-up calls for compound tasks.                            |
| Task context | Task truncated to 600 characters; short candidate summaries.            | Tasks up to 16,000 characters; candidate descriptions bounded by a request-size budget.                     |
| Acceptance   | Validate returned IDs; confidence ≥ 0.8 to route, ≥ 0.5 to suggest.     | Validate returned IDs and answer consistency; explicit no-match / clarify outcomes, no confidence gate.     |
| Reuse        | Published chooser: fresh HTTPS here. Our internal control reuses HTTPS. | Session: HTTPS + one bounded lexical index. Fresh: rebuild and reconnect. Fresh catalog validation in both. |

- **Why Session saves work.** Matching catalog and alias-representative identities avoid rebuilding lexical postings. No recommendation is cached: eligible routing requests still call Jev. Changed metadata invalidates the index.
- **Why Fresh has more work.** The full advisor validates skills and tools, resolves aliases, ranks candidates and checks answer consistency. A new Session also measures and bounds its index; that cost is retained in the timing.
- **How to read Hussi9.** Correct accepted selections require its original 0.8 confidence threshold. An abstention is not necessarily a wrong raw guess. Payload, transport and provider effects were not individually isolated.

### What our Hussi experiment tells us

- **Same transport, different chooser.** Our internal control combines the pinned Hussi chooser with our persistent HTTPS client and compact JSON. It is not a published Hussi9 upgrade.
- **A measured comparison.** The current bars use the same 48 tasks and catalog. The four Jev-based display variants ran interleaved; Native ran separately. Differences of a few milliseconds need the paired uncertainty intervals in the evidence.
- **Keep the broader contract.** Our advisor additionally qualifies MCP tools, clarification, compound outcomes and long context. The Hussi transport control was only tested on skills and no-match tasks here.

Pinned [Hussi9 chooser source](https://github.com/hussi9/skill-router/blob/652953a0cbb423d4bb7f62de83db15ad4ca9b16e/scripts/jev_choose.py); its original 0.8 route threshold and 1.2-second timeout remain. The modified control is our experiment. Four withheld original-Hussi suggestions named the expected skills but fell below its confidence gate; its full fallback workflow is not measured.

### Historical evidence ledger through 2026-09-23

**11,308 completed benchmark executions across development iterations**, including baseline and candidate variants. This counts neither unique tasks nor only passing tests.

| Group                          | Additional completed executions | Scope                                                        |
| ------------------------------ | ------------------------------: | ------------------------------------------------------------ |
| Earlier documented development |                           7,792 | Includes historical failed-provider cohorts; preserved below |
| Resumed full qualification     |                           2,540 | Ten cohorts, including rejected description reductions       |
| Session-index comparison       |                             880 | 480 skill comparison + 400 mixed observations                |
| New Native supplement          |                              96 | 48 identical tasks × two repetitions                         |
| **Total**                      |                      **11,308** | Each execution counted once                                  |

**676 recorded-response replays**, 149 offline unit tests, the health check and bootstrap draws are additional verification, excluded from this new live-execution increment. Earlier offline measurements retain their original ledger classification. API follow-ups are not extra benchmark executions. The larger count does not enlarge the 48-task headline sample.

Shorter-description experiments remain rejected: rank-16 scored 79/80 versus 80/80 skills and 125/128 versus 126/128 on the new 64-task set. [All resumed cohorts and failures](../../../../skill-evals/jev-capability-advisor/benchmarks/resumed-2026-09-23.json) remain separate from the current memo study. The adopted preparation optimization keeps the original full candidate-card budgets.

<details>
<summary>Earlier measurements and feature comparisons (archived)</summary>

## Smaller first choice. Full follow-up checks.

**406 ms median selection, with 80/80 correct accepted skill choices.** Our compact initial request lowers median selection time by **6.3%** versus our previous format in the same interleaved run.

| Variant                              | Median skill selection | Correct accepted selections | No match correct |
| ------------------------------------ | ---------------------: | --------------------------: | ---------------: |
| Hussi9 + our HTTPS                   |                 373 ms |                       80/80 |            16/16 |
| Jev Session · compact initial choice |                 406 ms |                       80/80 |            16/16 |
| Jev Session · previous format        |                 433 ms |                       79/80 |            16/16 |

- **Less repetition.** The first request uses candidate codes instead of repeating names, omits false activation flags and budgets 200 characters for descriptions and guidance.
- **Features retained.** Explicit activation flags, the full task up to 16,000 characters, MCP tools and strict answer checks stay. Follow-up requests keep their original 240-character description/guidance budget.
- **Checked beyond skills.** Candidate and baseline solve the same 87/100 mixed regressions, 59/64 fresh tasks, 13/14 challenge tasks and 15/16 restriction cases. Compound selection remains experimental.

Our internal Hussi transport experiment is still **33 ms faster** on these skill tasks. All three variants use reusable HTTPS and the same catalog. The 48 reused tasks ran twice with randomized task and variant order on 2026-09-23, using `jev-1.13.0`; all 288 observations and 289 API attempts remain counted. The 80 positive observations determine the skill medians; the 16 NONE observations are separate. No retries, warmup or result/index cache; the first cold connection is included. All three variants had zero errors in this comparison.

The 100-task regression median fell from 661 to 588 ms, while the 14-task challenge was effectively tied at 355 ms. Compaction in follow-ups lost one compound result during development, so the adopted version compacts only the first request. A later 150-observation cohort received only HTTP 402 responses: it counts as attempted testing, with no usable speed or quality comparison. Still shorter variants remain unqualified.

[All eight cohorts, paired comparisons and source hashes](../../../../skill-evals/jev-capability-advisor/benchmarks/compact-initial-2026-09-23.json) · [Methods and remaining limits](../../../../skill-evals/jev-capability-advisor/README.md#compact-initial-selection-2026-09-23).

## Archived comparison: 5.89× the native selector's speed

**Before initial-request compaction.** These historical timings stay separate from the newer study above; they do not measure the new request format.

**Jev Session chooses a skill in 0.73 seconds; the native model selector takes 4.31 seconds.**

Skill selection · median · lower is better. Variants are ordered from fastest to slowest. The factor is the ratio of medians across **80 skill-selection observations per variant**: same tasks and catalog, separate measurement runs on 2026-09-22 and 2026-09-23. It measures selection, not complete agent-task speed.

The website adds technical info popovers beside each bar and a GitHub link beside Hussi9. Hover or focus the info button; tap to toggle, press Escape or tap outside to dismiss. Native restores the Jev Session comparison without a selection frame or blank headline. A small decorative sparkle marks a full accepted-selection score; it stays static with reduced motion.

| Variant              | Median skill selection | p95 skill selection | Correct accepted selections | No match correct | Errors |
| -------------------- | ---------------------: | ------------------: | --------------------------: | ---------------: | -----: |
| Hussi9 + our HTTPS   |                0.506 s |             0.577 s |                       80/80 |            16/16 |      0 |
| Jev Session          |                0.733 s |             0.798 s |                       80/80 |            16/16 |      0 |
| Hussi9               |                0.884 s |             0.936 s |                       76/80 |            16/16 |      0 |
| Jev Fresh Connection |                1.108 s |             1.167 s |                       80/80 |            16/16 |      0 |
| Native               |                4.314 s |             6.323 s |                       80/80 |            16/16 |      0 |

**Hussi9 + our HTTPS is our internal experiment**, built on the Hussi chooser; it is not a published Hussi9 release. Selecting its bar shows **8.52×** relative to native. The initial headline stays with our Jev Session API at **5.89×**.

**Native:** `gpt-6-astra`, reasoning `low`, Codex CLI 0.154.0. **Jev and Hussi9:** `jev-1.13.0`. The native model is the requested configuration; its resolved backend identity was not independently observable. Environment: Linux/NixOS in WSL2, Intel Core i9-13900K, Python 3.14.7, concurrency one. Provider load and caching were uncontrolled.

The same 48 frozen tasks ran twice: 40 single-skill and eight no-match tasks, balanced between German and English. Every variant uses the same 132-skill catalog; native receives the same 128 ordered Jev candidate cards, task and routing rules. Hussi9 keeps its published request format. Incorrect selections stay in timing distributions and quality denominators. No-match timings are separate from the headline. The original four-variant supplement reused three Jev-based arms and added only 96 native observations. The fifth bar now also displays 96 archived observations from our modified control: 480 observations across the chart, with no new Jev requests or additions to the execution ledger.

[Hussi9's published Jev selection component](https://github.com/hussi9/skill-router/blob/652953a0cbb423d4bb7f62de83db15ad4ca9b16e/scripts/jev_choose.py) retains its 1.2-second timeout and 0.8 confidence threshold. This measures the chooser, not the complete router, hooks or fallback workflow. The **modified persistent-transport control** in the first row retains that chooser, timeout and confidence threshold; our adapter replaces its transport. It scored 80/80 without removing the gate. This comparison does not establish an overall fastest product.

### Why routing speeds differ

Same Jev model. Different selection work. Fresh Connection is already our optimized advisor; Session adds connection reuse.

| Difference   | Hussi9 chooser                                                      | Jev advisor                                                                                             |
| ------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Candidates   | Eligible skill index; split into domain and process choices.        | Validate, deduplicate and locally rank skills + MCP tools; up to 240 candidates.                        |
| Questions    | Domain, process and task type in one request.                       | Selection mode + first capability; up to two follow-up calls for compound tasks.                        |
| Task context | Task truncated to 600 characters; short candidate summaries.        | Tasks up to 16,000 characters; candidate descriptions bounded by a request-size budget.                 |
| Acceptance   | Validate returned IDs; confidence ≥ 0.8 to route, ≥ 0.5 to suggest. | Validate returned IDs and answer consistency; explicit no-match / clarify outcomes, no confidence gate. |
| Connection   | Fresh HTTPS for each measured selection.                            | Fresh: new HTTPS. Session: reuse HTTPS in a retained process; same selection policy.                    |

- **Why Session is faster.** Reusing HTTPS avoids repeated connection setup. The host supplies a catalog for each request; it is validated each time. This benchmark used no result cache.
- **Why Hussi9 beats Fresh here.** Its measured requests were smaller and local preparation shorter. Both made one API call per observation. The effects of payload size, preparation, transport and provider load were not isolated.
- **What 76/80 means.** Four correct Hussi9 suggestions fell below its 0.8 route threshold. These are withheld recommendations, not four wrong skill guesses. We measured the chooser, not its full fallback workflow.

[Our selection implementation](../../../../skills/skill-maintenance/jev-capability-advisor/scripts/jev_advisor.py) · [Hussi9's pinned implementation](https://github.com/hussi9/skill-router/blob/652953a0cbb423d4bb7f62de83db15ad4ca9b16e/scripts/jev_choose.py) · [Post-hoc audit and measurement limits](../../../../skill-evals/jev-capability-advisor/README.md#technical-differences-audit).

### Why the faster experiment is not the default yet

- **Our experiment, built on Hussi9.** The Hussi chooser uses our reusable HTTPS client and compact JSON serialization. Jev Session already uses the same client. This is our internal adapter, not a published Hussi9 upgrade.
- **Faster here, equally correct.** 0.506 s and 80/80 accepted skill choices, plus 16/16 no-match decisions. Smaller requests and less preparation accompany the gain; their individual effects were not isolated.
- **Compact selection, now in our advisor.** The separate, newer comparison qualifies a smaller initial request in our full advisor. The Hussi adapter itself remains a skill-only experiment; its MCP, clarification, compound and long-context behavior is not qualified.

The control's median local preparation was 0.535 ms versus 21.324 ms for Jev Session; median serialized requests were 32,382.5 versus 46,108.5 bytes. Both already reuse the same HTTPS client. These measurements do not attribute the entire latency difference to local preparation or request size. The control keeps Hussi's 600-character task limit and domain/process/type selection protocol. Adopting a compact path requires preserving and testing our host IDs, activation restrictions, tool and compound outcomes.

### 1.51× faster with a reusable session

Fresh Connection already uses our optimized advisor. Session additionally keeps its HTTPS connection: **0.73 seconds with a Jev session; 1.11 seconds with a fresh connection**, a **34%** reduction in median wait. Both Jev paths achieved **96/96 correct results**, including **80/80** skill choices and **16/16** no-match decisions. Each task still supplies a fresh catalog and receives full validation.

The first connection in each repetition is included: two cold session calls and 94 reused connections. No prewarming, result/index cache or harness retry was used. The paired median saving within the original session study was 376 ms, with a task-cluster bootstrap 95% interval of 365–384 ms. These tasks were withheld from runtime tuning; the native supplement reuses them. This study did not test fresh MCP, compound or clarification tasks.

[Use a reusable session](../../../../skills/skill-maintenance/jev-capability-advisor/references/session-integration.md) in a host that supplies its current eligible catalog. The benefit requires a retained process/session and direct HTTPS; proxy environments use the existing unpooled fallback. Installation does not install an automatic native hook, and a whole-task speedup has not been demonstrated.

Native timing includes selection preparation and the model turn. Jev timing includes preparation, API requests, session validation and evidence recording. The comparison excludes native process startup, capability loading and task execution. The older native comparison below uses a different corpus and revision; its timings must not be combined with these results.

[Comparison data, archived control and count supplement](../../../../skill-evals/jev-capability-advisor/benchmarks/native-session-2026-09-23.json) · [Original session data](../../../../skill-evals/jev-capability-advisor/benchmarks/session-2026-09-22.json).

## Earlier native comparison: 4.71× faster median selection

**1.22 seconds with Jev. 5.73 seconds with the native selector.**

Both received the same inputs in the earlier, pre-session 80-task regression comparison. Correct complete results were **70/80 for Jev and 72/80 for native**. The headline is the ratio of medians and measures selection only; a whole-task speedup has not been demonstrated.

| Measured on 2026-09-22   | Jev advisor | Native selector |
| ------------------------ | ----------: | --------------: |
| Median selection         | **1.216 s** |         5.725 s |
| p95 selection            | **3.465 s** |        12.331 s |
| Correct complete results |       70/80 |           72/80 |

Timing includes local preparation and Jev calls, but excludes native process startup, capability loading and task execution. Compound selection remains experimental.

## 7,000+ benchmark runs

**7,792 completed benchmark executions across development iterations**, including baseline and candidate variants. This records development effort, not 7,792 unique tasks or passing tests.

| Included experiments             |      Runs | Counting rule                                                  |
| -------------------------------- | --------: | -------------------------------------------------------------- |
| Retrieval evaluations            |     1,080 | 270 tasks × four configurations                                |
| Live selection evaluations       |       452 | 160 initial + 100 corrected + 32 pilot + 160 matched runs      |
| Runtime measurements             |       400 | 320 earlier + 80 optimized fresh-process measurements          |
| Archived replay evaluations      |       100 | 100 recorded-response replays                                  |
| Session and selector development |     4,418 | 37 completed experiments, including 384 fresh-task comparisons |
| Native supplement                |        96 | Same 48 frozen tasks × two native observations                 |
| Compact selection development    |     1,246 | Eight cohorts; includes 150 provider rejections                |
| **Total**                        | **7,792** | Completed executions, counted once per experiment              |

Repeated tasks across configurations and revisions count as separate runs. Subgroup summaries, warmups, re-scoring, API follow-ups, bootstrap draws and unit assertions are excluded. The additional 4,418 executions include two HTTP timeouts; every scheduled observation in the 37 listed experiments is retained. This is an audited selection of completed experiments, not every exploratory call. The native supplement adds 96 completed executions once to the existing 6,450; reused Jev and Hussi observations are not counted again. Compact selection adds 1,246 executions once, including 150 HTTP 402 rejections excluded from speed and model-quality comparisons; its 1,469 API attempts include follow-ups and are not extra executions. The cumulative count does not expand any speed study beyond its own task set. See the [earlier count ledger](../../../../skill-evals/jev-capability-advisor/benchmarks/development-counts-2026-09-22.json) and [compact-study ledger](../../../../skill-evals/jev-capability-advisor/benchmarks/compact-initial-2026-09-23.json).

## Less output. Less preparation.

- **99.3% less returned JSON:** median output fell from 287,767 to 1,901 bytes across 100 archived results, retaining complete selected descriptions. This measures bytes, not model tokens or task speed.
- **35% less local preparation time:** median preparation and request construction fell from 120.54 to 78.41 ms in 40 paired measurements. Ordered candidates and request payloads stayed identical, without a cache.

## What you get

| Capability             | Why it helps                                                                  |
| ---------------------- | ----------------------------------------------------------------------------- |
| **Skills + MCP tools** | Compare available workflows and tools in one supplied catalog.                |
| **Clear outcomes**     | Distinguish a recommendation, no match, missing context and provider failure. |
| **Compact advice**     | Return relevant descriptions and safety signals; retain a full local receipt. |
| **Reusable sessions**  | Reuse the connection while refreshing the task and eligible catalog.          |
| **Offline inspection** | Explore candidates without a key or network call.                             |
| **Host control**       | Preserve activation restrictions, permissions and execution ownership.        |

The skill is a release candidate. Earlier explicit on-demand use was qualified in Codex. The new reusable session interface supports integration by a host with authoritative inventory; skill/plugin installation does not install automatic prompt interception. Native hooks still require separate qualification.

<details>
<summary>Measurement conditions and remaining limits</summary>

The matched comparison used 718 catalog entries and the same 240 ordered candidate cards per task. Its 80 previously used synthetic regressions include 40 German, 30 English and ten mixed-language tasks. Task and arm order were randomized, with one sample per arm/task, no retries and no local caches. Provider caching and service load were uncontrolled.

Single-task, no-match and clarification results tied at 58/60. Compound results were 12/20 for Jev and 14/20 for native. All failures remain in the denominator. The 4.71× headline is the ratio of arm medians; the median of individual paired ratios is 4.19×. These are different statistics.

The local preparation experiment used 40 fresh processes per arm, ten fixed development queries and alternating arm order on Linux/NixOS in WSL2, an Intel i9-13900K and Python 3.14.7. Absolute timings are environment-specific.

Earlier studies include a sixfold selector result with lower Jev accuracy and a correction study with 72/80 correct Jev results. Those are different observations and do not replace the current matched comparison. Whole-host pilots have not demonstrated faster task completion. The cumulative run total includes earlier revisions and comparison baselines; it is not a production qualification score.

</details>

[Full methods, historical results and qualification](../../../../skill-evals/jev-capability-advisor/README.md) · [Machine-readable benchmark data](../../../../skill-evals/jev-capability-advisor/benchmarks/2026-09-22.json)

The website renders these highlights in a separate Astro component with an accessible SVG comparison. Its numerical summary is derived from the same benchmark data; a build check keeps this README's headline figures aligned.

</details>
