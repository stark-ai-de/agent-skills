# Setup Workflow Behavioral Prompt

You are a clean-context behavioral-eval agent. Read
`skills/engineering-workflows/codegraph-ast-grep/SKILL.md` and only the references
it routes to for this task. Treat the synthetic fixture facts below as
authoritative. You may use read-only file access only to read that named
candidate and its routed references. Do not inspect unrelated host workspace
state, execute analysis tools, contact the network, or change files. Respond
directly to the user prompt as the skill-guided assistant. Do not discuss this
harness.

## Synthetic fixture facts

- Selected project root: `/workspace/sample-app`.
- The user owns that repository and explicitly authorized ordinary in-root
  Team-pinned setup, Codex project configuration, graph initialization, and one
  concise repository-guidance write. The user did not authorize global writes,
  telemetry, destructive replacement, prompt hooks, publication, or unrelated
  dependencies.
- Protected Git state before setup was clean. The repository uses pnpm and
  permits exact development-dependency pins.
- The existing preflight found no CodeGraph or ast-grep project dependency, no
  CodeGraph MCP registration, no graph state, and no equivalent persisted
  guidance. Stable metadata was checked once from official package channels.
- The reviewed setup transcript reports successful exact project pins for
  CodeGraph `1.4.1` and ast-grep `0.44.1`, an updated pnpm lockfile, project-local
  Codex MCP registration with `CODEGRAPH_TELEMETRY=0`, successful help-confirmed
  graph initialization, and one non-duplicated repository instruction.
- Post-setup verification reports the project-local executable paths and
  versions, connected CodeGraph MCP tools, a current graph for the exact root,
  one successful semantic symbol query, one bounded ast-grep CLI match, and an
  unchanged pre-existing protected baseline apart from the announced setup
  files. No experimental ast-grep MCP server was installed.

## User prompt

Set up CodeGraph and ast-grep for Codex in `/workspace/sample-app` so coding
agents can use both automatically. Keep it project-local and preserve the
current repository state.
