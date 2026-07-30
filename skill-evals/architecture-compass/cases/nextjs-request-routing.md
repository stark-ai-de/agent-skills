# Next.js Request Boundary Routing

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to plan an authenticated, tenant-aware Next.js 16 App
Router search screen. Its Server Component reads `params`, `searchParams`,
`cookies()`, and `headers()`, while browser and external consumers need a public
HTTP endpoint. The otherwise static shell also contains one quota widget that
must intentionally execute at request time. The screen has cached reads, a
validated write, and a realtime freshness overlay. Select the minimum governing
ADRs, state the request-boundary rules, and do not implement anything.

## Deterministic Assertions

- contains: AC-ADR-008
- contains: AC-ADR-009
- contains: AC-ADR-010
- contains: AC-ADR-017
- contains: await params
- contains: await searchParams
- contains: await cookies()
- contains: await headers()
- contains: connection()
- contains: trusted source
- contains: public transport boundary
- not_contains: Route Handler for every Server Component read
- not_contains: connection() on every route

## Expected Behavior

- Route through the catalog and the Short variants, then load the canonical
  Long variants for AC-ADR-008/009/010/017 and only their relevant Guides.
- Treat Next.js 16 request APIs as asynchronous and show every requested API as
  awaited before use.
- Read trusted data directly from the Server Component by default. Use a Route
  Handler only as the public transport boundary needed by browser or external
  consumers, rather than adding an internal HTTP hop for the Server Component.
- Use `connection()` only for the quota widget's intentional request-time
  execution when no earlier request API already makes that boundary dynamic.
- Keep the turn read-only and connect rendering, cached reads, validated
  commands, and realtime freshness to their owning ADRs without declaring a
  universal Next.js stack default.
