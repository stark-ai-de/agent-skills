# Cleanup Plan Template

Embed this structure in the `Plan` section of the selected route's chat result or single file record when the user needs to approve individual memory cleanup actions. Do not persist it as a second curation artifact.

An explicit `--backup-root` also requires a stable non-sensitive `--backup-root-alias` for the portable storage locator.

```json
{
  "schema_version": "1.0",
  "codex_home": "<codex-home>",
  "created_at": "<iso-8601-timestamp>",
  "source": {
    "memory_files": [],
    "config_file": null,
    "repo_context_files": []
  },
  "summary": {
    "entries_extracted": 0,
    "keep": 0,
    "rewrite": 0,
    "move_to_agents_md": 0,
    "move_to_repo_docs": 0,
    "move_to_skill": 0,
    "move_to_config": 0,
    "delete": 0,
    "ask_user": 0
  },
  "decisions": [
    {
      "id": "M-1",
      "source_file": "memories/MEMORY.md",
      "line": 1,
      "current_memory_redacted": "<short redacted memory claim>",
      "primary_classification": "ASK USER",
      "risk_tags": [],
      "confidence": "low",
      "conflicts": [],
      "proposed_action": "<leave unchanged, rewrite, move, delete, or ask>",
      "proposed_replacement": null,
      "approved": false
    }
  ],
  "apply_requirements": {
    "requires_explicit_user_approval": true,
    "requires_backup_first": true,
    "unknown_schema_action": "defer_without_writing",
    "backup": {
      "mode": "exact",
      "storage_policy": "outside-git-worktree",
      "storage_root": "deterministic-user-state-or-verified-external-override",
      "backup_root_alias": null,
      "persisted_locator_policy": "script-reported-portable-storage-locator-and-manifest-relative-paths-only",
      "include_paths": [],
      "manifest": "backup-manifest.json",
      "receipt_rule": "Every pre-existing changed file must match exactly one verified manifest source entry; an approved new file is created-no-preimage with an explicit rollback."
    }
  }
}
```
