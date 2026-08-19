# README Audit Safety

Use this reference when inspecting local image references in README markup.

## Boundary

Declare a repository root and pass the README as a root-relative path:

```bash
node scripts/audit-readme-logo-assets.mjs --root . --readme README.md
```

Treat the README path and every local `src`, `srcset`, or Markdown image target as untrusted input.

Accept a local reference only when all of these are true:

- it is a relative filesystem path;
- normalization does not traverse above the declared root;
- it is not POSIX absolute, Windows drive-absolute, or UNC/network syntax;
- query and fragment suffixes are removed only for filesystem resolution, not to reinterpret a remote URL as local;
- the resolved file and every followed symlink stay inside the canonical root;
- the target is a regular file when an asset read is attempted.

Reject and report the reference without opening it when any check fails. Do not silently rewrite an unsafe reference into an allowed path.

Root-bounded `..` segments from a nested README are valid only when component-wise and canonical resolution remains inside the declared root. Preserve component order while walking: never collapse `symlink/..` lexically before checking the symlink target. Inline, angle-bracket, balanced-parenthesis, full/collapsed/shortcut reference images, HTML `src`, and candidate-wise `srcset` values receive the same boundary checks. Code examples and HTML comments are not live image references.

For the supported README contract, each `<source>` uses exactly one bare URL in `srcset`; `src` on `<source>` is inert and rejected. Descriptors and multi-candidate `srcset` values are outside this deterministic contract. A `<picture>` contains exactly one final `<img>`, every `<source>` precedes it, and the fallback has a non-empty `src` or single-bare-URL `srcset`, alt text, and positive-integer `width` and `height`. Nested or unclosed `<picture>` markup fails closed. Candidates or ancestors hidden with the HTML `hidden` attribute or obvious inline visibility/opacity styles cannot satisfy readiness.

## Read-only behavior

The audit may read the declared README and root-bounded referenced assets. README and inspected SVG content are capped at 5 MiB, image/reference counts are bounded, and raster animation checks use the bundled structural inspector. It must not create, rewrite, delete, rename, chmod, or stage files. It may report remote HTTP(S) and data URLs as remote or embedded without fetching them.

## Report

For each local or rejected reference, report its source location, normalized root-relative path when safe, and any compatibility risk. Verify the SVG with the bundled strict validator and distinguish static from animated GIF/PNG/APNG/WebP content. A reduced-motion source must be verified static, precede animated candidates, and retain a verified-static final `<img>` fallback.

Summarize rejected absolute, UNC, root-escaping traversal, missing, or symlink-escaping references separately. Never print the canonical root or raw filesystem errors. Exit `0` means clean, `1` means compatibility/readiness findings, and `2` means unsafe input or a path-boundary rejection.
