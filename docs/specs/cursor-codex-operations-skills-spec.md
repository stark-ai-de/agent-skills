---
title: "Cursor support for Codex operation skills"
slug: "cursor-codex-operations-skills"
artifact_path: "docs/specs/cursor-codex-operations-skills-spec.md"
mode: "standard"
status: "accepted"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-07-03"
updated: "2026-07-03"
source_request: "@GitHub My codex related skills inside https://github.com/stark-ai-de/agent-skills should be made available for cursor. create a spec file how to implement it."
---

# Cursor support for Codex operation skills

## Goal

Make the promoted Codex operation skills in this repository available to Cursor Agent users through native Agent Skills support, without duplicating skill bodies into Cursor rules or changing the canonical skill names.

## Scope

- In scope: promoted public skills under `skills/codex-operations/`: `codegraph-ast-grep`, `codex-memory-curator`, and `codex-spec-interviewer`.
- In scope: Cursor installation documentation, Cursor compatibility notes, skill wording audits where Codex-only instructions would mislead Cursor users, and install smoke validation.
- In scope: release metadata, changelog, and public skill `metadata.version` updates only when the implementation changes public skill behavior or frontmatter.
- Out of scope: incubator skills, promotion decisions, publishing a release, custom Cursor plugins, a Cursor MCP server, vendoring third-party skills, or converting these skills into `.cursor/rules/*.mdc` files.

## Repo context

- Relevant files or areas: `README.md`, `skills/codex-operations/README.md`, `skills/codex-operations/*/SKILL.md`, `skills/codex-operations/*/agents/openai.yaml`, `docs/specs.md`, `CHANGELOG.md`, and `package.json`.
- Existing public Codex operation skills: `codegraph-ast-grep`, `codex-memory-curator`, and `codex-spec-interviewer`.
- Existing commands or conventions: public skills live under `skills/`, specs live under `docs/specs/`, public skill changes require coherent category README text and `metadata.version` handling, and final validation normally runs through `npm run validate`.
- External context checked during planning: Cursor Agent Skills docs, Cursor Rules docs, Vercel skills CLI README, Agent Skills specification, and Agent Skills client implementation guide.
- Unknown repo facts marked as unspecified: whether Cursor UI remote GitHub skill import should be documented as a primary install path for this catalog. Treat it as secondary until manually verified.

## Requirements

### Functional requirements

- WHEN a Cursor user wants these Codex operation skills, THE REPO SHALL document Cursor-native install commands that target Cursor instead of relying only on existing Codex install commands.
- WHEN documenting Cursor installation, THE REPO SHALL include one command for all promoted Codex operation skills and at least one individual-skill example.
- WHEN using `npx skills`, THE COMMANDS SHALL use `-a cursor` and explicit `--skill` names for the Codex operation set.
- WHEN a user installs project-locally for Cursor, THE RESULT SHALL place skills in a Cursor-discovered project skill location such as `.agents/skills/`.
- WHEN a user installs globally for Cursor, THE RESULT SHALL place skills in a Cursor-discovered user skill location such as `~/.cursor/skills/`.
- WHEN the docs mention existing Codex installs, THE DOCS MAY note that Cursor can also discover compatible Codex skill directories, but SHALL still recommend a Cursor-targeted install for clearer ownership.
- WHEN a skill is made available in Cursor, THE SKILL SHALL keep the same `name`, `description`, `references/`, `scripts/`, and `assets/` layout required by the Agent Skills format.
- WHEN a skill contains Codex-exclusive config paths, commands, or assumptions, THE IMPLEMENTATION SHALL either add a Cursor-safe alternative path or explicitly state that the step applies only to Codex.
- WHEN updating `codegraph-ast-grep`, THE IMPLEMENTATION SHALL avoid implying that Cursor users should modify `~/.codex/config.toml`; Cursor-specific MCP setup must be documented separately or marked as a manual Cursor settings step.
- WHEN updating `codex-memory-curator`, THE IMPLEMENTATION SHALL preserve its Codex memory scope. Running the skill from Cursor must not imply Cursor memory cleanup unless a separate Cursor memory feature is explicitly added later.
- WHEN updating `codex-spec-interviewer`, THE IMPLEMENTATION SHALL keep the spec workflow portable across Codex and Cursor Agent, with repo-local `AGENTS.md`, specs, ADRs, and validation commands remaining the source of truth.
- WHEN public skill behavior, compatibility text, or frontmatter changes, THE IMPLEMENTATION SHALL bump the affected skill `metadata.version` values and update release metadata according to repo conventions.
- WHEN only README/category docs change, THE IMPLEMENTATION MAY avoid public skill version bumps, but SHALL still update `CHANGELOG.md` if the repo process expects docs-only changes to be recorded.

### Non-goals and constraints

- Do not copy any skill into `.cursor/skills/` inside this catalog repository; that directory is an install output in a consuming project, not the source catalog layout.
- Do not convert `SKILL.md` files into `.cursor/rules/*.mdc`; Cursor rules are a separate prompt-scope mechanism and are not needed for native Agent Skills support.
- Do not add Cursor-only frontmatter such as `paths` or `disable-model-invocation` unless a specific skill needs it, the repo validator accepts it, and the behavior remains acceptable for other Agent Skills clients.
- Do not broaden Codex-specific skills into generic Cursor workflows without renaming, re-scoping, or creating a separate skill.
- Do not include secrets, customer data, private repo paths, internal hostnames, or non-public operational details in examples.

## File plan

- Update: `README.md` with a Cursor install section near the existing Codex install instructions.
- Update: `skills/codex-operations/README.md` to state that the promoted Codex operation skills are Agent Skills and can be installed into Cursor while preserving Codex-specific scope where applicable.
- Audit and update if needed: `skills/codex-operations/codegraph-ast-grep/SKILL.md` and its references for Cursor-safe MCP wording.
- Audit and update if needed: `skills/codex-operations/codex-memory-curator/SKILL.md` for explicit Codex-memory boundaries when invoked from Cursor.
- Audit and update if needed: `skills/codex-operations/codex-spec-interviewer/SKILL.md` compatibility text for Cursor Agent.
- Update only if public skill behavior or release metadata changes: `CHANGELOG.md`, `package.json`, and affected skill `metadata.version` fields.
- Avoid touching: incubator skills, unrelated public skills, site runtime code, `.cursor/rules/`, `.cursor/skills/`, and lockfiles unless validation proves they must change.

## Implementation plan

1. Confirm the promoted Codex operation skill list from `skills/codex-operations/README.md` and do not include incubator candidates unless a separate promotion spec exists.
2. Add Cursor install documentation to `README.md`:

   ```bash
   npx skills@latest add stark-ai-de/agent-skills --skill codegraph-ast-grep --skill codex-memory-curator --skill codex-spec-interviewer -g -a cursor -y
   npx skills@latest add stark-ai-de/agent-skills --skill codex-spec-interviewer -g -a cursor
   ```

3. Add a project-local Cursor example for teams that want the skills committed or shared through a target repository:

   ```bash
   npx skills@latest add stark-ai-de/agent-skills --skill codegraph-ast-grep --skill codex-memory-curator --skill codex-spec-interviewer -a cursor
   ```

4. Explain that Cursor reads Agent Skills directly, so `.cursor/rules/*.mdc` conversion is not the implementation path.
5. Audit `codegraph-ast-grep` for Codex MCP wording. Keep Codex MCP setup intact, but add Cursor-safe wording where the same skill is used from Cursor.
6. Audit `codex-memory-curator` for automatic-invocation risk. Preserve its Codex memory purpose and make any Cursor note explicit: Cursor can run the skill, but the subject remains Codex memory state.
7. Audit `codex-spec-interviewer` compatibility wording and examples so Cursor Agent users can apply the same spec workflow without assuming Codex-only UI or config.
8. If any `SKILL.md` public behavior changes, bump affected `metadata.version` values and update release metadata/changelog consistently.
9. Run repository validation and local install smoke checks.
10. Perform a manual Cursor UI check after installing into Cursor: open Cursor Customize -> Skills and verify the three skill names appear.

## Acceptance criteria

- [ ] `README.md` documents Cursor global install for all promoted Codex operation skills using `-a cursor`.
- [ ] `README.md` includes at least one individual Cursor install command.
- [ ] `skills/codex-operations/README.md` accurately states Cursor availability without removing the Codex-specific operating context.
- [ ] No `.cursor/rules/*.mdc` or `.cursor/skills/` source copies are added to this catalog repository.
- [ ] `codegraph-ast-grep` does not direct Cursor users to edit Codex config as though it were Cursor config.
- [ ] `codex-memory-curator` remains clearly scoped to Codex memory state even when installed into Cursor.
- [ ] `codex-spec-interviewer` remains usable from Cursor Agent for repo-local spec creation and ADR gating.
- [ ] Any changed public skill has a coherent `metadata.version`, category README row, and changelog/release metadata entry as required by repo conventions.
- [ ] Local `npx skills` smoke validation proves the three skills can be installed with `-a cursor` into a temp project.
- [ ] Manual Cursor UI verification confirms the installed skills are discoverable under Cursor Skills, or the blocker is documented.

## Source challenge

- Repo evidence checked: `AGENTS.md`, `README.md`, `docs/specs.md`, `docs/specs/README.md`, `skills/README.md`, `skills/codex-operations/README.md`, representative Codex operation `SKILL.md` files, `scripts/validate-skills.mjs`, and `package.json`.
- External docs checked: Cursor Agent Skills docs, Cursor Rules docs, Vercel skills CLI README, Agent Skills specification, and Agent Skills client implementation guide.
- Requirement revised: making these skills available for Cursor should use native Agent Skills installation and discovery, not Cursor rule conversion.
- Requirement revised: existing Codex-directory compatibility in Cursor is useful, but docs should still provide explicit Cursor-targeted install commands.
- Requirement preserved: these remain Codex operation skills; availability in Cursor is a runtime/install surface, not a semantic rewrite into generic Cursor workflows.
- Requirement preserved: incubator candidates stay out of the Cursor support scope until separately promoted.

## ADR gate result

- ADR required: no for the scoped implementation.
- Reason: this repository already uses the open Agent Skills format and already identifies Cursor as a compatible runtime surface; the implementation adds docs, install commands, and compatibility wording rather than a new architecture policy.
- ADR trigger: create a short ADR first if implementation later adds a Cursor-specific publishing pipeline, Cursor-specific validation gate, Cursor-only generated artifacts, or a formal support policy that differs from the generic Agent Skills compatibility stance.
- Implementation blocked until ADR accepted: no, unless the scope expands into one of the ADR triggers above.

## Validation

```bash
npm run validate
pnpm format:check
pnpm lint
npm run smoke:install
npx skills@latest add ./skills --list

tmp="$(mktemp -d)"
repo="$(pwd)"
(
  cd "$tmp" && \
    npx skills@latest add "$repo/skills" \
      --skill codegraph-ast-grep \
      --skill codex-memory-curator \
      --skill codex-spec-interviewer \
      -a cursor \
      -y \
      --copy
)
test -f "$tmp/.agents/skills/codegraph-ast-grep/SKILL.md"
test -f "$tmp/.agents/skills/codex-memory-curator/SKILL.md"
test -f "$tmp/.agents/skills/codex-spec-interviewer/SKILL.md"
```

Manual validation after a global Cursor install:

```bash
npx skills@latest add stark-ai-de/agent-skills --skill codegraph-ast-grep --skill codex-memory-curator --skill codex-spec-interviewer -g -a cursor -y
```

Then open Cursor Customize -> Skills and confirm the three skills are listed.

## Risks and rollout notes

- Cursor's skill import UI and remote GitHub import behavior may evolve. Keep the primary path on `npx skills` and the open Agent Skills filesystem layout.
- `codex-memory-curator` may look odd inside Cursor because it manages Codex memory files. Mitigate with precise docs and descriptions instead of hiding the skill.
- `codegraph-ast-grep` contains Codex MCP setup language. Mitigate by separating Codex-specific config from Cursor-safe guidance.
- Cursor UI discovery is not fully covered by repository CI. Mitigate with a temp-project CLI install smoke check plus a manual Cursor UI verification step.
- Global install commands modify the user's home directory. Keep global commands documented for users, but use temp project-local installs for automated validation.

## User verification

- Verification basis: maintainer request asked for a spec to make Codex-related skills in this repository available for Cursor.
- Assumption: "Codex-related skills" means promoted public skills under `skills/codex-operations/`, not incubator candidates.
- Assumption: the implementation should make skills available to Cursor users while preserving Codex-specific semantics.
- Open question: none blocking. If incubator Codex candidates should also be made available, create a separate promotion/support spec.

## Done when

- [ ] This spec is saved at `docs/specs/cursor-codex-operations-skills-spec.md`.
- [ ] Cursor install docs exist and use `-a cursor` with the promoted Codex operation skill names.
- [ ] Skill wording has been audited for Cursor-safe behavior and Codex-only boundaries.
- [ ] Relevant version, changelog, and release metadata updates are included if public skill behavior changes.
- [ ] Repository validation and Cursor install smoke checks pass or blockers are reported.
- [ ] Manual Cursor Skills discovery is verified or the limitation is documented before merge.
