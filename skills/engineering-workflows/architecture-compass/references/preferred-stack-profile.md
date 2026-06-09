# Preferred Stack Profile

Use this reference only when the target repository has adopted these stack rules, asks for this default stack, or lacks a stack profile and wants a starter. Target repository stack rules always outrank this profile.

## Decision order

1. Prefer the existing stack and built-in platform capabilities.
2. If a specialized library is needed, prefer the library named in the target stack rules or this adopted profile.
3. If the preferred stack is insufficient, explain the technical gap before introducing another dependency.
4. If a deviation becomes a repeated pattern, update repo docs or propose an ADR.

## Core platform

- Use Next.js as the default application framework for web projects.
- Use TypeScript everywhere.
- Use pnpm workspaces and Turbo for monorepo orchestration.
- Use Oxc tools for linting and formatting when the repository has adopted them.
- Deploy Next.js web projects to Vercel by default when no deployment ADR says otherwise.

## Runtime validation and parsing

- Use Zod 4 for reusable runtime validation, schema parsing, form validation, API payload validation, tool schemas, and environment parsing.
- Use `@t3-oss/env-nextjs` for environment validation in Next.js projects.
- Do not default to ad hoc custom validators once the input shape matters across more than one boundary.

## Dates and time

- Use Luxon when the task involves non-trivial date handling, timezone logic, formatting rules, locale-aware output, or date arithmetic.
- For every date or time change, explicitly evaluate whether Luxon makes the code more readable. If it does, use Luxon.
- Native `Date` is acceptable for simple pass-through timestamps or trivial comparisons only when Luxon would not improve readability.
- Do not introduce date-fns, Day.js, Moment, or similar alternatives by default.

## Requests and server boundaries

- Prefer React Server Components, Next.js data fetching, and Cache Components first.
- Implement write operations with Server Actions when possible.
- Use `next-safe-actions` when write operations should be typed, validated, and consistently wrapped.
- Implement read operations through API routes by default.
- Base request orchestration and client-side server state on TanStack Query.
- Consider `tRPC` with `@trpc/tanstack-react-query` only when many read endpoints gain a clear developer or type-safety advantage from it.
- Consider GraphQL when many parameterized read requests benefit from dynamic queries, filtering, or field selection.
- Do not default to SWR or ad hoc client-side fetch layers when TanStack Query and native Next.js patterns already cover the requirement.
- Use ElysiaJS only when the system should run as a separate backend and serverless or API-route-based delivery is not the right fit.

## Forms, URL state, and internationalization

- Use `react-hook-form` for substantial forms.
- Use `nuqs` for URL query state and shareable UI-only state such as filters, tabs, dialogs, drawers, and other view options when no server data layer is involved.
- Prefer `nuqs` over prop drilling when UI state should be shared across components and represented in the URL.
- `nuqs` is also a good fit when URL state should drive prefetchable reads or parameterized data loading.
- Use `next-international` for internationalization in Next.js projects.

## UI and presentation

- Use Shadcn as the default component baseline.
- Use Tailwind as the default styling layer.
- Use `@tanstack/react-table` for sortable, filterable, paginated, selectable, or otherwise data-heavy tables.
- Keep table primitives focused on presentation and pair them with TanStack Table when table behavior matters.
- Treat `packages/ui` as the canonical home for shared UI primitives, Tailwind tokens, provider wiring, and reusable component variants.
- Keep app-local CSS limited to product-specific layout or composition; do not duplicate shared tokens or component styling inside `apps/*`.
- Use `motion` for animation instead of legacy `framer-motion`.
- Prefer CSS transitions, keyframes, and pseudo-classes for visual effects before using JavaScript-driven animation logic.
- Do not use React `useState` for purely visual hover or focus effects when CSS can express the interaction directly.
- Use JavaScript-driven animation only when the effect depends on runtime measurement, gesture orchestration, or other behavior CSS cannot handle cleanly.
- Use Recharts for charts.
- Use `react-email` for email templates and rendering.

## AI stack

- Use Vercel AI SDK v5 as the default unified AI gateway for model access and streaming.
- Use AI SDK Tools for tool-enabled model workflows.
- Use AI Elements for reusable AI-first UI patterns when they fit.
- Use Streamdown for streamed markdown rendering when streaming output needs structured presentation.
- Prefer `@openharness/core` for AI agents when a lightweight agent framework is enough.
- Consider LangChain.js when it provides a clear advantage for agent orchestration, RAG, or workflow composition.

## Data and infrastructure

- Supabase is the default backend base and PostgreSQL is the default relational database when this profile is adopted.
- Prefer server-side Supabase access with service or admin credentials when client-specific authentication is unnecessary.
- If only Supabase is involved and GraphQL adds no clear value, use Supabase packages directly.
- Offer Supabase Realtime on top when the product benefits from it.
- Use Drizzle ORM when several APIs or data sources are involved and Drizzle materially reduces complexity.
- Redis is the default choice for caching, queues, rate limits, high-throughput scenarios, or as a data gateway across multiple backends.
- Redis or Vercel KV can also be used when a full relational setup is not worth the overhead or the data is not relational.

## Additional targets

- Prefer Capacitor for Android and iOS apps when wrapping a web UI is the simplest path.
- Prefer Electron for desktop apps when it is a better fit than Capacitor, especially for Windows-focused desktop delivery.

## Task-end check

Every implementation task should end with a quick stack check:

- Did the solution follow the preferred stack?
- If not, was the deviation justified and documented?
