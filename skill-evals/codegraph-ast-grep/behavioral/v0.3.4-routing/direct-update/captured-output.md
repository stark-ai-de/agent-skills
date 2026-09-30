Selected **`update`** for `/workspace/sample-app`: preserve the existing project-local pnpm installation, update eligible stable CodeGraph and ast-grep versions, apply required migrations, and reconnect Codex. Protected Git state is clean.

The project is absent on this host, so **no update was performed**. Installed versions, pins, release eligibility, and readiness remain unverified.

The execution manifest would be completed from project evidence before mutation:

| Component            | Target and action                                                                                                                                                                   | Expected writes                                          | Verification / rollback                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| CodeGraph            | Check official registry metadata once, respecting pins and update opt-outs; run `CODEGRAPH_TELEMETRY=0 pnpm add --save-dev --save-exact @colbymchenry/codegraph@<eligible-version>` | `package.json`, `pnpm-lock.yaml`, local installation     | Verify local version/help; restore recorded prior version through pnpm if needed                 |
| ast-grep CLI         | Check official registry metadata once; update only `@ast-grep/cli` to the eligible exact version, preserving dependency policy                                                      | Same project-local package files                         | Verify local version/help and bounded structural query; restore recorded prior version if needed |
| Migrations and Codex | Apply help-confirmed required migrations; reconnect the existing project-local MCP registration                                                                                     | Required in-root configuration and generated graph state | Verify MCP exposure, graph freshness, semantic query, and persisted guidance                     |

If CodeGraph 1.6.0 is the eligible target, its documented migration requires running `CODEGRAPH_TELEMETRY=0 pnpm exec codegraph index` once in the project, after confirming installed help.

Your authorization covers these ordinary in-root updates, required migrations, and Codex reconnection; no further confirmation is needed for that scope. Telemetry remains suppressed for CodeGraph commands. No privilege escalation, installer-channel change, prompt-hook expansion, destructive replacement, or external service is included.

**Result:** updates, migrations, reconnection, and readiness checks are pending execution in the actual project environment.
