# Short Discovery For An Ambiguous Architecture Review

## Prompt

```text
Use $drawio-diagrams to make an editable architecture diagram for this repository and make it useful for our upcoming review.
```

## Should Trigger

Yes

## Expected Behavior

- Inspect repository evidence before asking questions.
- If ambiguity remains material, ask no more than three grouped questions covering audience and decision, view and state, and output or privacy constraints.
- Do not ask about icon or animation defaults unless the user wants to override them.
- Offer a sensible default and continue once the material boundary is known.

## Deterministic Assertions

- regex: audience|decision
- regex: current|target|state
- regex: repository|source|evidence
