# Plugins

`plugins/stark-ai-developer/` is the generated Agent Plugins package that Codex
loads through `.agents/plugins/marketplace.json`. Do not hand-edit it, including
copies under `plugins/stark-ai-developer/skills/`.

[`stark-ai-developer.source.json`](stark-ai-developer.source.json) is a sibling
homemade source file, never inside the generated package. It keeps two jobs as
fields, not folders:

- membership: `id` (`codex`), `displayName`, `description`, `skills[]`, and
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
[ADR-0043](../docs/adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.short.md) ([Long, canonical](../docs/adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.long.md) · [Guide](../docs/adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.guide.md)).
The same validated membership produces three distinct outputs: the portable
projection under `plugins/stark-ai-developer/`, the OpenAI-native skills-only
archive under `dist/openai/` from ephemeral adapter staging, and optional
one-skill standalone archives under `dist/skills/`. Listing copy lives in
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
