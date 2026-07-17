# Conditional Discovery Without Forced Wizard

## Prompt

```text
In Plan mode, use $drawio-diagrams to prepare an execution-ready plan for a small editable Client -> API -> Database diagram. The audience, scope, labels, theme, and output are already specified; do not interview me unless a real blocker remains, and do not write files while still in Plan mode.
```

## Should Trigger

Yes

## Expected Behavior

- Perform lightweight read-only tool discovery and produce an execution-ready plan without a mandatory setup wizard.
- Ask only about a missing choice that would materially change the result.
- Do not install tools, fetch assets, or configure MCP automatically.
- Name the safe authoring path, intended editable `.drawio` output, and later validation command without claiming that Plan mode already created the file.

## Deterministic Assertions

- contains: .drawio
- contains: validate_drawio.py
- regex: plan|would (?:create|validate)|execution
- regex: assumptions|specified inputs|no material ambiguity
