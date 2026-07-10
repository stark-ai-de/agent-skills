# Artifact Destinations

Use this reference when selecting or saving implementation spec files and any required ADR files.

## Destination Discovery

1. Use explicit user-provided folders only when the user asks for them.
2. Otherwise inspect the repository for existing spec and ADR structures.
3. If one clear spec convention exists, use it and report the path in the final checkpoint.
4. Do not interrupt the interview just to confirm existing structures.
5. Ask for confirmation at the final checkpoint when no clear convention exists, multiple plausible conventions exist, public/private placement is ambiguous, the target directory must be created, an overwrite is needed, or an ADR file would be written.
6. If no structure exists, suggest the smallest conventional structure at the final checkpoint.
7. Save the final spec unless the user explicitly declines persistence.
8. Save ADR files only when the ADR gate requires them and the user has not declined persistence.

If the user explicitly declines persistence, output the final spec and any ADR draft in chat.

## Spec Path Rules

1. Use an explicit user-provided path when present.
2. Otherwise, follow an existing repository spec convention when one is discoverable.
3. Otherwise, propose `docs/specs/<kebab-slug>-spec.md`.

When operating inside this `agent-skills` repository, follow `docs/specs.md`: save private, exploratory, sensitive, repo-creation, or not-yet-public specs under the ignored `docs/specs/do-not-publish/`, and save specs under `docs/specs/` only after the maintainer explicitly confirms they are publishable. In other repositories, follow the local convention first.

Spec filenames must be lowercase kebab-case and end in `-spec.md`. Do not add sequential numbers unless the target repository already uses numbered spec filenames.

## Persistence Rules

- While native Claude Code Plan mode is active, do not create, edit, or persist any file. After the verified checkpoint, report the approved paths and persistence as pending, then issue the save-only continuation defined in `SKILL.md`.
- Save every final spec file after the destination is selected from a clear repo convention or confirmed by the user.
- If the target directory is missing, create it only after confirmation unless repo instructions explicitly require that directory.
- If the selected specs folder is ignored by version control and the user expects a shared repo artifact, ask whether to keep it local-only, unignore that path, or choose a tracked docs path.
- If the target file exists, ask before overwriting. Prefer a clearer slug over automatic suffixes.
- Save ADR files only when the ADR gate requires a new or superseding ADR.
- During the save-only continuation, persist only the approved spec, any required ADR, and the minimal ADR index entry required by the repository's existing convention. Defer all other repo-facing documentation updates to later implementation, and record that work in the spec.
- Report every saved path in the final response.
- Avoid pasting full persisted artifacts unless the user requests it or file persistence was blocked.

## ADR Path Rules

1. Use the repository's ADR directory, template, numbering, and index conventions.
2. Use one durable decision per ADR.
3. Mark new ADRs as `Proposed` unless the maintainer explicitly accepts them.
4. Update the repository's existing ADR index when its convention requires one. Treat that minimal entry as part of ADR persistence, not unrelated documentation.
5. Link required ADRs from the implementation spec.

Do not create ADRs for feature behavior, UI copy, routine refactors under existing architecture, test cases, validation commands, or temporary experiments.

## Verification Checkpoint

Before saving final artifacts, summarize:

- scope and non-goals,
- assumptions and any non-blocking unknowns,
- blocking decisions or open questions,
- source challenge findings,
- risks and rollout notes,
- validation commands,
- ADR gate result,
- spec path basis and any required ADR paths.

Ask whether anything material is missing or wrong. Continue interviewing if the answer reveals a material gap. If the user explicitly declined persistence, return the complete approved artifacts in chat and write nothing. Otherwise, in active Plan mode, prepare the approved content without writing repository or workspace artifacts, report persistence as pending, and provide the save-only continuation; a host-managed `ExitPlanMode` plan file is allowed. Outside Plan mode, save the spec by convention, save any required ADR only after explicit confirmation, and make the minimal ADR index update required by the repository's existing convention. Defer all other repo-facing documentation changes to later implementation.
