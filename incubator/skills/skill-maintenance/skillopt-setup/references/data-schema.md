# Data Schema

`prepare-skillopt-split.mjs` converts `skill-evals/<skill>/cases/*.md` into split JSON under `.agents/skillopt-work/<skill>/data/`. It also writes `.agents/skillopt-work/<skill>/data-text-only/`; when visual assertions exist, that companion split filters out those cases while preserving the full split's train, validation, and test membership.

Each item has this shape:

```json
{
  "id": "codex-spec-interviewer/fuzzy-refactor-request",
  "skill_name": "codex-spec-interviewer",
  "case_path": "skill-evals/codex-spec-interviewer/cases/fuzzy-refactor-request.md",
  "prompt": "We need to clean up the billing integration...",
  "expected_behavior": ["Ask targeted clarification only where repo inspection cannot answer."],
  "rubric_path": "skill-evals/codex-spec-interviewer/rubric.md",
  "fixtures": [],
  "split_family": "case:fuzzy-refactor-request",
  "split_group": "sha256:...",
  "expected_artifacts": [],
  "deterministic_assertions": ["contains: implementation spec"],
  "visual_assertions": [],
  "tags": ["positive"],
  "should_trigger": true,
  "workspace_policy": "text-only",
  "source_hash": "sha256:..."
}
```

## Parsing Rules

- Extract `prompt` from `## Prompt`.
- Derive `id` from the case basename and fail before writing generated data unless basenames are unique lowercase kebab-case within one skill.
- Extract expected behavior bullets from `## Expected Behavior`.
- Extract fixture paths from `## Fixture` or `## Fixtures`; require trimmed, repository-relative POSIX paths and reject absolute paths, URI schemes, traversal, backslashes, pipe delimiters, and control characters before writing output.
- Extract an optional lowercase kebab-case `## Split Family`; otherwise derive a stable family label from normalized fixture paths or the case ID.
- Emit `split_group` as the stable component identity used by the allocator. Explicit families and every normalized shared fixture path form transitive relationships, so aliases such as `./fixtures/input.md` and `fixtures/input.md` cannot leak connected cases across splits.
- Extract expected artifact paths from `## Expected Artifact` or `## Expected Artifacts`; otherwise link shared files under `skill-evals/<skill>/expected/` when present.
- Extract deterministic checks from `## Deterministic Assertions`.
- Extract generated-artifact checks from `## Visual Assertions`.
- Preserve `Should Trigger Yes/No` when present.
- Link `rubric.md` and `expected/` artifacts when present.
- Exclude raw run transcripts from generated JSON.
- Put activation-only negative cases in `.agents/skillopt-work/<skill>/activation/negative-cases.json`; freshness checks their IDs, case paths, and source hashes as well as positive split items.
- Set `workspace_policy` to `text-only` when the case has no active visual assertions, or to `isolated-artifact-write` when a visual case requires bounded writes inside its temporary rollout workspace. This field describes the enforced case policy; it never authorizes legacy broad `workspace-write` execution.

Default split policy starts from 60 percent train, 20 percent validation, 20 percent test, seed 42. Custom ratios must each be positive; the seed must be an unsigned 32-bit integer. Cases connected transitively by an explicit split family or any normalized shared fixture stay together so related variants and shared evidence cannot cross split boundaries. Readiness and the data loader's actual setup path reject any `split_group` or `split_family` that appears in more than one split. The group-aware dynamic-programming allocator first preserves the documented held-out floors whenever indivisible group sizes make them feasible, then maximizes feasible visual-case coverage in validation and test, and finally minimizes distance from the requested ratios. This avoids post-hoc swaps: at least 3 validation and 3 test cases remain required for exploratory-quality data, and at least 5 validation and 5 test cases for official-parity-candidate data.

Supported deterministic assertion prefixes are:

- `contains: <text>`
- `not_contains: <text>`
- `regex: <pattern>`
- `section: <heading>`
- `path: <repo-relative path>`

When deterministic assertions are present, the local evaluator checks them before semantic LLM judging. A failed deterministic assertion fails the item without relying on the LLM judge.

Supported visual assertion prefixes are:

- `artifact_exists: <glob>`
- `png_dimensions: <glob> min_width=<px> min_height=<px>`
- `png_nonblank: <glob> [min_size=<bytes>]`
- `svg_valid: <glob>`
- `svg_has_flow_animation: <glob>`
- `svg_contains: <glob> <text>`
- `svg_not_contains: <glob> <text>`
- `svg_self_contained_images: <glob>`
- `drawio_valid: <glob> [animation_on=1|animation_off=1] [adaptive_colors=1] [min_pages=N] [min_native_stencils=N] [self_contained_svg=1] [uncompressed=1]`
- `drawio_embeds_svg_sha256: <glob> <64-lowercase-hex> [cell=stable-id]`
- `drawio_graph: <glob> [page=URL-encoded-name] [ids=id,...] [native_ids=id,...] [edges=source>target,...] [not_edges=source>target,...] [edge_roles=edge-id:role,...] [profile_styles=URL-encoded-cell-id:styleKey:styleValue,...] [links=https://...]`
- `drawio_self_contained_svg: <glob>`

Visual assertions are evaluated against atomically captured, size-bounded PNG, SVG, and generated `.drawio` artifacts from the isolated rollout workspace. The rollout harness parses artifacts itself and never executes validators copied from the target skill; copied helper and fixture directories are pruned before collection. `svg_self_contained_images` requires a valid exported SVG with at least one validated embedded SVG image and no external or unsupported image references. `drawio_valid` can require page count, animation state, native stencil count, uncompressed XML, self-contained embedded SVG images, and artifact-wide adaptive colors. `adaptive_colors=1` requires every page to set `mxGraphModel adaptiveColors="auto"`; it has no page-scoped form. The two animation options are mutually exclusive, including across separate assertions for the same artifact glob. `drawio_embeds_svg_sha256` proves that every matching valid source embeds the exact decoded SVG bytes identified by the digest and can bind that digest to a stable cell ID. `drawio_graph` can scope graph invariants to a URL-encoded page name, bind stable cells to native stencils or semantic edge roles, and verify URL-encoded `profile_styles` only on visible vertex cells marked with a nonempty `designProfile`; the cell and its ancestors must be visible and its finite width and height must be positive. Without `page=`, all requested profile mappings must occur together on at least one page rather than being combined across pages. Profile style IDs follow the normal graph-ID rules; at most 128 mappings are allowed, and each decoded value is limited to 2048 control-free characters. Allowed profile-style keys are `designProfile`, `shape`, `dataRole`, `strokeColor`, `fillColor`, `gradientColor`, `gradientDirection`, `shadow`, `glass`, `arcSize`, `strokeWidth`, `fontColor`, `fontSize`, and `profileRole`. `drawio_self_contained_svg` is the concise strict check for a valid, uncompressed, self-contained source diagram with at least one validated embedded SVG image. These assertions are intended for artifact-generating eval environments where draw.io Desktop export is available; if required artifacts are missing, the item fails deterministically. Readiness reports these cases through `visualArtifactReadiness`; when `drawio`/`diagrams.net` is unavailable and `visual_eval_policy` is `auto`, the active config should point at `data-text-only` and report `text_only_ready`.

Markdown punctuation escapes in artifact globs are decoded before matching, so formatter output such as `\*.png` retains the wildcard meaning of `*.png` in both JavaScript and Python evaluators.
