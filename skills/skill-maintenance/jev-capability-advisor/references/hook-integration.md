# Optional agent-mediated hook guidance

Use this **Integrate** mode to add a short reminder to Codex CLI or Claude Code before the agent handles a submitted user message. The reminder asks the agent to obtain Jev advice for new actionable work when the active host can supply trustworthy eligible capabilities. It does not obtain advice itself. For repeated calls from a process you control, choose the separate [owner-process session](session-integration.md).

## Opt-in and task behavior

Installing the skill or plugin leaves host configuration unchanged. Hook setup is a separate, explicit action with a named host and user/project scope. Explain during setup that actual advice sends a minimal task summary and bounded capability cards to TypeSafe, using the already configured credential source. Do not add unrelated private content, transcripts, tool results, private paths or secrets. Do not provision credentials or ask for a key in chat.

The hook receives every `UserPromptSubmit` event. The agent uses conversation context to distinguish a new actionable task from a confirmation, explanation question, smalltalk or continuation. When the hook is explicitly enabled and current prerequisites hold, the agent must run the existing Recommend workflow once with `selection_profile: general` and `retrieval_policy: current` **before loading a task-specific skill, planning the task or asking task-specific questions**. First perform only the minimum prerequisite checks: resolve eligible Jev, read its instructions, verify the bound registration and credentials, and establish a reliable current-session catalog under native permissions. If a prerequisite fails, immediately state the concrete reason and continue natively. One consultation may include up to three bounded provider calls. Follow-ups do not trigger another consultation. This is agent-mediated behavior, not deterministic prompt classification or guaranteed interception.

Keep explicit user skill choices and instructions to skip Jev. Resolve Jev through the host's currently advertised metadata, then follow its current instructions. A hook does not make an otherwise explicit-only Jev invocation eligible. Preserve every candidate's disabled, explicit-only and account restrictions and the user's existing authority. Plan-mode or other read-only limits still apply, including to catalog export and receipt writes. Do not create new caches or change the existing advisor's request/time budgets.

For a new actionable task, consultation or prerequisite failure emits one short user-visible status line with the recommendation or a concrete fallback reason before task-specific work continues. The static hook output is context for the agent, not proof of a successful consultation. Skipped confirmations and follow-ups need no advisor status. Missing credentials, unavailable Jev, unverifiable inventory, provider failure, timeout or cancellation retain the host's native selection; avoid retry loops and do not report a recommendation that never occurred.

Before the provider command, check the executing host's network policy. If outbound access requires approval, use its normal approval mechanism for that bounded advisor invocation. Ready credentials do not grant network access. A denied or unavailable approval requires a concrete fallback; do not weaken the sandbox, change global permissions or silently retry a failed provider request.

For Codex hosts whose active `exec_command` schema exposes `sandbox_permissions`, request `require_escalated` on the **first advisor invocation** when its network access needs approval. Supply a concise `justification` identifying the bounded TypeSafe advice request. These are tool arguments, not Python flags or text placed inside the shell command. Prepare the catalog, task-summary file and local coverage record in a separate permitted command first, then submit only the advisor command for review. Do not bundle setup writes or unrelated shell operations into that approval. For example, after resolving real local paths:

```json
{
  "cmd": "python3 /installed/jev/scripts/jev_advisor.py --catalog /private/catalog.json --query-file /private/task.txt --key-file /private/existing-key --summary --output /private/receipt.json",
  "sandbox_permissions": "require_escalated",
  "justification": "May Jev send this task summary and the eligible capability cards to TypeSafe for one bounded consultation?"
}
```

Use the executing host's actual tool schema; another host or permission profile may expose a narrower native network-approval mechanism instead. If approval is disabled, denied or unavailable, state that prerequisite failure and continue natively without dispatching the request. Do not run a predictably blocked advisor first and interpret its `network_error` as an approval request: a failed shell command does not itself grant or request network access. Keep the existing no-replay rule if a request has already failed. Auto-review, when configured by the user, decides native approval requests; the skill must not alter reviewer settings, add persistent allow rules or bypass a decision. [Codex sandbox and approval behavior](https://learn.chatgpt.com/docs/agent-approvals-security#common-sandbox-and-approval-combinations).

## Capture a bounded current-session catalog

Use the current running agent's host metadata. The catalog may contain both skills and MCP tools; its scope is the provable entries supplied to this session, not everything installed on the machine. Qualify the host callback, this catalog-capture path, delivery and actual recommendation use independently before claiming automatic advice. A static reminder, configuration check or historical receipt alone proves none of those steps.

1. **Bind to the active session.** Identify the actual host and current task. Use its currently supplied skill cards and tool metadata, refreshing through its native discovery interface where available. Do not start a second Codex/Claude/SDK session as an inventory oracle. Previous-turn snapshots require a current host freshness check.
2. **Preserve host identity and restrictions.** Keep the exact invocation name and a stable host ID, with a local ID-to-invocation mapping if the advisor needs a prefixed ID. Include only entries whose current availability and applicable invocation rules are established. Exclude disabled entries and skills restricted to explicit invocation unless the user has supplied that invocation; an explicit skill choice still takes precedence over advice. The host remains responsible for argument-specific approvals when the chosen capability is used.
3. **Use verified defaults, not guessed flags.** A documented default is evidence only for the host/version and metadata surface to which it applies. An absent field with no verified default leaves eligibility unknown and excludes that entry. More restrictive current session or managed settings override a default. Never turn an incomplete export into an unrestricted catalog.
4. **Build selection cards.** Follow the [catalog contract](contract.md#catalog) with `kind: skill|tool`, exact names, useful descriptions and source-backed restrictions. Before consultation, use host-provided selection cards. If an already advertised candidate needs enrichment, extract only its name, description and relevant invocation-policy metadata from frontmatter or host metadata files. Do not load the candidate's full `SKILL.md`, workflow body, examples or supporting instructions into the conversation. If that metadata remains insufficient, exclude the candidate and record the coverage gap. Jev's own instructions and prerequisite references are exempt. Load task-specific instructions only after advice and verification of the selected capability. Finding a file cannot establish availability or override restrictions. Include only actual MCP definitions as tool entries; built-in host tools are outside this hook catalog, and no tool entries are required when none are eligible. Keep public applicability text; do not send private paths, secrets, tool arguments or results.
5. **Record coverage locally.** Alongside the advice receipt, retain the session/turn association, metadata source, included skill/tool counts and exclusion reasons. Mark coverage bounded or unknown when the host list is incomplete, deferred or shortened. Some unknown entries do not prevent advice from a reliable bounded subset; an empty or unusable subset falls back to native discovery. A `none` result covers only the supplied/retrieved candidates. Recheck selected IDs and restrictions before activation; changed availability requires native fallback, not reuse of stale advice.

### Catalog shape and local check

When constructing a fresh CLI catalog, read the [Catalog contract](contract.md#catalog). Write a **bare JSON array** of capability objects. Do not wrap it in `{"capabilities": [...]}`, `{"catalog": [...]}` or an owner-process Session frame. Store the private provenance/coverage record separately. This structural example uses placeholders; replace them with current host metadata and source-backed flags, never fabricated availability:

```json
[
  {
    "id": "skill:<stable-host-id>",
    "kind": "skill",
    "name": "<exact-host-invocation-name>",
    "description": "<public-description-from-the-current-host>",
    "enabled": true,
    "explicit_only": false
  }
]
```

Before the first provider attempt, check a newly generated file locally using the existing helper. Preserve `general/current`, omit credentials, `--summary` and both cache options, and keep detailed output private:

```sh
python3 scripts/jev_advisor.py --catalog /private/catalog.json \
  --query-file /private/task.txt --selection-profile general \
  --retrieval-policy current --offline-candidates > /private/catalog-check.json
```

Read the local result's `status`, `candidate_ids` and coverage fields. Require `status: candidates` and a nonempty eligible subset before continuing. A formatting defect may be corrected from the contract and checked locally before any provider attempt; unresolved input errors or an empty subset require native fallback. This is syntax/retrieval validation, not proof of host availability, semantic selection or permission. Do not report its candidates as a Jev recommendation. Reuse an already valid current catalog without redundant inspection.

Only after the local check succeeds, make a **separate host tool call** for Recommend with the required native network approval described above. Do not combine file creation, the local check and the provider invocation in one shell command. Keep the existing consultation/request budgets and do not replay a failed provider request.

### Codex CLI

Use the skill list delivered to the running model and the tool metadata actually supplied to that session. For the pinned Codex source below, skill policy defaults `allow_implicit_invocation` to `true`; an absent optional policy is therefore not automatically an unknown restriction on that verified surface. Preserve explicit `false` and any host-supplied restriction. This default establishes invocation policy only, not installation, enablement, account access or tool-call approval. Reverify it for a host whose policy contract differs. [Pinned policy default](https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/skills/src/model.rs#L22-L28).

For MCP tools, include only current callable definitions exposed by the host. A discovery advertisement or configured server name alone is insufficient. If the host exposes native tool discovery and its use is authorized, resolve relevant deferred tools there first, then use the returned current definitions. Preserve missing or deferred coverage instead of scanning installed connectors. Codex's discovery interfaces are useful sources but do not certify every argument-specific permission in advance; actual calls stay under native permissions.

### Claude Code

Use the model-visible skill cards in the running session. Claude's documented default permits model invocation; `disable-model-invocation: true` removes that route, whereas `user-invocable: false` alone does not. Effective overrides and Skill-tool deny rules still apply. Descriptions can be shortened or name-only, so enrich an already established capability or exclude it when useful semantics cannot be obtained. [Invocation controls and defaults](https://code.claude.com/docs/en/skills#control-who-invokes-a-skill).

For MCP, use currently loaded definitions, including results obtained through the same session's authorized `ToolSearch`. Tool names can be advertised before full definitions arrive; preserve that incomplete coverage and refresh after changes. Do not substitute `claude mcp list`, files on disk, or another SDK process. In particular, SDK `init.skills` lists user-invocable skills and is not a full inventory of model-invocable skills in an existing interactive session. [Native tool availability](https://code.claude.com/docs/en/mcp#tool-availability), [SDK skill-list scope](https://code.claude.com/docs/en/agent-sdk/skills#confirm-skills-loaded).

Both hosts may offer a tool while a concrete call still needs approval or is denied for its arguments. Keep those native checks; advice grants no permission. Unknown availability or invocation eligibility excludes the entry. Known argument-specific authorization remains the executing host's responsibility, rather than a fabricated blanket allow in the catalog.

## Manage the registration

Run from the installed skill directory with an existing Python 3.10+ interpreter. On native Windows, use the installed Python executable instead of assuming a `python3` command exists. The interpreter running the manager becomes the registered interpreter; choose an OS-native binary, not a Windows shim from WSL or a WSL executable from Windows.

```text
python3 scripts/jev_hooks.py install|status|uninstall
  --host codex|claude-code
  [--scope user|project]
  [--project-root PATH]
  [--dry-run]
  [--key-file PATH]  # install only
```

| Operation   | Effect                                                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `install`   | Explicitly add or update the owned registration and private ownership records, with a backup before replacing configuration. |
| `status`    | Read the selected registration, interpreter, readable guidance and known obstacles without changing anything.                |
| `uninstall` | Remove only an unchanged entry that the local ownership record proves belongs to this installer.                             |
| `--dry-run` | Preview the selected operation without configuration or ownership writes.                                                    |

`--host` is required. Scope defaults to `user`, covering that host's projects. Project scope requires an explicit `--project-root`; it does not infer a repository from the current directory. Use the same host and scope to inspect or remove a registration.

```sh
python3 scripts/jev_hooks.py install --host codex --dry-run
python3 scripts/jev_hooks.py install --host codex
python3 scripts/jev_hooks.py status --host codex
python3 scripts/jev_hooks.py uninstall --host codex --dry-run
python3 scripts/jev_hooks.py uninstall --host codex
```

For Claude Code, replace `--host codex` with `--host claude-code`. For a project registration, add `--scope project --project-root /path/to/project` to each command. Commands above demonstrate the lifecycle, not an instruction to immediately remove a wanted installation. Explicit hook removal restores native selection; it does not remove Jev or the user's credentials.

### Configure an existing credential reference

To use an existing raw-key file, pass its path during explicit installation:

```sh
python3 scripts/jev_hooks.py install --host codex --key-file /path/to/existing-key --dry-run
python3 scripts/jev_hooks.py install --host codex --key-file /path/to/existing-key
python3 scripts/jev_hooks.py status --host codex
```

The manager validates a readable existing file and stores only its path in private `<host>-settings.json`, shared by that host's user/project registrations. It does not copy, change, authenticate or print the key contents. Use the host's normal private state owner and Git-exclusion rules below. Installation without `--key-file` preserves a previously configured reference; uninstall removes the owned hook but retains credential configuration and historical evidence.

A configured key file takes precedence over `TYPESAFE_API_KEY`. If that file becomes unreadable, report the concrete failure and use native selection; do not silently switch to the environment. Only when no path is configured may the environment supply the key. Unreadable, invalid or conflicting private configuration is a fallback condition, not permission to guess a credential source.

The delivered context ends with `Local registration (never send to provider): ` followed by JSON containing `host`, `scope` and `project_root` (`null` for user scope; the bound absolute root for project scope). Use that binding for the manager's read-only `status`: always pass its `--host` and `--scope`, and pass its `--project-root` only for project scope. Do not infer the host from model branding, guess a project root from the current directory or silently inspect user scope instead. An absent, malformed or contradictory binding is a concrete prerequisite failure. These local registration values must never enter the query, capability cards or provider request. Read `credentials.source`, `readiness` and `reason`. When `source` is `key_file` and readiness is `ready`, pass the returned local `credentials.key_file` explicitly to the existing advisor's `--key-file`; environment mode uses its ordinary environment lookup. The key-file path is a local command argument only and must never enter the query, capability cards or public evidence. Quote it as data for the actual shell. If active mode forbids a required catalog/receipt write, keep native fallback.

If installation is interrupted between hook and credential-settings writes, a private `<host>-settings.pending.json` journal keeps credential readiness unavailable with `incomplete_credential_update`; it does not fall back to the environment. Retry the original explicit install with the same `--key-file`. Recovery proceeds only when the recorded before/after fingerprints still match; conflicting edits are preserved and require review. Uninstall remains available for removing the owned hook and retains the journal and key configuration for diagnosis. Do not delete the pending journal to bypass the readiness failure.

Credential readiness is local: `ready` means the configured file is accessible or the environment source is present, not that TypeSafe accepted a key. `status` reads no key contents and makes no provider calls. A later recommendation can still fail authentication or network access.

### Configuration destinations

| Host        | User scope                                                           | Project scope                           |
| ----------- | -------------------------------------------------------------------- | --------------------------------------- |
| Codex CLI   | `CODEX_HOME/hooks.json`, default `~/.codex/hooks.json`               | `<project>/.codex/hooks.json`           |
| Claude Code | `CLAUDE_CONFIG_DIR/settings.json`, default `~/.claude/settings.json` | `<project>/.claude/settings.local.json` |

Native Windows uses its own user home and native paths. WSL and Windows configuration, credentials and mutable runtime state remain separate. The manager does not replace declarative configuration sources or copy state between operating systems. It preserves unrelated settings and hook entries and does not enable hooks through a plugin-root manifest.

Ownership records and configuration backups live under `jev-capability-advisor/hooks` in private user state: `XDG_STATE_HOME` or `~/.local/state` on POSIX; `LOCALAPPDATA` on native Windows. Keep this directory outside repositories. The sole exception is the default POSIX `~/.local/state/jev-capability-advisor/hooks` when the home itself is a Git worktree: an existing Git must confirm that exact root and that no state files are tracked. Nested repositories and other state overrides remain rejected. Before writing receipts or backups, the manager creates its own private `.gitignore` containing `*`; it never changes the home ignore file or Git index. A changed exclusion is preserved and blocks mutation; a missing exclusion is restored by explicit installation, including an otherwise unchanged install. Status and dry-run report exclusion readiness without writing. It records installation ownership and private configuration, not task history or key contents. Optional sanitized qualification records remain separate from raw host evidence. Do not delete it before uninstalling: loss of proof must not authorize removal of a similar-looking user entry.

Repeated installation is idempotent. For an update, the manager checks the existing owned entry and current file content before an atomic replacement. Malformed JSON, symlinks or Windows junctions, detected concurrent changes or edited ownership targets stop the change instead of overwriting user work. Uninstall preserves later user changes and unrelated entries. An interrupted write retains a prepared ownership journal. A subsequent explicit install/uninstall finalizes it only when its before/after snapshot proves what happened; status and dry-run stay read-only. A process killed before releasing its private `.lock` leaves a lock containing its PID. Inspect that PID locally and remove only the confirmed stale lock before retrying; never remove an active lock. Resolve a reported conflict by reviewing the exact configuration and ownership record; never restore an old full-file backup over newer unrelated settings automatically.

## What the hook runs

The installer embeds `assets/hook-guidance.txt`, the local registration binding and a small emitter directly in the command registration. Runtime execution has no dependency on a movable skill/plugin cache path. The emitter uses the existing Python interpreter with `-I -B -c`; its fixed program receives the constant JSON payload as data, drains stdin in bounded chunks without parsing or retaining prompts, and emits only:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "The embedded Jev task-selection guidance"
  }
}
```

The command has a five-second timeout. It reads no credentials or catalogs, performs no provider/network calls and logs no prompt. It does not return a blocking decision or exit code 2; ordinary command failure must allow host continuation. This timeout applies to the static emitter, not to the separate agent-run advice call, which retains the existing advisor limits.

Claude uses `command` plus `args` to invoke the Python executable directly. Native Windows requires a real executable, not a `.cmd` or `.bat` shim. Codex uses a quoted command on POSIX; its Windows override invokes an existing `powershell.exe` using `-EncodedCommand`, with the fixed Python program and Base64-encoded payload passed as separate arguments. Encoding the data also avoids PowerShell 5.1 stripping embedded JSON quotes during native argument conversion. The installer validates the final Windows command length and exposes the readable command/guidance for review. It does not install PowerShell, Python or either host. The [Claude command-hook reference](https://code.claude.com/docs/en/hooks#command-hook-fields) and [Codex hook reference](https://learn.chatgpt.com/docs/hooks) describe these host interfaces.

Review the exact host version and launcher in an isolated environment before claiming compatibility. Updating the skill does not silently rewrite installed registrations; rerun `install` explicitly to update the embedded hint. If the interpreter is removed or its path changes, reinstall using the new interpreter after reviewing status.

## Host trust and operational checks

Codex requires review of each exact non-managed hook definition. Use its normal `/hooks` review; changed definitions may need review again. Project hooks additionally depend on project trust. The installer never grants trust or bypasses managed policy. Claude configuration also remains subject to workspace trust, settings precedence and hook-disable policy. Confirm the installed Claude version supports command-hook `args`; this documentation does not invent a minimum version. See the [Codex trust rules](https://learn.chatgpt.com/docs/hooks#review-and-trust-hooks) and [Claude settings reference](https://code.claude.com/docs/en/settings).

Use `status` to distinguish registration, local credential readiness and recorded qualification evidence. `qualification_context` identifies the local platform and current integration/registration fingerprints. Its `host_version` is deliberately `null`: read-only status does not execute the host, even with `--version`, because startup can write runtime state. Establish the actual version from the active host separately during controlled qualification. The integration fingerprint covers the skill's scripts, assets, references and `SKILL.md`, so changing guidance can invalidate older evidence as well as changing code.

`qualification_evidence.status` distinguishes `absent`, `invalid`, `historical` and `stale`. Records whose files/platform match remain historical while the active host version and session conditions are unverified. Current qualification stays `not_verified`: recorded evidence cannot attest current trust, agent receipt, catalog eligibility, provider availability or adoption. `not_verified` is not itself an unavailable capability or credential result, and must not become a blanket reason to skip advice. Check the actual current prerequisites and preserve ADR-0057's independent hook, eligible-inventory and delivery qualification requirements; missing or unverifiable prerequisites still require truthful native fallback. Historical records neither authorize consultation nor forbid a controlled current qualification run. A version change established by the active session also invalidates reuse of old results as current proof. Do not enable global hook settings or remove another hook to make this registration appear healthy.

### Record controlled qualification

A controlled qualification run may write its sanitized result to the private `evidence_path` reported by `status`, separately for the registration. There is no record-import command. Use a version-1 JSON object with these fields:

| Field                                         | Content                                                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `version`, `host`, `host_version`, `platform` | `1`, `codex` or `claude-code`, the observed version number, and `linux`, `wsl`, `macos` or `windows`. |
| `integration_sha256`, `registration_sha256`   | Exact current fingerprints reported in `qualification_context`.                                       |
| `catalog`                                     | Integer `skills` and `mcp_tools` counts; `completeness` is `bounded` or `unknown`.                    |
| `scenarios`                                   | Each named scenario below has `passed`, `failed`, `simulated` or `not_run`.                           |

Scenario names are `registration`, `delivery`, `catalog`, `provider`, `adoption`, `disabled`, `explicit_only`, `availability_change`, `incomplete_metadata`, `plan_mode`, `missing_key`, `error`, `timeout`, `cancellation` and `followup`. Observe each layer independently in the same actual host, using known skills and harmless MCP tools. Use an ordinary task prompt without Jev, skill-selection or test instructions to check automatic consultation. Verify that advice or a concrete prerequisite fallback precedes task-specific skill loading, planning and questions. An emitted JSON sample is not delivery; visible advice text is not a provider receipt; a selected name is not observed activation. An explicitly prompted or late manual advice call cannot repair a failed automatic first step. Do not turn simulated failures, unavailable hosts or skipped scenarios into passes.

Keep raw sessions and private provenance outside the public repository. Publish only a sanitized host/version/platform summary, fingerprints, bounded catalog counts and scenario results. Native Windows subprocess tests, for example, do not qualify a Windows Claude or Codex session. New versions and changed integration revisions require new evidence. Historical evidence may aid diagnosis but never replace the current-session eligibility check.

On a failed attempt, state the observed reason and continue normally. Check normal host diagnostics for a skipped hook, timeout or unsupported command format; inspect the rendered command before changing it. Keep raw diagnostics local if they include private configuration. Roll back with `uninstall` for the same host/scope, then confirm the owned entry is absent and unrelated settings remain.
