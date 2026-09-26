# Jev, measured

**Faster capability selection. Compact, inspectable advice.**

Jev Capability Advisor helps your agent find a relevant skill or tool from its available catalog. [Install and use the advisor](../README.md).

## Current next-skill comparison

**6.42× the native selector’s speed.** Jev Session needs **0.482 seconds** versus Native’s **3.092 seconds**, with **48/48 correct skill choices** each. This measures selection, not complete-task speed.

**Measured release: 0.23.0, 2026-09-25.** All seven runtime files match [release `095de174`](https://github.com/stark-ai-de/agent-skills/tree/095de174e8eb345b27a726631c6a2215168958df/skills/skill-maintenance/jev-capability-advisor/scripts), including the catalog-validation and alias-punctuation fixes. The site checks this binding and discloses later drift.

| Variant                                    | Skill decision median |  Skill p95 |   Factor vs Native | Correct accepted choices | No match correct | Errors |
| ------------------------------------------ | --------------------: | ---------: | -----------------: | -----------------------: | ---------------: | -----: |
| Hussi9 + our HTTPS (internal, unpublished) |            0.480227 s | 0.753286 s |              6.44× |                    48/48 |            16/16 |      0 |
| Jev Session                                |            0.481746 s | 0.875332 s |              6.42× |                    48/48 |            16/16 |      0 |
| Published Hussi9 chooser                   |            0.844864 s | 1.002141 s | Withheld (timeout) |                    45/48 |            16/16 |      1 |
| Native                                     |            3.091701 s | 5.916692 s |           Baseline |                    48/48 |            16/16 |      0 |

- **Same inputs:** 32 tasks × two repetitions; **48 skill observations and 16 NONE observations per variant**, with a frozen 132-skill catalog. These previously used tasks recheck the release; they are not a new unseen test set.
- **Models:** Native requests **gpt-6-luna, reasoning medium**, using Codex CLI 0.157.0. Jev and both Hussi variants use **jev-1.13.0**. The actual Native backend identity remains unobservable.
- **Measurement windows:** Jev/Hussi 2026-09-25T13:16:28.204293+00:00 – 2026-09-25T13:18:30.738377+00:00; Native 2026-09-25T13:23:09.230351Z – 2026-09-25T13:27:34.786740Z. Provider load and caching were uncontrolled; Native reported cached input in **45/64** turns.
- **Timer:** preparation plus response handling/model turn. Process startup, skill loading, fallback work and task execution are excluded. Session needs a retained process. No warmups, harness retries or saved decisions. Medians use full precision; p95 uses nearest rank.
- **One retained Hussi timeout:** the published chooser returned 45/48 accepted correct skill choices, with two confidence abstentions and one timeout. Its median includes the failure return, so its speed factor is withheld. The late response’s input tokens are still counted. Jev and Native each have zero errors.

The product chart shows the qualified Jev Session and Native timings, with the **6.42×** Native-relative factor beside Jev’s bar. The published Hussi chooser’s timing bar is excluded because of its retained timeout; its complete results remain in the table above. Our unpublished pooled-HTTPS control also remains in the table: its median was about 1.5 ms below Jev’s. This is a transport experiment, not a released product or qualified MCP integration.

The same chart box lists four discovered selector candidates: [skill-picker](https://github.com/MuskanPaliwal/skill-picker), [jev-skill-suggester](https://github.com/win4r/jev-skill-suggester), [SkillRanker](https://github.com/Dicklesworthstone/skillranker), and [skill-router by Lomesh](https://github.com/lomeshdutta/skill-router). They were not included in the recorded campaigns and have no comparable measurements here. They are labeled **Not benchmarked**, without timing bars or factors. The partial Luna Low development run did not produce a replacement comparison.

[Current Jev/Hussi observations](../../../../skill-evals/jev-capability-advisor/benchmarks/next-skill-2026-09-25.json) · [Current Native observations and audit bindings](../../../../skill-evals/jev-capability-advisor/benchmarks/native-next-skill-2026-09-25.json) · [Import and measurement checks](../../../../skill-evals/jev-capability-advisor/README.md#release-recheck-2026-09-25).

## Product features and measured selection

**One fast next-skill choice, plus a broader advisor when needed.** Jev Session selects the next eligible skill in the explicit `next_skill` mode. Its `general` mode also supports MCP tools and other outcomes. The feature table describes each product; the timing and correctness results measure the pinned selection paths, not every product feature.

| Product feature            | Jev Capability Advisor                  | Hussi9 skill-router                      |
| -------------------------- | --------------------------------------- | ---------------------------------------- |
| Skill recommendations      | ✓ Chooses from your available skills    | ✓ Available in Claude and Codex variants |
| MCP tool recommendations   | ✓ Available in general mode             | ✓ Available in the Codex variant         |
| 16k task characters to Jev | ✓ Sends up to 16,000 task characters    | ✕ Only up to 600 task characters         |
| HTTPS connection reuse     | ✓ Keeps the connection open in Session  | ✕ Fresh connection in the tested chooser |
| Search index reuse         | ✓ Keeps catalog search ready in Session | ✓ Reuses its local skill index           |

**Read the icons:** ✓ supports the named feature; ✕ does not support that feature in the stated path; ? means not checked or not used in the experiment. Task-text limits describe the text sent to Jev. Host integration depends on the client.

**Catalog sources:** Jev accepts the current inventory supplied by the host. Hussi accepts its local skill index **or supplied entries**. The experiment used a frozen benchmark catalog.

- **Why Jev avoids work:** a retained Session reuses HTTPS and its bounded search index. Each request still validates current inventory and checks the answer. The measured `next_skill` path uses no saved decisions.
- **Why the published Hussi chooser takes longer here:** it opens fresh HTTPS in the measured path. Transport, payload and provider effects were not isolated individually; this does not time its complete router or cached routes.
- **What the text limits mean:** task characters sent to Jev, not whole-product input limits. For tasks of 15 words or fewer, Hussi can additionally send up to 300 characters from the previous assistant message. It also supports MCP tools, offline inspection and other routing paths outside the measured chooser.
- **What the internal experiment proves:** we connected Hussi's selection function to our reusable HTTPS client and compact JSON, using a fixed skill list. We did not integrate its inventory scan or MCP routing. Those features were not removed from Hussi; they are outside this experiment. It is slightly faster in this task set, but its MCP support is unassessed and its search-index path was not used.

Sources: [our advisor](../../../../skills/skill-maintenance/jev-capability-advisor/scripts/jev_advisor.py), [our session](../../../../skills/skill-maintenance/jev-capability-advisor/scripts/jev_session.py), [pinned Hussi chooser](https://github.com/hussi9/skill-router/blob/652953a0cbb423d4bb7f62de83db15ad4ca9b16e/scripts/jev_choose.py), [Hussi router sources at the same revision](https://github.com/hussi9/skill-router/tree/652953a0cbb423d4bb7f62de83db15ad4ca9b16e).

## Next-skill input efficiency

**6.3% less selection input than both measured Hussi variants**, confirmed again on 2026-09-25. The explicit `next_skill` profile chooses one skill; remaining work stays unassessed. Default `general` mode also supports tools and compound advice.

The KPI is provider-reported input tokens for selection, not whole-agent tokens or cost. Both median and total input must improve, with all Jev skill and no-match choices correct.

### Matched tasks

**6.4% less total skill-selection input** than each Hussi variant.

| Variant                                | Median input tokens | Total skill input | Skills correct | No match correct | Median decision | Errors |
| -------------------------------------- | ------------------: | ----------------: | -------------: | ---------------: | --------------: | -----: |
| Our Jev · next skill                   |               8,433 |           674,614 |          80/80 |            16/16 |         0.453 s |      0 |
| Published Hussi9 chooser               |               9,007 |           720,418 |          76/80 |            16/16 |         0.829 s |      0 |
| Hussi9 + our HTTPS client (experiment) |               9,007 |           720,418 |          80/80 |            16/16 |         0.452 s |      0 |

No-match input (median / total), separate from the headline:

- **Our Jev · next skill:** 8,411.5 / 134,596 input tokens.
- **Published Hussi9 chooser:** 8,986 / 143,802 input tokens.
- **Hussi9 + our HTTPS client:** 8,986 / 143,802 input tokens.

### Repeated confirmation

**6.3% less total skill-selection input** than each Hussi variant.

| Variant                                | Median input tokens | Total skill input | Skills correct | No match correct | Median decision | Errors |
| -------------------------------------- | ------------------: | ----------------: | -------------: | ---------------: | --------------: | -----: |
| Our Jev · next skill                   |             8,430.5 |           404,678 |          48/48 |            16/16 |         0.482 s |      0 |
| Published Hussi9 chooser               |             8,996.5 |           431,896 |          45/48 |            16/16 |         0.845 s |      1 |
| Hussi9 + our HTTPS client (experiment) |             8,996.5 |           431,896 |          48/48 |            16/16 |         0.480 s |      0 |

No-match input (median / total), separate from the headline:

- **Our Jev · next skill:** 8,401 / 134,528 input tokens.
- **Published Hussi9 chooser:** 8,981 / 143,686 input tokens.
- **Hussi9 + our HTTPS client:** 8,981 / 143,686 input tokens.

### Why the next-skill profile uses less input

| Technical difference     | Our explicit next-skill profile                                                    | Pinned Hussi9 chooser                                                   |
| ------------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Selection question       | One next-skill choice; at most one provider call                                   | Domain, process and task-path choices in one request                    |
| Candidate representation | Shared bounded cards, compact numeric codes and no repeated option descriptions    | Published domain/process option layout                                  |
| Coverage                 | One skill; remaining work explicitly unassessed                                    | Published skill-routing chooser contract                                |
| Connection               | Persistent HTTPS within a retained session                                         | Published chooser: fresh connection; our control: persistent HTTPS      |
| Checks retained          | Current catalog, activation restrictions, valid host IDs and strict answer parsing | Original returned-ID checks, 0.8 route threshold and 1.2-second timeout |

The pooled control remains slightly faster. Jev’s input advantage preserves **128/128 skill choices and 32/32 no-match decisions** across both cohorts. Encoding and question-count effects were not isolated individually.

Both cohorts used the same 132-skill catalog and `jev-1.13.0` on 2026-09-25: 48 matched tasks plus 32 repeated confirmation tasks, each run twice for three variants. All **480 comparison observations**, a separate **nine-observation development check**, and **64 Native observations** are retained: **553 new live observations**. No retries, warmups, missing results or unknown input usage. One Hussi timeout remains an error; it does not become a successful selection because its response arrived later.

The tasks were previously exposed. This is a release recheck, not a new blind confirmation. Hussi means its pinned chooser, not the full router, hooks or fallback. The token gates permit retained comparator failures; they do not qualify a speed claim for a timed-out variant. Offline tests and replays are excluded from live counts.

[Current audited observations](../../../../skill-evals/jev-capability-advisor/benchmarks/next-skill-2026-09-25.json) · [Earlier optimization ledger](../../../../skill-evals/jev-capability-advisor/benchmarks/optimization-development-2026-09-24.json) · [Evaluation details](../../../../skill-evals/jev-capability-advisor/README.md#release-recheck-2026-09-25).

## Known limits and evidence scope

In the September 24 snapshot, a trailing period after an explicitly named qualified skill ID could prefer an equivalent unqualified alias. The source-bound supplementary audit reproduced that inherited limitation in both baseline and candidate. The 16-case supplementary suite passed 15 cases; the 173 main contract tests passed for the measured snapshot. This did not establish a permission bypass. Release 0.23.0 fixes terminal punctuation handling, passes 178 offline tests, and is bound to the September 25 live recheck. The historical 15/16 result and source hashes remain unchanged; these live tasks do not separately isolate the punctuation fix.

Both dated Jev/Hussi and Native report pairs are retained separately. Historical observations are not added again to the new campaign count. The small [optimization ledger](../../../../skill-evals/jev-capability-advisor/benchmarks/optimization-development-2026-09-24.json) also remains because the next-skill report binds its SHA-256 and records rejected candidates and a provider interruption. Its 107 observations left unexecuted remain missing. It provides provenance, not additional current-comparison observations or a development-effort KPI. Superseded benchmark presentations and their unrelated receipts are excluded from the release tree.

General-profile recorded-response parity preserves 29 incorrect baseline outcomes, including two errors, across 232 offline replays. This establishes unchanged behavior for those supplied responses, not new model-quality successes. No whole-task accuracy improvement or speed gain has been demonstrated. The [accepted promotion scope](../../../../skill-evals/jev-capability-advisor/README.md#promotion-decision) relies on efficient, correct next-skill selection and optional inspection; general compound advice remains experimental.

## What you get

| Capability           | Purpose                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| Skills and MCP tools | Compare available capabilities in a host-supplied catalog.                 |
| Clear outcomes       | Distinguish recommendations, no match, clarification and provider failure. |
| Compact advice       | Return selected descriptions while retaining a full local receipt.         |
| Reusable sessions    | Reuse HTTPS and a bounded index while validating current inventory.        |
| Offline inspection   | Inspect candidates without a key or network call.                          |
| Host control         | Preserve activation restrictions, permissions and execution ownership.     |

The skill is accepted for optional, requested advice and offline inspection. Installation does not install automatic prompt interception; automatic host activation, inventory and advice delivery require separate qualification.

[Evaluation methods and promotion decision](../../../../skill-evals/jev-capability-advisor/README.md) · [Install and use](../README.md)

## Historical comparison, 2026-09-24

**Historical snapshot:** these unchanged observations describe [the earlier measured source](https://github.com/stark-ai-de/agent-skills/tree/a4a8512dd8ebb55abb26650e08af38f301cea064/skills/skill-maintenance/jev-capability-advisor/scripts). The release recheck above is the current comparison.

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

The product chart compares Jev Session, the published Hussi9 chooser and Native. The complete results above retain our unpublished pooled-HTTPS control: it was slightly faster than Jev Session in this cohort. It is a benchmark adaptation, not a released product or a qualified MCP/host integration.

[Native observations, exact timings and audit bindings](../../../../skill-evals/jev-capability-advisor/benchmarks/native-next-skill-2026-09-24.json) · [Unchanged Jev/Hussi confirmation](../../../../skill-evals/jev-capability-advisor/benchmarks/next-skill-2026-09-24.json) · [Measurement and import audit](../../../../skill-evals/jev-capability-advisor/README.md#native-next-skill-supplement-2026-09-24).
