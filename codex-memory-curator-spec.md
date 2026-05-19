# Codex Memory Curator Skill Specification

## 1. Purpose

Create a reusable Codex skill named `codex-memory-curator` that audits, reviews, cleans up, and improves Codex memories.

The skill should help detect whether Codex memories are making results worse by introducing stale assumptions, repo-specific pollution, duplicated rules, too-broad preferences, or hidden conflicts with current repo instructions.

The skill must be strict, skeptical, and safe. It should behave like a reviewer that grills every memory entry before deciding whether it belongs in memory, `AGENTS.md`, a repo document, a skill, config, or deletion.

## 2. Background

Codex memories can improve continuity, but they can also degrade output when they contain stale, overly broad, or repo-specific assumptions. Memory cleanup should be a repeatable workflow instead of an ad hoc prompt.

OpenAI Codex skills are directories with a required `SKILL.md` file and optional `scripts/`, `references/`, and `assets/` folders. Codex initially sees skill metadata for discovery and only loads the full `SKILL.md` when the skill is selected. References and scripts should be loaded only when needed.

This means the skill must be:

- Easy to trigger with a precise `description`
- Small enough to avoid unnecessary context bloat
- Operational rather than essay-like
- Safe around destructive memory edits
- Clear about what belongs in memory versus repo instructions

## 3. Target Location

This should be a user-level skill because Codex memories are user-level state.

Recommended path:

```text
$HOME/.agents/skills/codex-memory-curator/
```

Do not make this repo-specific unless the memory review workflow is customized for one repository.

## 4. Proposed Folder Structure

```text
codex-memory-curator/
  SKILL.md
  references/
    classification-rubric.md
    safe-editing-procedure.md
    example-review-report.md
    config-modes.md
  scripts/
    inventory-memories.sh
    backup-memories.sh
    scan-memory-risks.sh
  assets/
    review-report-template.md
```

## 5. Core Skill Metadata

`SKILL.md` frontmatter:

```yaml
---
name: codex-memory-curator
description: Review, grill, clean up, rewrite, and prune Codex memories. Use when the user asks to audit ~/.codex/memories, remove stale memories, reduce memory pollution, review memory files, or decide whether memory entries belong in AGENTS.md, config, docs, skills, or deletion.
---
```

### Metadata Requirements

The description must include trigger phrases users are likely to say:

- "review memories"
- "clean up memories"
- "memories made Codex worse"
- "audit ~/.codex/memories"
- "stale memories"
- "memory pollution"
- "move memory to AGENTS.md"
- "disable or tune memories"

The description must not be vague. Avoid:

```yaml
description: Helps improve Codex behavior.
```

## 6. Skill Goals

The skill must:

1. Locate Codex memory files.
2. Inspect memory-related config.
3. Create an inventory of memory files.
4. Extract memory entries into atomic claims.
5. Classify each memory entry.
6. Identify risks, duplicates, stale assumptions, and scope problems.
7. Propose safe edits before applying them.
8. Back up memory files before any modification.
9. Produce a cleanup report.
10. Recommend the right location for each entry:
    - Keep in memory
    - Rewrite in memory
    - Move to `AGENTS.md`
    - Move to repo docs
    - Move to a skill
    - Move to config
    - Delete
    - Ask user

## 7. Non-Goals

The skill must not:

- Silently delete memory files
- Rewrite memory files without approval
- Store secrets in memory
- Treat memories as authoritative over current repo files
- Invent a memory file schema if the real schema is unclear
- Convert every useful rule into memory
- Apply repo-specific assumptions globally
- Run broad destructive commands
- Read unrelated personal files

## 8. Memory Classification Model

Each extracted memory entry must receive exactly one primary classification.

### 8.1 KEEP

Use for stable personal preferences that apply across many repos.

Examples:

```text
User prefers pnpm.
User prefers concise implementation plans.
User prefers context-efficient Codex workflows.
```

### 8.2 KEEP BUT REWRITE

Use when the idea is useful but currently too broad, too strong, ambiguous, or too long.

Bad memory:

```text
Always use service classes.
```

Better memory:

```text
User often prefers explicit service boundaries in TypeScript apps, but current repo conventions and source code should determine the final structure.
```

### 8.3 MOVE TO AGENTS.md

Use when the entry describes repo-specific rules, commands, test procedures, architecture constraints, paths, coding conventions, or generated-file restrictions.

Examples:

```text
Run pnpm turbo test in this repo.
Do not modify generated files in packages/api-client.
apps/telegram-dispatcher owns Telegram dispatch logic.
```

### 8.4 MOVE TO REPO DOCS

Use for detailed architecture context or operational knowledge that is too long for `AGENTS.md`.

Examples:

```text
docs/architecture.md
docs/testing.md
docs/codex-handoff.md
docs/service-patterns.md
```

### 8.5 MOVE TO SKILL

Use when the entry is a reusable workflow.

Examples:

```text
Long Codex refactors should maintain a handoff file.
Browser automation reviews should inspect history logs before producing Playwright scripts.
Memory cleanup should follow the curator workflow.
```

### 8.6 MOVE TO CONFIG

Use when the entry is actually a Codex behavior setting.

Examples:

```text
memories.use_memories = false
memories.generate_memories = false
memories.disable_on_external_context = true
```

### 8.7 DELETE

Use when the entry is harmful, stale, duplicated, too narrow, sensitive, or based on a one-off debugging session.

Examples:

```text
A branch name from an old migration.
A one-time bug diagnosis.
A temporary file path.
Any secret or sensitive token.
A hard rule that conflicts with current repo instructions.
```

### 8.8 ASK USER

Use when the memory may be important but cannot be safely classified.

The skill should ask exactly one focused question at a time.

## 9. Review Questions

For every atomic entry, Codex must ask internally:

1. Is this stable for months?
2. Is this a personal preference or a repo rule?
3. Could this mislead Codex in another repository?
4. Is it phrased too strongly?
5. Does it contain "always", "never", or "must" when the rule is contextual?
6. Is it duplicated?
7. Does it conflict with `AGENTS.md`, repo docs, package files, or the current user prompt?
8. Does it contain secrets, customer data, private identifiers, or sensitive personal data?
9. Would this be more precise as a skill, config setting, or repo document?
10. Is it short enough to be a memory?

## 10. Required Workflow

### Step 1: Discover Codex Home

Run:

```bash
echo "${CODEX_HOME:-$HOME/.codex}"
```

### Step 2: Inventory Memory Files

Run:

```bash
find "${CODEX_HOME:-$HOME/.codex}/memories" -maxdepth 2 -type f -print 2>/dev/null
```

If no memory directory exists, report that no local memory files were found and suggest checking whether memories are enabled.

### Step 3: Inspect Config

Run:

```bash
sed -n '1,220p' "${CODEX_HOME:-$HOME/.codex}/config.toml" 2>/dev/null
```

Classify the active memory mode:

- Disabled
- Enabled but not injected
- Enabled and injected
- External-context generation disabled
- Unknown

### Step 4: Extract Atomic Entries

Read memory files in small chunks.

Rules:

- Do not print huge files.
- Use `sed -n`.
- Summarize large files incrementally.
- Extract one claim per row.

### Step 5: Classify Entries

Assign one primary classification per entry.

Optional secondary tags:

- stale
- duplicated
- too-broad
- too-specific
- repo-specific
- workflow
- config
- sensitive
- conflicting
- useful

### Step 6: Produce Review Report

Before edits, output:

```md
# Codex Memory Review

## Summary

- Memory files inspected:
- Entries extracted:
- Keep:
- Rewrite:
- Move to AGENTS.md:
- Move to repo docs:
- Move to skill:
- Move to config:
- Delete:
- Ask user:

## Highest-Risk Memories

| ID  | Entry | Risk | Recommendation |
| --- | ----- | ---- | -------------- |

## Proposed Cleanup Table

| ID  | Current memory | Classification | Reason | Proposed action |
| --- | -------------- | -------------- | ------ | --------------- |

## Config Recommendation

<recommended config mode>

## Recommended Next Action

<one concrete next step>
```

### Step 7: Ask Before Edits

Required message before any destructive action:

```text
Do you want me to apply the safe cleanup now? I will back up the memory directory first.
```

### Step 8: Backup Before Modification

Run:

```bash
MEM_DIR="${CODEX_HOME:-$HOME/.codex}/memories"
BACKUP_DIR="${CODEX_HOME:-$HOME/.codex}/memories.backup.$(date +%Y%m%d-%H%M%S)"
cp -a "$MEM_DIR" "$BACKUP_DIR"
echo "Backup created at $BACKUP_DIR"
```

### Step 9: Apply Approved Changes Only

Rules:

- Only apply changes the user approved.
- Prefer minimal edits.
- Preserve original file format.
- If schema is unclear, write proposed changes to `.proposed.md` instead of editing the original.
- Never delete the only copy of a memory file.
- After edits, show a trimmed diff.

Example:

```bash
diff -ru "$BACKUP_DIR" "$MEM_DIR" | sed -n '1,240p'
```

## 11. Config Modes to Recommend

### 11.1 Audit Mode

Use when testing whether memory injection worsens Codex output.

```toml
[features]
memories = true

[memories]
use_memories = false
generate_memories = true
```

### 11.2 Safer Normal Mode

Use for daily work while reducing noisy memory generation.

```toml
[features]
memories = true

[memories]
use_memories = true
generate_memories = true
disable_on_external_context = true
min_rate_limit_remaining_percent = 50
```

### 11.3 Exact Repo Work Mode

Use for migrations, refactors, debugging, and architecture work where stale assumptions are harmful.

```toml
[features]
memories = true

[memories]
use_memories = false
generate_memories = false
```

### 11.4 Off Mode

Use when memory behavior is actively harming output and the user wants a full reset.

```toml
[features]
memories = false
```

## 12. `SKILL.md` Content Requirements

The final `SKILL.md` should include:

1. Frontmatter
2. Goal
3. Core principle
4. Safety rules
5. Inputs to inspect
6. Classification rubric
7. Review process
8. Output contract
9. Backup and edit rules
10. Config recommendations
11. Final output instruction

It should stay operational and avoid long explanations.

Recommended length:

```text
150 to 300 lines
```

Move longer examples into `references/`.

## 13. References

### `references/classification-rubric.md`

Purpose:

- Full decision tree for classifying memories
- Examples of good and bad memories
- Rules for "always", "never", and "must"
- Examples of softening overly strong memories

### `references/safe-editing-procedure.md`

Purpose:

- Backup instructions
- Edit approval flow
- Diff instructions
- Recovery steps
- What to do if memory schema is unclear

### `references/example-review-report.md`

Purpose:

- A sample output report
- Example classification rows
- Example config recommendation
- Example user decision prompts

### `references/config-modes.md`

Purpose:

- Explain memory config modes
- Give copy-paste TOML snippets
- Explain when to use each mode

## 14. Scripts

### 14.1 `scripts/inventory-memories.sh`

Purpose:

- Print Codex home
- Check whether memories directory exists
- List memory files with size and modification time
- Avoid printing memory contents

Suggested implementation:

```bash
#!/usr/bin/env bash
set -euo pipefail

CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
MEM_DIR="$CODEX_DIR/memories"

echo "Codex home: $CODEX_DIR"

if [ ! -d "$MEM_DIR" ]; then
  echo "No memories directory found at: $MEM_DIR"
  exit 0
fi

find "$MEM_DIR" -maxdepth 2 -type f -print0 \
  | xargs -0 ls -lh 2>/dev/null \
  | awk '{print $5, $6, $7, $8, $9}'
```

### 14.2 `scripts/backup-memories.sh`

Purpose:

- Create timestamped backup
- Print backup path

Suggested implementation:

```bash
#!/usr/bin/env bash
set -euo pipefail

CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
MEM_DIR="$CODEX_DIR/memories"

if [ ! -d "$MEM_DIR" ]; then
  echo "No memories directory found at: $MEM_DIR"
  exit 1
fi

BACKUP_DIR="$CODEX_DIR/memories.backup.$(date +%Y%m%d-%H%M%S)"
cp -a "$MEM_DIR" "$BACKUP_DIR"

echo "$BACKUP_DIR"
```

### 14.3 `scripts/scan-memory-risks.sh`

Purpose:

- Flag likely problematic content
- Do not modify files
- Print filenames and matching lines

Suggested implementation:

```bash
#!/usr/bin/env bash
set -euo pipefail

CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
MEM_DIR="$CODEX_DIR/memories"

if [ ! -d "$MEM_DIR" ]; then
  echo "No memories directory found at: $MEM_DIR"
  exit 0
fi

grep -RInE \
  "always|never|must|token|secret|password|api[_-]?key|private key|branch|temporary|one-off|todo|localhost|apps/|packages/" \
  "$MEM_DIR" \
  2>/dev/null || true
```

## 15. Assets

### `assets/review-report-template.md`

```md
# Codex Memory Review

## Summary

- Memory files inspected:
- Entries extracted:
- Keep:
- Rewrite:
- Move to AGENTS.md:
- Move to repo docs:
- Move to skill:
- Move to config:
- Delete:
- Ask user:

## Highest-Risk Memories

| ID  | Entry | Risk | Recommendation |
| --- | ----- | ---- | -------------- |

## Proposed Cleanup Table

| ID  | Current memory | Classification | Reason | Proposed action |
| --- | -------------- | -------------- | ------ | --------------- |

## Config Recommendation

## Recommended Next Action
```

## 16. Expected User Commands

The skill should work with explicit invocation:

```text
$codex-memory-curator

Review my Codex memories. Be strict. Do not edit anything yet. Produce the cleanup report first.
```

It should also trigger implicitly for prompts like:

```text
My Codex results got worse after enabling memories. Review and clean them up.
```

```text
Audit ~/.codex/memories and tell me what should be deleted or moved to AGENTS.md.
```

```text
I think my memories are polluting repo work. Help me review them.
```

## 17. Acceptance Criteria

The skill is complete when:

- `SKILL.md` exists with valid YAML frontmatter.
- `name` is `codex-memory-curator`.
- `description` contains clear trigger phrases.
- The workflow requires backup before modification.
- The workflow requires user approval before edits.
- The workflow distinguishes memory from `AGENTS.md`, repo docs, skills, and config.
- The workflow includes a classification rubric.
- The workflow outputs a review report before edits.
- The skill does not require reading all references upfront.
- Scripts are optional and deterministic.
- No script modifies memories except the backup script, and even that only copies.
- The skill can be invoked with `$codex-memory-curator`.

## 18. Validation Plan

### 18.1 Static Validation

Run:

```bash
test -f "$HOME/.agents/skills/codex-memory-curator/SKILL.md"
sed -n '1,20p' "$HOME/.agents/skills/codex-memory-curator/SKILL.md"
```

Confirm:

- YAML frontmatter starts and ends with `---`
- `name` exists
- `description` exists
- No malformed Markdown fences

### 18.2 Script Validation

Run:

```bash
bash "$HOME/.agents/skills/codex-memory-curator/scripts/inventory-memories.sh"
bash "$HOME/.agents/skills/codex-memory-curator/scripts/scan-memory-risks.sh"
```

Do not run the backup script unless memory files exist.

### 18.3 Codex Validation Prompt

Use:

```text
$codex-memory-curator

Review my Codex memories. Do not edit anything. Produce only the review report and recommended config mode.
```

Expected behavior:

- Codex inventories memory files.
- Codex inspects memory config.
- Codex produces classifications.
- Codex does not modify files.
- Codex asks before cleanup.

## 19. Failure Modes and Required Behavior

### Failure: No Memories Directory

Behavior:

```text
No local memories directory was found. Check whether memories are enabled or whether CODEX_HOME points to a non-default location.
```

### Failure: Config Missing

Behavior:

```text
No config.toml was found. Memory behavior may be controlled by app settings or defaults.
```

### Failure: Memory Schema Unknown

Behavior:

```text
The memory file format is unclear. I will not edit it directly. I will write proposed replacements to a separate `.proposed.md` file instead.
```

### Failure: Sensitive Data Found

Behavior:

1. Do not print full secret.
2. Identify file and line if possible.
3. Recommend immediate removal.
4. Require backup before edits.
5. Recommend rotating exposed credentials if any real secret may have been stored.

### Failure: Conflicting Rules

Behavior:

1. Cite the conflict.
2. Prefer current prompt and repo instructions.
3. Mark memory as rewrite, move, or delete.

## 20. Recommended Implementation Prompt for Codex

```text
Create a user-level Codex skill at $HOME/.agents/skills/codex-memory-curator.

Use this specification:
- Required SKILL.md with valid frontmatter
- Optional references and scripts as described
- No destructive scripts
- Backup before any edits
- Review report before cleanup
- Do not read all references upfront
- Keep SKILL.md operational and concise

After implementation:
1. Show the final file tree.
2. Show SKILL.md first 80 lines.
3. Run the inventory script.
4. Do not modify my memories.
```

## 21. Source Notes

This specification is based on current Codex behavior and official Codex documentation, including:

- Codex skills use a required `SKILL.md` with `name` and `description`.
- Skills may include optional `scripts/`, `references/`, `assets/`, and `agents/openai.yaml`.
- Codex uses progressive disclosure: it sees skill metadata first, then loads `SKILL.md`, then loads references or scripts only when needed.
- Skills can be invoked explicitly with `$skill-name` or implicitly from the description.
- User-level skills belong in `$HOME/.agents/skills`.
- Codex memory settings include `memories.generate_memories`, `memories.use_memories`, `memories.disable_on_external_context`, and related config keys.
- Codex docs warn not to store secrets in memories and recommend reviewing memory files before sharing generated memory artifacts.

## 22. Recommended Next Action

Implement the skill using the implementation prompt in section 20, then run the validation plan in section 18.
