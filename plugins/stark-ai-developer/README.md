# stark AI Developer

portable Agent Plugin generated from the explicit `plugins/stark-ai-developer.source.json` allowlist.

This harness-first package contains 9 developer workflows and has no shared backend,
bundled MCP server, telemetry or analytics. Jev Capability Advisor optionally
sends supplied task text and public capability cards to TypeSafe using your own
API key; offline candidate inspection needs no network or credentials.
Telegram Serverless uses the official CLI for authorized Telegram operations.
Deployments and remote tests send selected code, assets or test inputs to Telegram
and can change live data or send bot messages; installation alone starts none.
Canonical skill content remains maintained under
`skills/<category>/<skill>/`; this portable copy is generated and must not be edited
as a source.

Use `plugins/stark-ai-developer/` only with a client that supports the portable Agent Plugins contract.
Standalone skill installation remains available from the repository through
`npx skills@latest`.
