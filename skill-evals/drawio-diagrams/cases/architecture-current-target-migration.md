# Current And Target Migration Architecture

## Prompt

```text
Show the current monolith and the proposed service split in one editable draw.io file for an architecture review. Reviewers need to understand the differences and migration dependencies.
```

## Should Trigger

Yes

## Split Family

architecture-current-target

## Expected Behavior

- Separate current and target state by pages or clearly labelled parallel lanes.
- Never present proposed components as already deployed.
- Show only the migration dependencies needed to explain the transition.
- Encode state with text or shape semantics as well as color.

## Deterministic Assertions

- contains: Current
- contains: Target
- regex: proposed|planned
- contains: migration
