# Official Logo Preference

## Prompt

```text
Use $drawio-diagrams to create `official-integrations.drawio` with GitHub, PostgreSQL, Redis, and a generic message queue. Prefer the official logo or native service stencil for each named brand; use a semantic queue icon only for the genuinely generic queue. Keep the source editable and self-contained.
```

## Should Trigger

Yes

## Split Family

icon-policy

## Expected Behavior

- Resolve an official organization, product, or service mark (or the native service stencil) before considering a generic glyph for a named component.
- Keep the generic message queue as a labelled semantic icon because it has no named brand to resolve.
- Use a labelled semantic icon only for a named node that remains unresolved, and disclose that per-node substitution rather than replacing resolved peers.
- Embed selected external SVGs, preserve their source artwork and original brand colors, and validate the editable source.

## Deterministic Assertions

- contains: official-integrations.drawio
- regex: official.{0,}(logo|mark)|native.{0,}stencil
- regex: semantic.{0,}(queue|fallback|unresolved)
- regex: original.{0,}(artwork|brand colors)|preserve.{0,}(artwork|brand colors)
- contains: validate_drawio.py
