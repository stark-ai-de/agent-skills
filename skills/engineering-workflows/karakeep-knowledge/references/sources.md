# Upstream contracts and baseline

Checked 2026-10-13. Recheck for new installations/upgrades; these are a tested-design
baseline, not an automatic update policy.

| Contract                                     | Primary source                                                                                                                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Official three-service Compose topology      | [Docker installation](https://docs.karakeep.app/installation/docker/) and [v0.33.2 Compose](https://github.com/karakeep-app/karakeep/blob/v0.33.2/docker/docker-compose.yml) |
| Current web release checked                  | [Karakeep v0.33.2](https://github.com/karakeep-app/karakeep/releases/tag/v0.33.2)                                                                                            |
| Official MCP tools, STDIO and credentials    | [MCP integration](https://docs.karakeep.app/integrations/mcp/)                                                                                                               |
| MCP package contract                         | [Official npm package](https://www.npmjs.com/package/@karakeep/mcp) and [upstream source](https://github.com/karakeep-app/karakeep/tree/main/apps/mcp)                       |
| Storage, archive and inference configuration | [Environment variables](https://docs.karakeep.app/configuration/environment-variables/)                                                                                      |
| Supported imports                            | [Import guide](https://docs.karakeep.app/using-karakeep/import/)                                                                                                             |
| Optional local inference                     | [AI provider guide](https://docs.karakeep.app/configuration/different-ai-providers/)                                                                                         |
| Current Codex MCP configuration              | [OpenAI MCP documentation](https://learn.chatgpt.com/docs/extend/mcp)                                                                                                        |

The bundled Compose template pins Karakeep `0.33.2`, Meilisearch `1.41.0` and the
official Karakeep Chromium image by digest. The capture-browser `release` tag is
qualified by its immutable digest. These pins were observed in a local Linux setup;
they are not a claim of validation on every architecture or Docker host. Inspect
upstream platform manifests before using an untested architecture.

The MCP baseline is the separately published `@karakeep/mcp@0.33.1`. Verify the
installed package, tools and runtime; the app's release number is not the npm version.
This skill ships original orchestration and guidance only. It does not vendor
upstream server code or binaries; upstream Karakeep packages retain their own license
(AGPL-3.0). The local private-file launcher communicates with the official process.

## Synchronization and curation contracts

Checked 2026-10-14 against upstream `v0.33.2` source (not a live mutation test):

- [Lists](https://github.com/karakeep-app/karakeep/blob/v0.33.2/docs/docs/04-using-karakeep/lists.md): manual/private/shared and saved-query smart lists; bookmarks can belong to multiple lists.
- [Tags](https://github.com/karakeep-app/karakeep/blob/v0.33.2/docs/docs/04-using-karakeep/tags.md) and [search qualifiers](https://github.com/karakeep-app/karakeep/blob/v0.33.2/docs/docs/04-using-karakeep/search-query-language.md): cross-cutting labels and filtered retrieval.
- [MCP list schemas](https://github.com/karakeep-app/karakeep/blob/v0.33.2/apps/mcp/src/lists.ts): manual create fields, query updates and stable-ID membership. Do not infer smart-list creation/conversion from a query update.
- [MCP bookmark schemas](https://github.com/karakeep-app/karakeep/blob/v0.33.2/apps/mcp/src/bookmarks.ts): link/text creation, metadata updates; no text-body update field in the checked MCP.
- [MCP tags](https://github.com/karakeep-app/karakeep/blob/v0.33.2/apps/mcp/src/tags.ts) and [rule schema](https://github.com/karakeep-app/karakeep/blob/v0.33.2/packages/shared/types/rules.ts): inspect release support and current write authority before use.

The pinned npm MCP version remains `0.33.1`; the source tag above describes the web
repository contract, not proof of identical installed package tools. Discover the
actual session's schemas. No live sync, curation, scheduled trigger, text-body update,
smart-list creation or performance benchmark was observed for this extension.
