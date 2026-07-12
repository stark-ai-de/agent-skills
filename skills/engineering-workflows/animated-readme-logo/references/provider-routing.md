# Provider Routing

Use this reference for `create` tasks and whenever external image generation is proposed.

## Eligibility

Consider Recraft only for a new mark or an intentional redesign that does not require reference-media fidelity.

Do not use Recraft for:

- `review` work;
- a clean existing SVG;
- faithful transformation or cleanup of an existing mark;
- a request that needs an input image, exact identity preservation, or other reference media;
- animation/export work that already has an acceptable source.

## Live preflight

1. Detect whether a live Higgsfield MCP generation capability is callable in the current session.
2. Query live availability for the exact model identifier `recraft_v4_1`.
3. Obtain the exact current cost for this batch from the live capability. Do not infer availability or cost from documentation, examples, memory, or a prior run.
4. Use `unavailable` when the live surface conclusively lacks the capability or exact model. Use `indeterminate` when capability, model, or exact cost cannot be queried reliably. Take the local route in either state.
5. Sanitize the prompt: include only public product/brand facts needed to design the mark. Remove secrets, private paths, internal hosts, hidden metadata, and unrelated repository content.
6. Present the sanitized brief, exact live cost, and these fixed settings:

```text
model: recraft_v4_1
model_type: utility_vector
resolution: 1k
aspect_ratio: 1:1
count: 1
background_color: null
```

Use `model_type: vector` only when the brief explicitly calls for a more expressive mark; explain that choice in the preflight.

7. Ask for explicit approval of that exact one-output batch. A general request to create a logo, approval from before the live cost check, or approval of a different batch is insufficient.
8. Stop with `Approval state: pending` until the user approves. Make no credit-consuming call.

## Approved generation

- Recheck live availability and cost if the prior preflight may have gone stale. If cost or settings changed, present the new preflight and request approval again.
- Generate only the approved batch.
- Treat the returned image as design input. Inspect it for readability, simple geometry, transparency intent, and brand fit, then author a self-contained SVG and validate that SVG locally.
- Do not imply that a provider result is an editable or validated SVG unless the actual file passes the strict validator.
- If the batch fails, report the failure and do not retry or spend more credits without a new live preflight and approval. Continue with the local route when the user still wants the logo.

## Local fallback

Use direct local SVG authoring when the provider is ineligible, unavailable, indeterminate, declined, or lacks a live cost. Do not treat fallback as degraded completion: it must meet the same SVG and motion contracts.

Use `drawio-diagrams` only when the mark is geometric and an editable diagram-style construction materially helps. Otherwise write a minimal self-contained SVG directly.
