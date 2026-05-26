# animated-readme-logo Eval Proof

This folder contains initial proof cases for the incubator `animated-readme-logo` skill.

## Promotion Rationale

- Clear routing: activates for README logo animation, profile README hero images, and README image compatibility.
- Safety value: prevents agents from recommending animated SVG-only README delivery without fallbacks.
- Accessibility value: requires reduced-motion static alternatives for animated README assets.
- Maintenance fit: guidance is mostly stable workflow plus small read-only helper scripts.

## Eval Set

Positive trigger cases:

- `cases/static-svg-logo.md`
- `cases/animated-gif-only.md`
- `cases/transparent-logo-requirement.md`
- `cases/lottie-readme-request.md`
- `cases/no-initial-asset.md`
- `cases/raster-source-transform.md`

Negative activation cases:

- `cases/ordinary-readme-edit-negative.md`
- `cases/app-animation-negative.md`

Use `rubric.md` to grade outputs. Passing outputs must separate README-safe delivery from optional web/demo animation, include accessibility fallbacks, and avoid private or internal examples.
