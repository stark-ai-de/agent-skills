# Network access and failure contract

## Prerequisite, not a permission manager

Jev recommendations require Python 3.10+, an existing TypeSafe credential and
host-authorized HTTPS to `api.typesafe.ai:443` (`/v1/systemone`). Installation,
hook trust, processing consent and network authorization are independent. Keep
verified TLS, the fixed endpoint, existing credential precedence and minimal
non-sensitive task summaries/public capability cards. Never request keys in chat.

The user or administrator owns network policy. Neither ordinary advice nor
installation may change sandbox, firewall, proxy, trust or approval settings.
Separately authorized hook/credential-reference setup keeps its existing narrow
ownership contract; updating this skill does not refresh installed registrations.
Use its existing explicit reinstall/refresh procedure after reviewing changes.

## Decide using current host evidence

| Situation                                                | Action                                                                                                         |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Access is already allowed and prerequisites hold         | Use the existing advisor; no redundant approval or connectivity probe.                                         |
| Approval is required and available                       | Use the narrowest applicable native approval before dispatch. Keep permitted local preparation separate.       |
| User explicitly denies                                   | End this attempt without provider dispatch. Respect the denial's scope; no repeat prompt or alternative route. |
| Policy blocks access or required approval is unavailable | Do not run a predictably prohibited request. Explain the API prerequisite and user/admin-owned remedy.         |
| Policy is unknown, with no observed prohibition          | Do not invent a denial. Use only the ordinary permitted execution path and describe its actual result.         |
| Provider/transport fails                                 | Report the safe error once. Do not replay the request, change permissions, or switch execution routes.         |

Use the [host-specific approval reference](hook-integration.md) and actual tool
schema. An available one-command/session authorization need not change durable
configuration. Permission to run outside a sandbox is broader than a domain
allowance: disclose that difference. Never override managed policy or approval.
A new session, reinstall or skill update alone is not authorization. Remember
denials through existing host/session context, not a new permission database;
a later explicit authorization change can permit a new, separately scoped attempt.

Do not offer a bypass installer, daemon, MCP proxy or remote executor. There is
no second installation mode in this contract. Do not issue extra provider calls
for diagnosis or replay an unknown-completion POST. Existing safe transport
receipt fields may aid an explicitly authorized diagnosis; do not print proxy
URLs, exception strings, private paths, credentials, payloads or response bodies.

## Explain what happened

Return one short message in the user's language. Preserve the existing result
status and error code; the summary's `error_message` is safe presentation, not
proof of a host-policy decision. Only explicit host evidence establishes a denial.
HTTP 403, DNS/TLS errors, timeout and generic `network_error` do not establish one.
Credential configuration/authentication failures are distinct from network access.
A generic transport failure can occur after dispatch or while reading a response;
do not infer that the API was never reached.

Examples below are message semantics, not mandatory English UI text:

| Observed result                 | Message                                                                                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Explicit user denial            | “Jev was not used: you declined TypeSafe API access. Without it, Jev cannot recommend a capability.”                                                                 |
| Confirmed host-policy block     | “Jev is unavailable here: the active policy blocks api.typesafe.ai. Jev requires that API access to be allowed in the agent client, possibly by your administrator.” |
| Unknown transport failure       | “The TypeSafe request failed; completion is unknown. No Jev recommendation is available. Do not automatically retry.”                                                |
| Missing or rejected credentials | “Jev could not use the configured TypeSafe credential. No Jev recommendation was produced.”                                                                          |

After an explicit denial, do not append another permission pitch. Recommend a
concrete host setting only when it exists for the active host/version. Never
suggest disabling TLS verification. A request counter or a flag set before I/O
cannot establish that data did or did not reach TypeSafe; preserve uncertainty.

For an automatic consultation, add “Native skill selection will continue.” An
explicit Jev-only request instead remains unfulfilled; any subsequent native
advice must be clearly labeled separately. Local `Inspect` can still provide
candidates without provider access, but is not an offline Jev recommendation and
must not be forced as a substitute. Skipped events and unchanged continuations
need no repeated status. Valid `none` and `clarify` are not transport failures.

## Same contract, native environments

Windows native, macOS and Linux use the same prerequisites and failure semantics.
WSL is an additional environment, not required for native Windows users. Use an
available OS-native Python interpreter, native paths and shell-appropriate quoting;
keep existing private-state locations and Windows/WSL credentials separate.

Test the helper on each OS and qualify actual host approval/denial separately.
Python or hook-launcher compatibility does not prove an upstream sandbox exists
on that OS. Mocked host replies and emitted guidance are not live qualification.
A real advisor result, current eligible catalog and independent hook delivery/use
are needed for the respective support claims. Report missing evidence explicitly;
normal CI uses synthetic catalogs and injected replies without provider keys.
