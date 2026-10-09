# Inventory and decision guide

Use one row per entry point or generated script source. Keep evidence concise;
the inventory is a decision aid, not a requirement to produce a large report.

| Field                 | Record                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| Entry point and owner | Source path, generated origin if any, and responsible workflow or team.                              |
| Role and effects      | Runtime, operator, test, fixture, or generated; read/write/network effects.                          |
| Callers               | Imports, package commands, CI, docs, runbooks, manual commands, and external contracts checked.      |
| Required contract     | Outputs, ordering, auth, provenance, limits, concurrency, errors, and rollback.                      |
| Decision              | Remove, reuse an existing function, simplify, or retain; cite evidence.                              |
| Proof                 | Focused positive/negative checks, exact-output comparison, current-head CI, and untested live gates. |

## Decision tests

1. **Remove:** no real caller remains, and another supported path owns the same
   outcome. A self-test of an unused command does not make it a production
   caller. Remove the obsolete test with the command; keep tests of the active
   path.
2. **Use a standard function:** compare its full behavior, not its API name.
   Check authentication, trusted evidence, response bounds, timeouts, retries,
   error visibility, and version pinning. Reject a replacement that needs an
   extensive adapter or loses a required guarantee.
3. **Simplify:** centralize repeated pure configuration while preserving
   externally named commands and platform-specific checks. Keep a small
   coordinator where it enforces domain ordering or ownership.
4. **Retain:** note the distinct caller or failure mode. A helper for safe
   recovery, provenance, process cleanup, or an operator boundary may be
   necessary even if it resembles another script.

## Representative patterns

- An unused `qualification` CLI duplicates a publisher's receipt recorder.
  Workflow, catalog, docs, and operator searches find only its self-tests.
  Remove that CLI and those tests, but retain the publisher's evidence binding
  and the separate upstream owner checks.
- Two audit-profile configuration files repeat app URLs and score thresholds.
  Move shared values into one small function; keep both documented profile
  entry points, the browser preflight, and profile-specific limits. Compare
  rendered configuration for every app/profile pair.
- Two list commands traverse the same skill catalog. Reuse one reader with a
  validated standard argument parser, keep both package aliases, and compare
  sorted output byte for byte.
- A custom registry/HTTP client may be replaced by an installed CLI only after
  proving the same authentication, immutable artifact identity, provenance,
  pagination, timeout, and size limits. Keep the domain proof coordinator.
- A Nix-generated shell program belongs to its declarative source. Edit and
  validate that source; do not patch the output or run a system switch just to
  check a refactor.

## Report shape

| Repository | Outcome or PR       | Removed maintenance                           | Retained helpers and why                       | Checks                            | Open gates                            |
| ---------- | ------------------- | --------------------------------------------- | ---------------------------------------------- | --------------------------------- | ------------------------------------- |
| Example    | One reviewed change | One duplicate command path; no new dependency | Publisher receipt verifier enforces provenance | Focused tests and current-head CI | Live publisher proof remains separate |

Count removed mechanisms, dependencies, special cases, and caller paths when
those counts help a reviewer. Include line counts only as supporting evidence.
