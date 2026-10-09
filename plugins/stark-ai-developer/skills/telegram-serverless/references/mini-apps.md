# Mini Apps

Read for route 4 and Mini App deployment diagnosis. Sources: [endpoints](https://core.telegram.org/bots/serverless#endpoints), [frontend hosting](https://core.telegram.org/bots/serverless#mini-app-front-end), [Serverless.call](https://core.telegram.org/bots/webapps#serverless).

## Endpoint boundary

A flat module `tgcloud/endpoints/getNote.js` exposes getNote through the platform. Names use letters, digits, and underscores and cannot start with a digit. The default export receives `(input, ctx)`; input is the JSON object supplied by the frontend, and `ctx.initData` is verified by the platform during ordinary Mini App calls.

Use `ctx.initData.user.id` as the authenticated caller. This establishes identity, not authorization to arbitrary records. Validate input and constrain reads/writes to that caller or explicit application roles. Never trust a submitted userId or client-side initDataUnsafe as backend authorization.

Original endpoint using the owned lookup from the database reference:

```js
import { EndpointError } from "sdk";
import { ownedNote } from "../lib/notes.js";

export default async function (input, ctx) {
  if (!Number.isSafeInteger(input?.noteId) || input.noteId <= 0) {
    throw new EndpointError("Choose a valid note.", { code: "INVALID_NOTE" });
  }
  const note = await ownedNote(ctx.initData.user.id, input.noteId);
  if (!note) throw new EndpointError("Note not found.", { code: "NOT_FOUND" });
  return { id: note.id, body: note.body };
}
```

Ordinary calls without valid init data are rejected by the platform before the endpoint runs. CLI run with supplied `--ctx` does not verify this context and cannot prove that authentication behavior.

Return JSON-serializable values. EndpointError intentionally exposes its description and optional parameters to the caller; keep those public-safe. Other exceptions become a generic client error with details retained in logs. Put stable business error codes in parameters when needed.

Endpoints are for the bot's Mini App, not generic unauthenticated webhook ingress. Do not promise a public integration endpoint by bypassing init data checks.

## Frontend call and UI

Include the official Mini Apps script, `https://telegram.org/js/telegram-web-app.js`. Call `Telegram.WebApp.Serverless.call(name, input?, callback)`; the SDK transmits init data. The callback receives an error or result, not a returned Promise.

Minimal original HTML behavior:

```html
<button id="load-note" type="button" disabled>Load note</button>
<p id="result" role="status"></p>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<script>
  const button = document.getElementById("load-note");
  const result = document.getElementById("result");
  const webApp = window.Telegram?.WebApp;
  const serverless = webApp?.Serverless;
  const available =
    typeof serverless?.call === "function" &&
    typeof webApp?.initData === "string" &&
    webApp.initData.length > 0;

  if (!available) {
    result.textContent =
      "This launch does not provide Mini App init data or Serverless support. Open the app through a Telegram Mini App launch that provides both.";
  } else {
    button.disabled = false;
    button.addEventListener("click", () => {
      button.disabled = true;
      result.textContent = "Loading…";
      const finish = (error, note) => {
        button.disabled = false;
        result.textContent = error
          ? error.type === "ENDPOINT_ERROR"
            ? error.message
            : error.type === "UNAUTHORIZED"
              ? "Reopen this app in Telegram."
              : "Unable to load the note."
          : note.body;
      };
      try {
        serverless.call("getNote", { noteId: 1 }, finish);
      } catch {
        finish({ type: "CLIENT_ERROR" });
      }
    });
  }
</script>
```

The fixed note ID is an example resource ID, not a caller identity. Real apps select their resource through UI state. Preserve a user's existing framework; the example establishes only the platform contract.

The SDK exposes Serverless even outside Telegram; its presence alone is insufficient. Missing init data causes a synchronous exception before any callback. Check both prerequisites and catch synchronous SDK failures so pending controls recover. These frontend checks gate the UI only; server-verified context still owns authentication.

Handle unavailable SDK, pending, success, business errors, unauthorized/transport failures, and retries appropriate to the action. Use textContent or framework escaping for returned text. Client error fields include message, optional type/parameters, and HTTP status (0 for an incomplete request).

## Static hosting

The project root holds frontend source; only its built output is hosted. Configure `static.source` in the existing tgcloud.jsonc (JSON with comments) or strict tgcloud.json. Use the installed CLI's JSON schema for detailed validation.

Example config for an existing dist build:

```json
{
  "$schema": "./node_modules/@tgcloud/cli/schema/tgcloud.json",
  "static": {
    "source": "dist",
    "spa": true,
    "immutable": ["/assets/*"]
  }
}
```

- Vite-style builds commonly use dist. SSR-oriented frameworks need a verified static export and explicit source folder; do not deploy their server output.
- The CLI does not build on push. Run and verify the actual build script before publishing, or inspect a deploy script that builds before pushing.
- spa supplies index.html for eligible extensionless paths, not missing files with extensions.
- immutable is only for content-hashed files; marking mutable HTML/config can leave clients stale for a year.
- Headers use exact paths or prefix patterns; null removes a header. Redirects are first-match, with existing files taking priority.
- `"static": "dist"` is a shorthand. `static: false` removes the hosted site on the next push; removing the key stops management and leaves existing hosted files.
- Dotfiles are excluded. Keep secrets out of the entire build, including public configuration and source maps.
- The host serves from /. Reserve /api/ for platform endpoints. Keep Telegram Web iframe embedding compatible: do not add X-Frame-Options or a restrictive frame-ancestors policy.

A full push combines modules and static output; targeted module pushes leave static content alone. Static-only publishing can target the configured build folder. Use the exact URL reported by the successful push for the owner's BotFather Mini App configuration. Local builds and mocked calls do not establish live hosting or Telegram-client access.
