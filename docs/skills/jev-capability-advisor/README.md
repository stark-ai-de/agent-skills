# Jev Capability Advisor

**Find the right skill or tool for the task in front of you.**

Jev Capability Advisor recommends capabilities from the catalog your agent actually has available. One focused task gets a focused recommendation; the experimental compound mode can attempt up to three complementary recommendations. No suitable capability, missing context and provider failures remain distinct outcomes.

## Why use it?

- **Skills and tools together.** Compare an installed workflow with an available MCP or host tool for the task you want to accomplish.
- **Clear outcomes.** Selection, no suitable capability, clarification and provider failures stay distinct. Prematurely stopped compound plans remain incomplete.
- **24.7% less local preparation time in our benchmark.** The optimized default needs no cache configuration. Optional caches support repeated catalogs or complete repeated recommendations.
- **Inspect the decision boundary.** Candidate coverage, requests, timing and provider usage are recorded. Your host controls loading, permissions and execution.

## Install and use

**Release preparation:** the catalog and plugin changes are proposed together. Production promotion still requires the [quality and utility gate](../../../skill-evals/jev-capability-advisor/README.md#promotion-gate). The following installation command applies after publication.

```sh
npx skills@latest add stark-ai-de/agent-skills --skill jev-capability-advisor -g -a codex
```

The standalone package uses the portable Agent Skills format and can also be installed with `-a cursor` or `-a claude-code`. **Native activation is currently qualified in Codex only**; installation on another host is not runtime qualification.

Then ask:

> Use $jev-capability-advisor to recommend the available skills or tools for reviewing this pull request and independently inspecting its deployment logs.

Or keep the first check entirely local:

> Use $jev-capability-advisor to inspect the candidates for this task without calling TypeSafe.

The helper needs **Python 3.10+**; it has no third-party Python dependencies, router service or embedding-model download. A fresh Jev recommendation uses your own TypeSafe API key and sends the supplied task plus bounded public capability cards to TypeSafe. Offline inspection needs no key or network. Configure credentials locally; never paste or commit them. The agent needs a **current host-supplied catalog**: files on disk alone do not establish which tools are available. See the [catalog and CLI contract](../../../skills/skill-maintenance/jev-capability-advisor/references/contract.md).

This release candidate also prepares the skill for **Codex in stark AI Developer 1.3.0**. Archive qualification and plugin-directory publication are separate stages; a locally built archive does not mean the directory already carries this update.

## Measured local speed

**The default reduces median preparation from 160 ms to 120 ms.** This is measured local catalog preparation and request construction, before contacting Jev—not native skill loading or end-to-end task speed.

| Same 718-entry catalog          | Preparation + request, median |           p95 | Offline CLI, median |
| ------------------------------- | ----------------------------: | ------------: | ------------------: |
| Earlier implementation          |                     159.54 ms |     164.61 ms |           204.93 ms |
| **Optimized default, no cache** |                 **120.13 ms** | **122.02 ms** |       **171.41 ms** |
| Optional warm index             |                     115.94 ms |     117.76 ms |           166.76 ms |
| First index creation            |                     206.60 ms |     216.65 ms |           259.77 ms |

Measured 2026-09-22: 40 fresh processes per row and measurement scope, ten fixed development queries, rotating arm order; Linux/NixOS in WSL2, Intel i9-13900K, Python 3.14.7. All 320 measured process outputs retained the same candidates and relevant payloads. No provider calls were timed here. Normal concurrent machine load and warm filesystem caches limit portability of the absolute numbers. The warm index adds only a small gain; its initial creation is slower, so index caching stays opt-in. The separate **decision cache** can avoid a fresh provider call entirely when the query and current catalog/host context match.

## Selection quality

**72/80 correct on the regression set; 16/20 on a fresh compound set.** A phase-specific follow-up correction addressed premature stops after the first recommendation. The 80 previously evaluated tasks now serve as regression data; the 20 independently authored new compound tasks were frozen separately before live testing.

| Regression task type             | Before correction | Corrected default |
| -------------------------------- | ----------------: | ----------------: |
| Single skill                     |             20/20 |         **20/20** |
| Single tool                      |             18/20 |         **18/20** |
| No capability needed             |             10/10 |         **10/10** |
| Clarification needed             |             10/10 |         **10/10** |
| Compound requests                |              5/20 |         **14/20** |
| Complete result across all tasks |             63/80 |         **72/80** |

Nine previously failing tasks became correct; none of the previously correct tasks became incorrect. However, among remaining failures, unwanted selections rose from three IDs across two cases to eight IDs across seven cases. Correctness requires all required capability groups, the right outcome and no unwanted selections. Initial requests and candidates remain byte-equivalent on all 80 tasks; this is one trial per task, so the design does not isolate prompt effects from model variability.

| Fresh compound tasks only      | Corrected default |
| ------------------------------ | ----------------: |
| Two independent capabilities   |         **10/10** |
| Three independent capabilities |              6/10 |
| Complete result                |         **16/20** |

**Compound advice remains experimental.** Each of the four fresh failures lacked at least one required candidate in the shortlist. Two also returned inconsistent initial model choices, correctly reported as errors; there were no HTTP/transport failures. All ten skill-only fresh compounds were correct, compared with six of ten involving tools. This small compound-only set does not measure fresh single-task or negative-case accuracy.

The corrected run used **153 requests** for 100 tasks, without retries or decision caching, on Jev 1.13.0 (2026-09-22; 718 catalog entries; sequential tasks). Complete recommendation median/p95 was **1.292/3.515 s** on the regression set and **2.426/3.641 s** on the fresh compound set. These are helper-selection times, not execution or host-loading times. The earlier run used different concurrency, so these observations do not establish a before/after speed gain.

A separate pre-correction experiment combining balanced retrieval and additional routing metadata matched the standard policy at 63/80 and did not improve overall quality. Those options remain experimental; `current` is still the default. The fixed catalog and synthetic tasks limit generalization.

## Native workflow pilot

In a small paired Codex pilot, native discovery and the advisor-assisted host both selected every required capability correctly: **6/6 tasks, 9/9 required groups**. Native discovery took a median **15.64 s**; the host with replayed Jev advice took **20.47 s** and corrected two incomplete compound suggestions itself. No additional task-quality or speed benefit was observed.

The twelve turns used a fixed catalog and six predeclared regression tasks. The advisor arm replayed verified responses from the earlier runtime, so it included no fresh TypeSafe network latency and does not qualify the later follow-up correction. This narrow pilot supports host control; it does not establish a general advantage over native discovery. Use the advisor for deliberate inspection and evaluation, not as a mandatory step for ordinary tasks.

## Features at a glance

| Capability                 | Jev Capability Advisor                                                        |
| -------------------------- | ----------------------------------------------------------------------------- |
| Recommendation candidates  | **Available skills, MCP tools and host tools in one catalog**                 |
| Independent first steps    | Single-task advice; experimental conditioned pairs/triples                    |
| No match or unclear intent | Separate `none` and `clarify` outcomes                                        |
| Provider failure           | Explicit error; never reported as a successful recommendation                 |
| Task-specific guidance     | Optional public `use_when`, `avoid_when`, keywords and parameter descriptions |
| Offline workflow           | Candidate inspection without API access                                       |
| Optional local caches      | Validated lexical index; bounded complete-decision cache                      |
| Alias handling             | Consolidate copies only with matching whole-bundle proof and restrictions     |
| Activation                 | Host-owned; explicit-only restrictions retained                               |

Different integrations solve different problems: this package provides an explicit, inspectable advisor for a host-supplied catalog. It does not replace native discovery or an automatic routing hook. The supported comparison is between the measured advisor configurations above; it is not a universal ranking of routing products.

## Scope that stays clear

Use this advisor when selecting capabilities is itself useful work. Ordinary tasks continue through your client's native discovery. The advisor does not install skills, intercept prompts, start MCP servers or execute selected tools. A recommendation does not grant permission to act.

The shortlist is bounded to 240 entries; an omitted tool may still be relevant. Public applicability metadata is optional and is not a permission or availability signal. Model confidence is not verified correctness. Catalogs, keys, caches and raw receipts stay local.

## Evidence and source

- [Qualification, methods and limitations](../../../skill-evals/jev-capability-advisor/README.md)
- [Current benchmark aggregates](../../../skill-evals/jev-capability-advisor/benchmarks/2026-09-22.json)
- [Skill instructions](../../../skills/skill-maintenance/jev-capability-advisor/SKILL.md)
- [Plugin source manifest](../../../plugins/stark-ai-developer.source.json)

The website detail page renders this same guide, keeping features, measurements and their scope in sync.
