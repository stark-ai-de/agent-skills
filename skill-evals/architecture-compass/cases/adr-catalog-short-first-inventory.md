# ADR Catalog Short-First Inventory

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to give a maintainer a human-readable inventory of the
available guardrails. Do not plan or implement a target-repository change. Start
from the ADR catalog and use only the summaries needed for this inventory.

## Deterministic Assertions

- contains: references/adr-catalog.md
- contains: Short
- contains: Execution status: not requested
- not_contains: loaded all Long ADRs
- not_contains: loaded all Guides

## Expected Behavior

- Open `references/adr-catalog.md` and use its Short links for the inventory.
- Group the result by scope and category and expose tags and `Applies when` cues.
- Do not load every Long or Guide variant merely to summarize the library.
- State that Long is canonical and Guides are optional implementation help.
- Return `Execution status: not requested` without a write continuation.
