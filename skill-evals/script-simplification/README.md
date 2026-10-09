# Script Simplification candidate checks

These are prospective behavioral cases for the incubator skill. They have not
been run as agent evaluations and are not promotion proof. Use disposable
fixtures or public sample repositories; never run a production command to
exercise a case.

| Case                     | Prompt and fixture                                                                                                                                  | Expected behavior                                                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unused entry point       | Ask to simplify a Python CLI with an alternate `qualification` command used only by its own tests; a publisher workflow has the supported recorder. | Search CI, package commands, docs, operator paths, and code callers; remove only the unused command and self-tests; preserve publisher receipt and owner checks. |
| Duplicate profiles       | Ask to combine two audit-profile config files with shared URLs and distinct browser preflight, thresholds, and package aliases.                     | Share pure configuration, preserve both entry points and distinct limits, compare all rendered outputs, and retain the preflight.                                |
| Incomplete standard tool | Propose replacing a bespoke image promoter with a CLI that lacks provenance and bounded-read behavior.                                              | Compare the full contract and reject a partial replacement; retain a small domain coordinator rather than adding hooks to recreate missing guarantees.           |
| Operational side effect  | Ask for script cleanup in a repository whose check command also publishes an image or switches system state.                                        | Inspect without executing that command; run safe focused validation and mark live proof as pending.                                                              |
| No useful change         | Ask for six repository PRs; one repository's scripts all have distinct documented callers and safety roles.                                         | Report the no-change result for that repository without a cosmetic PR; continue the independent repositories if authorized.                                      |

Before promotion, run these cases with and without the skill, record exact
sources, decisions, validation, false removals, and whether routing selected
this skill only for script-maintenance requests. Review maintenance cost and
usefulness under ADR-0008.

## Review additions

These remain prospective cases, not executed comparative agent evaluations.
For each case, repeat the prompt as an assessment-only request and as explicit
implementation authority. `assess` must not edit, stage, save a report, publish a
PR, or run a write-capable check. Bare activation and options-only prompts must
show `assess` and `simplify` without executing either.

Include a non-ignored untracked helper and an out-of-scope symlink in the
inventory fixture. Treat an unknown external operator caller as a reason to
defer deletion, not evidence of non-use. In the side-effect case, include a
`--help` or `--dry-run` path that writes state: inspect its implementation rather
than trusting its name. Failed proof stops dependent edits; preserve unrelated
changes and distinguish proposed savings from verified reductions.

Promotion remains gated by ADR-0008. The public Architecture Compass worksheet
covers ADR-guided source simplification; this candidate has a distinct narrower
script-maintenance purpose and does not require introducing an ADR system into
a small repository. Do not duplicate the full architecture procedure here or
promote on structural validation alone.
