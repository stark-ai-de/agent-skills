# Local setup and connection checks

Use the project's Node.js 24.18+ and a Git version supporting `--no-lazy-fetch`.
There are no package dependencies in this skill. The qualification receipt lists
actual tested Node, Bun and Git versions; it does not imply every platform was
executed.

## Install the candidate locally

This is an opt-in incubator skill. Public catalog promotion has a separate
comparative evidence gate. From the target project, install a local checkout's
skill directory using the repository's pinned Skills CLI:

```bash
SOURCE_DIR="/path/to/agent-skills/incubator/skills/engineering-workflows/change-impact"
INSTALL_INTERNAL_SKILLS=1 pnpm dlx skills@1.5.23 add "$SOURCE_DIR" --skill change-impact --agent codex --copy --yes
```

The command writes the target project's skill installation and install receipt.
It does not publish the skill or modify a global agent configuration. For Codex,
use the installed `.agents/skills/change-impact` directory. Read the local CLI
output if a different client uses a different installation destination. New
sessions must load the installed skill before automatic selection can be claimed.

## Configure credentials

Either provide `TYPESAFE_API_KEY` in the process environment or set
`TYPESAFE_API_KEY_FILE` to a regular local UTF-8 file containing only the raw key.
The environment key takes precedence, including an explicitly empty value; unset
it to use the file. The file reader rejects symbolic links, embedded whitespace
and files larger than 4096 bytes. Keep the file outside the repository with access
restricted to its owner. Do not paste the key into prompts, CLI arguments, JSON
packets, logs or checked-in configuration.

```bash
SKILL_DIR=".agents/skills/change-impact"
export TYPESAFE_API_KEY_FILE="/path/to/local/raw-key"
node "$SKILL_DIR/scripts/change-impact.mjs" doctor
```

`doctor` reports runtime availability and credential configuration without reading
repository source or making network calls. A configured key has not yet been
authenticated. To test the real connection, when that API use is authorized:

```bash
node "$SKILL_DIR/scripts/change-impact.mjs" doctor --live
```

The live check uses one fixed synthetic Choice question, the pinned model and the
same bounded transport as ranking. It may retry within its three-attempt budget.
A connected result includes actual provider usage. This proves a connection at
that moment; it grants no authority to transmit arbitrary project data.

## First investigation

Inspect the task and diff, then construct the source-backed collection request
from [the helper contract](helper-contract.md). Store request, packet, ranking
and confirmations in temporary or project-approved ignored storage. Run the
commands in sequence and inspect failure/coverage fields before proceeding.
Use `queue` to load just the next investigation batch; keep the full packet on
disk so subsequent checks can revalidate it.

Use the smallest useful source scope. When Git lacks a required object, fetch it
through the project's normal authorized workflow and recollect; collection itself
never fetches. When Jev is unavailable, explicitly choose a host-only review and
retain the evidence gap instead of retrying without bounds.
