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

Merge into the Codex user configuration (and its declarative source), preserving unrelated keys:

```toml
notify = ["/absolute/python3", "/absolute/skill/scripts/workspace.py", "notify", "--config", "/absolute/private/workspace.json"]

[mcp_servers.grepai]
command = "/absolute/grepai"
args = ["mcp-serve", "--workspace", "<workspace>"]
enabled = true
startup_timeout_sec = 30
tool_timeout_sec = 120
```

`notify` is a top-level key. Codex passes one JSON argument on `agent-turn-complete`. If a hook already exists, preserve it through the existing hook manager or a reviewed multiplexer; do not replace it. The queue ignores maintenance subprocesses and never saves prompts/transcripts. Register the canonical skill through the selected client's supported skill path, e.g. a deliberate local symlink. Verify a fresh process can discover it.

Preserve existing CodeGraph and Karakeep MCP definitions. For authorized graph work use the actual `projectPath` and the CodeGraph owner’s procedure, including approval before a diagnostic that may open or migrate a graph. Shared search can run before either companion is adopted. Use the Karakeep owner’s read-only `status --policy` for the configured collection capability and `--online` for account read verification. The separate `check --repo` workflow concerns project documents.

Validate with actual MCP `initialize`, `tools/list` and GrepAI search calls from both the operations directory and another repository. Then use a fresh Codex agent to prove configuration and instruction discovery. Existing chats need not hot-reload MCP tools; distinguish that from a verified fresh CLI session.
