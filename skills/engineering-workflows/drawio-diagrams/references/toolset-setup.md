# Toolset setup and detection

## Detection order

1. `python3` for the bundled dependency-free validator.
2. Node >= 18 for `render-drawio.mjs`, `open-drawio-url.mjs`, and `search-shapes.mjs`.
3. draw.io Desktop CLI:
   - `drawio` on PATH
   - macOS `/Applications/draw.io.app/Contents/MacOS/draw.io`
   - Windows `C:\Program Files\draw.io\draw.io.exe`
   - WSL2 `/mnt/c/Program Files/draw.io/draw.io.exe`
   - WSL2 user install `/mnt/c/Users/<user>/AppData/Local/Programs/draw.io/draw.io.exe`
4. Available draw.io MCP tools in the agent session.
5. Explicitly configured local shape-search index.
6. Explicitly approved local icon cache.
7. Network availability only if the user approves runtime fetches.

Useful probes:

```bash
python3 --version
node --version
command -v drawio || true
grep -qi microsoft /proc/version 2>/dev/null && echo WSL2 || true
[ -x "/Applications/draw.io.app/Contents/MacOS/draw.io" ] && echo macOS-drawio
[ -x "/mnt/c/Program Files/draw.io/draw.io.exe" ] && echo WSL2-system-drawio
```

## Promotion table

| Missing tool | Promote when | Benefit | Example install/config command |
| --- | --- | --- | --- |
| draw.io Desktop CLI | user needs Mermaid conversion, ELK layout, PNG/SVG/PDF export, or visual/dark render checks | conversion, layout, export, embedded XML, visual verification | macOS: `brew install --cask drawio`; Windows: `winget install JGraph.Draw`; Linux: use the distro package, Snap, Flatpak, or downloaded AppImage available for the user's environment |
| Official shape index | exact stencil names matter and no MCP `search_shapes` is available | offline style-string search through `scripts/search-shapes.mjs` | download the `jgraph/drawio-mcp` shape index into an external cache such as `~/.cache/drawio-diagrams/search-index.json` only after approval |
| Hosted draw.io MCP app server | inline diagram creation or shape search is useful and the diagram is not sensitive | app/server-assisted create + search | configure the client for `https://mcp.draw.io/mcp` only after warning that diagram XML is sent to the hosted endpoint |
| `@drawio/mcp` tool server | browser opening for XML/CSV/Mermaid without a full live editor | local tool server URL flow | configure the MCP client with `npx -y @drawio/mcp` if the user approves |
| `drawio-mcp-server` live editor | existing open documents, pages, layers, and live browser editing matter | interactive CRUD editing and export | configure the MCP client for `npx -y drawio-mcp-server --editor` if approved |
| `@next-ai-drawio/mcp-server` preview | fast browser preview sessions matter | preview-oriented create/edit/export tools | configure with `npx -y @next-ai-drawio/mcp-server` if approved |
| local icon cache / theSVG | brand/cloud logos are missing from native stencils | SVG variants and broad icon coverage | use an existing approved cache, or fetch selected SVGs only after approval |

Never install or configure without explicit approval. If approval is not granted, continue with direct XML and generic/native shapes.

## Optional local caches

Runtime should prefer native draw.io stencils and generic shapes. Use local shape indexes or icon caches only when they already exist or the user approves creating or fetching them. Keep downloaded indexes outside the skill folder so the skill stays small and reproducible.

Suggested cache locations:

```text
~/.cache/drawio-diagrams/search-index.json
~/.cache/drawio-diagrams/icons/<source>/<slug>/<variant>.svg
```

Record any external icon or index source in the final response.

## Privacy

Use `local-only` mode for sensitive diagrams. Hosted `mcp.draw.io` receives diagram content and requires explicit acceptance. `browser-url` mode carries diagram data in the URL fragment and can still be exposed through browser history, screenshots, sync, or logs. `self-hosted` mode may use self-hosted draw.io or local MCP tools.

Sources: integrated from draw.io CLI/MCP workflows and privacy-mode rules.
