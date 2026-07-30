# AC-ADR-008: Compose Next.js Routes, Rendering, and Component Responsibilities

ID: AC-ADR-008
Title: Compose Next.js Routes, Rendering, and Component Responsibilities
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: frontend
Tags: nextjs, rendering, server-components, client-components
Applies when: A Next.js App Router route, layout, fallback, screen, or interactive component boundary is created or materially changed.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-30
Gist: Keep App Router entrypoints thin, render on the server by default, and isolate only necessary client interaction.

Variants: **Short** · [Long, canonical](ac-adr-008-compose-nextjs-routes-rendering-and-component-responsibilities.long.md) · [Guide](ac-adr-008-compose-nextjs-routes-rendering-and-component-responsibilities.guide.md)

## Decision summary

App Router entrypoints remain thin framework files that compose named, feature-owned screens or handlers. Server Components are the default for rendering and trusted reads; Client Components are introduced only for state, events, browser APIs, context, or client-only libraries and receive browser-safe props.

Each data-backed screen deliberately selects awaited server rendering, streamed Suspense, or client-pending rendering. Its loading, error, and retry UI matches that mode. Pure UI leaves render props and callbacks without importing queries, persistence, Server Actions, or trusted modules.

## Read next

Read the [Long variant](ac-adr-008-compose-nextjs-routes-rendering-and-component-responsibilities.long.md) before changing route composition or a server/client boundary. Use the [Guide](ac-adr-008-compose-nextjs-routes-rendering-and-component-responsibilities.guide.md) for adaptable screen shapes and error-mode checks.
