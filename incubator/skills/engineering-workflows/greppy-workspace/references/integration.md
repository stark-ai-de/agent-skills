# Dependencies and Codex integration

Resolve existing installations before installing anything. Do not vendor their contents into this skill.

| Dependency             | Role                                                       | Provenance / qualified capability                                                                                 |
| ---------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| grepai                 | local semantic search / workspace MCP                      | [upstream](https://github.com/yoanbernabeu/grepai), installed 1.1.x help/source                                   |
| official grepai skills | focused usage guidance                                     | [catalog](https://yoanbernabeu.github.io/grepai/skills/), [source](https://github.com/yoanbernabeu/grepai-skills) |
| codegraph-ast-grep     | installation, per-root graph freshness and syntax evidence | optional for GrepAI; the separate owner governs graph setup and checks                                            |
| karakeep-knowledge     | connection, adopted policy, writer and recovery            | required for enabled record maintenance, with a compatible owner and adopted codeRecords grant                    |
| official Karakeep MCP  | search and readback using the existing account             | optional read access to approved knowledge via the existing account                                               |

After checking installed copies/scope, the qualified selective install form is:

```bash
pnpm dlx skills@1.5.23 add yoanbernabeu/grepai-skills --global --agent codex   --skill grepai-workspaces grepai-watch-daemon grepai-search-basics   grepai-search-advanced grepai-mcp-tools grepai-config-reference   grepai-ignore-patterns grepai-embeddings-ollama grepai-storage-qdrant --copy --yes
```

This requires the user's installation authorization and the host's package policy. Existing installations are dependencies, not a reason to reinstall. Record source URL and lock hashes locally. The selected client is Codex; the installer may use its shared global `~/.agents/skills` convention. Do not install/configure unrelated clients.

## Existing notify integration

Keep an adopted `notify` integration in place until a separate hook rollout is
requested. Resolve the existing `uv`, Python 3.10+ and PyYAML environment before
using this template. Prepare and qualify dependencies separately, record the
adopted PyYAML version, and prewarm the exact command before enabling callbacks.
The offline flag prevents dependency downloads during an agent event; a missing
cached environment is a setup failure, not permission to install anything.

Merge into the Codex user configuration (and its declarative source), preserving unrelated keys:

```toml
notify = [
  "/absolute/uv", "run", "--offline", "--no-project", "--no-python-downloads",
  "--python", "/absolute/adopted/python3",
  "--with", "PyYAML", "/absolute/adopted/skillRoot/scripts/workspace.py",
  "notify", "--config", "/absolute/private/configPath.json",
]

[mcp_servers.grepai]
command = "/absolute/grepai"
args = ["mcp-serve", "--workspace", "<workspace>"]
enabled = true
startup_timeout_sec = 30
tool_timeout_sec = 120
```

`notify` is a top-level key. Codex passes one JSON argument on `agent-turn-complete`. If a hook already exists, preserve it through the existing hook manager or a reviewed multiplexer; do not replace it. The queue ignores maintenance subprocesses and never saves prompts/transcripts. Register the canonical skill through the selected client's supported skill path, e.g. a deliberate local symlink. Verify a fresh process can discover it.

## Optional later Stop hook migration

Check the installed Codex version against the [official hook contract](https://learn.chatgpt.com/docs/hooks)
before adopting this alternative. Codex command hooks receive JSON on stdin.
`workspace.py hook` accepts `hook_event_name: "Stop"` with an absolute `cwd` and
emits no stdout on success. It requests neither blocking nor continuation.
Malformed payloads and recognized hook argument errors exit 1; exit 2 must not
be used because a Stop hook can use it to request another agent turn.

Stop runs before Codex finishes stopping, and another hook may resume work. A
Stop receipt is therefore a lifecycle signal, not proof of final completion.
Every valid Stop, including `stop_hook_active: true`, refreshes the same repository
queue entry. `GREPPY_MAINTENANCE_RUN=1`, the operations root and unregistered roots
remain excluded. For downstream compatibility the receipt still contains only
`repoId`, `at` and the internal `agent-turn-complete` trigger label; the label does
not change Stop's timing. See [the operating contract](records-and-operations.md#triggers-and-bounds).

After resolving the generic paths and separately qualifying the prewarmed
runtime, this is the additional handler to merge into `~/.codex/hooks.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "'/absolute/uv' run --offline --no-project --no-python-downloads --python '/absolute/adopted/python3' --with PyYAML '/absolute/adopted/skillRoot/scripts/workspace.py' hook --config '/absolute/private/configPath.json'",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

Use a synchronous, bounded queue operation. Measure the exact callback before
choosing its timeout; the example is not a live timing qualification. Do not run
maintenance, a model assessment or a dependency download inside Stop.

For an explicitly requested migration, back up the selected runtime and
declarative configuration, preserve all existing handlers, and replace only this
workspace's notify registration with its Stop handler. If notify is multiplexed,
remove only the Greppy branch. Keep deployed `skillRoot` paths unchanged. In a
fresh Codex process, open `/hooks`, review the exact new handler and explicitly
trust it through Codex's normal workflow; untrusted definitions are skipped.
Do not bypass or fabricate that trust state. Then verify the callback with an
isolated registered fixture and check the minimal receipt and later maintenance
separately. On failure restore
the previous notify registration and remove only the new owned handler. The PR
and its fixture tests do not activate this migration.

Both integrations send lifecycle events **out of Codex to Greppy**. They do not
inject a message into the model. Receipts omit thread and session IDs, so they
provide no automatic route back to the originating conversation. Incoming
message queues and new agent turns are separate integrations and are outside
this adapter's scope.

## Existing MCP and skill registration

Preserve existing CodeGraph and Karakeep MCP definitions. For authorized graph work use the actual `projectPath` and the CodeGraph owner’s procedure, including approval before a diagnostic that may open or migrate a graph. Shared search can run before either companion is adopted. Use the Karakeep owner’s read-only `status --policy` for the configured collection capability and `--online` for account read verification. The separate `check --repo` workflow concerns project documents.

Validate with actual MCP `initialize`, `tools/list` and GrepAI search calls from both the operations directory and another repository. Then use a fresh Codex agent to prove configuration and instruction discovery. Existing chats need not hot-reload MCP tools; distinguish that from a verified fresh CLI session.
