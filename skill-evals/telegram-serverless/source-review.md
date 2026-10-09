# Telegram Serverless source review

Reviewed: 2026-10-09 (Europe/Berlin). This is documentation and published-package evidence, not live Telegram qualification.

## Sources read

- [Complete Telegram Serverless page](https://core.telegram.org/bots/serverless): all 56 unique section anchors, including the complete CLI reference and October 6 Mini App additions.
- [Mini Apps Serverless calls](https://core.telegram.org/bots/webapps#serverless): call signature, verified init-data boundary, and client errors.
- [CLI package metadata](https://registry.npmjs.org/@tgcloud%2Fcli/latest): @tgcloud/cli 0.2.0, Node.js >=18.0.0, MIT.
- [Creator package metadata](https://registry.npmjs.org/@tgcloud%2Fcreate-bot/latest): @tgcloud/create-bot 0.1.1, Node.js >=18.0.0, MIT.
- [Published CLI 0.2.0 archive](https://registry.npmjs.org/@tgcloud/cli/-/cli-0.2.0.tgz): source-inspected without installing the CLI or performing a live CLI operation, particularly commands/migrate.js, commands/run.js, commands/login.js, and (during the review follow-up) commands/status.js and commands/webhook.js.
- [Official Mini Apps JavaScript](https://telegram.org/js/telegram-web-app.js): Serverless availability, synchronous precondition errors and callback delivery; inspected during the 2026-10-09 review follow-up.
- [Agent Skills specification](https://agentskills.io/specification) and [Agent Plugins 1.0.0](https://agent-plugins.org/specification): public format and package boundaries.

The raw page capture used by evaluation agents is temporary and excluded from the repository. Runtime references contain original explanations and bounded examples; no upstream skill is vendored.

## Source challenges resolved

- CLI 0.2.0 labels status as offline but calls webhookStatusLine; with available credentials this performs authenticated GET /webhook. Silent failure handling does not make it offline. diff remains a cached comparison.
- The Mini Apps SDK exports Serverless without init data and throws synchronously before callback delivery when init data is absent. The browser example now checks prerequisites and handles synchronous errors as well as callbacks. The [Mini Apps launch-mode reference](https://core.telegram.org/bots/webapps#webappinitdata) documents empty init data for keyboard-button and inline-mode launches, so the unavailable-state message names the missing launch capability instead of implying the app is outside Telegram.
- CLI token and Bot API token are separate. CLI environment authentication does not establish backend environment variables or secret injection.
- Backend SDK access is not Node.js or arbitrary npm support. Frontend build tooling has a distinct boundary.
- run executes uploaded local modules on the platform; supplied ctx bypasses normal init-data verification for testing. It is neither offline nor authentication proof.
- Full push mirrors modules and can delete remote-only files. fetch refreshes the comparison snapshot without merging sources.
- The prose migration overview describes individual warning confirmation, while the specific flag reference and CLI source permit --yes to apply every warning. The skill follows the concrete flag behavior and retains action authorization.
- migrate.js only returns failure for server-rejected changes. Skipped/manual work does not force failure; inspect the summary before claiming completion.
- --local selects the schema used against the live database. Only --dry-run prevents application.
- A static build must precede publication. static:false removes the site, while removing the static key relinquishes management.
- No documentation-backed runtime secret store, transaction guarantee, invocation quota, scheduler, pricing/SLA, or backup API was established. These remain unresolved, not assertions of impossibility.
- The repository rejects $skill starter tokens for CHAT-enabled metadata. The maintainer explicitly approved a portable starter prompt; Codex examples retain explicit invocation syntax.

## Evidence limits

No Telegram account was opened, token read, bot created, CLI cloud command executed, database migrated, endpoint authenticated against Telegram, hosted Mini App tested, or release published. CLI implementation observations do not prove server behavior. Offline behavioral trials and local repository checks are recorded separately.

## Complete section inventory

- [why-serverless](https://core.telegram.org/bots/serverless#why-serverless)
- [getting-started](https://core.telegram.org/bots/serverless#getting-started)
- [building-with-ai](https://core.telegram.org/bots/serverless#building-with-ai)
- [on-the-go-with-botfather](https://core.telegram.org/bots/serverless#on-the-go-with-botfather)
- [projects-and-modules](https://core.telegram.org/bots/serverless#projects-and-modules)
- [the-database](https://core.telegram.org/bots/serverless#the-database)
- [the-sdk](https://core.telegram.org/bots/serverless#the-sdk)
- [command-line-interface](https://core.telegram.org/bots/serverless#command-line-interface)
- [recent-changes](https://core.telegram.org/bots/serverless#recent-changes)
- [october-6-2026](https://core.telegram.org/bots/serverless#october-6-2026)
- [the-mental-model](https://core.telegram.org/bots/serverless#the-mental-model)
- [quick-demo](https://core.telegram.org/bots/serverless#quick-demo)
- [1-create-a-project](https://core.telegram.org/bots/serverless#1-create-a-project)
- [2-link-your-bot](https://core.telegram.org/bots/serverless#2-link-your-bot)
- [3-look-around](https://core.telegram.org/bots/serverless#3-look-around)
- [4-deploy](https://core.telegram.org/bots/serverless#4-deploy)
- [5-add-a-database-table](https://core.telegram.org/bots/serverless#5-add-a-database-table)
- [6-store-and-read-data](https://core.telegram.org/bots/serverless#6-store-and-read-data)
- [7-test-without-deploying](https://core.telegram.org/bots/serverless#7-test-without-deploying)
- [8-keep-in-sync](https://core.telegram.org/bots/serverless#8-keep-in-sync)
- [anatomy-of-a-project](https://core.telegram.org/bots/serverless#anatomy-of-a-project)
- [the-module-system](https://core.telegram.org/bots/serverless#the-module-system)
- [handlers](https://core.telegram.org/bots/serverless#handlers)
- [endpoints](https://core.telegram.org/bots/serverless#endpoints)
- [calling-an-endpoint-from-the-mini-app](https://core.telegram.org/bots/serverless#calling-an-endpoint-from-the-mini-app)
- [what-gets-deployed](https://core.telegram.org/bots/serverless#what-gets-deployed)
- [mini-app-front-end](https://core.telegram.org/bots/serverless#mini-app-front-end)
- [declaring-tables](https://core.telegram.org/bots/serverless#declaring-tables)
- [column-types](https://core.telegram.org/bots/serverless#column-types)
- [column-modifiers](https://core.telegram.org/bots/serverless#column-modifiers)
- [indexes-and-constraints](https://core.telegram.org/bots/serverless#indexes-and-constraints)
- [no-foreign-keys](https://core.telegram.org/bots/serverless#no-foreign-keys)
- [querying](https://core.telegram.org/bots/serverless#querying)
- [migrations](https://core.telegram.org/bots/serverless#migrations)
- [removing-things](https://core.telegram.org/bots/serverless#removing-things)
- [changing-a-column-39s-type](https://core.telegram.org/bots/serverless#changing-a-column-39s-type)
- [the-bot-api](https://core.telegram.org/bots/serverless#the-bot-api)
- [files](https://core.telegram.org/bots/serverless#files)
- [http](https://core.telegram.org/bots/serverless#http)
- [logging](https://core.telegram.org/bots/serverless#logging)
- [init](https://core.telegram.org/bots/serverless#init)
- [add](https://core.telegram.org/bots/serverless#add)
- [login](https://core.telegram.org/bots/serverless#login)
- [status](https://core.telegram.org/bots/serverless#status)
- [diff](https://core.telegram.org/bots/serverless#diff)
- [push](https://core.telegram.org/bots/serverless#push)
- [migrate](https://core.telegram.org/bots/serverless#migrate)
- [run](https://core.telegram.org/bots/serverless#run)
- [fetch](https://core.telegram.org/bots/serverless#fetch)
- [pull](https://core.telegram.org/bots/serverless#pull)
- [reset](https://core.telegram.org/bots/serverless#reset)
- [webhook](https://core.telegram.org/bots/serverless#webhook)
- [completion](https://core.telegram.org/bots/serverless#completion)
- [upgrade](https://core.telegram.org/bots/serverless#upgrade)
- [authentication](https://core.telegram.org/bots/serverless#authentication)
- [staying-in-sync](https://core.telegram.org/bots/serverless#staying-in-sync)
