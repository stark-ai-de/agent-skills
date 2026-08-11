# Unresolved Brand Peer Invariance

## Prompt

```text
Use $drawio-diagrams to update the supplied offline icon fixture. Add an unresolved brand named Acme Ledger while preserving the accepted embedded PostgreSQL logo exactly, including its original artwork and colors. Use a labelled semantic fallback for Acme Ledger only; do not replace, recolor, or simplify the resolved PostgreSQL peer.
```

## Should Trigger

Yes

## Split Family

icon-policy

## Fixtures

- skill-evals/drawio-diagrams/fixtures/offline-icon-before.drawio

## Expected Behavior

- Reuse the accepted embedded PostgreSQL bytes unchanged and keep its fixed aspect ratio.
- Add one labelled semantic icon for unresolved Acme Ledger, with a concise per-node substitution disclosure.
- Leave the resolved PostgreSQL peer's artwork, colors, source variant, and chip treatment untouched; fallback status must not trigger a global vendor-neutral or monochrome conversion.
- Avoid network lookup, installs, bulk downloads, and persistent caches while validating the editable result.

## Deterministic Assertions

- contains: offline-icon-before.drawio
- contains: PostgreSQL
- contains: Acme Ledger
- regex: per-node.{0,}(semantic )?fallback|semantic.{0,}fallback
- regex: resolved.{0,}(peer|logo)|keep.{0,}PostgreSQL
- regex: original.{0,}(artwork|colors)|without.{0,}(recolor|simplif)
- contains: validate_drawio.py
