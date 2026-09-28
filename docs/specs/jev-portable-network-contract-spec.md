# Jev: portable network contract specification

**Status:** Public implementation specification; live qualification remains open
**Specification revision:** 2 (portable Track A, repository-local publication)
**Last reviewed:** 2026-09-28 (scope and documentation, not live qualification)
**Owner:** stark-ai-de
**Implementation PR:** [#111](https://github.com/stark-ai-de/agent-skills/pull/111)
**Reviewed skill baseline:** `23c817f460704ece44c035eada1b7a2b030dc6a1`
**Recorded implementation baseline:** `0dfdaba38fa43049df0f74c8f54e712d41aab3be`

## 1. Outcome, scope, and authority

Jev recommendations require authorized HTTPS access to the TypeSafe API. The
skill declares and uses that prerequisite; the user or administrator controls
network permissions through the executing agent host. Without usable API access,
Jev reports that no recommendation was produced. The host may continue with
native capability selection, but must not label that result as Jev advice.

This document publishes the portable Track A requirements of specification
revision 2 alongside their implementation in PR #111. It retains the A1-A4
requirement identifiers and the original portable acceptance obligations. The
separate optional host deployment/rollback track is not part of this public
skill contract and is not copied here. Private repository-specific provenance,
configuration, and qualification artifacts are intentionally excluded.

**User verification:** On 2026-09-28, the maintainer explicitly requested that
PR #111 include its corresponding specification. That request authorizes this
public documentation addition on the existing PR branch. The specification is
being added after the implementation; it is not presented as a file that was
already committed before coding began. This addition authorizes no new live
installation, credential change, network-policy change, paid provider probe,
release, or merge.

Track A changes guidance, diagnosis/presentation, metadata, and their tests.
Retain the existing advisor, transport, credential precedence, consent checks,
invocation restrictions, request budgets, and local inspection behavior. Change
runtime code only where required to implement or verify this contract. Equivalent
skill behavior does not require identical host settings or sandbox engines.
Local deployment helpers must not become portable skill installation requirements.

## 2. Non-goals and ADR gate

Out of scope: a new daemon, MCP proxy, remote executor, privileged service,
second installation mode, automatic policy editing, blanket network enablement,
new decision caches, automatic POST retries, or proxy pooling implemented without
measured need. Do not broaden host allowlists or intentionally offline profiles
to make a qualification test pass. Do not port host-specific deployment helpers
to other operating systems as part of the portable advisor.

**ADR required: no.** This specification works within
[ADR-0057](../adrs/0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.long.md),
which preserves host permissions, invocation restrictions, native fallback, and
independent qualification of opt-in advice. It does not change that accepted
decision or introduce universal prompt interception. Public persistence follows
[the specification policy](../specs.md) and
[ADR-0056](../adrs/0056-allow-reviewed-public-comparisons-while-protecting-private-provenance.long.md).
Validation selection follows
[ADR-0041](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.long.md).
Any future conflicting architectural change requires the normal accepted
adaptation/successor process before implementation.

## 3. Source baseline and source-challenge summary

The [baseline skill][skill] and [hook reference][hook] already distinguish
installation, processing consent, and host approval. Their Codex-specific
approval instructions are duplicated between the main entrypoint and reference.
The [transport][transport] already supports configured proxies and safe receipt
metadata; generic network failures do not establish a sandbox-policy denial.

The source challenge therefore calls for clearer common prerequisites, native
approval handling, and truthful failure presentation, not another transport or
permission mechanism. Installation, processing consent, permission, network
reachability, a parsed provider result, and actual hook adoption remain distinct
claims. A hostname response or HTTP 404 is not evidence of a valid recommendation.
Local fixtures and emitted guidance are not evidence of live approval behavior.

This is the public, implementation-relevant challenge summary. No private host
inventory, review artifacts, credentials, or infrastructure provenance is needed
to implement or verify the portable contract. Publication does not turn the
requirements below into completed test results.

## 4. Track A: portable network and approval contract

### A1. Declare requirements without granting permissions

Document Python 3.10+, existing TypeSafe credentials, and host-authorized HTTPS
to `api.typesafe.ai:443`; the existing provider path is `/v1/systemone`. Retain
verified TLS, endpoint restrictions, data minimization, and no automatic replay.
A domain allowance is not a guarantee about submitted content or API paths.
Installation, a credential, hook trust, and processing consent are not substitutes
for one another or for network authorization.

Add a concise `compatibility` field consistent with the [Agent Skills format][format]:

```yaml
compatibility: >-
  Requires Python 3.10+, TypeSafe API credentials, and host-authorized
  HTTPS access to api.typesafe.ai for recommendations.
```

This is descriptive metadata, not a permission declaration. Do not introduce an
`allowed-tools` wildcard or a custom permission flag to imply network access.
Local `Inspect` remains available without provider access where otherwise
permitted, but is never presented as an offline Jev recommendation.

### A2. Use the host's existing approval route

| Observed condition                                                | Required behavior                                                                                                           |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Access is allowed and the other prerequisites hold                | Invoke the existing advisor normally. Do not ask for redundant approval.                                                    |
| Approval is required and an applicable native mechanism exists    | Request the narrowest supported authorization for the bounded advisor invocation. Dispatch only when permitted.             |
| The user explicitly denies access                                 | End this Jev attempt without dispatch. Respect the denial's scope; do not repeatedly ask or suggest bypasses.               |
| Managed policy blocks access, or required approval is unavailable | Do not dispatch a predictably prohibited request. Explain the prerequisite and the user/admin-owned remedy.                 |
| Policy is not known to prohibit access                            | Do not invent a permission result. Use the ordinary permitted execution path and report only the outcome actually observed. |
| A provider/transport attempt fails                                | Report its safe failure category; do not automatically replay it, change permissions, or switch execution routes.           |

A one-command or session authorization offered by the host need not modify
persistent configuration. Use it only where the actual host/version exposes it.
An approval that executes outside the sandbox has broader scope than a domain
allowance; disclose that difference rather than describing it as network-only.
Never override managed restrictions, approval denials, or the active tool schema.

Do not issue a separate connectivity probe on every task. Do not dispatch a
predictably blocked provider call just to trigger an approval dialog. Prepare
permitted local inputs separately from the bounded approval-bearing invocation.
Preserve the existing consultation limits and any stricter user opt-out.

Remember denials through available host/session context; this change does not
add a persistent permission database. A later explicit request or authorization
change can start a new attempt within its new scope. Never infer permission from
a fresh session, skill update, or reinstall alone.

### A3. Separate failures from native continuation

Classify from trustworthy evidence, not from guessed causes. A host denial can
be reported as denial; a generic `network_error`, HTTP 403, timeout, DNS error,
or TLS failure alone must not be called a sandbox rejection. Distinguish missing
credentials and provider authentication errors from missing network permission.
Keep raw exception text, keys, proxy URLs, private paths, and response bodies out
of public diagnostics. Do not disable TLS verification as a remedy.

Use the existing error/result envelope. These presentation categories do not
require a new public API status enum or schema version. Add sanitized structured
reason metadata only if existing consumers need it, preserving compatibility and
updating their tests. A transport flag set before I/O is not proof that zero or
some bytes reached the provider; state uncertainty when dispatch is unobservable.

Emit one short, user-language message for a consultation or concrete failure.
Do not repeat notices on unchanged continuations or skipped hook events. For an
automatic consultation, append native continuation; for an explicit Jev request,
first report that the requested Jev result was not produced. Any native advice
must be separately labeled and must not claim to fulfill a Jev-only request.

Required message semantics, illustrated in German:

- **Explicit denial:** “Jev wurde nicht verwendet: Du hast den Zugriff auf die
  TypeSafe-API abgelehnt. Ohne diesen Zugriff kann Jev keine Empfehlung liefern.”
- **Confirmed policy block:** “Jev ist in dieser Umgebung nicht verfügbar: Die
  aktive Richtlinie blockiert api.typesafe.ai. Für Jev muss dieser API-Zugriff im
  Agent-Client freigegeben werden, gegebenenfalls durch deinen Administrator.”
- **Unknown connection failure:** “Jev konnte die TypeSafe-API nicht erreichen.
  Die Ursache ist nicht eindeutig festgestellt. Es wurde keine Jev-Empfehlung erstellt.”

For automatic use, “Die normale Skill-Auswahl übernimmt.” is an appropriate
suffix. After an explicit denial, do not append another permission sales pitch.
Only recommend a concrete host control when supported by current documentation
and active-host evidence. Do not advertise a nonexistent alternative installer.

### A4. Keep host details out of the common entrypoint

Keep the common prerequisite, decision table, and failure semantics concise in
`SKILL.md`; put concrete Codex and Claude approval details in the existing hook
reference. Resolve tool arguments against the actual host schema. Do not carry
Codex's `sandbox_permissions`/`require_escalated` vocabulary into every host.

Use [Codex approval documentation][codex-approval] and [Claude sandbox
documentation][claude-sandbox] as version-sensitive implementation references,
not as evidence that every host has the same controls. At the specification
baseline, the Claude reference described its Bash sandbox for macOS, Linux, and
WSL2. Recheck the executing version; do not infer native-Windows sandbox support
from Python or hook launcher compatibility.

Windows-native, macOS, and Linux users get the same prerequisite and outcome
semantics. Use an available native Python interpreter, shell-appropriate quoting,
and existing platform-specific private-state locations. A Windows user must not
be required to adopt NixOS/WSL merely to run the portable advisor. Preserve the
separation of Windows and WSL credentials and mutable state.

## 5. Track A: file map and regression coverage

Paths are relative to this repository. The original portable requirements apply
to the existing owning surfaces; the implementation also uses a shared network
reference and the repository hook reminder rather than duplicating procedures.

| Surface                                                                                                                             | Required responsibility                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `skills/skill-maintenance/jev-capability-advisor/SKILL.md`                                                                          | Declare compatibility/prerequisites; keep the common contract concise; distinguish failures from native selection.     |
| `skills/skill-maintenance/jev-capability-advisor/references/network-access.md`                                                      | Own the shared prerequisite, authorization-outcome, failure, and portability contract.                                 |
| `skills/skill-maintenance/jev-capability-advisor/references/hook-integration.md`                                                    | Own concrete approval guidance, platform distinctions, and explicit registration refresh instructions.                 |
| `skills/skill-maintenance/jev-capability-advisor/assets/hook-guidance.txt` and `assets/repository-hook-guidance.txt`                | Keep both reminders short and aligned, including the complete Windows command-length boundary; add no permissions.     |
| Existing advisor/transport/hook scripts under the skill's `scripts/`                                                                | Adjust only necessary error propagation, rendering, or registration-update behavior; retain safe transport boundaries. |
| `skill-evals/jev-capability-advisor/test_network_contract.py`, existing Jev tests, and `scripts/validation/jev-capability-advisor/` | Extend the existing helper fixtures and validation harness, not a parallel implementation.                             |
| `skill-evals/jev-capability-advisor/README.md` and `.github/workflows/jev-network-contract.yml`                                     | Record evidence limits and run credential-free native OS tests; do not claim live host qualification.                  |
| `plugins/stark-ai-developer.source.json`, listing metadata, and generated `plugins/stark-ai-developer/`                             | Keep component versions, listing identity, and generated projections consistent through normal repository tooling.     |

Test allowed access, approval acceptance, denial, unavailable approval, and a
known policy block. Assert no provider dispatch before authorization and no
follow-up attempt after denial. Test generic network failure, timeout, TLS error,
provider authentication failure, and HTTP 404 without mislabeling their causes.
Test explicit advice versus automatic consultation, local inspection, repeated
continuations, later authorization changes, and secret-free messages.

For installation and ordinary invocation, compare persistent host network,
approval, proxy, firewall, and trust configuration before and after. Expect no
skill-owned permission changes. Separately authorized hook registration and
credential-reference operations keep their existing bounded ownership contract.
Updating packaged guidance does not silently rewrite installed registrations:
document the existing explicit refresh/reinstall path without granting new rights.

## 6. Functional and platform qualification

A hostname response, HTTP 404, emitted hook text, or successful local parse is
not a successful Jev recommendation. In an explicitly authorized fresh session,
use the actual advisor, existing credential source, a small synthetic task and a
valid current-session capability catalog. Check a valid parsed provider outcome;
`none` can be valid, while transport/authentication errors cannot. For an automatic
hook support claim, also observe actual delivery and recommendation use before
substantive task work. A manual invocation alone does not qualify the hook.

Use the same behavior scenarios on Windows native, macOS, and Linux, with WSL as
an additional environment. Record the interpreter, OS, host/version, source
revision, approval path, scenario, and observed outcome. Test the core helper
natively on each target OS; test host integrations separately where available.
Mocked Windows paths or subprocess tests do not qualify a live Windows host.

Record `passed`, `failed`, `simulated`, `not_run`, or `unsupported` honestly.
Do not claim universal end-to-end support while any claimed host/platform lacks
representative evidence. An upstream unsupported sandbox is not proof that the
portable advisor itself requires that sandbox. No new host-adapter implementation
is implied by this portability requirement.

Use existing safe receipt fields for transport mode, HTTP status, elapsed time,
and connection reuse where available. Keep raw sessions, credentials, payloads,
private catalog metadata, and account identifiers outside the repository. Tests
that send provider requests require separate authorization and bounded budgets;
normal offline CI must not require real keys or paid API calls.

## 7. Documentation, metadata, and validation quality

Keep README content focused on prerequisites, use, failure explanation, and
links. Keep durable ownership/policy decisions in ADRs. Put detailed versioned
qualification observations in the existing evidence surface rather than
repeating them in README, ADR, and skill entrypoint. Keep the warning that domain
permission does not constrain payloads visible. Do not imply that a host's
sandbox-command policy also controls web search, apps, or MCP traffic.

Use strict UTF-8 and readable Markdown with valid links and no truncation,
base64 artifacts, or replacement-character substitutions. Avoid unrelated
reformatting. Validate skill name, description, license, compatibility,
string-valued metadata, endpoint declarations, packaged projections, and links
through the existing owning validators. Follow the component release/version
workflow for actual skill changes; this documentation-only addition requires no
further skill, bundle, or root package version bump. Do not rewrite historical
benchmarks or claim publication of a release.

Update PR validation text with exact tested commits, commands, outcomes, and
limits. Do not relabel earlier runs as current or turn an unexecuted or simulated
scenario into a passed acceptance item. Updating source guidance does not
implicitly refresh existing installations or grant new processing consent.

## 8. Implementation sequence and validation entrypoints

1. Read repository instructions, applicable accepted ADRs, and the current source
   revision; reconcile drift against the recorded baselines above.
2. Add relevant failing fixtures before necessary behavior changes. Implement
   common guidance and outcome presentation without changing selection,
   credential precedence, transport, consent, or request-budget contracts.
3. Update host references, both reminders, component metadata, and generated
   projections through normal tooling; never hand-edit projected skill files.
4. Run owning checks and native OS tests. Qualify real host/API behavior only
   with separate authorization and bounded budgets. Report exact evidence and
   all remaining gaps.

Use the repository's declared toolchain and package manager. Inspect script
write/network effects and isolate test homes before execution. For changed
canonical skill sources, run `pnpm run sync:agent-plugin` before projection
checks; this is generation, not a live installation. Relevant validation commands:

```sh
pnpm run validate:jev
pnpm run validate:skills
pnpm run validate:network-endpoints
pnpm run validate:projections
pnpm run validate:bundles
pnpm run validate:runtime-matrix
pnpm run format:check
python -B -m unittest discover -s skill-evals/jev-capability-advisor -p 'test_network_contract.py' -v
python -B -m unittest discover -s skill-evals/jev-capability-advisor -p 'test_hook*.py' -v
```

When bundle/listing metadata changes, also use the existing release-descriptor,
OpenAI listing, and release-intent checks against the actual PR base. Run other
mandatory checks selected by the changed contracts and repository rules. Hosted
PR validation remains required. These commands describe validation entrypoints,
not evidence that this documentation addition executed them. Missing environments
or baseline failures must be reported rather than silently waived.

## 9. Acceptance checklist and done-when criteria

The original portable obligations remain the completion criteria. Checkboxes
are not automatically completed by the presence of code, a documented procedure,
or simulated replies; acceptance needs matching evidence for its claimed scope.

- [ ] API/Python/credential requirements are visible and platform-neutral.
- [ ] Neither installation nor ordinary advice changes persistent permissions.
- [ ] Native authorization works where supported; denial/unavailable approval
      causes no prohibited dispatch, replay, repeated prompt, or alternate route.
- [ ] Known denial, confirmed policy block, and unknown network failure produce
      accurate, actionable, secret-free messages in the user's language.
- [ ] Native continuation and local inspection are never called Jev advice.
- [ ] Shared behavior has native Windows, macOS, and Linux evidence; WSL and
      host-specific support are qualified separately, with gaps visible.
- [ ] Entry-point guidance, hook text, references, metadata, projections, and
      tests agree; changed registrations are refreshed only explicitly.

Done means the applicable portable acceptance items have matching, source-bound
evidence and mandatory PR checks pass. Live approval/denial, provider access,
current-session inventory, and automatic hook delivery/use must remain explicitly
open until observed on each claimed integration. A passing native helper test
matrix does not waive those obligations or establish universal host support.
The separate local host deployment track is neither implemented nor accepted by
this document.

## 10. Implementation mapping, risks, and deferred work

At the recorded implementation baseline, PR #111 adds the shared network
reference, compatibility guidance, both bounded hook reminders, and sanitized
`error_message` presentation while preserving existing result statuses and
error codes. It adds eight offline contract tests and a Windows/macOS/Linux
matrix on Python 3.10 and 3.14. The skill metadata is `0.3.2` and the bundle is
`1.7.1`, with aligned listing and generated metadata. These are implementation
facts, not proof that every acceptance scenario has been exercised. The
[implementation and validation record][implementation-record] distinguishes
actual runs, simulated outcomes, and untested live behavior; consult checks for
the exact PR head rather than treating this baseline as current CI status.

Risks remain: a generic failure can be misreported as policy denial; unsandboxed
approval can be broader than a domain grant; changed guidance can leave installed
registrations stale; private diagnostic values can leak; and passing helper
fixtures can be mistaken for real host support. A1-A4, explicit registration
refresh, secret-free diagnostics, command-length checks, and separate live
qualification address these risks without granting additional authority.

### Deferred, not a merge gate

Use already-available safe transport timing/reuse fields during authorized
qualification. The reviewed proxy path creates a fresh opener/TLS context,
unlike the reusable direct connection. Only if measured overhead warrants it,
propose connection/TLS reuse as a separate bounded skill change with preserved
endpoint, verification, timeout, and no-replay guarantees. Do not add a benchmark
campaign, extra provider traffic, pooling, or a second installation path here.

### Implementation handoff

> Maintain the portable network contract in this repository after rechecking
> current code and applicable ADRs. Add relevant failing tests before changing
> behavior. Do not install hooks, change live permissions, call TypeSafe, publish
> releases, merge, or modify another repository without separate authorization.
> Report the exact changed files, validated commit, check results, platform
> evidence, and remaining gaps. Do not label native continuation as Jev advice
> or claim live support from offline fixtures.

## Source references

Repository source links are pinned to the inspected skill baseline. External
format and host documentation are retained from specification revision 2 as
version-sensitive references; this documentation-only publication does not
reverify their current controls. Check the actual executing host/version before
using a concrete approval mechanism.

[skill]: https://github.com/stark-ai-de/agent-skills/blob/23c817f460704ece44c035eada1b7a2b030dc6a1/skills/skill-maintenance/jev-capability-advisor/SKILL.md
[hook]: https://github.com/stark-ai-de/agent-skills/blob/23c817f460704ece44c035eada1b7a2b030dc6a1/skills/skill-maintenance/jev-capability-advisor/references/hook-integration.md
[transport]: https://github.com/stark-ai-de/agent-skills/blob/23c817f460704ece44c035eada1b7a2b030dc6a1/skills/skill-maintenance/jev-capability-advisor/scripts/https_transport.py
[format]: https://agentskills.io/specification
[codex-approval]: https://learn.chatgpt.com/docs/agent-approvals-security
[claude-sandbox]: https://code.claude.com/docs/en/sandboxing
[implementation-record]: https://github.com/stark-ai-de/agent-skills/pull/111#issuecomment-5868145482
