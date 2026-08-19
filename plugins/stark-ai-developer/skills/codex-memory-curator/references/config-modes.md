# Memory Config Modes

Use this reference when the user asks whether to disable, tune, or audit memories.

For exact TOML edits, verify current Codex config docs when network access is available; memory config keys are a moving surface.

## Active Mode Classification

Inspect:

```bash
sed -n '1,220p' "${CODEX_HOME:-$HOME/.codex}/config.toml" 2>/dev/null
```

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
