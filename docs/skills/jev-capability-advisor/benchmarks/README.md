# Jev, measured

**Faster capability selection. Compact, inspectable advice.**

Jev Capability Advisor helps your agent find a relevant skill or tool from its available catalog. [Install and use the advisor](../README.md).

## 4.71× faster median selection

**1.22 seconds with Jev. 5.73 seconds with the native selector.**

Both received the same inputs in the 80-task regression comparison. Correct complete results were **70/80 for Jev and 72/80 for native**. The headline is the ratio of medians and measures selection only; a whole-task speedup has not been demonstrated.

| Measured on 2026-09-22   | Jev advisor | Native selector |
| ------------------------ | ----------: | --------------: |
| Median selection         | **1.216 s** |         5.725 s |
| p95 selection            | **3.465 s** |        12.331 s |
| Correct complete results |       70/80 |           72/80 |

Timing includes local preparation and Jev calls, but excludes native process startup, capability loading and task execution. Compound selection remains experimental.

## 2,000+ benchmark runs

**2,032 completed benchmark executions across development iterations**, including baseline and candidate variants. This records development effort, not 2,032 unique tasks or passing tests.

| Included experiments        |      Runs | Counting rule                                             |
| --------------------------- | --------: | --------------------------------------------------------- |
| Retrieval evaluations       |     1,080 | 270 tasks × four configurations                           |
| Live selection evaluations  |       452 | 160 initial + 100 corrected + 32 pilot + 160 matched runs |
| Runtime measurements        |       400 | 320 earlier + 80 optimized fresh-process measurements     |
| Archived replay evaluations |       100 | 100 recorded-response replays                             |
| **Total**                   | **2,032** | Completed executions, counted once per experiment         |

Repeated tasks across configurations and revisions count as separate runs. Subgroup summaries, warmups, re-scoring, API follow-ups, bootstrap draws and unit assertions are excluded. This cumulative count does not expand the current speed comparison beyond its 80 tasks.

## Less output. Less preparation.

- **99.3% less returned JSON:** median output fell from 287,767 to 1,901 bytes across 100 archived results, retaining complete selected descriptions. This measures bytes, not model tokens or task speed.
- **35% less local preparation time:** median preparation and request construction fell from 120.54 to 78.41 ms in 40 paired measurements. Ordered candidates and request payloads stayed identical, without a cache.

## What you get

| Capability             | Why it helps                                                                  |
| ---------------------- | ----------------------------------------------------------------------------- |
| **Skills + MCP tools** | Compare available workflows and tools in one supplied catalog.                |
| **Clear outcomes**     | Distinguish a recommendation, no match, missing context and provider failure. |
| **Compact advice**     | Return relevant descriptions and safety signals; retain a full local receipt. |
| **Offline inspection** | Explore candidates without a key or network call.                             |
| **Host control**       | Preserve activation restrictions, permissions and execution ownership.        |

The skill is a release candidate. It does not automatically intercept ordinary prompts. Native runtime behavior is currently qualified in Codex only; installing on another host does not establish runtime qualification.

<details>
<summary>Measurement conditions and remaining limits</summary>

The matched comparison used 718 catalog entries and the same 240 ordered candidate cards per task. Its 80 previously used synthetic regressions include 40 German, 30 English and ten mixed-language tasks. Task and arm order were randomized, with one sample per arm/task, no retries and no local caches. Provider caching and service load were uncontrolled.

Single-task, no-match and clarification results tied at 58/60. Compound results were 12/20 for Jev and 14/20 for native. All failures remain in the denominator. The 4.71× headline is the ratio of arm medians; the median of individual paired ratios is 4.19×. These are different statistics.

The local preparation experiment used 40 fresh processes per arm, ten fixed development queries and alternating arm order on Linux/NixOS in WSL2, an Intel i9-13900K and Python 3.14.7. Absolute timings are environment-specific.

Earlier studies include a sixfold selector result with lower Jev accuracy and a correction study with 72/80 correct Jev results. Those are different observations and do not replace the current matched comparison. Whole-host pilots have not demonstrated faster task completion. The cumulative run total includes earlier revisions and comparison baselines; it is not a production qualification score.

</details>

[Full methods, historical results and qualification](../../../../skill-evals/jev-capability-advisor/README.md) · [Machine-readable benchmark data](../../../../skill-evals/jev-capability-advisor/benchmarks/2026-09-22.json)

The website renders these highlights in a separate Astro component with an accessible SVG comparison. Its numerical summary is derived from the same benchmark data; a build check keeps this README's headline figures aligned.
