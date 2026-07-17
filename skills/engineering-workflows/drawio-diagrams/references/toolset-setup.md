# Toolset setup and detection

## Detection order

1. `python3` for the bundled dependency-free validator.
2. Node >= 18 for `render-drawio.mjs`, `open-drawio-url.mjs`, `search-shapes.mjs`, and `validate-drawio-diagram-rules.mjs`.
3. draw.io Desktop CLI:
   - `drawio` on PATH
   - macOS `/Applications/draw.io.app/Contents/MacOS/draw.io`
   - Windows `C:\Program Files\draw.io\draw.io.exe`
   - WSL2 `/mnt/c/Program Files/draw.io/draw.io.exe`
   - WSL2 user install `/mnt/c/Users/<user>/AppData/Local/Programs/draw.io/draw.io.exe`
4. Available draw.io MCP tools in the agent session.
5. Configured or standard-cache local shape-search index.
6. Existing local icon cache.
7. Read-only network access for selected public SVG lookup when host policy allows it.

Useful probes:

```bash
python3 --version
node --version
command -v drawio || true
grep -qi microsoft /proc/version 2>/dev/null && echo WSL2 || true
[ -x "/Applications/draw.io.app/Contents/MacOS/draw.io" ] && echo macOS-drawio
[ -x "/mnt/c/Program Files/draw.io/draw.io.exe" ] && echo WSL2-system-drawio
```

## Icon lookup behavior

Icon-first is the default and does not require a legal-approval wizard. Use native stencils and existing assets immediately. When read-only web access is allowed, retrieve only the selected public SVGs, validate them, and embed them in the `.drawio` file.

Ask only if the host requires network consent or an action would install software, configure MCP, use a hosted service, download a bulk pack/index, or create a persistent cache. If lookup cannot proceed, use a labelled native semantic icon for each unresolved node and keep all other resolved logos.

## Promotion table

| Missing tool | Promote when | Benefit | Example install/config command |
| --- | --- | --- | --- |
| draw.io Desktop CLI | user needs PNG/SVG/PDF export or visual/dark render checks | export, embedded XML where supported, and visual verification after a format smoke test; Mermaid import and `--layout` are not assumed | macOS: `brew install --cask drawio`; Windows: `winget install JGraph.Draw`; Linux: use the distro package, Snap, Flatpak, or downloaded AppImage available for the user's environment |
| Official shape index | exact stencil names matter and no MCP `search_shapes` is available | offline style-string search through `scripts/search-shapes.mjs` | after approval, download the committed [`jgraph/drawio-mcp` shape index](https://github.com/jgraph/drawio-mcp/blob/main/shape-search/search-index.json) unchanged to `~/.cache/drawio-diagrams/search-index.json`; the helper auto-detects that path |
| Hosted draw.io MCP app server | inline diagram creation or shape search is useful and the diagram is not sensitive | app/server-assisted create + search | configure the client for `https://mcp.draw.io/mcp` only after warning that diagram XML is sent to the hosted endpoint |
| `@drawio/mcp` tool server | browser opening for XML/CSV/Mermaid without a full live editor | local tool server URL flow | configure the MCP client with `npx -y @drawio/mcp` if the user approves |
| `drawio-mcp-server` live editor | existing open documents, pages, layers, and live browser editing matter | interactive CRUD editing and export | configure the MCP client for `npx -y drawio-mcp-server --editor` if approved |
| `@next-ai-drawio/mcp-server` preview | fast browser preview sessions matter | preview-oriented create/edit/export tools | configure with `npx -y @next-ai-drawio/mcp-server` if approved |
| Lobe Icons / Simple Icons / theSVG / Iconify / Devicon / Web3 packs | named AI, SaaS, data, dev-tool, or crypto logos are missing | broad real-logo coverage with self-contained SVG embedding | retrieve only selected public SVGs when read-only network policy allows; ask before package installs, bulk downloads, or persistent cache creation |

Never install or configure without explicit approval. If an optional action is not approved, continue with direct XML and per-node native semantic icons.

## Optional local caches

Runtime should prefer existing embedded icons, native draw.io stencils, and local icon caches. Use caches when they already exist; ask before creating or bulk-populating them. Keep downloaded indexes outside the skill folder so the skill stays small and reproducible.

Suggested cache locations:

```text
~/.cache/drawio-diagrams/search-index.json
~/.cache/drawio-diagrams/icons/<source>/<slug>/<variant>.svg
```

### Official shape-index cache

The exact upstream source is
[`jgraph/drawio-mcp/shape-search/search-index.json`](https://github.com/jgraph/drawio-mcp/blob/main/shape-search/search-index.json).
Before downloading it or creating the cache directory, show the source and
target and obtain explicit approval. After approval, download the raw file
unchanged:

```bash
mkdir -p "$HOME/.cache/drawio-diagrams"
curl --fail --location \
  --output "$HOME/.cache/drawio-diagrams/search-index.json" \
  https://raw.githubusercontent.com/jgraph/drawio-mcp/main/shape-search/search-index.json
```

The compatible upstream schema is a JSON array whose entries use `title`,
`tags`, `style`, `w`, `h`, and `type`; `search-shapes.mjs` consumes that array
without conversion. Index resolution is, in order: explicit `--index PATH`,
`DRAWIO_SHAPE_INDEX`, `~/.cache/drawio-diagrams/search-index.json`, then the
gzip variant `~/.cache/drawio-diagrams/search-index.json.gz`.

Probe the installed cache before relying on it:

```bash
node skills/engineering-workflows/drawio-diagrams/scripts/search-shapes.mjs \
  "AWS Lambda" --type vertex --limit 5 --json
```

Record any external icon or index source in the final response.

## Privacy

Use `local-only` mode for sensitive diagrams. Hosted `mcp.draw.io` receives diagram content and requires explicit acceptance. `browser-url` mode carries diagram data in the URL fragment and can still be exposed through browser history, screenshots, sync, or logs. `self-hosted` mode may use self-hosted draw.io or local MCP tools.

Sources: integrated from draw.io CLI/MCP workflows, icon-source setup feedback, and privacy-mode rules.
