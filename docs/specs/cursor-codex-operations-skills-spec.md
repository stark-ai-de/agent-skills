---
title: "Cursor-native support for Codex-related skills"
slug: "cursor-codex-operations-skills"
artifact_path: "docs/specs/cursor-codex-operations-skills-spec.md"
mode: "standard"
status: "accepted"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-07-03"
updated: "2026-07-13"
source_request: "@GitHub My codex related skills inside https://github.com/stark-ai-de/agent-skills should be made available for cursor. create a spec file how to implement it. Follow-up: consider Cursor-native skills such as cursor-spec-interviewer. Maintainer challenge: evaluate whether portable skills belong in engineering-workflows instead of duplicated runtime categories."
---

# Cursor-native support for Codex-related skills

## Goal

Make the repository's Codex-related operating workflows available to Cursor Agent users through first-class Agent Skills. Use runtime-native skill variants when the runtime name, trigger behavior, configuration steps, evidence model, or output contract should be runtime-specific; otherwise keep the skill portable, place it in the appropriate workflow category, and document runtime installation.

## Cross-host clarification

- The skill name and description drive discovery; no shared router or custom metadata can guarantee activation across clients.
- Installing a target-specific skill into another host preserves its target evidence and output contract while only collaboration controls adapt.
- Portable workflows remain single skills; runtime-specific memory/state and execution-prompt workflows remain independent skills.
- Local CLI-to-API gateways are backend adapters, not skill routers, and stay with their owning workflow until [ADR-0028](../adrs/0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.short.md) ([Long, canonical](../adrs/0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.long.md) · [Guide](../adrs/0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.guide.md))'s extraction gate is met.

## Scope

- In scope: promoted public skills originally reviewed from `skills/codex-operations/`: `codegraph-ast-grep`, `codex-memory-curator`, and `codex-spec-interviewer`.
- In scope: creating Cursor-native public skill variants when the skill would be clearer, safer, or more discoverable as a Cursor workflow.
- In scope: initial Cursor-native target `cursor-spec-interviewer`, because `codex-spec-interviewer` shares the interview lifecycle but has a Codex-specific name, evidence model, and execution-output contract.
- In scope: deciding whether `codegraph-ast-grep` needs a Cursor-specific variant or belongs in `skills/engineering-workflows/` as a portable engineering workflow.
- In scope: documenting that `codex-memory-curator` remains a Codex-state skill and that any Cursor, Claude, or other runtime memory/state curator requires its own source challenge instead of a clone-by-default split.
- In scope: Cursor installation documentation, Cursor compatibility notes, skill wording audits, eval proof for new public skills, and install smoke validation.
- In scope: release metadata, changelog, public catalog docs, and public skill `metadata.version` updates when public skill behavior or frontmatter changes.
- Out of scope: incubator skill promotion unrelated to Cursor support, publishing a release, custom Cursor plugins, a Cursor MCP server, vendoring third-party skills, or converting these skills into `.cursor/rules/*.mdc` files.

## Repo context

- Relevant files or areas: `README.md`, `skills/README.md`, `skills/codex-operations/README.md`, `skills/cursor-operations/`, `skills/engineering-workflows/`, `skill-evals/`, `docs/specs.md`, [ADR-0021](../adrs/0021-place-portable-skills-in-workflow-categories.short.md) ([Long, canonical](../adrs/0021-place-portable-skills-in-workflow-categories.long.md) · [Guide](../adrs/0021-place-portable-skills-in-workflow-categories.guide.md)), `CHANGELOG.md`, and `package.json`.
- Existing public skills under review: portable `codegraph-ast-grep`, Codex-specific `codex-memory-curator`, and Codex-specific `codex-spec-interviewer`.
- Existing commands or conventions: public skills live under `skills/`, specs live under `docs/specs/`, promoted public skills need eval proof under `skill-evals/`, category README rows must match `SKILL.md` frontmatter descriptions, public skill changes require `metadata.version`, and final validation normally runs through `npm run validate`.
- External context checked during planning: Cursor Agent Skills docs, Cursor Rules docs, Vercel skills CLI README, Agent Skills specification, and Agent Skills client implementation guide.
- Unknown repo facts marked as unspecified: whether Cursor UI remote GitHub skill import should be documented as a primary install path for this catalog. Treat it as secondary until manually verified.

## Requirements

### Functional requirements

- WHEN a Cursor user wants these workflows, THE REPO SHALL expose Cursor-friendly skill names and install instructions instead of expecting users to discover Codex-prefixed names by accident.
- WHEN a workflow is semantically portable but Codex-branded in name, trigger text, output prompt, or compatibility wording, THE IMPLEMENTATION SHALL create a Cursor-native counterpart rather than only documenting `-a cursor` installation.
- WHEN creating a Cursor-native counterpart, THE SKILL SHALL be self-contained under its own skill directory and SHALL NOT depend on files from the Codex skill directory at runtime.
- WHEN content is adapted from an existing Codex skill, THE IMPLEMENTATION SHALL preserve the same safety posture, persistence rules, ADR gate behavior, source-challenge behavior, and validation rigor unless a Cursor-specific difference is documented.
- WHEN creating `cursor-spec-interviewer`, THE REPO SHALL add a promoted public skill at `skills/cursor-operations/cursor-spec-interviewer/SKILL.md` with frontmatter name `cursor-spec-interviewer`.
- WHEN `cursor-spec-interviewer` finalizes a spec, THE OUTPUT SHALL produce a Cursor-ready execution prompt, not a Codex execution prompt.
- WHEN `cursor-spec-interviewer` references repo instructions, THE SKILL SHALL treat `AGENTS.md`, existing repo docs, ADRs, package scripts, validation commands, and relevant `.cursor/rules/*.mdc` files as inspectable repo evidence.
- WHEN `cursor-spec-interviewer` mentions Cursor rules, THE SKILL SHALL treat them as additional repo evidence, not as the default artifact format for implementation specs.
- WHEN documenting Cursor installation, THE REPO SHALL include one command for all Cursor-ready public skills and at least one individual-skill example.
- WHEN using `npx skills`, THE COMMANDS SHALL use `-a cursor` and explicit `--skill` names for Cursor-native skills.
- WHEN a user installs project-locally for Cursor, THE RESULT SHALL place skills in a Cursor-discovered project skill location such as `.agents/skills/`.
- WHEN a user installs globally for Cursor, THE RESULT SHALL place skills in a Cursor-discovered user skill location such as `~/.cursor/skills/`.
- WHEN the docs mention existing Codex installs, THE DOCS MAY note that Cursor can also discover compatible Codex skill directories, but SHALL recommend Cursor-native skill names where they exist.
- WHEN a skill is portable across runtimes and only the install target differs, THE IMPLEMENTATION SHALL place it in a workflow category instead of duplicating it under runtime operation categories.
- WHEN `codegraph-ast-grep` contains Codex-exclusive config paths, commands, or assumptions, THE IMPLEMENTATION SHALL separate runtime-specific MCP guidance inside the existing portable skill and SHALL NOT create `cursor-codegraph-ast-grep` unless Cursor setup materially diverges.
- WHEN evaluating a possible `cursor-memory-curator`, `claude-memory-curator`, or other runtime memory curator, THE IMPLEMENTATION SHALL NOT clone `codex-memory-curator` by default. A runtime memory/state curator requires a separate source challenge of that runtime's durable state model and a separate scope decision.
- WHEN public skill behavior, compatibility text, or frontmatter changes, THE IMPLEMENTATION SHALL bump the affected skill `metadata.version` values and update release metadata according to repo conventions.
- WHEN adding a new public skill, THE IMPLEMENTATION SHALL add eval proof under `skill-evals/<skill-name>/` before treating the skill as promoted.

### Cursor-native skill creation rule

Create a new `cursor-*` skill when at least one of these is true:

- The existing skill name is runtime-branded and would be awkward or misleading to invoke from Cursor.
- The skill's default prompt or final execution prompt names Codex as the actor.
- The skill's activation should key off Cursor terms such as Cursor Agent, Cursor rules, Cursor skills, Cursor settings, or Cursor MCP.
- The skill needs Cursor-specific safety boundaries, artifact destinations, or validation steps.
- The skill can be self-contained without relying on external files from another skill directory.

Do not create a new `cursor-*` skill when the only difference is the filesystem install target and the existing skill remains clear, safe, and discoverable in Cursor.

### Non-goals and constraints

- Do not copy any skill into `.cursor/skills/` inside this catalog repository; that directory is an install output in a consuming project, not the source catalog layout.
- Do not convert `SKILL.md` files into `.cursor/rules/*.mdc`; Cursor rules are a separate prompt-scope mechanism and are not needed for native Agent Skills support.
- Do not add Cursor-only frontmatter such as `paths` or `disable-model-invocation` unless a specific skill needs it, the repo validator accepts it, and the behavior remains acceptable for other Agent Skills clients.
- Do not broaden Codex-specific skills into generic Cursor workflows without renaming, re-scoping, or creating a separate skill.
- Do not add a public Cursor skill without eval proof.
- Do not include secrets, customer data, private repo paths, internal hostnames, or non-public operational details in examples.

## File plan

### Required for this implementation

- Add: `skills/cursor-operations/README.md`.
- Add: `skills/cursor-operations/cursor-spec-interviewer/SKILL.md`.
- Add/adapt as needed: `skills/cursor-operations/cursor-spec-interviewer/assets/` and `skills/cursor-operations/cursor-spec-interviewer/references/` from `codex-spec-interviewer`, with Cursor-specific execution-prompt language.
- Add: `skill-evals/cursor-spec-interviewer/README.md`, trigger cases, non-trigger cases, expected behavior, rubric, and run summary placeholders or completed proof according to existing eval conventions.
- Update: `skills/README.md` with the new Cursor operations category.
- Move: `skills/codex-operations/codegraph-ast-grep/` to `skills/engineering-workflows/codegraph-ast-grep/` and change its frontmatter category to `engineering-workflows`.
- Update: `README.md` public catalog table and install section with Cursor-native install commands.
- Add: ADR-0021 for the category rule that portable skills live in workflow categories and runtime categories are reserved for runtime-specific behavior.
- Update: `CHANGELOG.md`, `package.json`, and `metadata.version` values as required by release conventions for adding a public skill.

### Audit and update when needed

- Audit: `skills/engineering-workflows/codegraph-ast-grep/SKILL.md` and references for runtime-specific MCP boundaries.
- Audit: `skills/codex-operations/codex-memory-curator/SKILL.md` for explicit Codex-memory boundaries when invoked from Cursor.
- Audit: `skills/codex-operations/codex-spec-interviewer/SKILL.md` only if shared wording or release metadata must be synchronized.

### Avoid touching

- Incubator skills, unrelated public skills, site runtime code, `.cursor/rules/`, `.cursor/skills/`, and lockfiles unless validation proves they must change.

## Implementation plan

1. Confirm the promoted Codex operation skill list from `skills/codex-operations/README.md` and do not include incubator candidates unless a separate promotion spec exists.
2. Add a new public category `skills/cursor-operations/` with a README that includes the required public-catalog marker and a table row for `cursor-spec-interviewer`.
3. Scaffold `cursor-spec-interviewer` as a self-contained skill, using `codex-spec-interviewer` as the source workflow but replacing Codex-branded runtime language with Cursor Agent language.
4. Preserve the spec interviewer's core behavior: source challenge, ADR gate, user verification, artifact persistence rules, EARS-like acceptance criteria, final self-check, and saved spec plus execution prompt.
5. Adapt inputs to inspect so Cursor-specific repo evidence is included when present: `.cursor/rules/**/*.mdc`, Cursor skill folders in the target repo, and Cursor settings only when the task depends on them.
6. Adapt output format so the companion implementation prompt is a Cursor execution prompt.
7. Keep `cursor-spec-interviewer` self-contained. Do not reference assets or templates from `../codex-spec-interviewer/` because an installed skill should work when installed alone.
8. Add eval proof for `cursor-spec-interviewer`, including:
   - positive trigger: fuzzy Cursor coding request needing a persisted implementation spec,
   - positive trigger: Cursor project with `.cursor/rules/*.mdc` and ADR implications,
   - negative trigger: user asks for immediate direct implementation with complete requirements,
   - negative trigger: user asks to audit Codex memories,
   - rubric checks for Cursor terminology, source challenge, ADR gate, artifact paths, and validation commands.
9. Update root README install docs. Include Cursor-native commands first:

   ```bash
   npx skills@latest add stark-ai-de/agent-skills --skill cursor-spec-interviewer -g -a cursor -y
   npx skills@latest add stark-ai-de/agent-skills --skill cursor-spec-interviewer -a cursor
   ```

10. Add a compatibility note for existing portable skills:

    ```bash
    npx skills@latest add stark-ai-de/agent-skills --skill codegraph-ast-grep -g -a cursor -y
    ```

    Keep `codex-memory-curator` under Codex operations unless the user explicitly wants Cursor to inspect Codex memory state.

11. Move `codegraph-ast-grep` into Engineering Workflows because the CodeGraph plus ast-grep exploration/refactor workflow is portable; keep runtime-specific MCP setup warnings in its setup reference instead of creating `codex-codegraph-ast-grep` and `cursor-codegraph-ast-grep` duplicates.
12. Do not create a runtime memory curator as part of this Cursor support scope. If release-adjacent work adds `cursor-memory-curator`, `claude-memory-curator`, or another runtime memory curator, it must be backed by a separate source challenge and scope decision, and public release docs must not expose private spec paths.
13. Update `CHANGELOG.md`, package release metadata, public catalog tables, and affected `metadata.version` values.
14. Run repository validation, eval smoke checks, and local Cursor-target install checks.
15. Perform a manual Cursor UI check after installing into Cursor: open Cursor Customize -> Skills and verify the new Cursor skill name appears.

## Acceptance criteria

- [ ] `skills/cursor-operations/cursor-spec-interviewer/SKILL.md` exists and its frontmatter `name` matches the folder name.
- [ ] `cursor-spec-interviewer` description clearly says when Cursor Agent should use it.
- [ ] `cursor-spec-interviewer` produces a Cursor-ready execution prompt, not a Codex execution prompt.
- [ ] `cursor-spec-interviewer` preserves source challenge, ADR gate, user verification, validation command capture, and persisted spec behavior.
- [ ] Cursor-specific repo evidence such as `.cursor/rules/**/*.mdc` is inspected when relevant, without converting implementation specs into rules by default.
- [ ] `skill-evals/cursor-spec-interviewer/` contains trigger, non-trigger, expected behavior, rubric, and run-summary proof sufficient for promotion.
- [ ] `README.md` documents Cursor global and project-local install for `cursor-spec-interviewer` using `-a cursor`.
- [ ] `skills/README.md`, `skills/cursor-operations/README.md`, root README public catalog, `CHANGELOG.md`, and package release metadata are coherent.
- [ ] No `.cursor/rules/*.mdc` or `.cursor/skills/` source copies are added to this catalog repository.
- [ ] `codegraph-ast-grep` lives under `skills/engineering-workflows/`, keeps one portable skill name, and labels Codex MCP commands as runtime-specific.
- [ ] No `cursor-memory-curator`, `claude-memory-curator`, or other runtime memory curator is added by this Cursor support spec. Release-adjacent runtime memory curators are backed by separate source challenges and scope decisions.
- [ ] Any changed public skill has a coherent `metadata.version`, category README row, and changelog/release metadata entry as required by repo conventions.
- [ ] Local `npx skills` smoke validation proves `cursor-spec-interviewer` can be installed with `-a cursor` into a temp project.
- [ ] Manual Cursor UI verification confirms the installed skill is discoverable under Cursor Skills, or the blocker is documented.

## Source challenge

- Repo evidence checked: `AGENTS.md`, `README.md`, `docs/specs.md`, `docs/specs/README.md`, `skills/README.md`, `skills/codex-operations/README.md`, representative Codex operation `SKILL.md` files, `skill-evals/README.md`, `scripts/validate-skills.mjs`, and `package.json`.
- External docs checked: Cursor Agent Skills docs, Cursor Rules docs, Vercel skills CLI README, Agent Skills specification, and Agent Skills client implementation guide.
- Requirement revised: making these workflows available for Cursor should not only document `-a cursor`; at least `codex-spec-interviewer` deserves a Cursor-native counterpart because the runtime name and final execution prompt are user-visible.
- Requirement revised: Cursor rules are useful repo evidence but are not the right publishing format for these workflows.
- Requirement revised: `codegraph-ast-grep` should move to Engineering Workflows as one portable skill because the workflow does not materially differ between Codex and Cursor.
- Requirement preserved: existing Codex operation skills remain valid and should not be silently renamed or removed.
- Requirement preserved: incubator candidates stay out of the Cursor support scope until separately promoted.
- Requirement constrained: runtime memory curators are not created by default because `codex-memory-curator` manages Codex memory state, not generic Cursor, Claude, or agent state.

## ADR gate result

- ADR required: yes for the expanded category rule.
- ADR: [ADR-0021](../adrs/0021-place-portable-skills-in-workflow-categories.short.md) ([Long, canonical](../adrs/0021-place-portable-skills-in-workflow-categories.long.md) · [Guide](../adrs/0021-place-portable-skills-in-workflow-categories.guide.md)) places portable skills in workflow categories and reserves runtime operation categories for runtime-specific behavior.
- Reason: creating `cursor-spec-interviewer` is a catalog/content addition, but moving `codegraph-ast-grep` out of Codex Operations establishes a reusable public catalog taxonomy rule.
- ADR trigger: create a short ADR first if implementation later adds a Cursor-specific publishing pipeline, Cursor-specific validation gate, Cursor-only generated artifacts outside the Agent Skills format, or a formal support policy that differs from the generic Agent Skills compatibility stance.
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
      --skill cursor-spec-interviewer \
      -a cursor \
      -y \
      --copy
)
test -f "$tmp/.agents/skills/cursor-spec-interviewer/SKILL.md"
```

Optional compatibility smoke check for still-portable engineering workflow skills:

```bash
tmp="$(mktemp -d)"
repo="$(pwd)"
(
  cd "$tmp" && \
    npx skills@latest add "$repo/skills" \
      --skill codegraph-ast-grep \
      -a cursor \
      -y \
      --copy
)
test -f "$tmp/.agents/skills/codegraph-ast-grep/SKILL.md"
```

Manual validation after a global Cursor install:

```bash
npx skills@latest add stark-ai-de/agent-skills --skill cursor-spec-interviewer -g -a cursor -y
```

Then open Cursor Customize -> Skills and confirm `cursor-spec-interviewer` is listed.

## Risks and rollout notes

- Cursor's skill import UI and remote GitHub import behavior may evolve. Keep the primary path on `npx skills` and the open Agent Skills filesystem layout.
- Creating Cursor-native variants can duplicate maintenance. Mitigate by keeping the Cursor skill intentionally scoped, documenting the source Codex workflow, and adding eval cases that catch terminology and output-contract drift.
- `cursor-spec-interviewer` should not blindly copy Codex UI/config assumptions. Mitigate by adapting compatibility text, input inspection, and final execution prompt language.
- `codex-memory-curator` may look useful from Cursor or Claude because those agents can run installed skills, but its subject remains Codex memory files. Mitigate by requiring separate runtime-specific state cleanup scopes before adding such skills, without exposing private planning artifacts in public release docs.
- `codegraph-ast-grep` contains Codex MCP setup language. Mitigate by placing it in Engineering Workflows and separating runtime-specific config guidance from the portable exploration workflow.
- Cursor UI discovery is not fully covered by repository CI. Mitigate with a temp-project CLI install smoke check plus a manual Cursor UI verification step.
- Global install commands modify the user's home directory. Keep global commands documented for users, but use temp project-local installs for automated validation.

## User verification

- Verification basis: maintainer request asked for a spec to make Codex-related skills in this repository available for Cursor, followed by a maintainer challenge that Cursor-native skills such as `cursor-spec-interviewer` may make more sense.
- Assumption: "Codex-related skills" started with promoted public skills under `skills/codex-operations/`, not incubator candidates; after ADR-0021, portable skills can move to workflow categories.
- Assumption: `cursor-spec-interviewer` should be a first-class Cursor-native public skill rather than only an install alias.
- Assumption: `codegraph-ast-grep` remains one portable engineering workflow unless runtime MCP setup differences prove a separate skill is cleaner.
- Assumption: `codex-memory-curator` should not be cloned as `cursor-memory-curator` or `claude-memory-curator`; runtime variants require runtime-specific durable state targets and separate scope decisions.
- Open question: none blocking. If incubator Codex candidates should also be made available, create a separate promotion/support spec.

## Done when

- [ ] This spec is saved at `docs/specs/cursor-codex-operations-skills-spec.md`.
- [ ] ADR-0021 records the public catalog category rule.
- [ ] `cursor-spec-interviewer` exists as a promoted public Cursor operation skill with eval proof.
- [ ] `codegraph-ast-grep` exists as a promoted public Engineering Workflows skill and remains installable for Codex and Cursor.
- [ ] Cursor install docs exist and use `-a cursor` with Cursor-native skill names.
- [ ] Runtime-specific skill wording has been audited for portable behavior, runtime-specific config boundaries, and Codex-only memory boundaries.
- [ ] Relevant version, changelog, catalog, eval, and release metadata updates are included.
- [ ] Repository validation and Cursor install smoke checks pass or blockers are reported.
- [ ] Manual Cursor Skills discovery is verified or the limitation is documented before merge.
