# Plugins

`plugins/stark-ai-developer/` is the generated Agent Plugins package that Codex
loads through `.agents/plugins/marketplace.json`. Do not hand-edit it, including
copies under `plugins/stark-ai-developer/skills/`.

[`stark-ai-developer.source.json`](stark-ai-developer.source.json) is a sibling
homemade source file, never inside the generated package. It keeps two jobs as
fields, not folders:

- membership: `id` (`codex`), `displayName`, `description`, `skills[]`, `mcp[]`, and
  `distributions`
- plugin identity: `pluginId`, `version`, `listingId`, `submissionType`,
  `publicListingStrategy`, `outputs`, `contractSnapshots`, and `build`

`$schema` points at the colocated
[`stark-ai-developer.source.schema.json`](stark-ai-developer.source.schema.json).
Generated `plugin.json` files use the official
[Agent Plugins 1.0.0 schema](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json);
the offline pin lives under `scripts/vendor/agent-plugins/1.0.0/`.

Membership is an explicit, version-controlled allowlist of canonical public
skills. Category membership and directory discovery do not add skills.
Canonical skills remain under `skills/<category>/<skill>/`. The `id` and
`skillsCliAgent` remain `codex` because they identify the existing Codex
install target; `displayName` identifies the public distribution.

Portable Agent Plugins packages and client-native adapters follow
[ADR-0070](../docs/adrs/0070-consume-pinned-ssh-runtime-artifacts-from-an-independent-repository.short.md) ([Long, canonical](../docs/adrs/0070-consume-pinned-ssh-runtime-artifacts-from-an-independent-repository.long.md) · [Guide](../docs/adrs/0070-consume-pinned-ssh-runtime-artifacts-from-an-independent-repository.guide.md)).
Canonical SSH sources belong to
[`stark-ai-de/ssh-manager`](https://github.com/stark-ai-de/ssh-manager).
This repository consumes a reviewed runtime artifact under
`vendor/ssh-manager/runtime`, pinned by producer revision, runtime version and
manifest digest. `mcp[].targets` explicitly selects its distributions. The same
validated membership produces the portable projection under
`plugins/stark-ai-developer/`, the OpenAI-native harness-first archive under
`dist/openai/` from ephemeral adapter staging, optional one-skill standalone
archives under `dist/skills/`, and a Claude-native local MCP archive under
`dist/claude/`. The public OpenAI archive stays skills-only.

To update the runtime, review the producer revision and artifact manifest digest,
then run `node scripts/ssh/import-artifact.mjs <runtime-directory> <reviewed-pin.json>`.
The pin JSON contains `version`, `sourceRepository`, `sourceCommit` and
`manifestSha256`; import verifies the complete payload before replacing it.
`pnpm run build:ssh` verifies and copies the pinned artifact rather than rebuilding
producer sources. Run `pnpm run sync:agent-plugin` to regenerate the portable
projection, then `pnpm run validate:ssh` and `pnpm run validate:projections`.
Generation is offline and installs no dependencies at MCP startup.
`pnpm run package:claude-plugin` independently copies the selected runtime and
removes its native staging. See [local SSH setup](../README.md#local-ssh-management)
for trust, capabilities and lifecycle. Listing copy lives in
`docs/listing/openai/`. First-publication portal observations live in
`docs/listing/openai/stark-ai-developer-first-publication.md`. Catalog version
stays in `package.json`; plugin version stays in this sibling source file.

## Update membership or identity

1. Edit [`stark-ai-developer.source.json`](stark-ai-developer.source.json).
2. Keep `name` equal to the canonical `SKILL.md` frontmatter name.
3. Keep `source` under the public root `skills/`; never select incubator,
   Cursor operations, or Claude operations content for a Codex distribution.
4. Keep entries in the documented install order.
5. Update product routing, plugin evaluation cases, plugin version, release
   notes, and listing capabilities when public behavior changes.
6. After a bundled-skill or membership change, run `npm run sync:agent-plugin`.
7. Run:

```bash
npm run validate:bundles
```

The validator checks the source schema, canonical source boundaries, skill
names, filesystem safety, and the README Codex install command.
