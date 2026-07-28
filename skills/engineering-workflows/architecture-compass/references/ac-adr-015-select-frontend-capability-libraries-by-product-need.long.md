# AC-ADR-015: Select Frontend Capability Libraries by Product Need

ID: AC-ADR-015
Title: Select Frontend Capability Libraries by Product Need
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: frontend
Tags: validation, dates, forms, url-state, internationalization, ui, styling, tables, animation, charts, email
Applies when: Choosing validation, date/time, form, URL-state, internationalization, UI, styling, table, animation, chart, or email-rendering capabilities.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Add a frontend library only when its owned capability and lifecycle value exceed native and existing-stack complexity.

Variants: [Short](ac-adr-015-select-frontend-capability-libraries-by-product-need.short.md) · **Long, canonical** · [Guide](ac-adr-015-select-frontend-capability-libraries-by-product-need.guide.md)

## Context

A preferred-stack list can turn useful libraries into universal mandates. That increases client JavaScript, overlapping abstractions, upgrade surface, and inconsistent ownership. Conversely, rebuilding complex accessibility, form, internationalization, table, or time semantics ad hoc creates its own risk. Selection must begin with the product capability and boundary.

## Decision

### Apply one selection test

Before adding or standardizing a frontend capability library, document:

1. the user or system capability and the complexity native/framework features cannot meet;
2. the server, build, client, email, or shared-code boundary that owns it;
3. target browser/runtime and rendering compatibility;
4. accessibility, localization, security, privacy, and performance requirements;
5. API maturity, maintenance health, license, dependency and supply-chain impact;
6. integration with the existing design system, tests, compiler, bundler, and deployment;
7. source-code ownership or upgrade model, exit path, and responsible maintainer.

Prefer existing repository and platform capability when it meets this test. A library can be selected for a subsystem without becoming a repository-wide default.

### Keep validation and dates at their boundaries

Runtime schemas protect untrusted inputs, network/storage payloads, configuration, tool contracts, and other boundary data. They are reused when the same semantic contract truly crosses boundaries, but UI-only field state is not forced into a global schema package without benefit. Static TypeScript types remain complementary.

Date/time selection is driven by timezones, calendars, locale formatting, parsing guarantees, arithmetic, recurrence, serialization, and runtime support. Native `Date`/`Intl` or Temporal may be sufficient; a library is selected when it improves correctness and readability for the actual target matrix. Internal instants and wire formats remain unambiguous regardless of display library.

### Select interaction libraries for real complexity

- Native forms, framework form handling, and server-owned commands are preferred for simple forms. A client form-state library is justified by substantial dynamic fields, complex validation UX, controlled inputs, performance, or reusable form composition.
- URL-state tooling is used when state must be bookmarkable, shareable, navigable, or server-readable. It is not a cure for ordinary component-state ownership or prop drilling.
- Internationalization is an architecture decision covering locale routing/detection, catalog ownership, fallback, formatting, server/client loading, metadata/SEO, and translation workflow. A package follows that decision.
- A headless table engine is justified by sorting, filtering, selection, virtualization, pagination, or other data-grid behavior, not by static semantic tables.

### Own presentation capability

A component baseline and styling system are selected together with token, theme, variant, accessibility, and distribution ownership. Source-registry components become maintained repository source: local modifications, dependency updates, security fixes, and upstream reconciliation are the repository's responsibility. Shared UI belongs behind a stable public package boundary only when multiple consumers need it.

Use semantic HTML and CSS for layout, hover, focus, transitions, keyframes, and reduced-motion behavior where possible. JavaScript animation is introduced for runtime measurement, gesture orchestration, shared layout, sequencing, or physics. Charting is selected based on required chart types, data scale, accessibility fallback, interaction, responsiveness, and export needs. Email components belong to a dedicated rendering/test pipeline because email-client support differs from the web.

## Consequences

Package choices become conditional and explainable, reducing blanket dependencies while retaining specialized tools where they provide real value. Teams must maintain a small capability record instead of copying a fixed list.

## Validation

- Compare the chosen library with native, existing-stack, and at least one viable alternative against the capability test.
- Measure client bundle and rendering impact for browser libraries.
- Test server/client/build boundary compatibility and prevent server-only code from entering client bundles.
- Run automated accessibility checks plus keyboard and assistive-technology scenarios for interactive components.
- Test locale, timezone, reduced-motion, empty/loading/error, large-data, and email-client cases relevant to the selected capability.
- Verify dependency removal or replacement is bounded by owned adapters where portability matters.
