# Toolset setup and detection

## Detection order

1. `python3`.
2. Node >= 18.
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

## Promotion table

| Missing tool        | Promote when                                                  | Benefit                                    |
| ------------------- | ------------------------------------------------------------- | ------------------------------------------ |
| draw.io Desktop CLI | user needs Mermaid conversion, export, visual check, dark SVG | conversion, ELK layout, PNG/SVG/PDF export |
| shape index         | exact stencil names matter                                    | offline style-string search                |
| draw.io MCP         | live preview/editing desired                                  | interactive browser or app flow            |
| local icon cache    | brand/cloud icons missing                                     | SVG variants and broad icon coverage       |

Never install or configure without explicit approval.

## Optional local caches

Runtime should prefer native draw.io stencils and generic shapes. Use local shape indexes or icon caches only when they already exist or the user approves creating or fetching them. Record any external icon or index source in the final response.

## Privacy

Use `local-only` mode for sensitive diagrams. Hosted `mcp.draw.io` receives diagram content and requires explicit acceptance. `browser-url` mode carries diagram data in the URL fragment. `self-hosted` mode may use self-hosted draw.io or local MCP tools.

Sources: integrated from draw.io CLI/MCP workflows and privacy-mode rules.
