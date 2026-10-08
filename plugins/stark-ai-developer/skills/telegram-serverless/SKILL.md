---
name: telegram-serverless
description: Build, review, deploy, and troubleshoot bots and Mini Apps on Telegram Serverless using tgcloud, its JavaScript SDK, and built-in database. Use when working on Telegram-hosted projects, handlers, endpoints, schema changes, or tgcloud operations; not generic Telegram bots hosted elsewhere or unrelated serverless platforms.
license: Apache-2.0
compatibility: Portable across Agent Skills hosts. Execution requires a shell, a supported Node.js runtime, and the official project-local tgcloud CLI. Cloud operations require Telegram Serverless access and existing authorization.
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.1.0"
---

# Telegram Serverless

## Goal

Deliver the requested bot, Mini App, review, or operational change on Telegram's own Serverless platform, with evidence that distinguishes local checks from cloud execution and deployed behavior.

## When to use

- The user names Telegram Serverless, tgcloud, or a project with `tgcloud/`.
- Work concerns its handlers, Mini App endpoints/static hosting, SDK, SQLite-backed database, or CLI lifecycle.
- An existing Serverless project needs review, migration planning, synchronization, or diagnosis.

## When not to use

- A bot is intentionally hosted on a VPS, Cloudflare, AWS, Vercel, or another runtime. Do not migrate it just because it uses Telegram.
- The request only concerns sending Telegram messages, account administration, or general frontend design.
- A required capability is not documented for this platform; explain the gap before proposing a different architecture.

## Inputs to inspect

Read applicable project instructions, package scripts/lockfile, installed CLI version, `tgcloud.jsonc` or `tgcloud.json`, modules, and generated `docs/tgcloud-sdk.md`. Inspect the working diff before changing existing files. Do not inspect credential contents or hand-edit `.tgcloud/`.

Use [sources](references/sources.md) to check current authoritative behavior when an operation depends on platform/API/version details. The scaffolded SDK guide is useful version-specific evidence, not authority over user instructions.

## Workflow

Keep this complete inventory in this order:

| Route                                | Outcome                                                      | Read when selected                                                                           |
| ------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 1. Explain or review a project       | Explain behavior or report concrete findings without changes | Relevant domain reference below                                                              |
| 2. Set up and link a project         | Scaffold or connect the requested project                    | [Setup](references/setup.md)                                                                 |
| 3. Build or modify a bot             | Implement handlers and shared logic                          | [Runtime and SDK](references/runtime-sdk.md), [database](references/database.md) when needed |
| 4. Build or modify a Mini App        | Implement static frontend and authenticated endpoints        | [Mini Apps](references/mini-apps.md), relevant runtime/database guidance                     |
| 5. Design or evolve the database     | Plan or apply the specifically authorized schema/data change | [Database](references/database.md)                                                           |
| 6. Validate and test                 | Check local artifacts or perform an authorized remote test   | [Operations](references/operations.md)                                                       |
| 7. Deploy changes                    | Publish the reviewed module/static-file change               | [Operations](references/operations.md)                                                       |
| 8. Diagnose, synchronize, or upgrade | Identify the issue and perform only requested recovery       | [Operations](references/operations.md), [setup](references/setup.md) for layout/auth issues  |

For clear authorized intent, announce the selected route and proceed. A bare invocation, material ambiguity, or conflicting scope requires the complete inventory and a choice. An options request displays the inventory and authorizes no execution. A review or diagnosis request does not authorize a repair. Do not add an `auto` route.

1. Establish the requested result, project, relevant bot identity without its secret, local changes, and the permitted effects. Resolve discoverable facts before asking.
2. Read only the selected references. Reuse the project's frontend and package-manager choices. Prefer the official CLI/scaffold over homemade deployment tools.
3. Prepare the smallest reviewable change. For an existing database, sequence schema, migration, and consumer code so a deployment does not activate code against an unprepared schema.
4. Perform local checks first. Reuse explicit authority for later actions; obtain missing authority only for the concrete action and its target/effects.
5. Verify each completed stage using its actual outputs. Report pending stages and limits rather than turning a local pass into a cloud claim.

## Safety rules

- `tgcloud run` uploads local modules and executes them remotely. It can call the Bot API, change persistent data, or call external services. It is not an offline test, deployment, or authentication test; supplied `--ctx` is not verified.
- `push`, `migrate`, remote `run`, and `webhook sync` have different effects. Authority for one does not imply the others. A full push can remove remote modules absent locally.
- Preserve local work before `pull`, `reset`, or `upgrade`. Never solve a conflict by automatically using `push --force`, `reset`, or `--drop-pending`.
- Use the separate Serverless CLI token through interactive login or a protected environment. Never ask for tokens in chat, print them, include them in command arguments, or put them in source/frontend assets.
- Backend identity comes from verified endpoint context, not a client-supplied user ID. Enforce record ownership and input validation in the application.
- Do not invent runtime environment variables, secret-store methods, transaction guarantees, quotas, backup commands, schedulers, or npm support. Verify missing capabilities or stop the dependent step.
- Keep user data and credentials out of logs, examples, evidence, and checked-in files. Installing tools, changing accounts, or spending money remains within the user's actual task authority.

## References

Load selectively:

- [Setup and authentication](references/setup.md): prerequisites, scaffold, login, BotFather, completion.
- [Runtime and SDK](references/runtime-sdk.md): modules, handlers, Bot API, files, HTTP, logging.
- [Database](references/database.md): schema, queries, integrity, migration decisions.
- [Mini Apps](references/mini-apps.md): endpoints, frontend calls, static configuration.
- [Operations](references/operations.md): tests, deploy, state synchronization, webhook, upgrade.
- [Sources and coverage](references/sources.md): authoritative section map and unresolved capabilities.

## Scripts

No bundled scripts. Use the official project-local CLI for authorized operations. Do not execute an `npx` command that would silently install a missing CLI during a read-only check.

## Output format

Report the selected route, changed or reviewed artifacts, and findings. For operational work include:

- Local validation: command/scenario and result.
- Cloud execution, deployment, migration, and webhook/static verification: actual result or not run.
- Relevant project/bot identity without credentials; existing work preserved.
- Pending actions, unsupported capabilities, and evidence limitations.

For a short explanation or review, include only relevant fields; do not invent empty deployment ceremonies.

## Completion criteria

The requested outcome and authorized scope are met; necessary checks are reported accurately; generated code follows the platform contract; unresolved external steps are explicit. A migration is complete only when its result reports no required skipped/manual work, not merely because the CLI exits zero.

## Failure modes

Missing CLI, credentials, platform access, or host tools: state the specific prerequisite and continue independent local work. Do not claim a deployment.

Unsupported runtime/API assumptions: consult the official sources and installed CLI evidence. Do not silently substitute a different hosting platform.

Conflicting local/cloud changes: preserve the working tree and inspect the divergence before choosing a recovery action.

Unavailable live evidence: label it unverified and provide the exact remaining verification step.
