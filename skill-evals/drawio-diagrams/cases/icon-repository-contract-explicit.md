# Explicit Repository Icon Contract

## Prompt

```text
Use $drawio-diagrams to create `admin-runtime.drawio` for Admin UI -> API -> Job Queue -> Worker. Apply the supplied repository diagram icon contract from `diagram-icon-contract.md` and report any required fallback.
```

## Should Trigger

Yes

## Fixtures

- skill-evals/drawio-diagrams/fixtures/diagram-icon-contract.md

## Expected Behavior

- Inspect and apply the explicitly requested repository icon contract before selecting providers.
- Use the contract's mappings where available and a consistent labelled fallback where a mapping is absent.
- Do not infer that unrelated product-UI icon rules apply unless the referenced contract says so.
- Validate the editable `.drawio` output and report mappings and substitutions.

## Deterministic Assertions

- contains: diagram-icon-contract.md
- regex: mapping|contract
- regex: fallback|substitution
- contains: admin-runtime.drawio
- contains: validate_drawio.py
