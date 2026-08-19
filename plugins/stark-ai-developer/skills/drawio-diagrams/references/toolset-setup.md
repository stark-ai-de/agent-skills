# Toolset setup and detection

## Detection order

1. `python3` for the bundled dependency-free validator.
2. Node >= 18 for `render-drawio.mjs`, `open-drawio-url.mjs`, `search-shapes.mjs`, and `validate-drawio-diagram-rules.mjs`.
3. Read-only capability receipt:
   - `node skills/engineering-workflows/drawio-diagrams/scripts/probe-drawio-toolset.mjs`
   - add `--json` when a stable machine-readable receipt is needed; the helper does not install, configure, render, or create caches.
4. draw.io Desktop CLI (the entries below cover native and cross-boundary host layouts):
   - `drawio` on PATH
   - Linux-native executable from the active NixOS user profile
   - macOS `/Applications/draw.io.app/Contents/MacOS/draw.io`
   - Windows `C:\Program Files\draw.io\draw.io.exe`
   - WSL2 `/mnt/c/Program Files/draw.io/draw.io.exe`
   - WSL2 user install `/mnt/c/Users/<user>/AppData/Local/Programs/draw.io/draw.io.exe`
5. Available draw.io MCP tools in the agent session.
6. Configured or standard-cache local shape-search index.
7. Existing local icon cache.
8. Read-only network access for selected public SVG lookup when host policy allows it.

Useful probes:

```bash
python3 --version
node --version
command -v drawio || true
grep -qi microsoft /proc/version 2>/dev/null && echo WSL2 || true
[ -x "/Applications/draw.io.app/Contents/MacOS/draw.io" ] && echo macOS-drawio
[ -x "/mnt/c/Program Files/draw.io/draw.io.exe" ] && echo WSL2-system-drawio
nix profile list 2>/dev/null | grep -i drawio || true
nix eval --raw nixpkgs#drawio.pname 2>/dev/null || true
```

The preflight receipt should distinguish `available`, `missing`, `rejected`, and `indeterminate` evidence for each capability. A version probe proves executable identity only; a renderer is not called `transactional-native` until the actual executable and temporary PNG/SVG format smoke checks pass. Browser version failure is `indeterminate`, not browser success.

## Linux-host native route

The preferred transactional renderer on Linux hosts, including WSL distributions, is a native draw.io executable owned by the active user profile. Before proposing an install, check `type -a drawio`, the active package/profile ownership, and host compatibility; do not silently replace a repository- or user-owned executable. If the checks show that a native package is required and the user separately approves installation, use the host's documented package-manager route:

```bash
nix profile install nixpkgs#drawio
```

This is an approval-gated user-profile change. Do not write draw.io configuration, create a mutable system-wide wrapper, or download an AppImage. A native result is eligible for `transactional-native` only after a format smoke test and the Linux `/proc/self/fd` prerequisites pass.

If native Linux capability is unavailable, offer `approved-raw-cli-manual`, `fixed-theme-browser-raster`, `browser-url-preview`, `html-viewer-preview`, or `direct-xml` according to the requested outcome. Report the selected route and its limitation; never claim transactional guarantees for a Windows bridge or raw manual export.

### Installation proposal contract

When a required command is missing, show all of these fields before asking for approval:

```text
Missing command: drawio (Linux-native transactional renderer)
Package/source: nixpkgs#drawio
Package-manager command: nix profile install nixpkgs#drawio
Persistence scope: current user's Nix profile only
Expected impact: adds a native Linux draw.io executable; does not edit repository or Nix configuration
Post-install checks: type -a drawio; probe --version and --help; temporary PNG/SVG smoke export; verify /proc/self/fd route
```

Use the active environment's package manager and source after checking ownership and compatibility. Installation is never performed during preflight; it requires explicit tool-install approval. Do not silently substitute an AppImage or a mutable wrapper.

### Cross-boundary Windows bridge

Calling a Windows Desktop binary from a Linux host crosses an execution boundary. It requires explicit cross-boundary approval in addition to any tool-install, browser, hosted/MCP, cache, or paid/provider approval. Convert every input and output path with the host's path-conversion utility and suffix fallback artifacts with `.windows-bridge`:

```bash
DRAWIO_EXE='/mnt/c/Program Files/draw.io/draw.io.exe'
INPUT_WIN="$(wslpath -w "$PWD/name.drawio")"
OUTPUT_WIN="$(wslpath -w "$PWD/name.windows-bridge.drawio.png")"
"$DRAWIO_EXE" -x -f png -s 2 -b 10 -o "$OUTPUT_WIN" "$INPUT_WIN"
```

This is an approved raw/manual route only. It cannot be used by `scripts/render-drawio.mjs`, cannot consume inherited Linux descriptor paths, and must report that the transactional renderer's staging and no-clobber guarantees were unavailable.

## Icon lookup behavior

Icon-first is the default and does not require a legal-approval wizard. Use native stencils and existing assets immediately. When read-only web access is allowed, retrieve only the selected public SVGs, validate them, and embed them in the `.drawio` file.

Official organization/product/service marks are the primary lookup target. Use a labelled native semantic icon only for an unresolved node or an intentionally generic/vendor-neutral concept; keep resolved official logos and their original artwork/brand colors unchanged. Ask only if the host requires network consent or an action would install software, configure MCP, use a hosted service, download a bulk pack/index, or create a persistent cache. If lookup cannot proceed, use a labelled semantic fallback per unresolved node and keep all other resolved logos unchanged. Any explicit recoloring or necessary documented accessibility treatment must be disclosed.

## Promotion table

| Missing tool | Promote when | Benefit | Example install/config command |
| --- | --- | --- | --- |
| draw.io Desktop CLI | user needs PNG/SVG/PDF export or visual/dark render checks | export, embedded XML where supported, and visual verification after a format smoke test; Mermaid import and `--layout` are not assumed | NixOS/WSL: after ownership and compatibility checks plus separate installation approval, `nix profile install nixpkgs#drawio`; macOS: `brew install --cask drawio`; Windows: `winget install JGraph.Draw`; otherwise use the approved raw/manual, Windows-bridge, fixed-theme-browser, browser-preview, or direct-XML route |
| Official shape index | exact stencil names matter and no MCP `search_shapes` is available | offline style-string search through `scripts/search-shapes.mjs` | after approval, download the committed [`jgraph/drawio-mcp` shape index](https://github.com/jgraph/drawio-mcp/blob/main/shape-search/search-index.json) unchanged to `~/.cache/drawio-diagrams/search-index.json`; the helper auto-detects that path |
| Hosted draw.io MCP app server | inline diagram creation or shape search is useful and the diagram is not sensitive | app/server-assisted create + search | configure the client for `https://mcp.draw.io/mcp` only after warning that diagram XML is sent to the hosted endpoint |
| `@drawio/mcp` tool server | browser opening for XML/CSV/Mermaid without a full live editor | local tool server URL flow | configure the MCP client with `npx -y @drawio/mcp` if the user approves |
| `drawio-mcp-server` live editor | existing open documents, pages, layers, and live browser editing matter | interactive CRUD editing and export | configure the MCP client for `npx -y drawio-mcp-server --editor` if approved |
| `@next-ai-drawio/mcp-server` preview | fast browser preview sessions matter | preview-oriented create/edit/export tools | configure with `npx -y @next-ai-drawio/mcp-server` if approved |
| Lobe Icons / Simple Icons / theSVG / Iconify / Devicon / Web3 packs | named AI, SaaS, data, dev-tool, or crypto logos are missing | broad real-logo coverage with self-contained SVG embedding | retrieve only selected public SVGs when read-only network policy allows; ask before package installs, bulk downloads, or persistent cache creation |

Never install or configure without explicit approval. Installation, cross-boundary execution, browser use, hosted/MCP transfer, cache creation, and paid/provider actions each need their own approval. If an optional action is not approved, continue with direct XML and per-node native semantic icons.

## Optional local caches

Runtime should prefer known official/accepted embedded marks and native draw.io service stencils. Use local icon caches for named entities only when their provenance and variant are known; otherwise resolve the official source before falling back to a generic semantic icon. Ask before creating or bulk-populating caches. Keep downloaded indexes outside the skill folder so the skill stays small and reproducible.

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
