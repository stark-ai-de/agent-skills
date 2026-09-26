---
title: "Agent-mediated Jev hooks for Codex and Claude Code"
slug: "jev-agent-mediated-hooks"
artifact_path: "docs/specs/jev-agent-mediated-hooks-spec.md"
mode: "standard"
status: "approved"
owner: "stark-ai-de"
repo: "agent-skills"
created: "2026-09-25"
updated: "2026-09-26"
source_request: "Integrate the existing Jev advisor through optional portable agent hooks."
---

# Agent-mediated Jev hooks

## Goal and scope

Add an explicitly enabled UserPromptSubmit reminder to the existing Jev skill for Codex CLI and Claude Code on Linux/WSL, macOS and native Windows. The agent decides whether a submitted message begins a new actionable task and, when qualified prerequisites hold, uses the existing Recommend workflow once for that task.

Ordinary skill/plugin installation remains non-activating. No host source patch, daemon, new advice cache, provider gateway, automatic toolchain installation or user-wide activation is part of feature implementation. Existing owner-process integration remains available. The approved [host-qualification follow-up](jev-hook-host-qualification-spec.md) adds bounded current-session catalog capture, private credential references and version-bound evidence without changing these architectural boundaries.

## User verification

The maintainer confirmed both hosts, all target platforms, user-wide default with explicit project alternative, new-task-only advice, a short advice/fallback status line, and public persistence of this sanitized specification. Feature implementation and public persistence are authorized. The maintainer subsequently approved a narrowly scoped Git exclusion for private state when HOME itself is version-controlled; the exception does not permit state in project repositories.

## Repository context and architectural gate

Canonical runtime belongs to the existing skill-maintenance Jev skill. Bundled projections are generated with the repository synchronizer; evaluation code stays outside installed runtime. Writing agents use individually assigned worktrees under ADR-0029.

ADR required: **no**. [ADR-0057](../adrs/0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.short.md) ([Long, canonical](../adrs/0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.long.md) · [Guide](../adrs/0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.guide.md)) permits qualified opt-in advice while retaining eligible inventory, invocation restrictions, permissions and native fallback. [ADR-0038](../adrs/0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.short.md) ([Long, canonical](../adrs/0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.long.md) · [Guide](../adrs/0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.guide.md)) governs finite workflow disclosure. Existing projection and focused-validation boundaries remain binding.

## Requirements and acceptance criteria

1. WHEN a user enables the hook, it SHALL emit a static UserPromptSubmit additionalContext reminder using an existing Python 3.10+ executable, synchronously with a five-second deadline. The emitter SHALL discard stdin without parsing, storing or logging prompts and SHALL make no provider or credential access.
2. WHEN an explicitly enabled hook receives a new actionable task and current prerequisites hold, the agent SHALL make one existing Recommend invocation with selection profile general and retrieval policy current before loading a task-specific skill, planning or asking task-specific questions. Only minimal prerequisite checks SHALL precede it; failed prerequisites SHALL produce an immediate concrete fallback status before native task work. Existing request limits and timeouts remain unchanged. Confirmations, explanations, continuations, explicit opt-outs and already-advised tasks SHALL not trigger repeated advice.
3. Advice SHALL require reliable current host-supplied availability and applicable restrictions. Files on disk, an unrelated session or a static reminder SHALL not establish eligibility or completeness. Verified documented defaults MAY resolve an omitted field only for the applicable host; otherwise unknown availability or invocation restrictions SHALL exclude the entry. The catalog MAY contain a reliable bounded subset of current-session skills and MCP tools; omissions and unknown completeness SHALL remain explicit. Concrete argument-specific authorization SHALL stay with the executing host. Explicit-only restrictions, named skills and active permission/Plan constraints SHALL be preserved.
4. Missing credentials, unavailable eligible inventory, errors, timeout or cancellation SHALL retain native discovery and execution. A new actionable task SHALL produce one short truthful recommendation/outcome or concrete prerequisite/advice fallback reason before task-specific work continues. Missing prerequisites SHALL never be described as completed semantic advice.
5. Opt-in setup SHALL disclose task-summary and bounded capability-metadata processing by TypeSafe. No raw transcripts, unrelated private content, secrets or private paths are required.
6. The public manager SHALL provide install, status and uninstall, explicit host selection, user scope by default, explicit project root for project scope, and dry-run without writes.
7. Installation SHALL merge only an owned event entry, remain idempotent and preserve unrelated configuration. Invalid JSON, duplicate keys, symlinks, ownership conflicts and detected concurrent modifications SHALL abort without overwriting user changes. Backups and ownership state SHALL remain in private user state outside repositories, with the explicitly approved exception of the default POSIX home state folder described below.
8. Uninstall SHALL remove only a demonstrably unchanged owned entry. Status SHALL separate configured, trust/policy prerequisites and unverified live qualification. It SHALL not grant trust or disable other hooks.
9. The registration SHALL contain the reminder inline and a local JSON binding with `host`, `scope` and `project_root` (`null` for user scope, the bound absolute root for project scope), with no movable skill/plugin-cache path. This binding SHALL drive status arguments and SHALL never enter provider inputs; missing, invalid or contradictory binding SHALL trigger native fallback. Updating its content SHALL require explicit reinstallation and the host's normal review process.
10. `install --key-file PATH` SHALL validate an existing readable file and retain only its reference in private per-host configuration shared across registration scopes. Omitting the option SHALL preserve the existing reference. A configured file SHALL take precedence over `TYPESAFE_API_KEY`; an unreadable reference SHALL not silently switch to the environment. Uninstall SHALL retain credential configuration and historical evidence.
11. Read-only status SHALL distinguish registration, local credential readiness, recorded qualification evidence and currently unchecked conditions. File accessibility SHALL not claim authentication success. Evidence SHALL bind host/version, platform, integration/registration fingerprints, bounded catalog counts and scenario results; even matching historical evidence SHALL not automatically qualify the current session. Historical `not_verified` alone SHALL not mean unavailable or suppress current prerequisite checks; ADR-0057 qualification and native fallback requirements remain binding. Status SHALL not execute a host version command; the active host version SHALL remain unchecked until established separately during controlled qualification.

## Design and public interface

New manager: skills/skill-maintenance/jev-capability-advisor/scripts/jev_hooks.py.
Common reminder: skills/skill-maintenance/jev-capability-advisor/assets/hook-guidance.txt.

```text
jev_hooks.py install|status|uninstall --host codex|claude-code
  [--scope user|project] [--project-root PATH] [--dry-run]
  [--key-file PATH]  # install only
```

Use the real existing interpreter running the manager. Claude registrations use command plus args directly; Codex POSIX commands use shell-safe arguments. Codex Windows commandWindows invokes PowerShell with EncodedCommand. Pass the static JSON as encoded data rather than interpolating it into executable source; PowerShell 5.1 native argument parsing must not strip its quotes. Validate final Windows launcher length. Emitter and wrappers normalize failures to a non-blocking exit, never exit 2.

User destinations are CODEX_HOME/hooks.json (default ~/.codex/hooks.json) and CLAUDE_CONFIG_DIR/settings.json (default ~/.claude/settings.json). Project destinations are .codex/hooks.json and .claude/settings.local.json. Honor documented overrides, require project roots explicitly, and leave managed configuration and trust untouched.

Private state is under XDG_STATE_HOME (fallback ~/.local/state) on POSIX or LOCALAPPDATA on Windows, beneath jev-capability-advisor/hooks. If HOME itself is version-controlled, the default POSIX `~/.local/state/jev-capability-advisor/hooks` is permitted only after existing Git verifies the exact home worktree and confirms that no files in this folder are tracked. The manager SHALL create its own private `.gitignore` containing `*` before writing ownership or backup data; it SHALL NOT change the Git index or other ignore files. Nested repositories, other state overrides, tracked state and failed Git verification remain rejected. Explicit installation repairs a missing exclusion; conflicting content is preserved and blocks mutation. Status and dry-run report exclusion readiness without writing. Retain configuration backups, exact owned-entry receipts and the optional private credential path reference; no prompt history or key contents. Atomic replacement checks the observed configuration again before replacing it. Concurrent manager operations use a private lock; interrupted transaction state must remain diagnosable and must not grant ownership of arbitrary entries. Interrupted hook/key-reference updates SHALL retain a private pending journal and mark credentials unavailable with `incomplete_credential_update`, without environment fallback. Retrying the original explicit install with the same key-file reference MAY recover only when before/after fingerprints still match; conflicting edits SHALL remain untouched. Uninstall SHALL remain available and retain private credential history and pending diagnostics.

Integrate exposes hook guidance and the existing owner-process session option. Hook registration alone is not qualified automatic advice. Agents resolve the current Jev skill through current host metadata and read manager status using the delivered local registration binding, including the explicit project root when applicable. They do not guess these values from model names or working directories, or send them to the provider. They pass a configured local key-file reference explicitly to the existing advisor; environment credentials apply only when no reference is configured. Capture skills and loaded MCP definitions from the same executing session, preserve verified defaults and exclusions, and report bounded/unknown coverage. File reads may enrich an already established entry; they do not establish availability.

## File and implementation plan

1. Save this approved specification before implementing.
2. Add the manager and common guidance to the canonical skill; extend existing operational documentation with one canonical hook reference and concise links.
3. Add meaningful hook tests to the owning evaluation suite and a focused Linux/macOS/Windows Python CI job.
4. Synchronize generated plugin projections; run affected validation gates.
5. Exercise available isolated host paths, report each evidence layer separately, and preserve unavailable platform/provider proof as an explicit gap.

No root release-version changes, Git staging, commits, publishing or live user-configuration installation are required.

## Source challenge

The current [Codex hooks documentation](https://learn.chatgpt.com/docs/hooks) and [Claude command-hook documentation](https://code.claude.com/docs/en/hooks#command-hook-fields) support UserPromptSubmit and additionalContext. Write timeout in hook configuration, not the app-server output field timeoutSec. Claude supports direct executable arguments; a minimum supporting Claude version is unspecified and must not be invented.

[PowerShell argument parsing](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_parsing?view=powershell-7.5#passing-arguments-that-contain-quote-characters) challenges the assumption that outer EncodedCommand protects inner native argv: encoded static data avoids raw JSON quoting loss. Actual native Windows tests remain required.

Codex requires trust for the exact hook definition; Claude interactive settings hooks also require workspace trust. Qualify fresh sessions without bypassing managed policies. Neither documentation nor a static hook proves complete native inventory. The approved follow-up instead qualifies bounded current-session catalogs, verifies host defaults before using them and excludes unknown availability or invocation restrictions. ADR-0057 requires native fallback when no reliable scope can be established; actual calls retain native argument-specific authorization.

## Validation

Run the new Python hook unittest suite; cover both hosts and configuration scopes, overrides, idempotence, preservation, malformed and duplicate-key JSON, symlinks, ownership edits/deletion/duplication, dry-run purity, large untrusted stdin, failure exits, interpreter paths with special characters, Windows shells and command-length limits.

After projection synchronization, run:

```sh
pnpm run sync:agent-plugin
pnpm run validate:jev
pnpm run validate:skills
pnpm run validate:projections
pnpm run validate:plugin-evals
pnpm run lint:actions
pnpm run lint
```

Check formatting on changed supported files. Add owning contract checks if implementation changes another boundary; do not run the full local aggregate solely for finalization.

Live scenarios independently observe hook delivery, agent adoption, current catalog eligibility and genuine Jev advice. For automatic advice, submit an ordinary blind task without Jev, skill or test directions; advice or a concrete prerequisite fallback must precede task-specific skill loading, planning and questions. A late manual call is not automatic proof. Exercise new tasks versus follow-ups, disabled and explicit-only restrictions, changed availability, incomplete metadata, Plan mode, credential-file precedence/readability, absent credentials, error, timeout and cancellation. Preserve simulated and unexecuted scenarios distinctly. Status must reject invalid evidence and distinguish absent, invalid, historical and stale records without automatically asserting current qualification. Begin with isolated WSL/Codex; record actual host versions and independently qualify Claude, macOS and Windows. Unit or subprocess fixtures alone do not qualify an agent host.

## Risks, rollout and rollback

Static guidance is model-mediated and cannot guarantee a consultation on every task. Configuration can be present while trust, policy, interpreter availability or inventory prerequisites prevent use. Existing general-profile advice may make up to three provider calls; no new latency claim is made.

Ship only explicit setup. Clearly distinguish configured from qualified behavior and keep all missing live evidence visible. If a hook misbehaves, remove only its unchanged owned registration using uninstall and verify sibling hooks remain. Do not overwrite later user edits from a backup.

## Assumptions and done-when

Python and any live-test host/provider credentials must already be provisioned through their existing owners. Complete authoritative host inventory is not assumed. Minimum Claude support version and untested platform outcomes remain unspecified evidence, not permissive defaults. Per-host credential references remain private, and old qualification records never substitute for current-session checks.

Implementation is done when the source, documented commands, focused automated coverage and generated projections agree and required local checks pass. Support for a host/platform is qualified only when its live evidence passes; unavailable proof remains a named acceptance gap.
