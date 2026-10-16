# Hermes installation and session checks

Use this adapter when connecting Hermes to the same knowledge workflow. It is one
portable skill, not a separate Hermes copy of the reconciliation logic. Installing
or loading it grants no collection access or repository-import permission.

## Install the complete package

Resolve the actual execution host and active profile's `HERMES_HOME` first. Hermes
normally uses `~/.hermes`; named profiles have their own configuration and skill
directory. Preserve existing configuration, profile isolation and local edits.

Install the entire reviewed `karakeep-knowledge/` directory, including `scripts/`,
`scripts/knowledge/`, `references/`, `assets/` and `agents/`. A lone `SKILL.md` or
`knowledge.mjs` cannot run the helper: its imported modules must be present. Use an
immutable source revision and record the installed revision/digest privately.

Use one installation, chosen by the existing configuration owner:

- Profile-local: the complete folder at `$HERMES_HOME/skills/karakeep-knowledge`.
- Shared read-only package: the complete folder under an existing external skills
  root, with that root added to the profile's `skills.external_dirs`.

Do not blindly overwrite an existing installation or enable every unrelated skill
from a different host. Check for a profile-local or trusted project skill with the
same name: a trusted project copy can override it; conflicting profile-local and
external copies can instead make native loading refuse an ambiguous name. Resolve
the intended source before claiming that the shared revision is in use. Preserve
both copies; explicitly select one installation root or an unambiguous categorized
path in that profile's configuration. A container image can install this
nonsecret payload at build time; it must not bake in credentials or private policy.

## Use Hermes' native auto-load configuration

Merge the appropriate values from [the example](../assets/hermes-config.example.yaml)
into the active profile's `config.yaml`, preserving unrelated lists and settings.
For a profile-local installation, omit `external_dirs`. The example path is a
placeholder, not an existing installation. Do not replace the whole YAML file.

`skills.auto_load` loads this skill's instructions at the start of a normal Hermes
agent session. The agent then invokes the Node `check` at its first substantive Git
repository work. This is agent behavior, not a deterministic command hook, daemon,
cron job or post-merge pipeline. Hermes' own disabled-skill settings, ignored rules
and sessions without the skills toolset/context can suppress auto-loading; internal
delegation/review agents need not inherit it. Verify the actual target session.

Do not treat `~/.codex/AGENTS.md` or a file at `$HERMES_HOME/AGENTS.md` as a global
Hermes startup mechanism. Hermes project context has its own discovery/precedence.
No edit to `SOUL.md` or the agent's identity is needed. For an older Hermes without
native auto-load, invoke the skill once manually and adopt the existing
[project instruction](../assets/project-instructions.md) in the context file that
the installed Hermes actually loads. Do not upgrade the runtime silently.

## Execute on the correct host

The helper requires Node.js 24.18+ and Git on Linux/POSIX. Resolve the installed
skill directory shown by Hermes and run:

```sh
node /installed/karakeep-knowledge/scripts/knowledge.mjs check --repo /absolute/repository
```

Hermes' terminal backend must be able to read that same package and repository.
Host-side discovery does not prove availability inside a remote/Docker terminal
backend. Use the selected profile's private descriptor, credential references and
shared collection state under the [helper contract](helper.md). The existing helper
and MCP launcher accept loopback origins only: another container's or host's
`localhost` does not reach the owner's service. Report missing connectivity; do not
weaken the origin check, expose the service, copy host credentials into an image or
invent cross-host writer coordination. The designated writer and shared state must
remain consistent with the adopted policy.

## Qualification and disablement

1. In the actual profile, verify that Hermes discovers the intended installed skill
   and can read its references and every imported Node module.
2. Start a fresh ordinary session in a Git repository. Observe the native auto-load
   and the agent's real read-only `check` invocation. A loaded prompt alone proves
   instruction discovery, not execution or a working Karakeep connection.
3. Verify `needs_setup` without mutation for an unadopted repository and continued
   repository work when the configured service is unavailable. Qualify authorized
   reads/writes separately using the existing setup/sync acceptance cases.

Removing `auto_load` or disabling the skill stops automatic instruction loading; it
does not revoke retained API/MCP credentials. To enforce a write stop, the connection
owner must revoke/detach the attachment-owned write capability. Preserve knowledge,
other attachments and unrelated credentials. Keep runtime, CI, published-image and
live-session evidence distinct.

## Checked upstream contract

Checked 2026-10-16 against Hermes revision
`f97608f178d1ffeca59860195ab7da295f7c8e5f`:
[native defaults](https://github.com/NousResearch/hermes-agent/blob/f97608f178d1ffeca59860195ab7da295f7c8e5f/hermes_cli/config_defaults.py),
[session auto-load](https://github.com/NousResearch/hermes-agent/blob/f97608f178d1ffeca59860195ab7da295f7c8e5f/agent/system_prompt.py)
and [skill discovery](https://github.com/NousResearch/hermes-agent/blob/f97608f178d1ffeca59860195ab7da295f7c8e5f/agent/skill_utils.py).
The [skills guide](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills/)
and [context guide](https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files/)
describe the current user surface; recheck when changing the pinned runtime.
