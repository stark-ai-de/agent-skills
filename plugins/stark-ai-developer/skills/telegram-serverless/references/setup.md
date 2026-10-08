# Setup and authentication

Read for route 2, or for a prerequisite/layout problem in route 8. Authoritative sources: [getting started](https://core.telegram.org/bots/serverless#getting-started), [authentication](https://core.telegram.org/bots/serverless#authentication), [BotFather](https://core.telegram.org/bots/serverless#on-the-go-with-botfather).

## Preflight

Identify the target folder, its Git state, existing instructions, package manager, installed Node.js, and installed `@tgcloud/cli` version. Use the package's actual engine constraint; the documented minimum is not a recommendation to replace a maintained local toolchain. Check the existing local binary/package metadata before invoking `npx`, which may install a missing package.

The bot owner must enable Serverless in BotFather. The skill does not infer this from a local package or automatically operate the owner's Telegram account.

## Create or adopt a project

The official creator is `npm create @tgcloud/bot <folder>`; the installed CLI also provides `tgcloud init` in the target root. Respect project package-management rules. These commands write project files and can install dependencies; use them only for authorized setup.

For an existing frontend, add Serverless in that frontend's root. The creator/init preserves existing files, adds the backend and docs, and may add a build-then-push deploy script if one is absent. Inspect the resulting diff and actual scripts; do not assume an existing `deploy` script has the expected behavior.

Expected backend layout:

```text
tgcloud/
  schema.js
  handlers/message.js
  endpoints/getProfile.js
  lib/format.js
tgcloud.jsonc
```

Handlers and endpoints are flat. Only lib may be nested. The scaffold also provides an SDK guide and project instructions; preserve existing instructions. Init refuses nested projects and can fill missing files when repeated at the same root.

Use `tgcloud add handlers/<update_type>`, `endpoints/<identifier>`, or `lib/<path>` for a new module. It refuses overwrite; the active default export becomes live after deployment. Use the CLI's advertised handler types rather than a frozen list.

A legacy layout has schema/lib/handlers at the root. Inspect `tgcloud upgrade --dry-run`, then use the authorized upgrade only after preserving local work. Do not manually move CLI state.

## Link the bot without exposing credentials

The Serverless CLI access token from BotFather → bot → Serverless → CLI Access is distinct from the Bot API token. The owner enters it in their interactive terminal using the installed `tgcloud login`. Do not ask them to paste it into chat or run it through a recorded argument.

For CI, use an already authorized secret injection to populate `TGCLOUD_TOKEN`. It takes precedence over saved login credentials. Never display the value while diagnosing which source is in use. The CLI owns `.tgcloud/`; verify it is ignored without opening its credentials.

Login validates the token and synchronizes local CLI state. Missing or invalid credentials require an explicit login path; do not invent a token flag or manually patch state. Authentication does not establish authority to deploy or migrate.

The CLI token authenticates the local developer tool. It is not a documented credential mechanism inside backend modules. Never put it in the frontend.

## BotFather and local clients

BotFather exposes handlers, endpoints, libraries, schema/database changes, static files, and CLI access for the same cloud project. Changes made there can cause local/cloud divergence. Inspect before synchronizing; local presence is not evidence of current deployment.

Shell completion is optional. The documented completion command prints bash/zsh/fish setup for a bare `tgcloud` binary; it does not hook into `npx`. Do not install a global CLI or rewrite shell configuration solely to add completion unless requested.
