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
