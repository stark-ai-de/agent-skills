# AC-ADR-006: Assign Workspace Ownership and Source Roles

ID: AC-ADR-006
Title: Assign Workspace Ownership and Source Roles
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: repository-architecture
Tags: workspace, ownership, source-roles
Applies when: A repository creates or changes apps, packages, source folders, file placement, or shared-code ownership.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Give each deployable and source role one clear owner and extract shared packages only for proven boundaries.

Variants: [Short](ac-adr-006-assign-workspace-ownership-and-source-roles.short.md) · [Long, canonical](ac-adr-006-assign-workspace-ownership-and-source-roles.long.md) · **Guide**

> Non-normative implementation guidance. The Long variant is authoritative.

## Placement map

Before creating or moving files, use a table like this:

| Planned path                                                   | Owner          | Source role          | Runtime audience | Callers        | Why here               |
| -------------------------------------------------------------- | -------------- | -------------------- | ---------------- | -------------- | ---------------------- |
| `apps/<web-app>/src/app/<route>/page.tsx`                      | web app        | framework entrypoint | server           | router         | required route file    |
| `apps/<web-app>/src/components/<feature>/<feature>-screen.tsx` | web app        | component            | server or shared | route          | product composition    |
| `packages/<domain-core>/src/<contract>.ts`                     | domain package | contract             | runtime-neutral  | web and worker | stable shared contract |

If the `Callers` column has only one app and no independent public contract, start app-local. Extract later with focused proof rather than predicting reuse.

## Adaptable workspace shape

```text
apps/
  <web-app>/
  <backend-service>/
  <docs-app>/
packages/
  ui/
  <domain-core>/
  <tooling>/
```

Create only selected, owned units. A small repository may correctly contain one app and no packages.

Within a Next.js app, a useful starting distinction is:

```text
src/app/          # framework entrypoints
src/components/   # React implementations
src/hooks/        # substantial React hooks
src/lib/          # non-React app modules
```

Introduce more specific folders only when the selected runtime and actual files require them. Keep framework metadata and fallback files thin; move reusable fallback UI to components.

## Source-role examples

Use role-specific folders only when the repository has enough files to make the distinction useful:

```text
src/lib/queries/         # browser-safe read contracts, keys, and client options
src/lib/search-params/   # URL parsing and serialization, not domain persistence
src/lib/server-only/     # trusted reads, privileged clients, and server adapters
src/generated/           # generated runtime sources, visibly marked and reproducible
infra/ | deploy/ | ops/  # deployment ownership outside hand-written runtime source
```

Generated database types stay private to the persistence adapter unless a deliberately smaller DTO is part of a public contract. App-local deployment manifests may remain under the owning app, but keep them outside `src/` and document the generator, inputs, owner, and regeneration command.

When target conventions require an exception, record a small allowlist:

| Path     | Reason                                | Owner     | Removal condition        |
| -------- | ------------------------------------- | --------- | ------------------------ |
| `<path>` | `<framework or migration constraint>` | `<owner>` | `<observable condition>` |

An allowlist explains a real exception; it is not a substitute for classifying new files.

## Extraction test

Before moving code to a package, ask:

- Are there two current consumers with the same semantics?
- Can the package API avoid app-local aliases, configuration, and framework lifecycle?
- Is ownership clearer after extraction?
- Can each consumer validate the contract independently?
- Does the package need a release or compatibility boundary?

A “no” does not forbid future extraction; it suggests app-local ownership for the current slice.

## Simplification loop

Use this optional worksheet when the user requests less custom code, fewer
abstractions, deduplication, or framework/library reuse. It applies the existing
ownership decision, [runtime boundaries](ac-adr-007-enforce-runtime-safe-module-and-public-package-boundaries.long.md),
[dependency ownership](ac-adr-013-own-language-package-build-lint-and-supply-chain-tooling-explicitly.long.md),
and [validation contract](ac-adr-049-distinguish-change-risk-from-representative-environment-observation.long.md);
it is not a new adoptable policy, mandatory optimization pass, or sixth workflow.
Use target-native languages, tools and accepted decisions. An audit reports
candidates without writing files; planning does not authorize implementation.

Example request: "Use Architecture Compass to simplify the source files in
`<scope>` under the accepted ADRs. Check deletion, existing framework/library
capabilities and shared ownership, implement equivalent reductions, and report
the net line changes including tests." For recommendations only, request `audit`.

### 1. Establish scope and evidence

- Record the immutable baseline revision, current candidate, requested paths,
  existing edits, generated/vendor exclusions and owning validation commands.
  Keep unrelated changes out of the task's attributable savings. Keep the initial
  baseline fixed for cumulative savings and identify each pass's starting
  candidate for incremental deltas, including relevant dirty-tree identity.
- Inventory every requested source file, not just the PR diff. For a TypeScript
  scope, enumerate tracked `.ts` and `.tsx` files, classify implementation,
  tests/fixtures, declarations and generated files, and reconcile the counts.
  Report exclusions and files that could not be inspected.
- Use available semantic callers/imports and structural search to find repeated
  behavior, pass-through wrappers, duplicate schema/type declarations and custom
  platform plumbing. Inspect candidates and consumers before deciding. Text
  matches alone do not establish semantic equivalence or dead code; check dynamic
  registration, reflection, generated consumers and public exports too.
- Separate inventory coverage, structural scanning and semantic review. If a
  semantic tool is unavailable, name the fallback and its limits; do not claim
  complete semantic review from a repository-wide scan or install tools silently.

### 2. Compare the smallest supported alternatives

For each candidate, consider deletion, a native/framework feature, an already
adopted library, or reuse inside an existing owner before adding an abstraction
or dependency. These are comparison options, not a universal package ranking.

| Candidate / callers      | Current obligation        | Alternative / exact version                 | Equivalence evidence and gaps       | Owner / disposition                |
| ------------------------ | ------------------------- | ------------------------------------------- | ----------------------------------- | ---------------------------------- |
| `<source and consumers>` | `<behavior and boundary>` | `<delete, native, library, shared or keep>` | `<source, focused proof, unknowns>` | `<apply, retain or defer; reason>` |

Check inputs and outputs, ordering, defaults, nullability, serialization,
error types and redaction, cancellation, timeouts, size bounds, cleanup,
concurrency/backpressure, authorization and data ownership where relevant.
Use current official API documentation and the actual installed version/runtime
matrix; record unknown compatibility rather than assuming it from an API name.
Behavior changes are a separate decision, not hidden savings.

A dependency in the lockfile may be only transitive: verify the consuming
package's declared dependency and public exports. A new dependency needs a
specific capability benefit, maintained API, compatible license/runtime,
security and transitive-cost review, upgrade owner and exit path under target
policy. For frontend capability selection, use the existing
[AC-ADR-015 test](ac-adr-015-select-frontend-capability-libraries-by-product-need.long.md).
Count integration/configuration and adapter code as maintained code. Upstream
maintenance reduces custom implementation; local integration, upgrades and
contract tests remain the project's responsibility. Do not claim zero upkeep.

### 3. Keep real boundaries while removing duplication

Share behavior only when real consumers have the same semantic contract. Prefer
one named function in the existing owner before a new cross-package API. Apply
the extraction test above if a package boundary is actually needed; future
consumers alone do not justify a shared package.

Keep app-specific policy and incompatible runtime audiences separate. Common
mechanics can be shared while callers retain different authorization, retention
or failure policies. Preserve a thin facade when it protects a public API,
runtime or compatibility boundary; apply the
[AC-ADR-007 deletion test](ac-adr-007-enforce-runtime-safe-module-and-public-package-boundaries.long.md)
before removing it.

Illustrative candidates, subject to target-version and contract verification:

| Custom implementation                                        | Candidate                                                | Conditions that can require retaining custom code                                                                                             |
| ------------------------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Duplicate DTO declarations beside an existing runtime schema | Infer input/output types from the adopted schema library | Input coercion, transforms, optional fields and public serialization can differ                                                               |
| Repeated environment/config projection                       | Share the projection in its existing owner               | Creation and verification may still need different checks or secret handling                                                                  |
| Handwritten finite-response buffering                        | Adopted bounded stream reader or runtime facility        | Byte vs character limits, interrupted streams, abort/cleanup and memory bounds                                                                |
| Manual bounded subprocess buffering and timeout listeners    | Runtime process API, such as Node `execFile`             | Shell-free arguments, binary stdin, separate stdout/stderr bounds, exit errors and kill semantics; streaming/backpressure may require `spawn` |
| A custom parser, form state machine or auth protocol         | Existing parser, form framework or auth library          | Strict parsing, accessibility, session boundaries and application authorization still need proof                                              |

These are examples, not mandated dependencies. For subprocesses, keep secrets
out of arguments/logs and preserve sanitized errors. For network reads, preserve
SSRF controls and socket/DNS binding; a shorter response reader does not replace
the transport's trust policy. Likewise, a generic queue or retry helper does not
prove durable reservations, idempotency or unknown-outcome recovery.

Repeated fixtures and parameterized tests may be shared only when every distinct
input, assertion, failure scenario, isolation requirement and useful case name
is preserved. Check strictness, unknown keys, coercion, split Unicode,
fingerprints, retries and idempotency against resolved source/types as well as
version-matched documentation; a latest-version example is not compatibility proof.

### 4. Execute and re-evaluate a bounded slice

1. Select a candidate with concrete evidence of lower maintenance burden. Record
   the owner, affected callers, expected deletion, proof and reversible diff.
2. Within the selected workflow's authority, implement the smallest coherent
   slice, migrate its callers and remove the now-unused implementation. Keep
   required behavior and readability; do not pursue a numeric deletion quota.
3. Run owning-boundary checks and meaningful regression cases for uncertain
   semantics, including failures and boundary values. Use AC-ADR-049 to reuse
   matching receipts and invalidate only affected evidence. Do not create tests
   that merely restate the implementation or repeatedly rerun unchanged suites.
4. Review the full affected diff, measure the result, and inspect any newly
   exposed duplication. Continue only while another evidenced candidate remains
   inside the authorized scope. A retained implementation with a documented
   reason is a valid result.

After each retained improvement, search the agreed inventory and affected
consumers again: deletion can expose another removable layer. Do not stop only
because the first pass or its tests succeeded. Revisit a rejected candidate only
when new evidence changes its reason. A requested code reduction qualifies only
when the agreed handwritten total falls and maintenance complexity improves
with required behavior proved; report a beneficial size-increasing correctness
change separately.

Convergence requires a complete final pass that finds no remaining qualifying
candidate. Missing evidence, failed validation, incomplete coverage, scope or
governance conflict, and an explicit resource limit are blocked or bounded stops,
not evidence of convergence. Report the resumption condition; do not invent a
pass limit for an open-ended request or promise a global optimum. Preserve
independent verified improvements, stop dependent edits on failed proof, and
do not count unverified or reverted reductions as achieved.

Stop when candidates are exhausted, remaining benefit is speculative, proof
fails, state drifts materially, or a new dependency/ownership decision falls
outside accepted governance. A failed slice is repaired or reverted within the
authorized changes; no endless optimization or unrelated cleanup follows.
After concurrent changes, reconcile the new candidate and affected proof before
continuing; preserve the original baseline or explicitly explain a new one.

### 5. Report attributable savings and limits

Use the optional section in the [refactor report](../assets/refactor-report-template.md#simplification-evidence-when-requested),
with one existing validation ledger rather than a second proof system. Report:

- baseline and final revision/content identity, scope, coverage method and gaps;
- accepted, retained and deferred candidates, including library alternatives;
- physical added/deleted lines and net delta (`added - deleted`) separately for
  implementation, tests/fixtures and all changed files, with other categories
  such as docs/generated/config reconciled to the total;
- per-pass and cumulative handwritten totals with production, tests/fixtures,
  docs/config and generated/vendor/lockfile deltas separated; count new helpers,
  adapters, manifests and support code wherever they live;
- dependency changes, remaining policy/integration ownership, validation and
  the reason iteration stopped.

Use repository-native diff/count tools, for example `git diff --numstat` between
verified revisions, with the same path scope and counting method. State whether
counts are physical lines or a language-aware SLOC measure; they are not
interchangeable. Include new/deleted files and rename treatment, and disclose
binary files or excluded generated output. Split this task's delta from the full
PR when other authors or earlier passes contributed changes.

Do not count reformatting/minification, moving code to another owned package,
deleting required tests, or hiding vendored/generated code as reduced maintenance.
A negative implementation delta can coexist with a positive total delta; report
both. Fewer lines do not establish faster runtime or lower memory usage. If no
safe net reduction was found, say so without forcing a change.

## Official sources

- [Next.js project structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [pnpm workspace documentation](https://pnpm.io/workspaces)
- [Node.js packages and entry points](https://nodejs.org/api/packages.html)
