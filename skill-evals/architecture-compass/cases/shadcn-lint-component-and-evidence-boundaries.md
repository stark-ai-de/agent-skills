# Shadcn Lint Component and Evidence Boundaries

## Should Trigger

Yes.

## Prompt

Qualify the all-six profile for shared primitives and app consumers. CardTitle may change typography except font utilities; containers allow spacing; Avatar permits size-* only. Primitive definitions use three narrow overrides. The team proposes excluding the entire UI package, allowing all --* style properties, and treating a green lint as accessibility proof.

## Deterministic Assertions

- contains: no-restyle
- contains: no-arbitrary-values
- contains: require-static-classes
- contains: no-raw-colors
- contains: no-inline-styles
- contains: no-unknown-classes
- contains: positive
- contains: negative
- contains: accessibility
- contains: component definitions
- contains: separate

## Expected Behavior

Keep all six checks for consumers. Disable only the three documented checks in verified primitive-definition paths, retaining the other three. Exercise allowed placement, typography, spacing, size and tokens against forbidden padding, font overrides, raw color, arbitrary appearance, inline padding, unknown classes and unreadable component class construction. Do not add a blanket custom-property allowance that bypasses color checking. Config-print and registration evidence are insufficient; keep static, local, CI, visual and accessibility claims separate.

## Evidence Stage

source/static: this is an agent-behavior evaluation contract, not a recorded
agent run or an executed plugin/runtime qualification. Structural validation
checks its inventory and assertions; target adoption requires separate evidence.
