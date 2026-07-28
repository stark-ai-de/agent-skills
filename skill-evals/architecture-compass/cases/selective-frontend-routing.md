# Selective Frontend ADR Routing

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to plan a read-only Next.js dashboard screen. It reads
existing data and has no write, worker, AI, mobile, or database-selection work.
Select only the ADRs needed to decide rendering, client caching, accessibility,
and measurable performance. Do not implement it.

## Deterministic Assertions

- contains: AC-ADR-008
- contains: AC-ADR-009
- contains: AC-ADR-024
- contains: AC-ADR-025
- not_contains: AC-ADR-011
- not_contains: AC-ADR-016
- not_contains: AC-ADR-017

## Expected Behavior

- Use catalog metadata and Short variants to select the relevant frontend ADRs.
- Load the selected Long variants for the decision and only the Guides needed
  for concrete Next.js, query, accessibility, or measurement help.
- Do not load unrelated backend, AI, data-platform, mobile, or desktop ADRs.
- Keep the turn read-only and return pending/not-requested lifecycle statuses.
