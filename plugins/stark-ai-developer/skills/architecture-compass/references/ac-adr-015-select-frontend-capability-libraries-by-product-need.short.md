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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-30
Gist: Add a frontend library only when its owned capability and lifecycle value exceed native and existing-stack complexity.

Variants: **Short** · [Long, canonical](ac-adr-015-select-frontend-capability-libraries-by-product-need.long.md) · [Guide](ac-adr-015-select-frontend-capability-libraries-by-product-need.guide.md)

## Decision summary

- Define the required capability, owning layer, accessibility contract, runtime boundary, bundle budget, and maintenance owner before naming a library.
- Prefer platform, framework, and already-adopted repository capabilities when they satisfy the requirement. Do not install a library merely to standardize trivial code.
- Validate untrusted or cross-boundary data at the boundary; TypeScript types alone are not runtime validation.
- Choose date/time tools from actual timezone, calendar, locale, arithmetic, serialization, and target-runtime needs. No date library is a blanket default.
- Use specialized form, URL-state, i18n, table, animation, chart, and email libraries only for the complexity they are designed to own.
- Source-distributed UI components become repository-owned code and require accessibility, update, security, and styling governance.
- Keep CSS-first interactions in CSS. Use JavaScript animation only for measurement, gesture, sequencing, or physics needs that CSS cannot express clearly.
- Record package names and current APIs in Guide/config, while durable capability and exit criteria remain canonical.

Apply [AC-ADR-024](ac-adr-024-meet-an-explicit-accessibility-baseline-with-automated-and-manual-proof.short.md) ([Long, canonical](ac-adr-024-meet-an-explicit-accessibility-baseline-with-automated-and-manual-proof.long.md) · [Guide](ac-adr-024-meet-an-explicit-accessibility-baseline-with-automated-and-manual-proof.guide.md)) and [AC-ADR-025](ac-adr-025-set-measurable-performance-budgets-and-optimize-from-evidence.short.md) ([Long, canonical](ac-adr-025-set-measurable-performance-budgets-and-optimize-from-evidence.long.md) · [Guide](ac-adr-025-set-measurable-performance-budgets-and-optimize-from-evidence.guide.md)).
