# Runtime and SDK

Read for bot code, shared modules, integrations, or code review. Sources: [projects](https://core.telegram.org/bots/serverless#projects-and-modules), [SDK](https://core.telegram.org/bots/serverless#the-sdk), [Bot API](https://core.telegram.org/bots/api).

## Code boundary and entrypoints

The backend is JavaScript ES modules in a V8 sandbox, not a Node.js server. There is no backend npm resolution, filesystem, Node Buffer, or server entrypoint. Use relative imports ending in `.js` within `tgcloud/`; SDK imports are `sdk`, `sdk/db`, `sdk/api`, and `sdk/fetch`. Do not import frontend dependencies or files outside that tree. Frontend packages are a separate build concern.

`schema.js` exports tables. Flat `handlers/` files have a default function for the matching Bot API update type. Empty/missing handlers ignore that update type. Flat `endpoints/` files are called by a Mini App. Shared `lib/` files can have subdirectories.

A message handler receives a Message directly, not an Update envelope. Its second argument contains `ctx.update`, including the raw update ID when needed. A callback-query handler instead receives a CallbackQuery. Validate optional fields for the actual update type.

Original example, accepting only text messages:

```js
import { api } from "sdk";

export default async function (message) {
  if (typeof message.text !== "string") return;
  await api.sendMessage({
    chat_id: message.chat.id,
    text: message.text === "/start" ? "Send a note to get started." : "Text received.",
  });
}
```

Do not assume invocation-global memory persists. Use the database for persistent state. Do not claim undocumented ordering, retry, isolation, or exactly-once delivery guarantees; make duplicate-sensitive effects explicit in the application design.

## Database access

Import `db` from `sdk` and schema/operators from `sdk/db` plus the local schema. Await terminal operations. Read [database](database.md) before designing schema, atomic updates, or migrations. Drizzle resemblance does not make all Drizzle APIs supported.

## Bot API and errors

`api.<method>(params)` uses Bot API method names and snake_case parameters. Successful calls return the unwrapped result. A failed API call throws `BotApiError` with code, description, method, and parameters, including retry information when provided.

Catch only the failure you can identify and recover from. A generic 400 does not prove that a message was already deleted. Do not swallow all failures or retry non-idempotent actions blindly. Use current Bot API documentation for method parameters and limits rather than copying an exhaustive method list into the skill.

## Files

`InputFile` wraps byte data, a filename, and optional MIME type for Bot API uploads; nested media fields are supported. Use `Uint8Array`, not Node Buffer.

`api.getFileContent(file_id)` returns all bytes. `api.getFileStream(file_id)` returns file information and a body stream. These helpers resolve downloads without exposing a bot token or constructing token-bearing URLs. Verify current upload/download limits before committing to a payload size; streaming is not a bypass.

## HTTP

Import `fetch` from `sdk`. It supports HTTP requests, response status/headers, text/JSON readers, and incremental response bodies. Check `res.ok` before interpreting success. Its response-size cap still applies when streaming.

`fetch.body.json`, `form`, and `text` helpers choose matching content types. Request bodies can include bytes, InputFile, or the SDK's FormData. Do not assume every browser/Node fetch option, global, or binary response helper exists; use the generated/current SDK guide.

For external authenticated APIs, first establish a documented runtime secret mechanism. `TGCLOUD_TOKEN` belongs to the CLI, and client-side Mini App SecureStorage is not a server secret store. Do not invent `process.env`, `sdk.secrets`, or hardcode provider credentials when the requested integration needs an unresolved capability.

## Logging and verification

The runtime console is available globally. Remote run reports logs, origins, return value, and elapsed time. Log useful event/error categories without credentials, whole message bodies, or unnecessary user data.

Use syntax checks and offline tests for pure logic when possible. They do not resolve the production SDK or prove Telegram delivery. Remote run can produce real effects and requires the target and authority described in [operations](operations.md).
