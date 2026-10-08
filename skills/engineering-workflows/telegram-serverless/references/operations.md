# Operations

Read for routes 6–8 and deployment/migration handoffs. Source: [CLI reference](https://core.telegram.org/bots/serverless#command-line-interface). Commands below mean the already installed project-local CLI, normally `npx tgcloud` or the project's documented equivalent.

## Effects and state

| Command      | Main effect                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------- |
| status, diff | Offline comparison against the last synchronized cloud snapshot                                    |
| fetch        | Read deployed state and refresh local CLI metadata; preserve working source files                  |
| run          | Upload local modules and execute remotely; application/API/database effects are possible           |
| push         | Change deployed modules/static files                                                               |
| migrate      | Inspect and potentially change the live database; dry-run applies nothing                          |
| pull         | Replace working modules with deployed versions; preserve the static build folder                   |
| reset        | Discard working module edits in favor of the last known snapshot; preserve the static build folder |
| webhook      | Inspect live webhook state                                                                         |
| webhook sync | Change routing and allowed_updates; drop-pending also discards queued updates                      |
| upgrade      | Move legacy local layout; dry-run previews moves                                                   |

Init/add/login/completion are covered in [setup](setup.md). Do not label fetch as having no local effects: it updates CLI-owned metadata. Never edit that state manually.

## Validate and test

Start with the requested evidence level. An offline-only request prohibits login, fetch, webhook queries, remote run, push, and migrations. Do not silently install a CLI to inspect a project.

Check module layout, imports, syntax, schema usage, ownership predicates, frontend scripts/output, and sensitive-file exclusion. Node syntax checks can check JS parsing but do not execute the platform SDK. Mocks can prove application decisions, not Telegram authentication, schema enforcement, or service behavior.

For authorized remote tests, identify the bot, data/API effects, and test input before running. A dedicated disposable bot is preferable when effects need isolation; don't assume run creates one.

Examples of invocation shape, not instructions to execute during a review:

```sh
npx tgcloud run handlers/message '{ chat: { id: 123 }, text: "/start" }'
npx tgcloud run handlers/message '{}' --ctx '{ update: { update_id: 10 } }'
npx tgcloud run endpoints/getNote '{ noteId: 1 }' --ctx '{ initData: { user: { id: 123 } } }'
```

Replace synthetic IDs with an authorized target only for an actual test. Inputs and context must be objects, not arrays/null/scalars. A bare runnable name is ambiguous if both handlers and endpoints define it; use its qualified path. The platform executes the local module set, including local libraries, without publishing it.

Do not include secrets in JSON arguments or logs. Capture actual return/log/error evidence. Supplying an arbitrary user through run context tests application logic, not the platform's init-data verification.

## Deploy

1. Inspect working changes, intended module/static scope, and known cloud revision. If current remote state is needed and authorized, fetch and inspect the divergence before publishing.
2. For an existing bot, preserve remote modules not part of the task. A new/minimal local directory is not sufficient evidence that a full push is safe.
3. Build the frontend first when static files are in scope. Review the output folder and config, including accidental removal or stale artifacts.
4. Show the concrete change and effects. Reuse existing deployment authority for this exact target/scope; otherwise obtain it after preparing the change.
5. Use a full push only for an intended full-project mirror. A targeted push changes only named modules and does not delete unrelated modules. Static-only push targets the configured build folder.
6. Record the successful revision/result. Inspect pending schema changes separately; pushing schema is not a migration.
7. Inspect webhook/static behavior when the authorized task requires live verification. Report checks not performed.

A schema-only push, authorized migration, then dependent handlers/endpoints can avoid activating code before an additive schema is ready. See [database](database.md) for destructive/manual cases.

## Concurrency and recovery

The platform checks cloud revisions. A rejected push is evidence of divergence, not permission for force. Fetch refreshes the comparison base; that does not itself merge remote changes into local source or make a subsequent full push safe.

Preserve local changes and compare both sides before a pull or manual reconciliation. Pull writes source; reset restores the cached snapshot and is not a fresh cloud fetch. Never use either as an automatic conflict resolver. Stop after a rejected operation to inspect its cause instead of retrying with weaker safeguards.

To roll back code, review the previously known-good module/static content against the current cloud state and deploy the authorized rollback scope. A local reset alone does not roll back the cloud. Code rollback cannot restore database deletions; require a verified data recovery plan for that operation.

## Webhook diagnosis

Inspect the platform-managed webhook's URL, allowed_updates, pending count, last delivery error, and sync state. Confirm handler existence/content and the required update type. Do not set a custom webhook URL for this platform.

Adding/removing handlers can require webhook sync. Its normal path retains pending updates; `--drop-pending` intentionally discards them and needs specific authority. A diagnosis-only request reports the repair without executing it.

## Legacy upgrade

Inspect the actual installed CLI and layout. For pre-tgcloud projects, preview `upgrade --dry-run`, preserve local work, and apply only an authorized move. The documented upgrade retains the bot link and does not require redeployment. Inspect the resulting tree and diff; do not turn a local layout upgrade into a push.

## Outcome

Record actual local, remote-run, deploy, migration, webhook, and static results independently. Most failures are nonzero, but migration can exit successfully while manual/skipped work remains. Missing live evidence remains unverified. Do not invent a production log command, backup operation, quota, or recovery API.
