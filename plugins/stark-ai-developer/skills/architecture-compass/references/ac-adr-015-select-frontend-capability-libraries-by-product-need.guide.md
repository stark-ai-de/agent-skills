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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-30
Gist: Add a frontend library only when its owned capability and lifecycle value exceed native and existing-stack complexity.

Variants: [Short](ac-adr-015-select-frontend-capability-libraries-by-product-need.short.md) · [Long, canonical](ac-adr-015-select-frontend-capability-libraries-by-product-need.long.md) · **Guide**

## Implementation guide

This guide is non-normative. The packages below are current candidates, not mandatory defaults.

### Capability map

- **Validation:** Zod 4 is suitable for shared runtime schemas at external and trust boundaries. For Next.js environment separation, T3 Env is optional when its build model fits. Avoid parsing already-trusted internal values repeatedly.
- **Dates:** Begin with a target-runtime matrix for `Date`, `Intl`, and Temporal. Add Luxon or another maintained library only when required timezone/calendar/arithmetic semantics and compatibility justify it.
- **Forms:** Use native forms, Server Actions, and React form primitives for simple flows. React Hook Form is suitable for client-heavy, dynamic, or reusable complex forms; it does not replace server validation or authorization.
- **URL state:** nuqs is suitable for typed, bookmarkable query state in supported React frameworks. Keep ephemeral local state local and domain read parameters in the read contract.
- **Internationalization:** evaluate a maintained Next.js integration such as next-international or another target-approved package only after locale routing, catalogs, fallback, server/client loading, and SEO behavior are decided.
- **UI/styling:** shadcn/ui can seed source-owned components when its current React, Tailwind, and registry model fits. Tailwind is one styling option, not an automatic migration requirement.
- **Data grids:** TanStack Table is appropriate for substantial headless table behavior; semantic HTML is enough for static tables.
- **Motion:** use CSS first. The current `motion` package is suitable for gestures and orchestrated runtime animation when needed; respect reduced motion.
- **Charts and email:** Recharts is a conditional React charting choice. React Email is a conditional source model for email rendering; test generated output across supported clients.

For each adopted package, pin a supported range through the repository package manager, note the owning subsystem, add representative tests, and record replacement criteria. Do not add all candidates to a starter automatically.

### Stack-deviation comparison

Before adding or replacing a frontend capability library, record:

| Existing or accepted option | Required capability | Evidence-backed gap           | Candidate     | Chosen option            | Docs/ADR impact              | Validation        |
| --------------------------- | ------------------- | ----------------------------- | ------------- | ------------------------ | ---------------------------- | ----------------- |
| `<native/current option>`   | `<needed behavior>` | `<gap or "not insufficient">` | `<candidate>` | `<current or candidate>` | `<none, docs, or local ADR>` | `<focused proof>` |

Prefer native, framework, and existing repository capability when it satisfies the requirement. If the evidence-backed gap is `not insufficient`, reject the extra library and continue only with the authorized bounded change. If the chosen option creates a durable deviation from an accepted target rule, stop the affected implementation and use the target repository's ADR change or successor process; AC-ADR-046 ranks the evidence but grants no write authority.

## Official sources

- [Zod](https://zod.dev/)
- [Temporal documentation](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Temporal)
- [React Hook Form](https://react-hook-form.com/get-started)
- [nuqs](https://nuqs.dev/)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TanStack Table](https://tanstack.com/table/latest/docs/introduction)
- [Motion](https://motion.dev/docs/react)
- [Recharts](https://recharts.github.io/en-US/guide/)
- [React Email](https://react.email/docs/introduction)
