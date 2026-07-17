# Animation Default And Opt Out

## Prompt

```text
Create two editable draw.io request-flow diagrams: the default animated version and a separate static version because I explicitly opt out of connector animation for that copy.
```

## Should Trigger

Yes

## Expected Behavior

- Animate directed runtime and data-flow connectors in the default diagram with native `flowAnimation=1` styles.
- Keep associations, dependencies, containment, annotations, and other structural edges static.
- Remove or disable flow animation in the opt-out copy.
- Validate the animated file with `--animation on` and the static file with `--animation off`.

## Deterministic Assertions

- contains: flowAnimation=1
- contains: --animation on
- contains: --animation off
