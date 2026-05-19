# Memory Config Modes

Use this reference when the user asks whether to disable, tune, or audit memories.

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
