# Dependencies and Codex integration

Resolve existing installations before installing anything. Do not vendor their contents into this skill.

| Dependency             | Role                                                       | Provenance / qualified capability                                                                                 |
| ---------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| grepai                 | local semantic search / workspace MCP                      | [upstream](https://github.com/yoanbernabeu/grepai), installed 1.1.x help/source                                   |
| official grepai skills | focused usage guidance                                     | [catalog](https://yoanbernabeu.github.io/grepai/skills/), [source](https://github.com/yoanbernabeu/grepai-skills) |
| codegraph-ast-grep     | installation, per-root graph freshness and syntax evidence | same canonical skill catalog; installed instructions and tools govern                                             |
| karakeep-knowledge     | connection, adopted policy, writer and recovery            | same canonical skill catalog, codeRecords-capable owner required                                                  |
| official Karakeep MCP  | search and readback using the existing account             | existing official Karakeep MCP package/launcher, preserve scoped credentials                                      |

After checking installed copies/scope, the qualified selective install form is:

```bash
pnpm dlx skills@1.5.23 add yoanbernabeu/grepai-skills --global --agent codex   --skill grepai-workspaces grepai-watch-daemon grepai-search-basics   grepai-search-advanced grepai-mcp-tools grepai-config-reference   grepai-ignore-patterns grepai-embeddings-ollama grepai-storage-qdrant --copy --yes
```

This requires the user's installation authorization and the host's package policy. Existing installations are dependencies, not a reason to reinstall. Record source URL and lock hashes locally. The selected client is Codex; the installer may use its shared global `~/.agents/skills` convention. Do not install/configure unrelated clients.

Merge into the Codex user configuration (and its declarative source), preserving unrelated keys:

```toml
notify = ["/absolute/python3", "/absolute/skill/scripts/workspace.py", "notify", "--config", "/absolute/private/workspace.json"]

[mcp_servers.grepai]
command = "/absolute/grepai"
args = ["mcp-serve", "--workspace", "dev"]
enabled = true
startup_timeout_sec = 30
tool_timeout_sec = 120
```

`notify` is a top-level key. Codex passes one JSON argument on `agent-turn-complete`. If a hook already exists, preserve it through the existing hook manager or a reviewed multiplexer; do not replace it. The queue ignores maintenance subprocesses and never saves prompts/transcripts. Register the canonical skill through the selected client's supported skill path, e.g. a deliberate local symlink. Verify a fresh process can discover it.

Preserve the existing CodeGraph and official Karakeep MCP definitions. For each graph query pass the actual `projectPath`; check freshness and synchronize only generated metadata in the authorized root first. CodeGraph initialization may offer source/instruction changes: inspect the installed command and choose a source-preserving initialization path. Global server availability is not a global graph watcher.

Validate with actual MCP `initialize`, `tools/list` and search/read calls from both the operations directory and another repository. Then use a fresh Codex agent to prove configuration and instruction discovery. Existing chats need not hot-reload MCP tools; distinguish that from a verified fresh CLI session.
