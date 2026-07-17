# Backup Before Overwrite

## Prompt

```text
Use $drawio-diagrams to update an existing production architecture.drawio in place, but make sure I can recover the original if anything goes wrong.
```

## Should Trigger

Yes

## Split Family

basic-export

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/example-clean.drawio

## Expected Behavior

- Read the existing diagram before editing.
- Create a backup or alternate output before overwriting the original.
- Keep the final change narrowly scoped.
- Validate the edited `.drawio` file.

## Deterministic Assertions

- contains: backup
- contains: .drawio
- contains: validate_drawio.py
