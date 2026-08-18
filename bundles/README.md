# Bundles

Bundles are explicit, version-controlled allowlists of canonical public skills. They are distribution inputs, not additional author-maintained skill sources or plugin packages.

Each manifest records an identifier, display metadata, an ordered list of canonical skill sources, and the distribution names used by downstream consumers. Generated projections use the same membership; they must not become a second source of truth.

The repository currently defines [`codex.json`](codex.json) for the six-skill **stark AI Developer** distribution. Its `id` and `skillsCliAgent` remain `codex` because they identify the existing Codex install target; `displayName` identifies the public distribution.

Portable Agent Plugins packages and client-native adapters follow [ADR-0043](../docs/adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.short.md) ([Long, canonical](../docs/adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.long.md) · [Guide](../docs/adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.guide.md)). This repository's `bundle.schema.json` validates bundle manifests. Generated Agent Plugins `plugin.json` files use the official [Agent Plugins 1.0.0 schema](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json) separately.

## Update a bundle

1. Add or remove an explicit `skills` entry.
2. Keep `name` equal to the canonical `SKILL.md` frontmatter name.
3. Keep `source` under the public root `skills/`; never select incubator, Cursor operations, or Claude operations content for a Codex distribution.
4. Keep entries in the documented install order.
5. Update product routing, plugin evaluation cases, plugin version, release notes, and listing capabilities when public behavior changes.
6. Run:

```bash
npm run validate:bundles
```

The validator checks the manifest schema, canonical source boundaries, skill names, filesystem safety, and the README Codex install command.
