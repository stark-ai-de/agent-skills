# AC-ADR-033: Choose Portable Dependency-Light Skill Helpers

ID: AC-ADR-033
Title: Choose Portable Dependency-Light Skill Helpers
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: stack-tooling
Tags: helpers, nodejs, python, portability
Applies when: Adding or replacing an executable helper inside a public skill package.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Prefer portable standard-library helpers and justify every runtime or dependency.

Variants: [Short](ac-adr-033-choose-portable-dependency-light-skill-helpers.short.md) · **Long, canonical** · [Guide](ac-adr-033-choose-portable-dependency-light-skill-helpers.guide.md)

## Context

Executable helpers can turn ambiguous agent instructions into deterministic checks and transformations. They also add runtime availability, operating-system behavior, dependency installation, process, filesystem, and supply-chain constraints to every skill installation. Bash-first helpers exclude common Windows environments; compiled or package-heavy helpers raise distribution cost; forbidding every non-Node runtime can make complex standard-library tasks less clear or safe.

## Decision

Public skill helpers use the smallest portable runtime and dependency contract that implements the required behavior clearly, safely, and testably.

Dependency-free Node.js ESM is the default for cross-platform filesystem, path, process, JSON, text, hashing, archive inventory, and child-process orchestration when standard library APIs are sufficient. Helpers avoid shell command construction, platform-specific path assumptions, implicit dependency installation, and writes outside their documented boundary.

Dependency-free Python is an allowed task-specific exception when Python's standard library materially improves correctness, reviewability, or implementation safety for work such as structured document parsing, image inspection, or numerical validation. The skill detects the required executable, documents supported versions and degraded behavior, and includes focused smoke coverage. Python is not selected merely from maintainer preference.

Shell is used only when the target contract explicitly guarantees the required shell and utilities or when it is a tiny transparent wrapper around a separately portable operation. Third-party runtime packages, binaries, browsers, or system tools require a separately documented capability need, version and install ownership, license and supply-chain review, explicit approval before installation, and a safe unavailable path.

Every helper declares inputs, outputs, read/write effects, overwrite behavior, network use, exit semantics, resource bounds, and cleanup. Validation runs it from the exact installed package on representative claimed platforms and exercises malformed input, missing tools, interruption, and no-clobber behavior where relevant.

## Invariants

- No helper silently installs a runtime, package, browser, or system tool.
- Standard-library implementations remain dependency-free in the installed payload.
- Runtime exceptions are justified by task evidence and covered by focused tests.
- Paths and subprocess arguments are handled without unsafe shell interpolation.
- A helper cannot broaden the skill's documented permission or side-effect boundary.

## Failure handling

When a required runtime or tool is missing, report the exact prerequisite and either stop safely or use the documented lower-capability path. Do not download or install it without explicit approval. On partial failure, preserve source inputs and previously valid outputs and report recoverable temporary state without deleting unrelated files.

## Consequences

Skills remain portable and easier to audit, with limited supply-chain surface. Some helpers are more verbose, Python exceptions need dual-runtime testing, and genuinely specialized capabilities require explicit prerequisites and approval-gated tooling.
