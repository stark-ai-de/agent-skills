The stable project-local update and required migration are complete.

- **Selected workflow:** `update`, because you explicitly requested stable versions, required migrations, and a successful Codex reconnect.
- **Root:** `/workspace/sample-app`
- **Provenance:** Existing Team-pinned pnpm dependencies were preserved.
- **Protected state:** The unrelated modification at `src/user-work.ts` remains byte-for-byte unchanged.

Updated components:

| Component | Previous |  Current |
| --------- | -------: | -------: |
| CodeGraph |  `1.3.0` |  `1.4.1` |
| ast-grep  | `0.43.0` | `0.44.1` |

Each stable target was checked once through its official package channel. The exact versions were written through pnpm to the project manifest and lockfile. CodeGraph commands ran with `CODEGRAPH_TELEMETRY=0`.

The help-required graph migration completed within the selected root without deleting or destructively rebuilding its state, and Codex reconnected successfully. The existing installer channel and project scope were retained; no prompt hook, unrelated dependency, global installation, telemetry consent, or external service was added.

Post-update verification confirms:

- Both project-local executable paths resolve to the expected versions.
- Codex exposes the CodeGraph MCP capabilities after reconnect.
- The graph is current for `/workspace/sample-app`.
- A focused semantic query succeeds.
- A bounded ast-grep CLI query succeeds.
- Persisted repository guidance is discoverable.
- `src/user-work.ts` is untouched.

The analysis stack is ready. Semantic and structural results remain index- and parser-backed evidence rather than compiler or runtime proof.
