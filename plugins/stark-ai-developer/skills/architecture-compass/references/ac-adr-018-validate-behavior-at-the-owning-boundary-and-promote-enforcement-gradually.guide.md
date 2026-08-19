# AC-ADR-018: Validate Behavior at the Owning Boundary and Promote Enforcement Gradually

ID: AC-ADR-018
Title: Validate Behavior at the Owning Boundary and Promote Enforcement Gradually
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: testing, validation, enforcement, evidence
Applies when: Implementing, refactoring, reviewing, or turning documented rules into automated gates.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Prove behavior at the boundary that owns it and harden reliable checks into gates in deliberate stages.

Variants: [Short](ac-adr-018-validate-behavior-at-the-owning-boundary-and-promote-enforcement-gradually.short.md) · [Long, canonical](ac-adr-018-validate-behavior-at-the-owning-boundary-and-promote-enforcement-gradually.long.md) · **Guide**

> Non-normative implementation guidance. The Long variant is authoritative.

## Map a change to proof

1. List the observable behaviors changed and name the module, boundary, or journey that owns each one.
2. Put pure transformations and validation decisions in focused unit tests.
3. Exercise each changed persistence, authorization, protocol, framework, or third-party boundary with an integration or contract test.
4. Add or update an end-to-end scenario only for a critical journey or a failure that depends on the assembled application.
5. Record which evidence stages were actually run and which remain for CI, installation, publication, deployment, or an external platform.

For TanStack Query tests, create an isolated `QueryClient` per test, disable retries except in retry scenarios, and assert pending, error, reset, freshness, and success behavior explicitly. For Next.js rendering, caching, routing, or hydration behavior, include a production build scenario rather than relying exclusively on development mode.

## Promote a rule safely

| Stage           | Required evidence before advancing                                                            |
| --------------- | --------------------------------------------------------------------------------------------- |
| Documentation   | Clear owner, rationale, scope, examples, and known exceptions                                 |
| Advisory report | Deterministic detection, baseline results, false-positive review, and actionable messages     |
| Local gate      | Focused runtime, positive and negative fixtures, migration path, and documented waiver        |
| CI gate         | Stable local history, CI runtime budget, owned failures, and no hidden environment dependency |

Keep policy checks read-only until mutation behavior has its own explicit contract and review. If an autofix is later added, test idempotence, preserve unrelated user changes, and expose a dry-run or diff.

## Evidence note template

```text
Stage: local
Command or scenario: <exact focused check>
Artifact/environment: <commit, build, runtime, or fixture identity>
Result: passed | failed | unavailable | not run
Limit: does not establish CI, publication/install, deployed/production, or external proof
```

## Official sources

- [Next.js testing guide](https://nextjs.org/docs/app/guides/testing)
- [TanStack Query testing guide](https://tanstack.com/query/latest/docs/framework/react/guides/testing)
- [Playwright test isolation](https://playwright.dev/docs/browser-contexts)
- [Testing Library guiding principles](https://testing-library.com/docs/guiding-principles)
