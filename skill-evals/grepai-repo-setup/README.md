# GrepAI repository setup scenarios

| Given                                                                                                       | Expected behavior                                                                                                                |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Exact project registration and a successful MCP search, with no local config or empty local provider fields | Report workspace search as usable and leave the repo config alone.                                                               |
| Local CLI reports an unknown empty provider                                                                 | Identify local mode and use the selected workspace explicitly.                                                                   |
| Project search works over MCP while sandbox CLI gets a loopback refusal                                     | Report MCP as usable, sandbox CLI as inaccessible, and host CLI as unverified unless separately checked.                         |
| Project is absent or the exact linked worktree is excluded                                                  | Distinguish verified absence or exclusion from a failed listing. Report the owner route without substituting a sibling checkout. |
| Search reports model/index mismatch                                                                         | Preserve the specific diagnosis and refer repair to the owner.                                                                   |
| Setup runs twice on an already registered project with equivalent guidance                                  | Preserve one registration and one instruction block.                                                                             |
| Doctor runs on a dirty tree                                                                                 | Preserve guidance, configuration and index state. Report search readiness separately from freshness.                             |
| User requests options without requesting execution                                                          | Show setup and doctor without acting.                                                                                            |

## Local smoke check

A registered project produced the same source match through MCP and the host CLI. The sandbox CLI received a loopback connection refusal. The CLI without workspace selection reported an empty embedding provider. The sampled source location matched the current checkout. The Git status and the two configuration file digests matched before and after the probe. This check covers access in the observed contexts. It does not establish complete index freshness or exercise registration writes.
