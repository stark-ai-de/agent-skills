# Jev, measured

**Faster capability selection. Compact, inspectable advice.**

Jev Capability Advisor helps your agent find a relevant skill or tool from its available catalog. [Install and use the advisor](../README.md).

## 5.89× the native selector's speed

**Jev Session chooses a skill in 0.73 seconds; the native model selector takes 4.31 seconds.**

Skill selection · median · lower is better. The factor is the ratio of medians across **80 skill-selection observations per variant**: same tasks and catalog, separate measurement runs on 2026-09-22 and 2026-09-23. It measures selection, not complete agent-task speed.

| Variant              | Median skill selection | p95 skill selection | Correct accepted selections | No match correct | Errors |
| -------------------- | ---------------------: | ------------------: | --------------------------: | ---------------: | -----: |
| Jev Session          |                0.733 s |             0.798 s |                       80/80 |            16/16 |      0 |
| Jev Fresh Connection |                1.108 s |             1.167 s |                       80/80 |            16/16 |      0 |
| Hussi9               |                0.884 s |             0.936 s |                       76/80 |            16/16 |      0 |
| Native               |                4.314 s |             6.323 s |                       80/80 |            16/16 |      0 |

**Native:** `gpt-6-astra`, reasoning `low`, Codex CLI 0.154.0. **Jev and Hussi9:** `jev-1.13.0`. The native model is the requested configuration; its resolved backend identity was not independently observable. Environment: Linux/NixOS in WSL2, Intel Core i9-13900K, Python 3.14.7, concurrency one. Provider load and caching were uncontrolled.

The same 48 frozen tasks ran twice: 40 single-skill and eight no-match tasks, balanced between German and English. Every variant uses the same 132-skill catalog; native receives the same 128 ordered Jev candidate cards, task and routing rules. Hussi9 keeps its published request format. Incorrect selections stay in timing distributions and quality denominators. No-match timings are separate from the headline. We reused the three existing Jev-based arms and added only 96 native observations, with no new Jev requests.

[Hussi9's published Jev selection component](https://github.com/hussi9/skill-router/blob/652953a0cbb423d4bb7f62de83db15ad4ca9b16e/scripts/jev_choose.py) retains its 1.2-second timeout and 0.8 confidence threshold. This measures the chooser, not the complete router, hooks or fallback workflow. A **modified persistent-transport control** scored 80/80 with a 0.506 s positive-task median; it is faster here, but is not the published implementation. This comparison does not establish an overall fastest product.

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

### 1.51× faster with a reusable session

Fresh Connection already uses our optimized advisor. Session additionally keeps its HTTPS connection: **0.73 seconds with a Jev session; 1.11 seconds with a fresh connection**, a **34%** reduction in median wait. Both Jev paths achieved **96/96 correct results**, including **80/80** skill choices and **16/16** no-match decisions. Each task still supplies a fresh catalog and receives full validation.

The first connection in each repetition is included: two cold session calls and 94 reused connections. No prewarming, result/index cache or harness retry was used. The paired median saving within the original session study was 376 ms, with a task-cluster bootstrap 95% interval of 365–384 ms. These tasks were withheld from runtime tuning; the native supplement reuses them. This study did not test fresh MCP, compound or clarification tasks.

[Use a reusable session](../../../../skills/skill-maintenance/jev-capability-advisor/references/session-integration.md) in a host that supplies its current eligible catalog. The benefit requires a retained process/session and direct HTTPS; proxy environments use the existing unpooled fallback. Installation does not install an automatic native hook, and a whole-task speedup has not been demonstrated.

Native timing includes selection preparation and the model turn. Jev timing includes preparation, API requests, session validation and evidence recording. The comparison excludes native process startup, capability loading and task execution. The older native comparison below uses a different corpus and revision; its timings must not be combined with these results.

[Four-variant data and count supplement](../../../../skill-evals/jev-capability-advisor/benchmarks/native-session-2026-09-23.json) · [Original session data](../../../../skill-evals/jev-capability-advisor/benchmarks/session-2026-09-22.json).

## Earlier native comparison: 4.71× faster median selection

**1.22 seconds with Jev. 5.73 seconds with the native selector.**

Both received the same inputs in the earlier, pre-session 80-task regression comparison. Correct complete results were **70/80 for Jev and 72/80 for native**. The headline is the ratio of medians and measures selection only; a whole-task speedup has not been demonstrated.

| Measured on 2026-09-22   | Jev advisor | Native selector |
| ------------------------ | ----------: | --------------: |
| Median selection         | **1.216 s** |         5.725 s |
| p95 selection            | **3.465 s** |        12.331 s |
| Correct complete results |       70/80 |           72/80 |

Timing includes local preparation and Jev calls, but excludes native process startup, capability loading and task execution. Compound selection remains experimental.

## 6,000+ benchmark runs

**6,546 completed benchmark executions across development iterations**, including baseline and candidate variants. This records development effort, not 6,546 unique tasks or passing tests.

| Included experiments             |      Runs | Counting rule                                                  |
| -------------------------------- | --------: | -------------------------------------------------------------- |
| Retrieval evaluations            |     1,080 | 270 tasks × four configurations                                |
| Live selection evaluations       |       452 | 160 initial + 100 corrected + 32 pilot + 160 matched runs      |
| Runtime measurements             |       400 | 320 earlier + 80 optimized fresh-process measurements          |
| Archived replay evaluations      |       100 | 100 recorded-response replays                                  |
| Session and selector development |     4,418 | 37 completed experiments, including 384 fresh-task comparisons |
| Native supplement                |        96 | Same 48 frozen tasks × two native observations                 |
| **Total**                        | **6,546** | Completed executions, counted once per experiment              |

Repeated tasks across configurations and revisions count as separate runs. Subgroup summaries, warmups, re-scoring, API follow-ups, bootstrap draws and unit assertions are excluded. The additional 4,418 executions include two HTTP timeouts; every scheduled observation in the 37 listed experiments is retained. This is an audited selection of completed experiments, not every exploratory call. The native supplement adds 96 completed executions once to the existing 6,450; reused Jev and Hussi observations are not counted again. The cumulative count does not expand any speed study beyond its own task set. See the [count ledger](../../../../skill-evals/jev-capability-advisor/benchmarks/development-counts-2026-09-22.json).

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
