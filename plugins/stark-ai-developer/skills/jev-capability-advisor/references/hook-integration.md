# Optional agent-mediated hook guidance

Use this **Integrate** mode to add a short reminder to Codex CLI or Claude Code before the agent handles a submitted user message. The reminder asks the agent to obtain Jev advice for new actionable work when the active host can supply trustworthy eligible capabilities. It does not obtain advice itself. For repeated calls from a process you control, choose the separate [owner-process session](session-integration.md).

## Default opt-in and task behavior

Installing the skill or plugin leaves host configuration unchanged. Hook setup is a separate, explicit action with a named host and user/project scope. Explain during setup that actual advice sends a minimal task summary and bounded capability cards to TypeSafe, using the already configured credential source. Do not add unrelated private content, transcripts, tool results, private paths or secrets. Do not provision credentials or ask for a key in chat.

The hook receives every `UserPromptSubmit` event. The agent uses conversation context to distinguish a new actionable task from a confirmation, explanation question, smalltalk or continuation. For a new task it may run the existing Recommend workflow once with `selection_profile: general` and `retrieval_policy: current`; one consultation may include up to three bounded provider calls. Follow-ups do not trigger another consultation. This is agent-mediated behavior, not deterministic prompt classification or guaranteed interception.

Keep explicit user skill choices and instructions to skip Jev. Resolve Jev through the host's currently advertised metadata, then follow its current instructions. A hook does not make an otherwise explicit-only Jev invocation eligible. Preserve every candidate's disabled, explicit-only and account restrictions and the user's existing authority. Plan-mode or other read-only limits still apply, including to catalog export and receipt writes. Do not create new caches or change the existing advisor's request/time budgets.

A real advice attempt emits one short user-visible status line with the recommendation or a concrete fallback reason. The static hook output is context for the agent, not proof of a successful consultation. Skipped confirmations and follow-ups need no advisor status. Missing credentials, unavailable Jev, unverifiable inventory, provider failure, timeout or cancellation retain the host's native selection; avoid retry loops and do not report a recommendation that never occurred.

## Eligibility and qualification gate

Before automatic advice, independently establish the actual host hook, current eligible inventory and recommendation delivery. Verify returned IDs against the active session and retain the host's execution control. Read host metadata, not installed directories, to establish availability. Missing eligibility fields are unknown, not implicit permission. A deferred or truncated catalog, another client's inventory or a previous turn's snapshot cannot silently become a complete current inventory.

Codex's existing discovery signals do not export every effective skill and tool restriction. The registration cannot repair that gap. If reliable current eligibility cannot be established, use native discovery. A controlled synthetic host catalog can demonstrate a bounded flow but cannot qualify all capabilities on a real machine. Installation status and static command tests alone are not automatic-advice qualification.

## Repository-adopted policy

A repository can deliberately adopt the Architecture Compass Jev host-advice policy through its own accepted ADR and mapping. Adoption records an obligation for named host scopes; it is separate from host-owner activation, TypeSafe processing authority and practical qualification. A non-adopting repository does not acquire that obligation because another repository uses the same user-level hook.

From the installed Jev skill directory, render the Codex fragment:

```sh
python3 scripts/jev_hooks.py render --host codex --policy repository-adopted
```

The command prints a JSON object with `hooks.UserPromptSubmit`. It reads only its packaged fixed guidance and uses the existing registration builder. It never reads or changes user configuration, credentials, ownership records or backups. `--scope`, `--project-root` and `--dry-run` are installer options and are rejected by `render`; `--policy` is rejected by the installer commands. Rendering is not a status or qualification check.

Review the fragment and apply it only through the host owner's configuration management and normal exact-definition hook trust. Merge the event entry with existing hooks; do not replace the whole config or install both guidance variants for the same scope. The existing installer owns only its default registration and receipts. It does not apply, inspect or remove the rendered policy fragment. Removal belongs to the configuration management that applied it. A configuration change requires fresh trust review; rollback preserves native selection and does not erase the repository's adoption.

For every new actionable task or material task/capability change, the agent checks the current repository's accepted local mapping and authorized host scope. When current eligibility, integration qualification, scoped processing consent and credentials are established, it consults Jev through the existing `general`/`current` helper **before substantive work**, then validates returned IDs and retains execution control. Bootstrap reads and consultation preparation precede substantive work. A changed task outcome, capability set or activation restriction invalidates previous advice. Unchanged continuations, confirmations, status questions and consultation steps do not trigger another call or repeated status.

Missing adoption causes no policy-driven provider call. Missing prerequisites or provider failure, timeout or cancellation in an adopted scope preserve native work and produce a brief, truthful unmet-obligation report. Honor explicit user choices and opt-outs. Never infer processing consent from adoption, infer eligibility from absent flags or promote a model-visible catalog to a complete host export. Do not export a catalog or write a receipt if Plan/read-only constraints forbid it. Send only a minimal task summary and bounded approved metadata. Exclude secrets, customer data, private paths, raw prompts/transcripts, unrelated content and tool results from both; model-mediated minimization is not guaranteed secret detection or redaction.

Compass `setup` records the local mapping, host scope and missing prerequisites without configuring the host. `audit` only inspects evidence; it neither installs hooks nor calls TypeSafe to manufacture qualification. Track installation, configuration, effective activation/trust, processing authority, current eligible inventory and actual advice/delivery separately. See the [qualification record](https://github.com/stark-ai-de/agent-skills/blob/main/skill-evals/jev-capability-advisor/README.md#repository-policy-qualification) before making any support claim. The first qualification target is Codex CLI on Linux/WSL; other hosts/platforms have no new qualification from this renderer.

## Manage the default registration

Run from the installed skill directory with an existing Python 3.10+ interpreter. On native Windows, use the installed Python executable instead of assuming a `python3` command exists. The interpreter running the manager becomes the registered interpreter; choose an OS-native binary, not a Windows shim from WSL or a WSL executable from Windows.

```text
python3 scripts/jev_hooks.py install|status|uninstall
  --host codex|claude-code
  [--scope user|project]
  [--project-root PATH]
  [--dry-run]
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

### Configuration destinations

| Host        | User scope                                                           | Project scope                           |
| ----------- | -------------------------------------------------------------------- | --------------------------------------- |
| Codex CLI   | `CODEX_HOME/hooks.json`, default `~/.codex/hooks.json`               | `<project>/.codex/hooks.json`           |
| Claude Code | `CLAUDE_CONFIG_DIR/settings.json`, default `~/.claude/settings.json` | `<project>/.claude/settings.local.json` |

Native Windows uses its own user home and native paths. WSL and Windows configuration, credentials and mutable runtime state remain separate. The manager does not replace declarative configuration sources or copy state between operating systems. It preserves unrelated settings and hook entries and does not enable hooks through a plugin-root manifest.

Ownership records and configuration backups live under `jev-capability-advisor/hooks` in private user state: `XDG_STATE_HOME` or `~/.local/state` on POSIX; `LOCALAPPDATA` on native Windows. Keep this directory outside repositories. The sole exception is the default POSIX `~/.local/state/jev-capability-advisor/hooks` when the home itself is a Git worktree: an existing Git must confirm that exact root and that no state files are tracked. Nested repositories and other state overrides remain rejected. Before writing receipts or backups, the manager creates its own private `.gitignore` containing `*`; it never changes the home ignore file or Git index. A changed exclusion is preserved and blocks mutation; a missing exclusion is restored by explicit installation, including an otherwise unchanged install. Status and dry-run report exclusion readiness without writing. It records installation ownership, not task history or advice. Do not delete it before uninstalling: loss of proof must not authorize removal of a similar-looking user entry.

Repeated installation is idempotent. For an update, the manager checks the existing owned entry and current file content before an atomic replacement. Malformed JSON, symlinks or Windows junctions, detected concurrent changes or edited ownership targets stop the change instead of overwriting user work. Uninstall preserves later user changes and unrelated entries. An interrupted write retains a prepared ownership journal. A subsequent explicit install/uninstall finalizes it only when its before/after snapshot proves what happened; status and dry-run stay read-only. A process killed before releasing its private `.lock` leaves a lock containing its PID. Inspect that PID locally and remove only the confirmed stale lock before retrying; never remove an active lock. Resolve a reported conflict by reviewing the exact configuration and ownership record; never restore an old full-file backup over newer unrelated settings automatically.

## What the hook runs

The installer embeds `assets/hook-guidance.txt` and a small emitter directly in the command registration. Runtime execution has no dependency on a movable skill/plugin cache path. The emitter uses the existing Python interpreter with `-I -B -c`; its fixed program receives the constant JSON payload as data, drains stdin in bounded chunks without parsing or retaining prompts, and emits only:

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

Use `status` to distinguish a configured registration from qualification still requiring host evidence. A configuration file cannot prove effective trust, agent receipt, current eligible inventory, actual provider use or recommendation adoption. Check those separately with synthetic tasks in an isolated host environment. Do not enable global hook settings or remove another hook to make this registration appear healthy.

On a failed attempt, state the observed reason and continue normally. Check normal host diagnostics for a skipped hook, timeout or unsupported command format; inspect the rendered command before changing it. Keep raw diagnostics local if they include private configuration. Roll back with `uninstall` for the same host/scope, then confirm the owned entry is absent and unrelated settings remain.
