# Bundles

Bundles are explicit, version-controlled allowlists of canonical public skills. They are distribution inputs, not additional author-maintained skill sources.

The Codex bundle is defined in [`codex.json`](codex.json). It currently contains the six reviewed skills used by the direct Codex install command and the planned **stark AI Developer** plugin distributions.

[ADR-0043](../docs/adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.short.md) ([Long, canonical](../docs/adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.long.md) · [Guide](../docs/adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.guide.md)) requires one portable Agent Plugins projection plus separate generated adapters for client formats that cannot share the portable root contract.

## Update a bundle

1. Add or remove an explicit `skills` entry.
2. Keep `name` equal to the canonical `SKILL.md` frontmatter name.
3. Keep `source` under the public root `skills/`; never select `incubator/skills/`, Cursor operations, or Claude operations for the Codex bundle.
4. Update product routing, plugin evaluation cases, plugin version, release notes, and listing capabilities when the public plugin behavior changes.
5. Run:

```bash
npm run validate:bundles
```

The validator also proves that the README Codex install command contains exactly the bundle's ordered skill names.
