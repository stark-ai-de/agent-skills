# Record maintenance and operating contract

The private workspace config points at the installed Karakeep owner, its adopted collection policy and a private components manifest. The owner must support `code-record` and `codeRecords`; see its `references/code-records.md` and `assets/code-record-policy.example.json`. Use the same account `stateRoot`, connection and designated writer host as existing knowledge workflows. Creating a second state root would defeat cross-policy serialization and is not supported.

The owner recomputes the actual source root, regular-file bytes, line range and fingerprints, rejects symlinks/secret paths, and checks source again before each mutation. Stable identity combines policy, repository and component identity, not HEAD. A file exactly matching HEAD gets its commit; modified/untracked bytes are explicitly a local draft. Agent reviews are never human approval. Practical validation requires hash-bound execution receipts under the private owner state root; the helper never executes a supplied test command.

`records.mjs` maintains selected components. Source changes clear previous test claims and downgrade the record to candidate, with a warning that semantic assessment must be repeated. It does not guess moved symbols or auto-promote a changed range. Removed or shortened sources visibly retire or invalidate existing owned records. Unchanged records are read back in rotating bounded batches, so managed-body conflicts are detected while no-op runs issue no content writes. The existing three-way managed section logic preserves notes outside that section. Managed-body edits produce a visible conflict; do not overwrite them.

## Triggers and bounds

- `workspace.py notify` accepts a real Codex completion event, records only registered repository ID/time, and coalesces events per repository. The operations root and `GREPPY_MAINTENANCE_RUN=1` are ignored.
- Discovery timer: reconcile new/moved/removed roots and generated ignore config; restart the owned watcher only on change.
- Maintenance timer: reconcile known sources, inspect/plan/apply at most the policy batch limit, and optionally assess one eligible queue item with the qualified runner below. The runner has bounded runtime/output and a per-repository cooldown. It never runs on every file save.
- Source assessment may return zero candidates. Failures remain `needs_agent`; only a newer completion after cooldown permits another automatic assessment. Receipt logs are private. Owner lock contention remains pending until the existing writer finishes. Never interpret an unverified create as a safe retry.

Inspect `last-reconcile.json`, `last-record-maintenance.json`, `last-notify.json`, `agent-checkpoints.json`, `agent-runs/` and owner operation receipts. A delivered notification, an executed timer, a successful runner and a verified remote write are separate evidence. `--no-agent` on `records.mjs` performs deterministic record maintenance without model calls.

## Qualify the optional assessor

Use the existing stock OpenAI Codex login and the explicitly adopted model. In
the private `agent` settings record `model` and `executableSha256` for the exact
qualified `codexExecutable` (default `codex`). Qualify the CLI offline with a
mock provider and an inert MCP fixture before recording the digest. Verify that
the private non-project launch directory, `--ignore-user-config`, read-only
sandbox, disabled approvals, apps, plugins, hooks and notifications exclude
repo-local configuration and inherited tools. The assessment names the selected
repository in its input. Custom provider routing needs a separate qualification.

At each eligible attempt, the adapter checks the binary digest and requires an
empty configured MCP roster from that executable with the same overrides and
a neutral directory. The roster probe includes user configuration, so this is
intentionally conservative. Existing configured servers, even disabled ones,
leave the assessment pending. A merged empty MCP table does not clear inherited
entries. Never broaden tool or account access to satisfy this check.

When the guard cannot establish the route, the event stays eligible for later
qualification and deterministic maintenance continues. Once an attempt starts,
its checkpoint is durable, even if the process or candidate validation fails.

## Data flow

grepai source chunks and embeddings remain in the configured local Ollama/Qdrant services. CodeGraph and ast-grep run locally. The existing Karakeep instance receives structured source metadata and descriptions (no raw snippet upload by this writer). The optional Codex runner uses the configured model provider; source read into its context can be sent to that provider. “Local runner” does not mean a local language model. Record that provider in the private setup receipt before enabling scheduled assessment. Source files, credentials and private receipts must not be copied into the public skill.

## Services and commands

Resolve the templates in `assets/` using the host's service manager and actual paths. Example commands once adopted:

```bash
systemctl --user start code-reuse-watch.service
systemctl --user status code-reuse-watch.service code-reuse-discover.timer code-reuse-maintain.timer
grepai search --workspace dev --json -n 10 "retry with exponential backoff"
python3 /absolute/skill/scripts/workspace.py doctor --config /absolute/private/workspace.json
python3 /absolute/skill/scripts/workspace.py maintain --config /absolute/private/workspace.json --apply
systemctl --user stop code-reuse-discover.timer code-reuse-maintain.timer code-reuse-watch.service
```

WSL user services require a running distribution and user manager. The timers resume their cycle when the user manager starts; they do not start Windows/WSL themselves. Preserve other applications' timers and processes. Stop a scheduled assessment through its owned service so systemd terminates the cgroup, not unrelated agents.

Normalize model-produced whitespace to the owner's single-line descriptive
fields before planning a record; a trailing newline must not strand an otherwise
valid candidate. Candidate file/symbol/range evidence still passes the owner's
strict source checks. If an assessment finds the same symbol in a different file,
report a possible rename for explicit verified rebind instead of creating a new
record automatically. Records outside a temporary `qualification_scope` pilot
stay pending; that temporary search selection must not retire prior records.
