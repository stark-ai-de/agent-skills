# stark AI Developer

portable Agent Plugin generated from the explicit `plugins/stark-ai-developer.source.json` allowlist.

This package contains 11 developer workflows. It also bundles a local SSH management MCP and background API. Node 24.18 or newer is required. Run `node runtime/cli.mjs help` for local setup. No SSH connection is opened until a specific approved target is requested. Credentials and grants are configured locally; MCP tools cannot grant permissions or submit credentials. State uses the native operating-system user's state directory and remains separate between Windows and WSL. Terminal sessions belong to the daemon, independently of the agent process. No telemetry or analytics is bundled.
Jev Capability Advisor optionally
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
