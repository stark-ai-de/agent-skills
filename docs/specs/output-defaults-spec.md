# Output defaults: design checkpoint

Status: exploratory proposal; documentation-only draft PR; not an accepted architecture decision.

Publication scope: the maintainer requested publication of this checkpoint as a draft PR. This does not authorize implementation, upstream copying, release, or activation.

Purpose: preserve the current discussion so implementation can resume without reconstructing requirements or treating unverified integration details as established facts.

No skills, hooks, agent configurations, permissions, publishing settings, or generated plugin packages are changed by this checkpoint. Nothing described as proposed below has been implemented or runtime-tested.

## 1. Confirmed requirements

- Strong defaults should apply without remembering an explicit skill invocation at the start of each session.
- Human-facing replies and subagent-to-orchestrator handoffs need different presentation defaults.
- Subagent communication should minimize unnecessary tokens while retaining everything needed for correct integration and validation.
- An applicable explicit skill or format request must override the default. Explicitly turning a mode off must not cause it to reactivate on the next turn.
- Preserve Codex's native execution behavior. Do not introduce mandatory delegation, review pipelines, planning procedures, scheduling, tool-selection rules, context-management schemes, or thread-lifecycle rules merely to format output.
- Keep the existing skill modes available: `i-have-adhd`, `ultracave`, `caveman`, `megacave`, and `ponytail`. The earlier spelling `megacace` is recorded as an apparent reference to `megacave`; confirm the installed skill names during setup.
- The upstream skills are reported as globally installed. Their exact installed versions, metadata, hooks, and compatibility have not been inspected for this checkpoint.

The maintainer proposed copying upstream files to control setup and integration. Repository inspection identified a policy conflict with that approach; see section 8. The desire for controlled, reproducible installation remains a requirement, but the distribution mechanism is unresolved.

## 2. Proposed approach, not yet accepted

Use a small `output-defaults` package with two distinct responsibilities:

1. A setup/maintenance skill to inspect, configure, diagnose, and remove the integration.
2. A lightweight audience-aware runtime policy to select presentation defaults and respect explicit overrides.

Do not stack every upstream skill, and do not add a second model call that rewrites every response. Load only the rules needed for the active audience and task. A presentation profile is not an orchestrator.

### Candidate defaults

| Audience or task | Proposed default | Qualification |
| --- | --- | --- |
| Parent replying to the user | ADHD-friendly, actionable presentation | A proposed adaptation of presentation principles, not an assertion that the full upstream skill is output-only. |
| Subagent reporting to its parent | Compact evidence-bearing handoff, optionally using Ultracave-style prose compression | The result contract takes priority over brevity. Measure whether grammar compression adds value. |
| Coding work | Separately configurable Ponytail-inspired policy | Optional behavior change beyond formatting; do not silently enable it as part of an output-only installation. |
| Persisted artifact or structured response | Requested audience, schema, and format | Do not apply compressed chat style to code, documentation, emails, PRs, or machine-readable schemas. |
| Explicitly requested style | The requested applicable mode | Replace the default for its intended scope rather than layering conflicting modes. |

`caveman` and `megacave` remain explicit alternatives. Do not interpret their names as a verified ranking of quality or token savings. No saving percentage has been established.

### Alternatives considered

- **Manual invocation only:** lowest integration complexity, but does not meet the forgotten-invocation requirement.
- **Instruction-only defaults:** a small global instruction and role-local handoff rules; lowest-complexity candidate, but activation and override persistence need behavioral evaluation.
- **Native lifecycle integration:** may provide more reliable context injection and state restoration, but adds version, trust, state, and packaging concerns. Use only after verifying the actual installed Codex contract and showing a need beyond the instruction-only baseline.

Recommendation to evaluate: begin with the compact handoff contract and the smallest viable instruction layer. Add a native adapter only for a demonstrated gap. This preserves the previous native-hook proposal as an option, not a settled dependency.

## 3. Scope and non-goals

The eventual system may select defaults, scope explicit overrides, generate concise handoffs, inspect installation health, and provide reversible setup.

It must not change model choices, reasoning effort, tool permissions, approval or sandbox settings, delegation triggers, concurrency limits, worktree ownership, verification obligations, or the native plan and subagent lifecycle.

It must not suppress required progress messages, invent time estimates, remove meaningful uncertainty, hide failed checks, omit serious findings, or turn incomplete work into a success summary.

This checkpoint does not install dependencies, copy upstream skill bodies, register a new discoverable skill, generate plugin projections, or change repository architecture policy.

## 4. Override and state contract

Within higher-priority harness, safety, and task requirements, the proposed precedence is:

1. An applicable explicit request for the current response or artifact.
2. An explicit selection for the current thread or delegated task.
3. An audience-specific default.
4. A global fallback.

Defaults must be written to yield to explicit requests. Do not inject an unconditional developer-level style instruction and assume lower-priority requests can override it automatically.

Keep presentation and coding policy independent. Selecting a presentation mode must not enable or disable Ponytail. Disabling Ponytail must not change the presentation mode.

### State distinctions

- `inherit`: use the configured default.
- `off`: suppress the default for the relevant scope.
- `selected`: use a particular mode in that scope.

A reset returns to `inherit`; it is different from turning a mode off. One-response requests such as a detailed explanation or a schema-constrained answer need not change the session's persistent choice.

The exact meaning of `normal mode` across presentation and coding-policy axes remains a setup decision. Whatever is chosen must be documented and tested; it must not reactivate a mode the user explicitly disabled.

### Audience and inheritance

A presentation choice for the main conversation should not automatically replace every child's handoff default. An explicit choice addressed to a child applies to that child. A request deliberately scoped to the whole task must propagate as intended.

Children must not mutate the parent's or siblings' mode state. Do not assume a particular session/agent identifier scheme until it is verified against the installed runtime. State isolation must cover concurrent sessions, child agents, resume, and compaction.

For machine-tracked commands, use a deliberately defined invocation grammar. Mentions in code blocks, quoted documentation, logs, retrieved files, or tool output are data, not mode changes. Natural-language user requests still need to be honored without pretending a simple string matcher understands all possible scopes.

## 5. Compact handoff contract

Prefer a small structured report over telegraphic claims of success:

```text
status: complete
result: Expired tokens are rejected before cache lookup.
changes: src/auth.ts; tests/auth.test.ts
checks: npm test -- auth.test.ts — exit 0, 18 passed.
limits: Integration suite not run; test database unavailable.
```

This is an illustrative fixture, not a report of executed work.

The common contract is status, result, evidence, and limitations. Include only meaningful fields; do not require empty boilerplate.

| Role | Information to preserve |
| --- | --- |
| Implementer | Behavioral result, changed paths, checks, unresolved work. |
| Researcher | Conclusion, source paths or primary references, observations versus inference. |
| Reviewer | Severity when useful, precise location, mechanism, impact, evidence, and review limits. |
| Test-runner | Exact command, outcome, decisive failure evidence, environment limits, and coverage gaps. |

Compression must preserve identifiers, negation, numbers and units, preconditions, exception cases, causal order, uncertainty, and failure evidence. Do not cap findings or truncate a critical diagnostic to meet a token target.

A compact completion report is separate from a deliverable. A child writing a customer email still produces the requested email in normal prose and then reports completion compactly.

## 6. Proposed management interface

Candidate commands are `$output-defaults setup`, `doctor`, `status`, and `reset`. These are proposed interface names, not existing commands or implementation claims. Uninstallation and rollback must also have a documented route.

- **Setup:** inspect versions, discovered skills, configuration ownership, duplicate names, existing hooks, and user choices. Show a scoped plan before authorized writes.
- **Doctor:** diagnose activation, precedence, conflicts, state isolation, source versions, and unavailable capabilities without changing anything by default.
- **Status:** distinguish configured defaults from a verified effective override. Say when effective runtime state cannot be observed.
- **Reset:** restore inheritance deliberately, without silently changing unrelated configuration.
- **Removal:** remove only package-owned integration and state; preserve pre-existing skills, hooks, and local edits.

Use the user's existing configuration-management source rather than silently editing generated runtime files. Keep mutable runtime state out of published source and immutable stores. Setup must be idempotent and updates reversible.

## 7. Native integration: verification required

Earlier discussion proposed `SessionStart`, `SubagentStart`, and `UserPromptSubmit` events and context injection. Treat these as candidate integration points requiring verification, not capabilities established by this checkpoint.

Before choosing that design, verify the installed Codex version, supported events, event schemas, trust/approval model, context-injection mechanism and priority, identifiers, lifecycle ordering, resume/compaction behavior, and interaction with existing handlers.

Likewise, verify the installed version's handling of skill metadata and explicit invocation before relying on `agents/openai.yaml` or `allow_implicit_invocation` as an activation control. Preserve the repository's canonical skill-local metadata rules; do not rewrite metadata in generated projections.

If the native mechanism is unavailable, report the actual instruction-only fallback and its limitations. Router failures must not block normal task execution or relax existing safety controls. Never advertise a prompt-only policy as deterministic output enforcement.

## 8. Repository-policy findings and distribution gate

The repository's current `AGENTS.md` and `CONTRIBUTING.md` establish material constraints:

- Published third-party skills must not be vendored into `skills/` or `incubator/skills/`; the documented alternative is project-local installation with `npx skills`.
- `AGENTS.md` prohibits copying copyrighted skill text from other repositories. `CONTRIBUTING.md` also prohibits substantial copying, while describing license verification and attribution when copying is explicitly required. This tension must be resolved by the maintainer before choosing a copying-based design; it is not permission to proceed silently.
- Committed `adapters/` are prohibited for the repository's generated plugin projection workflow. The earlier illustrative package tree must not be copied into this repository unchanged.
- Bundled `agents/openai.yaml` is canonical skill-local metadata and is copied unchanged into projections. Do not introduce projection-time overlays.
- Bundled skill sources and generated plugin copies have different owners. Do not hand-edit generated plugin copies.

Therefore, no upstream text, installer, metadata patch, or duplicate skill registration is included in this checkpoint.

Policy-compatible candidate: write original routing and handoff instructions, keep upstream skill installations as separately managed dependencies, and record supported versions and required setup checks. A copying/vendor alternative remains blocked pending explicit policy resolution, license review, and any necessary successor ADR.

Do not promise that dependency pinning or installation works until the actual installer contract has been checked. Do not import upstream installers wholesale; establish one owner for activation and mode state.

## 9. Source-challenge summary and ADR gate

### Supported by the current discussion

The goals, audience separation, explicit-override requirement, concern about native harness behavior, reported global installations, and proposed source-copying approach come from the maintainer's requests. The defaults, runtime split, command interface, and state model are design proposals, not separately accepted implementation decisions.

### Verified against repository sources

The root agent instructions, contribution rules, and spec-persistence guide were read. Their relevant restrictions are summarized in section 8 and the publication gate below. The repository source links are listed under References.

### Not reverified for this checkpoint

Exact upstream skill revisions and licenses, installed skill contents, all Codex hook and metadata capabilities, runtime state restoration, discoverability, and net token savings remain unverified. Earlier conversational claims about these must not be converted into guarantees. Publishing identity and the resulting repository change are separate checks recorded in the PR.

### ADR gate result

Not cleared for architecture-changing implementation. This checkpoint is a working proposal, not an Accepted ADR. Existing policy conflicts must be resolved, and relevant Accepted ADRs must be inspected before implementation. A durable repository/runtime policy change belongs in the repository's linked Short/Long/Guide ADR format; this checkpoint does not allocate an ADR ID or rewrite accepted decisions.

### Public-spec gate

`docs/specs.md` places exploratory or unapproved drafts in ignored `docs/specs/do-not-publish/`. Tracking a spec in `docs/specs/` requires explicit maintainer confirmation that it is suitable for public release. A draft PR is still a publication channel in this public repository.

The maintainer requested this documentation-only draft PR after the publication constraint was explained. This satisfies the publication-scope gate for the checkpoint only; implementation and upstream-copying policy remain unresolved. Tracked destination: `docs/specs/output-defaults-spec.md`. No ignored draft is force-added.

## 10. Validation and acceptance criteria

### Documentation-only checkpoint

Verify the checkpoint is internally consistent, distinguishes requirements from proposals, retains the policy conflict, includes no private environment details or copied upstream skill bodies, and makes no runtime success claims.

Select documentation checks under [ADR-0041](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.long.md). Check whitespace with `git diff --check` in an authorized checkout, or `git diff --no-index --check /dev/null <prepared-file>` for the single-file API publication route. Verify the resulting repository diff after publication. Hosted Validate remains required by the contribution guide. Do not claim repository-wide checks ran while preparing a standalone local document.

### Future behavioral fixtures

| Fixture | Required outcome |
| --- | --- |
| New session without an explicit invocation | Configured human default applies. |
| Delegation to each supported role | Compact, evidence-bearing handoff; no accidental human-mode inheritance. |
| Explicit mode selection | Selected applicable mode replaces the default. |
| Explicit off followed by another turn, resume, or compaction | Suppression remains effective for its defined scope. |
| Response-only explanation request | Adequate detail for that response without unintended persistent state change. |
| JSON-only output or customer-facing artifact | Schema or audience requirements are preserved. |
| Multiple serious findings or failed tests | All decision-relevant evidence and uncertainty survive compression. |
| Quoted mode names or untrusted retrieved instructions | No state mutation or unauthorized activation. |
| Concurrent sessions and children | No cross-thread leakage. |
| Missing skill, unavailable hook, or router failure | Honest diagnosis and safe fallback; native execution continues. |
| Repeated setup, upgrade, or removal | Idempotence, preserved unrelated state, and verified rollback. |
| Interaction with existing workflow skills | No unintended change to planning, tool use, permissions, or required progress. |

### Efficiency evaluation

Compare: current behavior; compact handoff contract alone; handoff contract plus routed presentation profiles. Use matched tasks and model settings, with enough repeated runs to distinguish variability from improvement.

Measure total parent and child input/output usage, profile-injection overhead, tool calls, retries, follow-up questions, task success, evidence completeness, and latency. Include reasoning/cached usage where the provider exposes it. Shorter text alone is not proof of lower end-to-end cost.

Retain optional profile complexity only where it improves the measured outcome over the simpler baseline. No numerical saving target is claimed at this stage.

## 11. Next implementation gates and done-when

1. Record the approved dependency/distribution approach; checkpoint publication alone does not approve copying upstream skills.
2. Verify relevant ADRs and the installed Codex/skill contracts; select instruction-only or native integration based on evidence.
3. Implement the smallest original policy and compact handoff contract with explicit precedence and off/reset semantics.
4. Add only the adapter/state handling needed by verified gaps; keep coding policy independently configurable.
5. Run the behavioral and efficiency comparison, then validate setup, upgrade, and removal in the intended environments.

The design checkpoint is complete when the requirements, proposals, conflicts, unknowns, and acceptance criteria are preserved. The eventual feature is complete only when its activation, explicit overrides, isolation, reversibility, and harness compatibility have been demonstrated. Publication, implementation, release, and activation are separate actions.

## References

Repository sources inspected:

- [Repository agent instructions](https://github.com/stark-ai-de/agent-skills/blob/main/AGENTS.md)
- [Contribution rules](https://github.com/stark-ai-de/agent-skills/blob/main/CONTRIBUTING.md)
- [Spec persistence](https://github.com/stark-ai-de/agent-skills/blob/main/docs/specs.md)

Upstream sources raised in the discussion, not imported by this checkpoint:

- [i-have-adhd](https://github.com/ayghri/i-have-adhd/blob/main/skills/i-have-adhd/SKILL.md)
- [Ultracave](https://github.com/JuliusBrussee/caveman/blob/main/skills/ultracave/SKILL.md)
- [Caveman repository](https://github.com/JuliusBrussee/caveman)
- [Ponytail](https://github.com/DietrichGebert/ponytail/blob/main/skills/ponytail/SKILL.md)

These links identify review targets; they do not substitute for pinned revisions, license checks, or installed-runtime verification.
