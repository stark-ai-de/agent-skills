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
