# Memory Config Modes

Use this reference when the user asks whether to disable, tune, or audit memories.

For exact TOML edits, verify current Codex config docs when network access is available; memory config keys are a moving surface.

## Active Mode Classification

Locate relevant lines across the entire document without exposing values:

```bash
node scripts/locate-memory-config.mjs --codex-home "${CODEX_HOME:-$HOME/.codex}" --json
```

The locator returns only line numbers and fixed signal names. It does not parse TOML, resolve profiles, or determine effective settings; comments and multiline strings may also match. Inspect bounded relevant sections with their table context, redact values before presenting excerpts, and resolve dotted/quoted keys, active profiles, command-line overrides, and duplicates before classification. Never truncate discovery at an arbitrary line count. Missing or ambiguous evidence remains unknown; a lexical match alone is not an active setting.

Classify the observed state:

| Mode                                 | Signals                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------- |
| Disabled                             | `[features] memories = false`                                           |
| Enabled but not injected             | `features.memories = true` and `memories.use_memories = false`          |
| Enabled and injected                 | `features.memories = true` and `memories.use_memories = true`           |
| External-context generation disabled | `memories.disable_on_external_context = true`                           |
| Unknown                              | Missing config, conflicting values, app-controlled settings, or unclear |

When `use_memories` or `generate_memories` is absent, use the documented default `true` only as a recommendation aid; still report that the setting is implicit.

If config is missing, report:

```text
No config.toml was found. Memory behavior may be controlled by app settings or defaults.
```

## Audit Mode

Use when testing whether memory injection worsens Codex output.

```toml
[features]
memories = true

[memories]
use_memories = false
generate_memories = true
```

Effect: Codex may generate or update memories, but existing memories are not injected into work.

## Safer Normal Mode

Use for daily work while reducing noisy memory generation from external context.

```toml
[features]
memories = true

[memories]
use_memories = true
generate_memories = true
disable_on_external_context = true
min_rate_limit_remaining_percent = 50
```

Effect: useful memories remain available, while context-heavy external workflows are less likely to create noisy memories.

## Exact Repo Work Mode

Use for migrations, refactors, debugging, and architecture work where stale assumptions are harmful.

```toml
[features]
memories = true

[memories]
use_memories = false
generate_memories = false
```

Effect: memory is kept available for later, but neither injection nor generation affects the exact repo task.

## Off Mode

Use when memory behavior is actively harming output and the user wants a full reset.

```toml
[features]
memories = false
```

Effect: memory features are disabled.

## Tuning Keys

Use these when the user asks for more precise memory behavior. Do not recommend model overrides unless the user explicitly asks for model-level tuning.

| Key                                           | Use                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `[features].memories`                         | Enables or disables the memory feature.                                                          |
| `memories.use_memories`                       | Controls whether existing memories are injected into new sessions.                               |
| `memories.generate_memories`                  | Controls whether new threads can become memory-generation inputs.                                |
| `memories.disable_on_external_context`        | Excludes threads using external context such as MCP, web, or tool search from memory generation. |
| `memories.min_rate_limit_remaining_percent`   | Raises or lowers the quota threshold for background generation.                                  |
| `memories.min_rollout_idle_hours`             | Requires a thread to sit idle before memory generation.                                          |
| `memories.max_rollout_age_days`               | Limits how old a thread can be and still be considered for memory generation.                    |
| `memories.max_rollouts_per_startup`           | Caps how many candidate threads are processed per startup pass.                                  |
| `memories.max_unused_days`                    | Limits unused memories considered during consolidation.                                          |
| `memories.max_raw_memories_for_consolidation` | Caps retained raw memories used for consolidation.                                               |
| `memories.extract_model`                      | Optional model override for per-thread extraction.                                               |
| `memories.consolidation_model`                | Optional model override for global consolidation.                                                |

Legacy alias: `memories.no_memories_if_mcp_or_web_search` may appear in older configs for `memories.disable_on_external_context`. Prefer the current key in recommendations.

## More Conservative Generation

Use when memory pollution is the main concern but existing useful memories should remain available.

```toml
[features]
memories = true

[memories]
use_memories = true
generate_memories = true
disable_on_external_context = true
min_rate_limit_remaining_percent = 50
min_rollout_idle_hours = 12
max_rollout_age_days = 14
max_rollouts_per_startup = 8
```

Effect: keeps memory injection available while slowing and narrowing background generation.

## Location Guidance

| Information type             | Better location       |
| ---------------------------- | --------------------- |
| User-wide stable preference  | Codex memory          |
| Repo-specific workflow rule  | `AGENTS.md`           |
| Detailed public repo context | Repository docs       |
| Reusable on-demand workflow  | Skill                 |
| Runtime behavior setting     | Config                |
| Secret, token, credential    | Nowhere in memory     |
| Temporary task state         | Handoff file or issue |

When a fact may drift, keep it scoped and require cheap verification.

## Consolidation readiness and user guidance

Read when a host requires extension-note updates, a correction has not reached generated memory, or the user asks about a pending consolidation. Keep the existing selected workflow and its report/chat delivery; this is not another cleanup route.

### Report the actual outcome

- **Stored:** the approved correction was saved through the host-permitted mechanism and reread successfully.
- **Pending:** the correction is stored, but the relevant generated entries are demonstrably unchanged or a verified job is waiting. Name the observed gate; do not infer a cause from `pending` alone.
- **Verified:** the targeted generated entries contain the intended corrections, duplicates are removed without losing scoped source links, and supporting evidence is preserved.
- **Unknown:** generated state or job evidence could not be inspected, the schema/version is unsupported, or a request timed out. Do not equate uncertainty with pending, failure or completion.

For note-only hosts, back up the affected existing curated file before delivering an approved note. Record the new note as `created-no-preimage`, including its rollback; never claim it was backed up. Preserve existing notes and raw/rollout evidence. A direct edit, when separately allowed, can be verified immediately; note-based application depends on the host's consolidation process.

### Prerequisites the user can satisfy

Inspect only what is needed for the missing gate, using native permissions. Explain what is confirmed, missing, or unknown before suggesting an action.

| Gate                                                  | Evidence to inspect                                                                                             | Safe user action                                                                                                                                                                                                                                                         |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Correct local host and memory enabled                 | Installed client/version, resolved Codex home, effective feature/profile and chat memory controls               | Use the intended machine/profile; enable memories through its supported settings if desired. Installation alone is not enablement.                                                                                                                                       |
| Supported, visible update input                       | Host update contract, extension instructions, exact note existence and visibility to the workspace diff         | Save the approved note in the host-supported location. Do not relocate notes or create a new extension just because a different installation used one.                                                                                                                   |
| Success cooldown expired                              | Version-qualified claim logic and last successful global completion timestamp                                   | Wait until the computed deadline, shown in the user's timezone. New inputs and restarts do not reset the elapsed-time requirement.                                                                                                                                       |
| Eligible pipeline startup                             | Runtime source/status showing an ordinary, non-ephemeral root session with memories enabled and state available | After the deadline, open or resume an ordinary chat if that operation starts a root session on this client. Continuing a turn in an already loaded chat may not trigger startup. Do not create or restart sessions on the user's behalf without corresponding authority. |
| Adequate Codex quota                                  | Supported account/rate-limit status and the effective memory threshold                                          | Wait for the relevant quota window to replenish or preserve enough quota for background work. A paid upgrade is not required by this guide. Do not lower safeguards or change models automatically.                                                                      |
| Eligible extraction inputs, when extraction is needed | Relevant chat generation controls, idle/age/source rules and external-context policy                            | Allow the source chat to become idle and, when wanted, opt it into generation using supported controls. Tool-assisted chats may be excluded. A visible extension note is a separate input; do not assume it needs a fresh extraction result.                             |
| No active lease or retry backoff; workspace usable    | Supported status or narrowly scoped read-only job fields; relevant permissions/error diagnostics                | Let an owned job finish or a retry deadline expire; repair a demonstrated permission/path problem only within current authorization. Do not delete locks or write SQLite rows to force work.                                                                             |

These gates are separate. Expiry of one gate does not prove the others are satisfied. A read-only status request does not itself trigger consolidation. Prefer supported status surfaces; use SQLite only read-only, only with local access authority, and only after checking the installed schema. Output no worker IDs, ownership tokens, thread IDs, raw memory rows or raw error payloads. An inaccessible status transport is an evidence gap, not proof the pipeline failed.

### Version-qualified six-hour cooldown

In the public **Codex rust-v0.163.0** implementation, `PHASE2_SUCCESS_COOLDOWN_SECONDS` is `6 * 60 * 60`. The global phase-2 claim rejects work when `last_error` is absent and `finished_at` is newer than that cooldown cutoff. This check applies even if the row says `pending`: enqueueing new inputs changes the status without clearing the successful completion time.

For that verified implementation, compute the earliest deadline as **last successful global completion + six hours**. At the boundary the cooldown condition clears; before it the condition remains true. This is an earliest eligibility time, not a scheduled start or a completion guarantee. Resolve the timestamp to the user's timezone, including its date and offset. Do not invent a timestamp when the completion time is unavailable.

The same release starts its asynchronous pipeline at eligible root-session startup, checks quota, runs extraction, then attempts consolidation. It does not promise a timer firing exactly at cooldown expiry. A restart does not remove the stored completion timestamp. No ordinary setting to shorten this constant is exposed by that implementation.

Verify the installed release before applying these details to another version or fork. If source/status evidence is unavailable, explain the documented background behavior and mark the exact cooldown/schema unknown. Do not transplant the six-hour value as a universal Codex rule. Do not patch a binary, forge completion timestamps, reset memory, loosen permission/network policy or edit the database to bypass a gate.

### Verify after the next successful pass

1. Preserve the approved input and a baseline of only the relevant generated files and source links.
2. When a pass is known to finish, inspect the exact corrected claims and duplicate locations in the generated index. Check that the source links still resolve. A timestamp/hash change alone does not prove the intended edits; an unchanged file alone does not identify the blocker.
3. Report stored input and active-index application separately. When the host documents next-session injection, explain that this chat may still contain an earlier injected snapshot; do not claim existing model context was retroactively replaced.
4. If the pass or content is not verified, keep the application pending/unknown and give the single next evidenced action. Do not poll indefinitely or create an automation without the user's request.

For file routes, put this evidence and next action in the existing curation record; chat routes retain chat delivery. Any runtime/config repair or broader cleanup still uses its own authorization boundary.

### Primary sources

- [Official local memory behavior and controls](https://learn.chatgpt.com/docs/customization/memories): asynchronous processing, idle eligibility, quota and chat controls.
- [rust-v0.163.0 global job claim and cooldown](https://github.com/openai/codex/blob/rust-v0.163.0/codex-rs/state/src/runtime/memories.rs): `PHASE2_SUCCESS_COOLDOWN_SECONDS`, `try_claim_global_phase2_job`, `enqueue_global_consolidation_with_executor`.
- [rust-v0.163.0 startup pipeline](https://github.com/openai/codex/blob/rust-v0.163.0/codex-rs/memories/write/src/start.rs): startup eligibility and extraction/consolidation ordering.
- [rust-v0.163.0 quota guard](https://github.com/openai/codex/blob/rust-v0.163.0/codex-rs/memories/write/src/guard.rs): effective remaining-quota threshold.
