# Jev, measured

**Faster capability selection. Compact, inspectable advice.**

Jev Capability Advisor helps your agent find a relevant skill or tool from its available catalog. [Install and use the advisor](../README.md).

## New: 1.51× faster with a reusable session

**0.73 seconds with a Jev session. 1.11 seconds with a fresh connection.**

Keeping the HTTPS connection open reduced median skill-selection latency by **34%** in the fresh-task comparison. The actual session API received a fresh catalog with every task; it did not reuse recommendations or skip validation.

| Fresh tasks · 2026-09-22 | Jev session | Jev fresh connection |
| ------------------------ | ----------: | -------------------: |
| Median skill selection   | **0.733 s** |              1.108 s |
| p95 skill selection      | **0.798 s** |              1.167 s |
| Correct skill results    |   **80/80** |                80/80 |
| Correct no-match results |   **16/16** |                16/16 |

There were 48 previously untested tasks, each repeated twice: 40 single-skill tasks and eight no-match tasks, balanced between German and English. Both Jev paths achieved **96/96 correct results**. The first connection in each repetition is included; no prewarming, result cache or retry was used. The paired median saving was 376 ms, with a task-cluster bootstrap 95% interval of 365–384 ms. This study did not test fresh MCP, compound or clarification tasks.

[Session benchmark data](../../../../skill-evals/jev-capability-advisor/benchmarks/session-2026-09-22.json).

[Use a reusable session](../../../../skills/skill-maintenance/jev-capability-advisor/references/session-integration.md) in a host that supplies its current eligible catalog. This benefit requires a retained process/session and a direct HTTPS connection; proxy environments use the existing unpooled fallback. It does not establish automatic native activation or a whole-task speedup. The older native comparison below uses a different corpus and revision; its timings must not be combined with these results.

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

**6,450 completed benchmark executions across development iterations**, including baseline and candidate variants. This records development effort, not 6,450 unique tasks or passing tests.

| Included experiments             |      Runs | Counting rule                                                  |
| -------------------------------- | --------: | -------------------------------------------------------------- |
| Retrieval evaluations            |     1,080 | 270 tasks × four configurations                                |
| Live selection evaluations       |       452 | 160 initial + 100 corrected + 32 pilot + 160 matched runs      |
| Runtime measurements             |       400 | 320 earlier + 80 optimized fresh-process measurements          |
| Archived replay evaluations      |       100 | 100 recorded-response replays                                  |
| Session and selector development |     4,418 | 37 completed experiments, including 384 fresh-task comparisons |
| **Total**                        | **6,450** | Completed executions, counted once per experiment              |

Repeated tasks across configurations and revisions count as separate runs. Subgroup summaries, warmups, re-scoring, API follow-ups, bootstrap draws and unit assertions are excluded. The additional 4,418 executions include two HTTP timeouts; every scheduled observation in the 37 listed experiments is retained. This is an audited selection of completed experiments, not every exploratory call. The cumulative count does not expand either speed study beyond its own task set. See the [count ledger](../../../../skill-evals/jev-capability-advisor/benchmarks/development-counts-2026-09-22.json).

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
