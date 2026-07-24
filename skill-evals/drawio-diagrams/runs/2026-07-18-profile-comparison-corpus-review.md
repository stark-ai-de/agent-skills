# 2026-07-18 Profile Comparison Validation Note

## Public scope

This note records only public regression outcomes for the draw.io profile-comparison contract. Private source files, provider provenance, screenshots, trajectories, and identifying corpus artifacts are not published here.

## Proof retained

- The comparison corpus grew from 100 to 102 draw.io cases and from 243 to 323 visual assertions across 21 visual cases.
- The comparison contract now checks stable component and boundary identities, labels, exact component-to-group membership, directed edge bindings and roles, native fallback identity, and embedded SVG bytes across all five profiles.
- Fixed light/dark SVG declarations, SVG/PNG canvas parity, nonblank dimensions, canonical decoded-pixel differences, static gallery references, and editable-source links are validated for every profile/theme artifact.
- The rasterization path is approval-gated, uses one explicit browser executable per comparison batch, recursively bounds embedded SVG inspection, rejects active or remote content, and preserves no-clobber output behavior.

## Limits

Deterministic checks prove artifact and semantic contracts, not nuanced visual quality. Profile readability, logo recognizability, layout quality, and detailed SVG/PNG composition still require the documented light/dark visual review. Animated SVG byte names remain intentionally nondeterministic.
